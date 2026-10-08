import { safeFetch } from '@/lib/security/ssrf';

export interface GscCredentials {
  propertyId: string; // e.g. "sc-domain:example.com" or "https://example.com/"
  clientEmail?: string;
  privateKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface GscQueryRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class GoogleSearchConsoleClient {
  private propertyId: string;
  private credentials: GscCredentials;

  constructor(credentials: GscCredentials) {
    this.propertyId = credentials.propertyId?.trim() || '';
    this.credentials = credentials;
  }

  isConfigured(): boolean {
    return Boolean(
      this.propertyId &&
      (this.credentials.accessToken ||
       this.credentials.refreshToken ||
       (this.credentials.clientEmail && this.credentials.privateKey) ||
       process.env.GSC_ACCESS_TOKEN ||
       process.env.GOOGLE_APPLICATION_CREDENTIALS)
    );
  }

  getSetupInstructions(): string {
    return 'Google Search Console integration requires: (1) Verified GSC Property identifier (e.g. sc-domain:yourdomain.com), and (2) Authorized OAuth credentials or Service Account with "Search Console View" permissions (https://www.googleapis.com/auth/webmasters.readonly).';
  }

  /**
   * Resolves a valid Bearer token from OAuth refresh or provided accessToken.
   */
  private async getAccessToken(): Promise<string | null> {
    if (this.credentials.accessToken) {
      return this.credentials.accessToken;
    }

    if (process.env.GSC_ACCESS_TOKEN) {
      return process.env.GSC_ACCESS_TOKEN;
    }

    // Refresh token exchange if clientId and clientSecret are provided
    if (this.credentials.refreshToken && this.credentials.clientId && this.credentials.clientSecret) {
      try {
        const tokenRes = await safeFetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.credentials.clientId,
            client_secret: this.credentials.clientSecret,
            refresh_token: this.credentials.refreshToken,
            grant_type: 'refresh_token',
          }).toString(),
          timeoutMs: 8000,
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          return tokenData.access_token || null;
        }
      } catch (err) {
        console.error('Failed to refresh Google OAuth token:', err);
      }
    }

    return null;
  }

  /**
   * Verifies that Google Search Console credentials are valid and can query the site.
   */
  async verifyConnection(): Promise<{ valid: boolean; message?: string; error?: string }> {
    if (!this.propertyId) {
      return { valid: false, error: 'Missing GSC Property ID.' };
    }

    const token = await this.getAccessToken();
    if (!token) {
      return {
        valid: false,
        error: `Could not obtain Google OAuth access token. ${this.getSetupInstructions()}`,
      };
    }

    try {
      const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.propertyId)}`;
      const res = await safeFetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        timeoutMs: 8000,
      });

      if (res.status === 401) {
        return { valid: false, error: 'Google OAuth token expired or unauthorized. Please re-authenticate.' };
      }

      if (res.status === 403) {
        return {
          valid: false,
          error: `Forbidden (HTTP 403): The authenticated Google account does not have read permissions for property "${this.propertyId}".`,
        };
      }

      if (res.status === 404) {
        return {
          valid: false,
          error: `Property "${this.propertyId}" was not found in your Google Search Console account.`,
        };
      }

      if (!res.ok) {
        return { valid: false, error: `Google API responded with HTTP ${res.status}` };
      }

      return {
        valid: true,
        message: `Successfully verified access to Google Search Console property: ${this.propertyId}`,
      };
    } catch (err: any) {
      return { valid: false, error: `Connection verification failed: ${err.message}` };
    }
  }

  /**
   * Queries actual search performance rows from Google Search Console API.
   */
  async fetchSearchAnalytics(
    startDate: string,
    endDate: string,
    rowLimit: number = 25
  ): Promise<{ success: boolean; rows: GscQueryRow[]; error?: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { success: false, rows: [], error: 'Google Search Console access token unavailable.' };
    }

    try {
      const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.propertyId)}/searchAnalytics/query`;
      const res = await safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query', 'page'],
          rowLimit,
        }),
        timeoutMs: 12000,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          rows: [],
          error: errJson.error?.message || `GSC searchAnalytics query failed with HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const rawRows = data.rows || [];

      const parsedRows: GscQueryRow[] = rawRows.map((r: any) => ({
        query: r.keys?.[0] || 'unknown',
        page: r.keys?.[1] || this.propertyId,
        clicks: Math.round(r.clicks || 0),
        impressions: Math.round(r.impressions || 0),
        ctr: Number(r.ctr || 0),
        position: Number((r.position || 0).toFixed(1)),
      }));

      return { success: true, rows: parsedRows };
    } catch (err: any) {
      return { success: false, rows: [], error: err.message };
    }
  }
}
