import { SeoAuditPage, SeoAuditIssue } from '@/lib/types/seo';

export interface CrawlOptions {
  maxPages?: number;
  rateLimitMs?: number;
  customUrls?: string[];
  userAgent?: string;
}

export interface CrawlResult {
  pages: Omit<SeoAuditPage, 'id' | 'audit_id' | 'created_at'>[];
  issues: Omit<SeoAuditIssue, 'id' | 'audit_id' | 'created_at'>[];
  healthScore: number;
}

/**
 * Normalizes URL domain and protocol
 */
export function normalizeUrl(inputUrl: string): string {
  let url = inputUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

/**
 * Checks robots.txt permission for the crawler user agent
 */
export async function checkRobotsTxt(
  baseUrl: string,
  userAgent: string = 'NexusMark-SEOBot'
): Promise<{ allowed: boolean; sitemapUrl: string | null }> {
  try {
    const origin = new URL(baseUrl).origin;
    const robotsUrl = `${origin}/robots.txt`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': `${userAgent}/1.0` },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { allowed: true, sitemapUrl: null };
    }

    const text = await res.text();
    let sitemapUrl: string | null = null;
    let isDisallowed = false;

    const lines = text.split('\n');
    let appliesToBot = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.split(':')[1]?.trim() || '';
        appliesToBot = agent === '*' || agent.toLowerCase().includes(userAgent.toLowerCase());
      } else if (line.toLowerCase().startsWith('disallow:') && appliesToBot) {
        const path = line.split(':')[1]?.trim() || '';
        if (path === '/') {
          isDisallowed = true;
        }
      } else if (line.toLowerCase().startsWith('sitemap:')) {
        sitemapUrl = line.substring(line.indexOf(':') + 1).trim();
      }
    }

    return { allowed: !isDisallowed, sitemapUrl };
  } catch {
    return { allowed: true, sitemapUrl: null };
  }
}

/**
 * Parses HTML to extract on-page SEO telemetry
 */
export function parseHtmlPage(
  url: string,
  html: string,
  statusCode: number,
  loadTimeMs: number
): {
  pageData: Omit<SeoAuditPage, 'id' | 'audit_id' | 'created_at'>;
  pageIssues: Omit<SeoAuditIssue, 'id' | 'audit_id' | 'created_at'>[];
  discoveredLinks: string[];
} {
  const issues: Omit<SeoAuditIssue, 'id' | 'audit_id' | 'created_at'>[] = [];
  const discoveredLinks: string[] = [];

  // Check HTTP status code
  if (statusCode >= 400) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'broken_http_status',
      severity: 'critical',
      title: `Page returned HTTP error status (${statusCode})`,
      evidence: `HTTP Status: ${statusCode}`,
      recommendation: `Fix the broken link or configure a 301 redirect to an active URL.`,
    });
  }

  // 1. Title Tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const titleLength = title ? title.length : 0;

  if (!title) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'missing_title',
      severity: 'critical',
      title: 'Missing <title> tag',
      evidence: 'No <title> tag was found in the HTML <head>.',
      recommendation: 'Add a descriptive title tag between 50 and 60 characters with your primary keyword.',
    });
  } else if (titleLength < 30) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'title_too_short',
      severity: 'warning',
      title: `Title tag is too short (${titleLength} chars)`,
      evidence: `<title>${title}</title>`,
      recommendation: 'Expand the title to 45-60 characters to optimize search snippet visibility.',
    });
  } else if (titleLength > 65) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'title_too_long',
      severity: 'warning',
      title: `Title tag exceeds recommended length (${titleLength} chars)`,
      evidence: `<title>${title.slice(0, 70)}...</title>`,
      recommendation: 'Shorten the title to under 60 characters to prevent truncation in search result pages.',
    });
  }

  // 2. Meta Description
  const descMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const metaDescription = descMatch ? descMatch[1].trim() : null;
  const metaDescriptionLength = metaDescription ? metaDescription.length : 0;

  if (!metaDescription) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'missing_meta_description',
      severity: 'warning',
      title: 'Missing meta description',
      evidence: 'No <meta name="description"> tag detected in HTML head.',
      recommendation: 'Add a compelling meta description between 120 and 155 characters that describes page value.',
    });
  } else if (metaDescriptionLength < 70) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'meta_description_too_short',
      severity: 'notice',
      title: `Meta description is short (${metaDescriptionLength} chars)`,
      evidence: metaDescription,
      recommendation: 'Expand to 120-155 characters to increase CTR in organic search listings.',
    });
  } else if (metaDescriptionLength > 165) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'meta_description_too_long',
      severity: 'warning',
      title: `Meta description may be truncated (${metaDescriptionLength} chars)`,
      evidence: `${metaDescription.slice(0, 160)}...`,
      recommendation: 'Shorten to 155 characters or fewer to avoid search engine snippet clipping.',
    });
  }

  // 3. Canonical URL
  const canonicalMatch = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : null;

  if (!canonicalUrl) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'missing_canonical',
      severity: 'warning',
      title: 'Missing canonical URL link',
      evidence: 'No <link rel="canonical"> specified.',
      recommendation: 'Add a self-referencing canonical URL tag to prevent duplicate content indexing issues.',
    });
  }

  // 4. Headings (H1 & H2)
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const firstH1 = h1Matches[0];
  const h1Text = firstH1 ? firstH1.replace(/<[^>]*>/g, '').trim() : null;
  const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const h2Count = h2Matches.length;

  if (h1Matches.length === 0) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'missing_h1',
      severity: 'warning',
      title: 'Missing <h1> heading tag',
      evidence: 'No <h1> heading found on the page.',
      recommendation: 'Add exactly one descriptive <h1> tag reflecting the main topic of the page.',
    });
  } else if (h1Matches.length > 1) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'multiple_h1',
      severity: 'notice',
      title: `Multiple <h1> tags found (${h1Matches.length})`,
      evidence: `Found ${h1Matches.length} H1 tags in document.`,
      recommendation: 'Use a single H1 for the page title and structure sub-topics under H2 and H3 headings.',
    });
  }

  // 5. Images and Alt Attributes
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  const imagesCount = imgMatches.length;
  let imagesMissingAlt = 0;

  for (const imgTag of imgMatches) {
    const hasAlt = /alt=["'][^"']*["']/i.test(imgTag);
    if (!hasAlt) {
      imagesMissingAlt++;
    }
  }

  if (imagesMissingAlt > 0) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'missing_alt_text',
      severity: 'warning',
      title: `${imagesMissingAlt} image(s) missing alt text`,
      evidence: `${imagesMissingAlt} of ${imagesCount} images have no alt attribute.`,
      recommendation: 'Add descriptive alt text to all informative images for accessibility and image search indexing.',
    });
  }

  // 6. Robots Directives
  const robotsMatch = html.match(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const robotsDirectives = robotsMatch ? robotsMatch[1].trim() : null;

  if (robotsDirectives && robotsDirectives.toLowerCase().includes('noindex')) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'noindex_directive',
      severity: 'critical',
      title: 'Page contains "noindex" meta tag',
      evidence: `<meta name="robots" content="${robotsDirectives}">`,
      recommendation: 'Remove the noindex tag if this page is intended to be found in search engines.',
    });
  }

  // 7. Structured Data (Schema.org / JSON-LD)
  const jsonLdMatches = html.match(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const hasSchema = jsonLdMatches.length > 0;
  const structuredDataTypes: string[] = [];

  for (const scriptTag of jsonLdMatches) {
    try {
      const rawJson = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      const parsed = JSON.parse(rawJson);
      if (parsed['@type']) {
        structuredDataTypes.push(String(parsed['@type']));
      }
    } catch {
      // Ignored
    }
  }

  if (!hasSchema) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'missing_schema',
      severity: 'notice',
      title: 'No structured data (JSON-LD) detected',
      evidence: 'No application/ld+json script blocks found.',
      recommendation: 'Add schema.org markup (Organization, WebSite, Article, or Product) to be eligible for rich snippets.',
    });
  }

  // 8. Word Count
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = textContent ? textContent.split(/\s+/).length : 0;

  if (wordCount < 200 && statusCode === 200) {
    issues.push({
      page_id: null,
      url,
      issue_type: 'thin_content',
      severity: 'warning',
      title: `Thin content detected (${wordCount} words)`,
      evidence: `Body content word count: ${wordCount} words.`,
      recommendation: 'Provide comprehensive, in-depth copy to answer search intent and rank competitively.',
    });
  }

  // 9. Links Discovery
  const linkMatches = html.match(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
  let internalLinksCount = 0;
  let externalLinksCount = 0;

  try {
    const origin = new URL(url).origin;
    for (const aTag of linkMatches) {
      const hrefMatch = aTag.match(/href=["']([^"']*)["']/i);
      if (hrefMatch && hrefMatch[1]) {
        const href = hrefMatch[1].trim();
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          continue;
        }

        try {
          const resolvedUrl = new URL(href, url).href.replace(/\/+$/, '');
          if (resolvedUrl.startsWith(origin)) {
            internalLinksCount++;
            if (!discoveredLinks.includes(resolvedUrl)) {
              discoveredLinks.push(resolvedUrl);
            }
          } else {
            externalLinksCount++;
          }
        } catch {
          // Ignored
        }
      }
    }
  } catch {
    // Ignored
  }

  const pageData: Omit<SeoAuditPage, 'id' | 'audit_id' | 'created_at'> = {
    url,
    status_code: statusCode,
    title,
    title_length: titleLength,
    meta_description: metaDescription,
    meta_description_length: metaDescriptionLength,
    canonical_url: canonicalUrl,
    h1: h1Text,
    h2_count: h2Count,
    images_count: imagesCount,
    images_missing_alt: imagesMissingAlt,
    internal_links_count: internalLinksCount,
    external_links_count: externalLinksCount,
    word_count: wordCount,
    load_time_ms: loadTimeMs,
    robots_directives: robotsDirectives,
    has_schema: hasSchema,
    structured_data_types: structuredDataTypes,
  };

  return { pageData, pageIssues: issues, discoveredLinks };
}

/**
 * Main Crawler Runner
 * Crawls a website honoring robots.txt, rate limits, and page limits.
 */
export async function runWebsiteCrawl(
  targetUrl: string,
  options?: CrawlOptions
): Promise<CrawlResult> {
  const maxPages = options?.maxPages || 15;
  const rateLimitMs = options?.rateLimitMs || 300;
  const normalizedRoot = normalizeUrl(targetUrl);

  const { allowed, sitemapUrl } = await checkRobotsTxt(normalizedRoot);
  if (!allowed) {
    return {
      pages: [],
      issues: [
        {
          page_id: null,
          url: normalizedRoot,
          issue_type: 'robots_txt_blocked',
          severity: 'critical',
          title: 'Crawl blocked by site robots.txt',
          evidence: 'Disallow: / matches crawler user-agent.',
          recommendation: 'Update robots.txt permissions to permit audit crawlers.',
        },
      ],
      healthScore: 0,
    };
  }

  const queue: string[] = options?.customUrls && options.customUrls.length > 0
    ? options.customUrls.map(normalizeUrl)
    : [normalizedRoot];

  const visited = new Set<string>();
  const pages: Omit<SeoAuditPage, 'id' | 'audit_id' | 'created_at'>[] = [];
  const allIssues: Omit<SeoAuditIssue, 'id' | 'audit_id' | 'created_at'>[] = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift()!;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NexusMark-SEOBot/1.0; +https://nexusmark.local/bot)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const loadTimeMs = Date.now() - startTime;
      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('text/html')) {
        continue;
      }

      const html = await res.text();
      const { pageData, pageIssues, discoveredLinks } = parseHtmlPage(
        currentUrl,
        html,
        res.status,
        loadTimeMs
      );

      pages.push(pageData);
      allIssues.push(...pageIssues);

      // Add newly discovered internal links to the crawl queue
      for (const link of discoveredLinks) {
        if (!visited.has(link) && !queue.includes(link) && queue.length + visited.size < maxPages * 2) {
          queue.push(link);
        }
      }
    } catch (err: any) {
      const loadTimeMs = Date.now() - startTime;
      pages.push({
        url: currentUrl,
        status_code: 0,
        title: null,
        title_length: 0,
        meta_description: null,
        meta_description_length: 0,
        canonical_url: null,
        h1: null,
        h2_count: 0,
        images_count: 0,
        images_missing_alt: 0,
        internal_links_count: 0,
        external_links_count: 0,
        word_count: 0,
        load_time_ms: loadTimeMs,
        robots_directives: null,
        has_schema: false,
        structured_data_types: [],
      });

      allIssues.push({
        page_id: null,
        url: currentUrl,
        issue_type: 'network_fetch_error',
        severity: 'critical',
        title: 'Failed to connect to page',
        evidence: err.name === 'AbortError' ? 'Connection timed out after 6 seconds' : err.message,
        recommendation: 'Check server availability, DNS records, and SSL certificate validity.',
      });
    }

    // Rate-limiting delay between requests
    if (queue.length > 0 && rateLimitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
    }
  }

  // Calculate overall SEO Health Score
  const totalPages = pages.length;
  let healthScore = 100;

  if (totalPages > 0) {
    const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
    const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
    const noticeCount = allIssues.filter((i) => i.severity === 'notice').length;

    const penalty = (criticalCount * 12) + (warningCount * 4) + (noticeCount * 1);
    healthScore = Math.max(10, Math.min(100, Math.round(100 - (penalty / totalPages))));
  }

  return {
    pages,
    issues: allIssues,
    healthScore,
  };
}
