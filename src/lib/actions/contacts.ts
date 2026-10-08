'use server';

import { createClient } from '@/lib/supabase/server';
import { Contact, CsvContactRow, ContactView, ContactSource, ConsentStatus } from '@/lib/types/crm';
import { calculateLeadScore } from '@/lib/crm/scoring';
import { revalidatePath } from 'next/cache';

export interface GetContactsOptions {
  search?: string;
  status?: string;
  stage?: string;
  source?: string;
  consentStatus?: string;
  tag?: string;
  isArchived?: boolean;
  page?: number;
  pageSize?: number;
  minScore?: number;
}

export async function getContacts(
  workspaceId: string,
  options?: GetContactsOptions
): Promise<Contact[]> {
  const result = await getContactsPaginated(workspaceId, options);
  return result.contacts;
}

export async function getContactsPaginated(
  workspaceId: string,
  options?: GetContactsOptions
): Promise<{
  contacts: Contact[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const supabase = await createClient();
  if (!supabase) {
    return { contacts: [], totalCount: 0, page: 1, pageSize: 25, totalPages: 0 };
  }

  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.max(1, Math.min(100, options?.pageSize || 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('contacts')
    .select('*, company:companies(*)', { count: 'exact' })
    .eq('workspace_id', workspaceId);

  if (options?.isArchived !== undefined) {
    query = query.eq('is_archived', options.isArchived);
  } else {
    query = query.eq('is_archived', false);
  }

  if (options?.status && options.status !== 'all') {
    query = query.eq('lead_status', options.status);
  }

  if (options?.stage && options.stage !== 'all') {
    query = query.eq('lifecycle_stage', options.stage);
  }

  if (options?.source && options.source !== 'all') {
    query = query.eq('source', options.source);
  }

  if (options?.consentStatus && options.consentStatus !== 'all') {
    query = query.eq('consent_status', options.consentStatus);
  }

  if (options?.minScore !== undefined && options.minScore > 0) {
    query = query.gte('lead_score', options.minScore);
  }

  if (options?.tag) {
    query = query.contains('tags', [options.tag]);
  }

  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error || !data) {
    console.error('Error fetching contacts:', error);
    return { contacts: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    contacts: data as Contact[],
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getContactById(
  workspaceId: string,
  contactId: string
): Promise<Contact | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('contacts')
    .select('*, company:companies(*)')
    .eq('workspace_id', workspaceId)
    .eq('id', contactId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Contact;
}

export async function createContact(
  workspaceId: string,
  contactData: {
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
    job_title?: string;
    company_id?: string;
    lead_status?: string;
    lifecycle_stage?: string;
    tags?: string[];
    owner_id?: string;
    source?: ContactSource;
    consent_status?: ConsentStatus;
    custom_fields?: Record<string, any>;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referrer?: string;
  }
): Promise<{ success: boolean; contact?: Contact; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Compute lead score
  const { score, reasons } = calculateLeadScore({
    first_name: contactData.first_name,
    last_name: contactData.last_name || '',
    phone: contactData.phone,
    job_title: contactData.job_title,
    company_id: contactData.company_id,
    lifecycle_stage: (contactData.lifecycle_stage as any) || 'lead',
    source: contactData.source || 'direct',
    consent_status: contactData.consent_status || 'pending',
  });

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      first_name: contactData.first_name.trim(),
      last_name: contactData.last_name?.trim() || '',
      email: contactData.email.trim().toLowerCase(),
      phone: contactData.phone?.trim() || null,
      job_title: contactData.job_title?.trim() || null,
      company_id: contactData.company_id || null,
      lead_status: contactData.lead_status || 'new',
      lifecycle_stage: contactData.lifecycle_stage || 'lead',
      tags: contactData.tags || [],
      owner_id: contactData.owner_id || null,
      source: contactData.source || 'direct',
      consent_status: contactData.consent_status || 'pending',
      custom_fields: contactData.custom_fields || {},
      lead_score: score,
      lead_score_reasons: reasons,
      utm_source: contactData.utm_source || null,
      utm_medium: contactData.utm_medium || null,
      utm_campaign: contactData.utm_campaign || null,
      utm_term: contactData.utm_term || null,
      utm_content: contactData.utm_content || null,
      referrer: contactData.referrer || null,
      created_by: user?.id || null,
    })
    .select('*, company:companies(*)')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create contact' };
  }

  // Log activity with UTM details if present
  let activityDesc = `Contact ${data.first_name} ${data.last_name} (${data.email}) created. Initial Lead Score: ${score}/100.`;
  if (contactData.utm_source) {
    activityDesc += ` Attribution: ${contactData.utm_source} / ${contactData.utm_medium || 'direct'} (Campaign: ${contactData.utm_campaign || 'none'}).`;
  }

  await supabase.from('activities').insert({
    workspace_id: workspaceId,
    contact_id: data.id,
    type: 'note',
    title: 'Contact created',
    description: activityDesc,
    user_id: user?.id || null,
  });

  // Trigger active workflows registered for contact_created event
  try {
    const { dispatchCrmEventTriggers } = await import('@/lib/actions/automations');
    await dispatchCrmEventTriggers(workspaceId, 'contact_created', data.id, { contactId: data.id });
  } catch (triggerErr) {
    console.error('Error triggering automations on contact creation:', triggerErr);
  }

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  return { success: true, contact: data as Contact };
}

export async function updateContact(
  workspaceId: string,
  contactId: string,
  updates: Partial<Contact>
): Promise<{ success: boolean; contact?: Contact; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  // Fetch existing activities to recalculate lead score dynamically
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('contact_id', contactId);

  const { score, reasons } = calculateLeadScore(updates, activities || []);

  const payload: Record<string, any> = {
    ...updates,
    lead_score: score,
    lead_score_reasons: reasons,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('contacts')
    .update(payload)
    .eq('workspace_id', workspaceId)
    .eq('id', contactId)
    .select('*, company:companies(*)')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to update contact' };
  }

  revalidatePath('/contacts');
  revalidatePath(`/contacts/${contactId}`);
  return { success: true, contact: data as Contact };
}

export async function archiveContact(
  workspaceId: string,
  contactId: string,
  isArchived: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { error } = await supabase
    .from('contacts')
    .update({
      is_archived: isArchived,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', contactId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function exportContactsCsv(
  workspaceId: string,
  options?: GetContactsOptions
): Promise<string> {
  const contacts = await getContacts(workspaceId, {
    ...options,
    pageSize: 1000,
  });

  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Job Title',
    'Company',
    'Lead Status',
    'Lifecycle Stage',
    'Lead Score',
    'Source',
    'Consent Status',
    'Tags',
    'UTM Source',
    'UTM Medium',
    'UTM Campaign',
    'Created At',
  ];

  const rows = contacts.map((c) => [
    `"${(c.first_name || '').replace(/"/g, '""')}"`,
    `"${(c.last_name || '').replace(/"/g, '""')}"`,
    `"${(c.email || '').replace(/"/g, '""')}"`,
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    `"${(c.job_title || '').replace(/"/g, '""')}"`,
    `"${(c.company?.name || '').replace(/"/g, '""')}"`,
    `"${c.lead_status}"`,
    `"${c.lifecycle_stage}"`,
    `"${c.lead_score || 0}"`,
    `"${c.source || 'direct'}"`,
    `"${c.consent_status || 'pending'}"`,
    `"${(c.tags || []).join('; ')}"`,
    `"${c.utm_source || ''}"`,
    `"${c.utm_medium || ''}"`,
    `"${c.utm_campaign || ''}"`,
    `"${new Date(c.created_at).toISOString()}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export async function bulkImportContacts(
  workspaceId: string,
  contacts: CsvContactRow[],
  options: { duplicateHandling: 'skip' | 'update' }
): Promise<{ success: boolean; imported: number; updated: number; errors: string[] }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, imported: 0, updated: 0, errors: ['Database unconfigured'] };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    try {
      const { score, reasons } = calculateLeadScore({
        first_name: c.first_name,
        last_name: c.last_name || '',
        phone: c.phone,
        job_title: c.job_title,
        lifecycle_stage: c.lifecycle_stage || 'lead',
        source: 'csv_import',
      });

      if (options.duplicateHandling === 'update') {
        const { error } = await supabase
          .from('contacts')
          .upsert(
            {
              workspace_id: workspaceId,
              first_name: c.first_name,
              last_name: c.last_name || '',
              email: c.email.toLowerCase(),
              phone: c.phone || null,
              job_title: c.job_title || null,
              lead_status: c.lead_status || 'new',
              lifecycle_stage: c.lifecycle_stage || 'lead',
              tags: c.tags || [],
              source: 'csv_import',
              lead_score: score,
              lead_score_reasons: reasons,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'workspace_id,email' }
          );

        if (error) {
          errors.push(`${c.email}: ${error.message}`);
        } else {
          updated++;
        }
      } else {
        const { error } = await supabase.from('contacts').insert({
          workspace_id: workspaceId,
          first_name: c.first_name,
          last_name: c.last_name || '',
          email: c.email.toLowerCase(),
          phone: c.phone || null,
          job_title: c.job_title || null,
          lead_status: c.lead_status || 'new',
          lifecycle_stage: c.lifecycle_stage || 'lead',
          tags: c.tags || [],
          source: 'csv_import',
          lead_score: score,
          lead_score_reasons: reasons,
          created_by: user?.id || null,
        });

        if (error) {
          if (error.code === '23505') {
            // Skipped duplicate
          } else {
            errors.push(`${c.email}: ${error.message}`);
          }
        } else {
          imported++;
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      errors.push(`${c.email}: ${msg}`);
    }
  }

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  return { success: true, imported, updated, errors };
}

// ==========================================
// Saved Contact Views Actions
// ==========================================

export async function getContactViews(workspaceId: string): Promise<ContactView[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('contact_views')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as ContactView[];
}

export async function saveContactView(
  workspaceId: string,
  name: string,
  filters: Record<string, any>,
  isDefault: boolean = false
): Promise<{ success: boolean; view?: ContactView; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('contact_views')
    .insert({
      workspace_id: workspaceId,
      name: name.trim(),
      filters,
      is_default: isDefault,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to save view' };
  }

  return { success: true, view: data as ContactView };
}

export async function deleteContactView(
  workspaceId: string,
  viewId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { error } = await supabase
    .from('contact_views')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', viewId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
