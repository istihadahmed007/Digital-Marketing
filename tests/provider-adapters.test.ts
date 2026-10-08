import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'dns';
import { ResendEmailProvider, isValidEmail } from '../src/lib/integrations/email/resend';
import { MauticClient } from '../src/lib/integrations/mautic/client';
import { GoogleSearchConsoleClient } from '../src/lib/integrations/google/search-console';
import { GoogleAnalytics4Client } from '../src/lib/integrations/google/analytics';
import { SerpProviderAdapter } from '../src/lib/integrations/seo/serp';
import { AiClient } from '../src/lib/integrations/ai/client';
import { validateSafePublicUrl, isUnsafeIp } from '../src/lib/security/ssrf';

describe('External Provider Adapters & Resilience', () => {
  describe('Resend Email Provider Adapter', () => {
    it('disables sending and returns clear setup instructions when credentials are missing', async () => {
      const provider = new ResendEmailProvider('', '');
      expect(provider.isConfigured()).toBe(false);

      const result = await provider.sendCampaignBatch({
        workspaceId: 'ws-test',
        campaignId: 'cmp-test',
        subject: 'Test Subject',
        htmlContent: '<p>Test</p>',
        recipients: [{ contactId: 'c1', email: 'user@example.com' }],
      });

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.error).toContain('Resend email infrastructure is not configured');
      expect(result.error).toContain('RESEND_API_KEY');
    });

    it('validates email syntax strictly', () => {
      expect(isValidEmail('valid@example.com')).toBe(true);
      expect(isValidEmail('firstname.lastname@company.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('missing-domain@')).toBe(false);
      expect(isValidEmail('@missing-user.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });

    it('rejects invalid recipient emails without attempting provider HTTP calls', async () => {
      const provider = new ResendEmailProvider('re_test_1234567890');
      const result = await provider.sendCampaignBatch({
        workspaceId: 'ws-test',
        campaignId: 'cmp-test',
        subject: 'Test Subject',
        htmlContent: '<p>Test</p>',
        recipients: [{ contactId: 'c1', email: 'not-an-email' }],
      });

      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.results[0].error).toContain('Invalid email address syntax');
    });

    it('handles provider rate limits (HTTP 429) gracefully with descriptive error', async () => {
      const provider = new ResendEmailProvider('re_test_key_123');

      // Mock fetch returning 429
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Rate limit exceeded' }),
      } as any);

      try {
        const result = await provider.sendCampaignBatch({
          workspaceId: 'ws-test',
          campaignId: 'cmp-test',
          subject: 'Rate Limit Test',
          htmlContent: '<p>Content</p>',
          recipients: [{ contactId: 'c1', email: 'test@example.com' }],
        });

        expect(result.sentCount).toBe(0);
        expect(result.failedCount).toBe(1);
        expect(result.results[0].error).toContain('rate limit exceeded (HTTP 429)');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('handles provider non-2xx errors (HTTP 500) and reports failure', async () => {
      const provider = new ResendEmailProvider('re_test_key_123');

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Resend service temporary outage' }),
      } as any);

      try {
        const result = await provider.sendCampaignBatch({
          workspaceId: 'ws-test',
          campaignId: 'cmp-test',
          subject: 'Server Error Test',
          htmlContent: '<p>Content</p>',
          recipients: [{ contactId: 'c1', email: 'test@example.com' }],
        });

        expect(result.sentCount).toBe(0);
        expect(result.failedCount).toBe(1);
        expect(result.results[0].error).toContain('Resend service temporary outage');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('handles successful email send and returns message ID', async () => {
      const provider = new ResendEmailProvider('re_test_key_123');

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 'msg_resend_987654321' }),
      } as any);

      try {
        const result = await provider.sendCampaignBatch({
          workspaceId: 'ws-test',
          campaignId: 'cmp-test',
          subject: 'Success Test',
          htmlContent: '<p>Content</p>',
          recipients: [{ contactId: 'c1', email: 'customer@example.com' }],
        });

        expect(result.success).toBe(true);
        expect(result.sentCount).toBe(1);
        expect(result.failedCount).toBe(0);
        expect(result.results[0].messageId).toBe('msg_resend_987654321');
        expect(result.results[0].status).toBe('sent');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Mautic REST API Client', () => {
    it('returns setup instructions when Mautic instance URL or credentials are unset', async () => {
      const client = new MauticClient({ baseUrl: '' });
      expect(client.isConfigured()).toBe(false);

      const result = await client.fetchContactsPage(0, 10);
      expect(result.contacts.length).toBe(0);
      expect(result.error).toContain('Mautic integration is not configured');
    });

    it('handles 401/403 authentication failures truthfully without reporting success', async () => {
      const client = new MauticClient({
        baseUrl: 'https://mautic.example.com',
        publicKey: 'invalid_user',
        secretKey: 'invalid_pass',
      });

      const dnsSpy = vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({ error: { message: 'Unauthorized' } }),
      } as any);

      try {
        const result = await client.fetchContactsPage(0, 10);
        expect(result.contacts.length).toBe(0);
        expect(result.error).toContain('Mautic authentication failed (HTTP 401)');
      } finally {
        global.fetch = originalFetch;
        dnsSpy.mockRestore();
      }
    });

    it('correctly parses paginated contact payload from Mautic REST API', async () => {
      const client = new MauticClient({
        baseUrl: 'https://mautic.example.com',
        accessToken: 'valid_bearer_token',
      });

      const dnsSpy = vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          total: 2,
          contacts: {
            '101': {
              id: 101,
              fields: {
                core: {
                  email: { value: 'sarah@skynet.com' },
                  firstname: { value: 'Sarah' },
                  lastname: { value: 'Connor' },
                },
              },
            },
            '102': {
              id: 102,
              fields: {
                core: {
                  email: { value: 'john@example.com' },
                  firstname: { value: 'John' },
                  lastname: { value: 'Doe' },
                },
              },
            },
          },
        }),
      } as any);

      try {
        const result = await client.fetchContactsPage(0, 10);
        expect(result.total).toBe(2);
        expect(result.contacts.length).toBe(2);
        expect(result.error).toBeUndefined();
      } finally {
        global.fetch = originalFetch;
        dnsSpy.mockRestore();
      }
    });
  });

  describe('SSRF Protection Guard', () => {
    it('detects and blocks loopback and private IPv4 ranges', () => {
      expect(isUnsafeIp('127.0.0.1')).toBe(true);
      expect(isUnsafeIp('127.0.0.2')).toBe(true);
      expect(isUnsafeIp('10.0.0.1')).toBe(true);
      expect(isUnsafeIp('10.255.255.255')).toBe(true);
      expect(isUnsafeIp('172.16.0.1')).toBe(true);
      expect(isUnsafeIp('172.31.255.255')).toBe(true);
      expect(isUnsafeIp('192.168.1.1')).toBe(true);
      expect(isUnsafeIp('169.254.169.254')).toBe(true); // AWS/GCP/Azure metadata IP
      expect(isUnsafeIp('0.0.0.0')).toBe(true);
    });

    it('detects and blocks IPv6 loopback and link-local ranges', () => {
      expect(isUnsafeIp('::1')).toBe(true);
      expect(isUnsafeIp('fe80::1')).toBe(true);
      expect(isUnsafeIp('fc00::1')).toBe(true);
    });

    it('permits public routable IP addresses', () => {
      expect(isUnsafeIp('8.8.8.8')).toBe(false);
      expect(isUnsafeIp('1.1.1.1')).toBe(false);
      expect(isUnsafeIp('142.250.190.46')).toBe(false); // google.com
    });

    it('blocks localhost hostname directly in URL validation', async () => {
      const res = await validateSafePublicUrl('http://localhost:3000/api/hook');
      expect(res.safe).toBe(false);
      expect(res.error).toContain('localhost');
    });

    it('blocks private IP literals in URL validation', async () => {
      const res = await validateSafePublicUrl('http://169.254.169.254/latest/meta-data/');
      expect(res.safe).toBe(false);
      expect(res.error).toContain('private/local IP address');
    });
  });

  describe('Google Search Console & GA4 Integration Adapters', () => {
    it('GSC verifyConnection returns false when credentials are unconfigured', async () => {
      const gsc = new GoogleSearchConsoleClient({ propertyId: 'sc-domain:example.com' });
      const verify = await gsc.verifyConnection();
      expect(verify.valid).toBe(false);
      expect(verify.error).toContain('Google OAuth access token');
    });

    it('GA4 verifyConnection returns false when credentials are unconfigured', async () => {
      const ga4 = new GoogleAnalytics4Client({ propertyId: '123456789' });
      const verify = await ga4.verifyConnection();
      expect(verify.valid).toBe(false);
      expect(verify.error).toContain('Google OAuth access token');
    });
  });

  describe('SERP Provider Adapter', () => {
    it('returns setup instructions when API keys are missing', async () => {
      const serp = new SerpProviderAdapter('serpapi', '');
      expect(serp.isConfigured()).toBe(false);

      const verify = await serp.verifyCredentials();
      expect(verify.valid).toBe(false);
      expect(verify.error).toContain('SerpApi integration requires API Key');
    });
  });

  describe('AI Assistant Provider Client', () => {
    it('returns setup instructions when AI credentials are unset', async () => {
      const ai = new AiClient('', '', '');
      expect(ai.isConfigured()).toBe(false);

      const res = await ai.generateOutreachDraft({
        contactName: 'Jordan Belfort',
        email: 'jordan@example.com',
        lifecycleStage: 'lead',
        leadStatus: 'new',
        activities: [],
        deals: [],
        objective: 'cold_outreach',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('AI Assistant is not configured');
      expect(res.error).toContain('OPENAI_API_KEY');
    });
  });
});
