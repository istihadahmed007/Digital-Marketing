import { SeoAuditPage, SeoAuditIssue } from '@/lib/types/seo';
import { safeFetch, safeReadText } from '@/lib/security/ssrf';

export interface CrawlOptions {
  maxPages?: number;
  rateLimitMs?: number;
  customUrls?: string[];
  userAgent?: string;
  allowedOrigin?: string; // Enforce origin restriction
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

export interface RobotsRule {
  path: string;
  allow: boolean;
}

/**
 * Checks if a path is allowed given a list of Allow / Disallow rules.
 * Longest matching path rule takes precedence. If same length, Allow takes precedence.
 */
export function isPathAllowedByRules(pathname: string, rules: RobotsRule[]): boolean {
  if (rules.length === 0) return true;

  let bestMatch: RobotsRule | null = null;

  for (const rule of rules) {
    // Basic prefix or wildcard match
    const rulePath = rule.path;
    if (!rulePath) continue;

    let matched = false;
    if (rulePath.includes('*') || rulePath.endsWith('$')) {
      // Regex conversion for wildcards
      try {
        const regexPattern = '^' + rulePath.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        const reg = new RegExp(regexPattern);
        matched = reg.test(pathname);
      } catch {
        matched = pathname.startsWith(rulePath);
      }
    } else {
      matched = pathname.startsWith(rulePath);
    }

    if (matched) {
      if (!bestMatch || rulePath.length > bestMatch.path.length) {
        bestMatch = rule;
      } else if (rulePath.length === bestMatch.path.length && rule.allow) {
        bestMatch = rule;
      }
    }
  }

  return bestMatch ? bestMatch.allow : true;
}

/**
 * Checks robots.txt permission for the crawler user agent.
 * Parses user-agent groups, path-specific Allow/Disallow rules, and discovers sitemaps.
 */
export async function checkRobotsTxt(
  baseUrl: string,
  userAgent: string = 'NexusMark-SEOBot'
): Promise<{ allowed: boolean; sitemapUrls: string[] }> {
  try {
    const origin = new URL(baseUrl).origin;
    const robotsUrl = `${origin}/robots.txt`;

    const res = await safeFetch(robotsUrl, {
      timeoutMs: 5000,
      headers: { 'User-Agent': `${userAgent}/1.0` },
    }).catch(() => null);

    if (!res || !res.ok) {
      return { allowed: true, sitemapUrls: [] };
    }

    const text = await safeReadText(res, 512 * 1024); // max 512KB for robots.txt
    const sitemapUrls: string[] = [];

    const lines = text.split('\n');
    const specificRules: RobotsRule[] = [];
    const globalRules: RobotsRule[] = [];

    const currentAgents: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const directive = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (directive === 'user-agent') {
        currentAgents.push(value.toLowerCase());
      } else if (directive === 'disallow' || directive === 'allow') {
        const isAllow = directive === 'allow';
        const isForSpecific = currentAgents.some((a) => a.includes(userAgent.toLowerCase()));
        const isForGlobal = currentAgents.some((a) => a === '*');

        if (isForSpecific) {
          specificRules.push({ path: value || '/', allow: isAllow });
        } else if (isForGlobal) {
          globalRules.push({ path: value || '/', allow: isAllow });
        }
      } else if (directive === 'sitemap') {
        if (value.startsWith('http')) {
          sitemapUrls.push(value);
        }
      }
    }

    const activeRules = specificRules.length > 0 ? specificRules : globalRules;
    const pathname = new URL(baseUrl).pathname || '/';
    const allowed = isPathAllowedByRules(pathname, activeRules);

    return { allowed, sitemapUrls };
  } catch {
    return { allowed: true, sitemapUrls: [] };
  }
}

/**
 * Safely fetches URLs from XML sitemap if provided and within origin.
 */
export async function parseSitemapUrls(sitemapUrl: string, origin: string, max: number = 20): Promise<string[]> {
  try {
    const res = await safeFetch(sitemapUrl, { timeoutMs: 6000 });
    if (!res.ok) return [];

    const xml = await safeReadText(res, 1024 * 1024);
    const urls: string[] = [];
    const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);

    for (const match of locMatches) {
      const loc = match[1]?.trim();
      if (loc && loc.startsWith(origin)) {
        urls.push(normalizeUrl(loc));
        if (urls.length >= max) break;
      }
    }

    return urls;
  } catch {
    return [];
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
      recommendation: `Fix broken link or configure 301 redirect to active destination.`,
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
      recommendation: 'Add a compelling meta description between 120 and 155 characters describing page value.',
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
      recommendation: 'Shorten to 155 characters or fewer to avoid search snippet clipping.',
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
      recommendation: 'Add a self-referencing canonical URL tag to prevent duplicate content indexing.',
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
      recommendation: 'Use a single H1 for page title and structure sub-topics with H2 and H3 headings.',
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
      recommendation: 'Add descriptive alt text to informative images for accessibility and image search.',
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
      recommendation: 'Remove the noindex tag if this page is intended to be indexed in search engines.',
    });
  }

  // 7. Structured Data (JSON-LD)
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
      recommendation: 'Add schema.org markup (Organization, WebSite, Article, or Product) for rich snippet eligibility.',
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
      recommendation: 'Provide comprehensive copy to satisfy user search intent.',
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
 * Main Crawler Runner with Origin Restriction, SSRF Guard, and Response Clamping.
 */
export async function runWebsiteCrawl(
  targetUrl: string,
  options?: CrawlOptions
): Promise<CrawlResult> {
  const normalizedRoot = normalizeUrl(targetUrl);
  const targetOrigin = options?.allowedOrigin || new URL(normalizedRoot).origin;

  // Clamp page count between 1 and 50
  const maxPages = Math.min(50, Math.max(1, options?.maxPages || 15));
  const rateLimitMs = Math.min(2000, Math.max(100, options?.rateLimitMs || 300));

  // Check robots.txt permissions
  const { allowed, sitemapUrls } = await checkRobotsTxt(normalizedRoot);
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
          evidence: 'Robots.txt Disallow rule matched crawler user-agent for this origin.',
          recommendation: 'Update robots.txt permissions to permit audit crawlers.',
        },
      ],
      healthScore: 0,
    };
  }

  // Populate initial crawl queue (strictly restricted to target origin)
  const queue: string[] = [];

  if (options?.customUrls && options.customUrls.length > 0) {
    for (const u of options.customUrls) {
      const norm = normalizeUrl(u);
      if (norm.startsWith(targetOrigin)) {
        queue.push(norm);
      }
    }
  }

  if (queue.length === 0) {
    queue.push(normalizedRoot);
  }

  // Also include discovered sitemap URLs if queue is small
  if (sitemapUrls.length > 0 && queue.length < maxPages) {
    for (const sm of sitemapUrls) {
      const sitemapLinks = await parseSitemapUrls(sm, targetOrigin, maxPages - queue.length);
      for (const sl of sitemapLinks) {
        if (!queue.includes(sl)) queue.push(sl);
      }
    }
  }

  const visited = new Set<string>();
  const pages: Omit<SeoAuditPage, 'id' | 'audit_id' | 'created_at'>[] = [];
  const allIssues: Omit<SeoAuditIssue, 'id' | 'audit_id' | 'created_at'>[] = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift()!;
    if (visited.has(currentUrl)) continue;

    // Strict origin boundary enforcement
    if (!currentUrl.startsWith(targetOrigin)) {
      continue;
    }

    visited.add(currentUrl);
    const startTime = Date.now();

    try {
      const res = await safeFetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NexusMark-SEOBot/1.0; +https://nexusmark.local/bot)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeoutMs: 8000,
        maxResponseBytes: 2 * 1024 * 1024, // 2MB clamp
      });

      const loadTimeMs = Date.now() - startTime;
      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('text/html')) {
        continue; // Skip non-HTML files (images, PDFs, binaries)
      }

      const html = await safeReadText(res, 2 * 1024 * 1024);
      const { pageData, pageIssues, discoveredLinks } = parseHtmlPage(
        currentUrl,
        html,
        res.status,
        loadTimeMs
      );

      pages.push(pageData);
      allIssues.push(...pageIssues);

      // Add newly discovered internal links matching origin
      for (const link of discoveredLinks) {
        if (
          link.startsWith(targetOrigin) &&
          !visited.has(link) &&
          !queue.includes(link) &&
          queue.length + visited.size < maxPages * 2
        ) {
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
        evidence: err.message || 'Fetch failed',
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

    const penalty = criticalCount * 12 + warningCount * 4 + noticeCount * 1;
    healthScore = Math.max(10, Math.min(100, Math.round(100 - penalty / totalPages)));
  }

  return {
    pages,
    issues: allIssues,
    healthScore,
  };
}
