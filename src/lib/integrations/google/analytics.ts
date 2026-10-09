import { safeFetch } from '@/lib/security/ssrf';

export interface Ga4Credentials {
  propertyId: string; // e.g. "123456789"
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface Ga4MetricRow {
  date: string;
  sessions: number;
  organicSessions: number;
  conversions: number;
  bounceRate: number;
}

export class GoogleAnalytics4Client {
  private propertyId: string;
  private credentials: Ga4Credentials;

  constructor(credentials: Ga4Credentials) {
    this.propertyId = credentials.propertyId?.trim() || '';
    this.credentials = credentials;
  }

  isConfigured(): boolean {
    return Boolean(
      this.propertyId &&
      (this.credentials.accessToken ||
       this.credentials.refreshToken ||
       process.env.GA4_ACCESS_TOKEN)
    );
  }

  getSetupInstructions(): string {
    return 'Google Analytics 4 integration requires: (1) Numeric GA4 Property ID (e.g. 348291024), and (2) OAuth access token or Service Account with "Google Analytics Viewer" permissions (https://www.googleapis.com/auth/analytics.readonly).';
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.credentials.accessToken) return this.credentials.accessToken;
    if (process.env.GA4_ACCESS_TOKEN) return process.env.GA4_ACCESS_TOKEN;

    const clientId = this.credentials.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = this.credentials.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = this.credentials.refreshToken || process.env.GOOGLE_REFRESH_TOKEN;

    if (refreshToken && clientId && clientSecret) {
      try {
        const tokenRes = await safeFetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }).toString(),
          timeoutMs: 8000,
        });

        if (tokenRes.ok) {
          const data = await tokenRes.json();
          return data.access_token || null;
        }
      } catch (err) {
        console.error('Failed to refresh GA4 OAuth token:', err);
      }
    }

    return null;
  }

  async verifyConnection(): Promise<{ valid: boolean; message?: string; error?: string }> {
    if (!this.propertyId) {
      return { valid: false, error: 'Missing GA4 Property ID.' };
    }

    const token = await this.getAccessToken();
    if (!token) {
      return { valid: false, error: `Could not obtain Google OAuth access token. ${this.getSetupInstructions()}` };
    }

    try {
      const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`;
      const res = await safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          metrics: [{ name: 'sessions' }],
          limit: 1,
        }),
        timeoutMs: 8000,
      });

      if (res.status === 401) {
        return { valid: false, error: 'GA4 OAuth credentials unauthorized or expired.' };
      }

      if (res.status === 403) {
        return {
          valid: false,
          error: `Forbidden (HTTP 403): Account does not have view access to GA4 property "${this.propertyId}".`,
        };
      }

      if (res.status === 404) {
        return { valid: false, error: `GA4 Property "${this.propertyId}" was not found.` };
      }

      if (!res.ok) {
        return { valid: false, error: `GA4 API responded with HTTP ${res.status}` };
      }

      return {
        valid: true,
        message: `Successfully connected and verified access to GA4 property: ${this.propertyId}`,
      };
    } catch (err: any) {
      return { valid: false, error: `GA4 verification failed: ${err.message}` };
    }
  }

  async fetchOrganicReport(
    startDate: string = '30daysAgo',
    endDate: string = 'today'
  ): Promise<{ success: boolean; rows: Ga4MetricRow[]; error?: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { success: false, rows: [], error: 'GA4 access token unavailable' };
    }

    try {
      const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`;
      const res = await safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'sessions' },
            { name: 'conversions' },
            { name: 'bounceRate' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'sessionMedium',
              stringFilter: { matchType: 'EXACT', value: 'organic' },
            },
          },
          orderBys: [{ dimension: { dimensionName: 'date' }, desc: true }],
          limit: 30,
        }),
        timeoutMs: 12000,
      });

      if (!res.ok) {
        return { success: false, rows: [], error: `GA4 query returned HTTP ${res.status}` };
      }

      const json = await res.json();
      const rawRows = json.rows || [];

      const rows: Ga4MetricRow[] = rawRows.map((r: any) => {
        const d = r.dimensionValues?.[0]?.value || '';
        const formattedDate = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
        const sessions = parseInt(r.metricValues?.[0]?.value || '0', 10);
        const conversions = parseInt(r.metricValues?.[1]?.value || '0', 10);
        const bounceRate = parseFloat(r.metricValues?.[2]?.value || '0');

        return {
          date: formattedDate,
          sessions,
          organicSessions: sessions,
          conversions,
          bounceRate,
        };
      });

      return { success: true, rows };
    } catch (err: any) {
      return { success: false, rows: [], error: err.message };
    }
  }
}
