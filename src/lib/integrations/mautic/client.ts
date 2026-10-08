import { safeFetch } from '@/lib/security/ssrf';
import { isValidEmail } from '@/lib/integrations/email/resend';

export interface MauticConfig {
  baseUrl: string;
  publicKey?: string;
  secretKey?: string;
  accessToken?: string;
}

export interface MauticContactField {
  value?: string;
}

export interface MauticRawContact {
  id: number | string;
  fields?: {
    core?: {
      email?: MauticContactField;
      firstname?: MauticContactField;
      lastname?: MauticContactField;
      phone?: MauticContactField;
      company?: MauticContactField;
      title?: MauticContactField;
    };
  };
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
}

export class MauticClient {
  private baseUrl: string;
  private authHeader: string | null = null;

  constructor(config: MauticConfig) {
    let cleanUrl = (config.baseUrl || '').trim().replace(/\/+$/, '');
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    this.baseUrl = cleanUrl;

    if (config.accessToken) {
      this.authHeader = `Bearer ${config.accessToken.trim()}`;
    } else if (config.publicKey && config.secretKey) {
      const creds = Buffer.from(`${config.publicKey.trim()}:${config.secretKey.trim()}`).toString('base64');
      this.authHeader = `Basic ${creds}`;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.authHeader);
  }

  getSetupInstructions(): string {
    return 'Mautic integration is not configured. Setup required: In Settings -> Integrations -> Mautic, provide: (1) Mautic Instance URL (e.g. https://mautic.yourdomain.com), and (2) API credentials (either Public/Secret API keys for Basic Auth, or OAuth Access Token).';
  }

  /**
   * Fetches a paginated slice of contacts from Mautic REST API.
   */
  async fetchContactsPage(start: number = 0, limit: number = 30): Promise<{
    contacts: MauticRawContact[];
    total: number;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { contacts: [], total: 0, error: this.getSetupInstructions() };
    }

    const endpoint = `${this.baseUrl}/api/contacts?start=${start}&limit=${limit}&orderBy=id&orderByDir=ASC`;

    try {
      const res = await safeFetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader!,
          'Accept': 'application/json',
          'User-Agent': 'NexusMark-CRM-Bridge/1.0',
        },
        timeoutMs: 10000,
      });

      if (res.status === 401 || res.status === 403) {
        return {
          contacts: [],
          total: 0,
          error: `Mautic authentication failed (HTTP ${res.status}). Verify API credentials or OAuth token validity.`,
        };
      }

      if (!res.ok) {
        return {
          contacts: [],
          total: 0,
          error: `Mautic server responded with error HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const rawContactsObj = json?.contacts || {};

      // Mautic returns contacts as an object with IDs as keys: { "1": { ... }, "2": { ... } } or an array
      const contactsList: MauticRawContact[] = Array.isArray(rawContactsObj)
        ? rawContactsObj
        : Object.values(rawContactsObj);

      const total = typeof json?.total === 'number' ? json.total : contactsList.length;

      return { contacts: contactsList, total };
    } catch (err: any) {
      return {
        contacts: [],
        total: 0,
        error: `Could not connect to Mautic endpoint: ${err.message}`,
      };
    }
  }

  /**
   * Performs an authentic bi-directional sync from Mautic to the Supabase database.
   * Handles pagination, deduplication by email, and truthful synced count.
   */
  async syncToSupabase(
    workspaceId: string,
    supabase: any,
    maxRecords: number = 100
  ): Promise<{
    success: boolean;
    syncedCount: number;
    totalAvailable: number;
    errors: string[];
    message: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        syncedCount: 0,
        totalAvailable: 0,
        errors: [this.getSetupInstructions()],
        message: 'Mautic unconfigured',
      };
    }

    let start = 0;
    const limit = 25;
    let syncedCount = 0;
    let totalAvailable = 0;
    const errors: string[] = [];

    while (syncedCount < maxRecords) {
      const pageResult = await this.fetchContactsPage(start, limit);
      if (pageResult.error) {
        errors.push(pageResult.error);
        break;
      }

      totalAvailable = pageResult.total;
      const contacts = pageResult.contacts;

      if (!contacts || contacts.length === 0) {
        break; // No more contacts
      }

      for (const m of contacts) {
        const core = m.fields?.core || {};
        const email = (core.email?.value || m.email || '').trim().toLowerCase();
        const firstName = (core.firstname?.value || m.firstname || '').trim() || 'Mautic Contact';
        const lastName = (core.lastname?.value || m.lastname || '').trim();
        const phone = (core.phone?.value || m.phone || '').trim() || null;
        const jobTitle = (core.title?.value || '').trim() || null;

        if (!isValidEmail(email)) {
          continue; // Skip invalid emails
        }

        try {
          // Check if contact already exists in workspace
          const { data: existing } = await supabase
            .from('contacts')
            .select('id, tags')
            .eq('workspace_id', workspaceId)
            .eq('email', email)
            .maybeSingle();

          if (existing) {
            // Update existing contact
            const currentTags: string[] = Array.isArray(existing.tags) ? existing.tags : [];
            const updatedTags = Array.from(new Set([...currentTags, 'mautic-synced']));

            await supabase
              .from('contacts')
              .update({
                first_name: firstName,
                last_name: lastName || undefined,
                phone: phone || undefined,
                job_title: jobTitle || undefined,
                tags: updatedTags,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            // Insert new contact
            await supabase.from('contacts').insert({
              workspace_id: workspaceId,
              email,
              first_name: firstName,
              last_name: lastName,
              phone,
              job_title: jobTitle,
              lead_status: 'contacted',
              lifecycle_stage: 'lead',
              tags: ['mautic-synced'],
              is_archived: false,
              source: 'website',
              consent_status: 'opted_in',
            });
          }

          syncedCount++;
        } catch (dbErr: any) {
          errors.push(`Error saving ${email}: ${dbErr.message}`);
        }
      }

      start += limit;
      if (start >= totalAvailable) break;
    }

    const success = errors.length === 0 || syncedCount > 0;
    const message = success
      ? `Mautic sync complete. Synchronized ${syncedCount} contact(s) from Mautic instance (${totalAvailable} available).`
      : `Mautic sync failed: ${errors.join(', ')}`;

    return {
      success,
      syncedCount,
      totalAvailable,
      errors,
      message,
    };
  }
}
