import { safeFetch } from '@/lib/security/ssrf';

export interface SerpRankResult {
  keyword: string;
  rank: number | null;
  searchVolume: number | null;
  cpc: number | null;
  difficulty: number | null;
  provider: string;
  lastSyncedAt: string;
}

export class SerpProviderAdapter {
  private provider: 'dataforseo' | 'serpapi';
  private apiKey: string;
  private apiLogin?: string; // DataForSEO uses login + password

  constructor(provider: 'dataforseo' | 'serpapi', apiKey: string, apiLogin?: string) {
    this.provider = provider;
    this.apiKey = apiKey?.trim() || '';
    this.apiLogin = apiLogin?.trim();
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && (this.provider === 'serpapi' || this.apiLogin));
  }

  getSetupInstructions(): string {
    if (this.provider === 'dataforseo') {
      return 'DataForSEO integration requires API Login (email) and API Password / Key in workspace settings or DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD environment variables.';
    }
    return 'SerpApi integration requires API Key in workspace settings or SERPAPI_API_KEY environment variable.';
  }

  async verifyCredentials(): Promise<{ valid: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { valid: false, error: this.getSetupInstructions() };
    }

    try {
      if (this.provider === 'serpapi') {
        const res = await safeFetch(`https://serpapi.com/account?api_key=${encodeURIComponent(this.apiKey)}`, {
          timeoutMs: 6000,
        });
        if (!res.ok) {
          return { valid: false, error: `SerpApi key verification failed (HTTP ${res.status}).` };
        }
        return { valid: true };
      } else {
        // DataForSEO user account check
        const creds = Buffer.from(`${this.apiLogin}:${this.apiKey}`).toString('base64');
        const res = await safeFetch('https://api.dataforseo.com/v3/user', {
          headers: { 'Authorization': `Basic ${creds}` },
          timeoutMs: 6000,
        });
        if (!res.ok) {
          return { valid: false, error: `DataForSEO verification failed (HTTP ${res.status}).` };
        }
        return { valid: true };
      }
    } catch (err: any) {
      return { valid: false, error: err.message || 'Provider connection failed' };
    }
  }

  async fetchKeywordLiveRank(keyword: string, targetDomain: string): Promise<SerpRankResult | null> {
    if (!this.isConfigured()) return null;

    try {
      if (this.provider === 'serpapi') {
        const endpoint = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(keyword)}&api_key=${encodeURIComponent(this.apiKey)}&num=30`;
        const res = await safeFetch(endpoint, { timeoutMs: 10000 });
        if (!res.ok) return null;

        const data = await res.json();
        const organicResults = data.organic_results || [];

        let foundRank: number | null = null;
        for (const item of organicResults) {
          const link = item.link || '';
          if (link.toLowerCase().includes(targetDomain.toLowerCase())) {
            foundRank = item.position || null;
            break;
          }
        }

        return {
          keyword,
          rank: foundRank,
          searchVolume: data.search_information?.total_results ? null : null,
          cpc: null,
          difficulty: null,
          provider: 'SerpApi (Live Google SERP)',
          lastSyncedAt: new Date().toISOString(),
        };
      } else {
        // DataForSEO Live Advanced
        const creds = Buffer.from(`${this.apiLogin}:${this.apiKey}`).toString('base64');
        const res = await safeFetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${creds}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            {
              keyword,
              language_code: 'en',
              location_code: 2840, // United States
              depth: 50,
            },
          ]),
          timeoutMs: 12000,
        });

        if (!res.ok) return null;
        const data = await res.json();
        const items = data.tasks?.[0]?.result?.[0]?.items || [];

        let foundRank: number | null = null;
        for (const item of items) {
          if (item.type === 'organic' && (item.domain || item.url || '').toLowerCase().includes(targetDomain.toLowerCase())) {
            foundRank = item.rank_group || item.rank_absolute || null;
            break;
          }
        }

        return {
          keyword,
          rank: foundRank,
          searchVolume: null,
          cpc: null,
          difficulty: null,
          provider: 'DataForSEO (Live Google SERP)',
          lastSyncedAt: new Date().toISOString(),
        };
      }
    } catch {
      return null;
    }
  }
}
