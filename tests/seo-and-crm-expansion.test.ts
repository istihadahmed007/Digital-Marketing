import { describe, it, expect } from 'vitest';
import { calculateLeadScore } from '../src/lib/crm/scoring';
import { parseHtmlPage, normalizeUrl } from '../src/lib/seo/crawler';
import { Contact, Activity, LeadScoreReason } from '../src/lib/types/crm';

describe('SEO Toolkit & CRM Expansion Suite', () => {
  describe('Rule-Based Deterministic Lead Scoring Engine', () => {
    it('accurately calculates high lead score for executive prospect with company and organic search source', () => {
      const executiveContact: Partial<Contact> = {
        first_name: 'Sarah',
        last_name: 'Connor',
        email: 'sarah@skynet-defense.com',
        phone: '+1-555-839-2019',
        job_title: 'Chief Technology Officer (CTO)',
        lifecycle_stage: 'sql',
        source: 'organic_search',
        consent_status: 'opted_in',
        company: { id: 'comp-1', name: 'Cyberdyne Systems', workspace_id: 'ws-1' } as any,
      };

      const activities = [
        { id: '1', workspace_id: 'ws-1', type: 'call', title: 'Intro call', created_at: '', user_id: 'u1' },
        { id: '2', workspace_id: 'ws-1', type: 'email', title: 'Technical review sent', created_at: '', user_id: 'u1' },
      ] as Activity[];

      const result = calculateLeadScore(executiveContact, activities);

      // Breakdown:
      // Phone: 15
      // Company: 15
      // CTO title: 25
      // SQL stage: 25
      // Organic search: 25
      // Opted in: 10
      // 1 Call: 10
      // 1 Email: 5
      // Sum = 125 -> Clamped to 100
      expect(result.score).toBe(100);
      expect(result.reasons.length).toBeGreaterThanOrEqual(7);

      const reasonsText = result.reasons.map((r) => r.reason).join('; ');
      expect(reasonsText).toContain('Direct phone number');
      expect(reasonsText).toContain('verified company');
      expect(reasonsText).toContain('C-Level / Founder decision-maker title');
      expect(reasonsText).toContain('Sales Qualified Lead');
      expect(reasonsText).toContain('Inbound organic SEO search');
      expect(reasonsText).toContain('Explicit marketing communication opt-in');
    });

    it('returns minimal score for sparse contact with no activities or title', () => {
      const sparseContact: Partial<Contact> = {
        email: 'anonymous@temp.org',
        lifecycle_stage: 'lead',
        source: 'website',
        consent_status: 'opted_out',
      };

      const result = calculateLeadScore(sparseContact, []);

      // Website source = 15 points
      expect(result.score).toBe(15);
      expect(result.reasons).toEqual([
        { reason: 'Direct website prospect conversion', points: 15 },
      ]);
    });

    it('rewards sales interaction velocity up to defined caps', () => {
      const contact: Partial<Contact> = {
        email: 'prospect@acme.com',
        source: 'referral', // 20
        consent_status: 'opted_in', // 10
      };

      // 4 calls/meetings
      const activities = [
        { id: '1', workspace_id: 'ws-1', type: 'call', title: 'Call 1', created_at: '', user_id: 'u1' },
        { id: '2', workspace_id: 'ws-1', type: 'meeting', title: 'Meeting 2', created_at: '', user_id: 'u1' },
        { id: '3', workspace_id: 'ws-1', type: 'call', title: 'Call 3', created_at: '', user_id: 'u1' },
        { id: '4', workspace_id: 'ws-1', type: 'call', title: 'Call 4', created_at: '', user_id: 'u1' },
      ] as Activity[];

      const result = calculateLeadScore(contact, activities);
      expect(result.score).toBe(20 + 10 + 30); // 60
      expect(result.reasons.some((r) => r.reason.includes('logged call/meeting interactions'))).toBe(true);
    });
  });

  describe('SEO Audit & Live HTML Crawler Engine', () => {
    it('normalizes target URLs correctly', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
      expect(normalizeUrl('http://mysite.org/')).toBe('http://mysite.org');
      expect(normalizeUrl('https://app.io/docs/')).toBe('https://app.io/docs');
    });

    it('detects critical broken HTTP status codes', () => {
      const res = parseHtmlPage('https://example.com/broken', '<html><body>404 Not Found</body></html>', 404, 320);
      expect(res.pageData.status_code).toBe(404);
      expect(res.pageIssues.some((i) => i.issue_type === 'broken_http_status' && i.severity === 'critical')).toBe(true);
    });

    it('validates optimized HTML page with zero critical issues', () => {
      const optimalHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Enterprise SaaS Marketing Platform - NexusMark CRM & SEO</title>
          <meta name="description" content="NexusMark is the all-in-one revenue platform unifying customer relationships, lead attribution, and real SEO audit intelligence for high-growth SaaS teams.">
          <link rel="canonical" href="https://nexusmark.io">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "NexusMark",
              "applicationCategory": "BusinessApplication"
            }
          </script>
        </head>
        <body>
          <h1>Complete Revenue Growth Engine</h1>
          <h2>Streamline Contact Lifecycles</h2>
          <h2>Real-Time SEO Auditing</h2>
          <img src="/logo.png" alt="NexusMark Platform Logo" />
          <a href="/pricing">View Pricing</a>
          <a href="/features">Explore Features</a>
          <p>NexusMark provides unified workspace intelligence for data-driven agencies and modern marketing teams.</p>
        </body>
        </html>
      `;

      const result = parseHtmlPage('https://nexusmark.io', optimalHtml, 200, 185);

      expect(result.pageData.status_code).toBe(200);
      expect(result.pageData.title).toBe('Enterprise SaaS Marketing Platform - NexusMark CRM & SEO');
      expect(result.pageData.title_length).toBeGreaterThan(30);
      expect(result.pageData.meta_description_length).toBeGreaterThan(100);
      expect(result.pageData.h1).toBe('Complete Revenue Growth Engine');
      expect(result.pageData.h2_count).toBe(2);
      expect(result.pageData.has_schema).toBe(true);
      expect(result.pageData.structured_data_types).toContain('SoftwareApplication');
      expect(result.pageData.images_count).toBe(1);
      expect(result.pageData.images_missing_alt).toBe(0);
      expect(result.discoveredLinks).toContain('https://nexusmark.io/pricing');
      expect(result.discoveredLinks).toContain('https://nexusmark.io/features');

      // No critical issues
      const criticalIssues = result.pageIssues.filter((i) => i.severity === 'critical');
      expect(criticalIssues.length).toBe(0);
    });

    it('identifies missing title, missing H1, unoptimized meta description, and missing alt text', () => {
      const deficientHtml = `
        <html>
        <head></head>
        <body>
          <img src="/banner.jpg" />
          <p>Unstructured page with no headers.</p>
        </body>
        </html>
      `;

      const result = parseHtmlPage('https://poorly-optimized.com', deficientHtml, 200, 450);

      const issueTypes = result.pageIssues.map((i) => i.issue_type);
      expect(issueTypes).toContain('missing_title');
      expect(issueTypes).toContain('missing_meta_description');
      expect(issueTypes).toContain('missing_canonical');
      expect(issueTypes).toContain('missing_h1');
      expect(issueTypes).toContain('missing_alt_text');
      expect(result.pageData.images_missing_alt).toBe(1);
      expect(result.pageData.has_schema).toBe(false);
    });
  });

  describe('Local SEO & NAP Consistency Engine', () => {
    it('verifies exact match for business name, phone digits, and postal code in HTML', () => {
      const location = {
        business_name: 'Nexus Growth Agency',
        phone: '(555) 789-1024',
        address_city: 'Austin',
        address_postal_code: '78701',
      };

      const html = `
        <footer>
          <p>Nexus Growth Agency</p>
          <p>100 Congress Ave, Austin, TX 78701</p>
          <a href="tel:5557891024">+1 (555) 789-1024</a>
        </footer>
      `;

      const hasName = html.toLowerCase().includes(location.business_name.toLowerCase());
      const cleanPhone = location.phone.replace(/\D/g, '');
      const hasPhone = html.replace(/\D/g, '').includes(cleanPhone);
      const hasCityZip = html.toLowerCase().includes(location.address_city.toLowerCase()) || html.includes(location.address_postal_code);

      expect(hasName).toBe(true);
      expect(hasPhone).toBe(true);
      expect(hasCityZip).toBe(true);
    });

    it('flags discrepancies when phone digits or business name are absent', () => {
      const location = {
        business_name: 'Apex Marketing Corp',
        phone: '(212) 555-9999',
        address_city: 'New York',
        address_postal_code: '10001',
      };

      const html = `
        <footer>
          <p>Some Generic Footer</p>
          <p>Contact: info@example.com</p>
        </footer>
      `;

      const discrepancies: string[] = [];
      if (!html.toLowerCase().includes(location.business_name.toLowerCase())) {
        discrepancies.push('Business name missing');
      }
      const cleanPhone = location.phone.replace(/\D/g, '');
      if (!html.replace(/\D/g, '').includes(cleanPhone)) {
        discrepancies.push('Phone number missing');
      }

      expect(discrepancies.length).toBe(2);
      expect(discrepancies).toContain('Business name missing');
      expect(discrepancies).toContain('Phone number missing');
    });
  });

  describe('Marketing Attribution & UTM Extraction', () => {
    it('correctly parses and isolates UTM campaign parameters from inbound URLs', () => {
      const url = 'https://app.nexusmark.io/forms/demo-request?utm_source=google_ads&utm_medium=cpc&utm_campaign=saas_q4_growth&utm_term=enterprise_crm&utm_content=hero_banner';

      const parsed = new URL(url);
      const utm = {
        utm_source: parsed.searchParams.get('utm_source'),
        utm_medium: parsed.searchParams.get('utm_medium'),
        utm_campaign: parsed.searchParams.get('utm_campaign'),
        utm_term: parsed.searchParams.get('utm_term'),
        utm_content: parsed.searchParams.get('utm_content'),
      };

      expect(utm.utm_source).toBe('google_ads');
      expect(utm.utm_medium).toBe('cpc');
      expect(utm.utm_campaign).toBe('saas_q4_growth');
      expect(utm.utm_term).toBe('enterprise_crm');
      expect(utm.utm_content).toBe('hero_banner');
    });
  });

  describe('Competitor Architectural Comparison Engine', () => {
    it('accurately computes differential metrics between two parsed pages', () => {
      const myPageMetrics = {
        word_count: 1450,
        load_time_ms: 220,
        h2_count: 8,
        internal_links_count: 14,
        has_schema: true,
      };

      const competitorMetrics = {
        word_count: 980,
        load_time_ms: 380,
        h2_count: 4,
        internal_links_count: 7,
        has_schema: false,
      };

      const wordCountDiff = myPageMetrics.word_count - competitorMetrics.word_count;
      const speedDiff = myPageMetrics.load_time_ms - competitorMetrics.load_time_ms;
      const h2Diff = myPageMetrics.h2_count - competitorMetrics.h2_count;

      expect(wordCountDiff).toBe(470); // My page has +470 words
      expect(speedDiff).toBe(-160);    // My page is 160ms faster
      expect(h2Diff).toBe(4);          // My page has 4 more H2 headings
      expect(myPageMetrics.has_schema && !competitorMetrics.has_schema).toBe(true);
    });
  });
});
