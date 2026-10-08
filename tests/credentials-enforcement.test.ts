import { describe, it, expect, vi } from 'vitest';
import dns from 'dns';
import { testWebhook } from '../src/lib/actions/integrations';
import { encryptSecret, decryptSecret, maskSecret, sanitizeConfigForClient } from '../src/lib/security/crypto';
import { isPathAllowedByRules } from '../src/lib/seo/crawler';

describe('Credentials Enforcement & Truthful Status Verification', () => {
  it('proves webhook tests reject localhost and internal network URLs', async () => {
    const localhostResult = await testWebhook('ws-default', 'http://localhost:3000/webhook');
    expect(localhostResult.success).toBe(false);
    expect(localhostResult.error).toContain('SSRF Security Error');
    expect(localhostResult.error).toContain('localhost');

    const privateIpResult = await testWebhook('ws-default', 'http://127.0.0.1:8080/hook');
    expect(privateIpResult.success).toBe(false);
    expect(privateIpResult.error).toContain('private/local IP address');

    const metadataResult = await testWebhook('ws-default', 'http://169.254.169.254/latest/meta-data');
    expect(metadataResult.success).toBe(false);
    expect(metadataResult.error).toContain('private/local IP address');
  });

  it('proves webhook tests report failure on HTTP 404 and 500 responses', async () => {
    const originalFetch = global.fetch;
    const dnsSpy = vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);

    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      } as any);

      const serverErrorResult = await testWebhook('ws-default', 'https://api.example.com/webhook');
      expect(serverErrorResult.success).toBe(false);
      expect(serverErrorResult.error).toContain('non-2xx status HTTP 500');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      } as any);

      const notFoundResult = await testWebhook('ws-default', 'https://api.example.com/missing-webhook');
      expect(notFoundResult.success).toBe(false);
      expect(notFoundResult.error).toContain('non-2xx status HTTP 404');
    } finally {
      global.fetch = originalFetch;
      dnsSpy.mockRestore();
    }
  });

  it('proves secrets are encrypted at rest and never exposed unmasked to client components', () => {
    const rawApiKey = 're_1234567890abcdef1234567890abcdef';
    const encrypted = encryptSecret(rawApiKey);

    // Ciphertext must not contain plaintext secret
    expect(encrypted).not.toContain(rawApiKey);
    expect(encrypted.split(':').length).toBe(3); // iv:tag:ciphertext

    // Decrypts accurately
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawApiKey);

    // Masking utility
    const masked = maskSecret(rawApiKey);
    expect(masked).toContain('••••••••');
    expect(masked).not.toBe(rawApiKey);

    // Sanitize config dictionary
    const rawConfig = {
      apiKey: rawApiKey,
      secretKey: 'my-super-secret-token',
      baseUrl: 'https://mautic.example.com',
      fromEmail: 'newsletter@example.com',
    };

    const clientConfig = sanitizeConfigForClient(rawConfig);
    expect(clientConfig.apiKey).toContain('••••••••');
    expect(clientConfig.secretKey).toContain('••••••••');
    expect(clientConfig.apiKey_is_set).toBe(true);
    // Non-sensitive configuration preserved
    expect(clientConfig.baseUrl).toBe('https://mautic.example.com');
    expect(clientConfig.fromEmail).toBe('newsletter@example.com');
  });

  describe('Robots.txt Path Matching & Specificity', () => {
    it('accurately resolves Allow vs Disallow rules with longest-path priority', () => {
      const rules = [
        { path: '/', allow: true },
        { path: '/admin', allow: false },
        { path: '/admin/public', allow: true },
        { path: '/private/*', allow: false },
      ];

      expect(isPathAllowedByRules('/', rules)).toBe(true);
      expect(isPathAllowedByRules('/about', rules)).toBe(true);
      expect(isPathAllowedByRules('/admin', rules)).toBe(false);
      expect(isPathAllowedByRules('/admin/dashboard', rules)).toBe(false);
      // More specific Allow rule overrides Disallow
      expect(isPathAllowedByRules('/admin/public/login', rules)).toBe(true);
      expect(isPathAllowedByRules('/private/secret.pdf', rules)).toBe(false);
    });
  });
});
