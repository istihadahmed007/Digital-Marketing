'use server';

import { createClient } from '@/lib/supabase/server';
import {
  SeoWebsite,
  SeoAudit,
  SeoAuditPage,
  SeoAuditIssue,
  SeoKeyword,
  SeoContentBrief,
  SeoLocalLocation,
  SeoIntegration,
  SeoGscData,
  SeoGa4Data,
  SeoIntegrationProvider,
  CompetitorComparisonResult,
} from '@/lib/types/seo';
import { runWebsiteCrawl, normalizeUrl, parseHtmlPage } from '@/lib/seo/crawler';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';

// ==========================================
// 1. SEO Websites & Ownership Verification
// ==========================================

export async function getSeoWebsites(workspaceId: string): Promise<SeoWebsite[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('seo_websites')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as SeoWebsite[];
}

export async function addSeoWebsite(
  workspaceId: string,
  domain: string,
  sitemapUrl?: string
): Promise<{ success: boolean; website?: SeoWebsite; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!cleanDomain) return { success: false, error: 'Valid website domain is required' };

  // Generate unique verification token
  const verificationToken = `nexusmark-verify-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

  const { data, error } = await supabase
    .from('seo_websites')
    .insert({
      workspace_id: workspaceId,
      domain: cleanDomain,
      verification_token: verificationToken,
      is_verified: false,
      sitemap_url: sitemapUrl?.trim() || null,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to add website' };
  }

  revalidatePath('/seo/audits');
  return { success: true, website: data as SeoWebsite };
}

export async function verifySeoWebsite(
  workspaceId: string,
  websiteId: string
): Promise<{ success: boolean; isVerified: boolean; message?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, isVerified: false, error: 'Database unconfigured' };

  const { data: site, error: fetchErr } = await supabase
    .from('seo_websites')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', websiteId)
    .single();

  if (fetchErr || !site) return { success: false, isVerified: false, error: 'Website record not found' };

  // Check live HTML meta tag or verification token
  const targetUrl = `https://${site.domain}`;
  let tokenFound = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NexusMark-SEOBot/1.0' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      tokenFound = html.includes(site.verification_token) || html.includes(`name="nexusmark-site-verification"`);
    }
  } catch {
    tokenFound = false;
  }

  // Fallback: If development/staging environment or token detected
  const isVerified = tokenFound || process.env.NODE_ENV === 'development';

  if (isVerified) {
    await supabase
      .from('seo_websites')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId);

    revalidatePath('/seo/audits');
    return {
      success: true,
      isVerified: true,
      message: tokenFound
        ? 'Website ownership confirmed via verification tag.'
        : 'Website verified for workspace audit access.',
    };
  }

  return {
    success: false,
    isVerified: false,
    error: `Verification tag <meta name="nexusmark-site-verification" content="${site.verification_token}"> was not found on https://${site.domain}.`,
  };
}

export async function deleteSeoWebsite(
  workspaceId: string,
  websiteId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { error } = await supabase
    .from('seo_websites')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', websiteId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/seo/audits');
  return { success: true };
}

// ==========================================
// 2. SEO Audits & Real Web Crawling
// ==========================================

export async function getSeoAudits(workspaceId: string, websiteId?: string): Promise<SeoAudit[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('seo_audits')
    .select('*, website:seo_websites(domain)')
    .eq('workspace_id', workspaceId);

  if (websiteId) {
    query = query.eq('website_id', websiteId);
  }

  query = query.order('started_at', { ascending: false });

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SeoAudit[];
}

export async function getSeoAuditDetails(
  workspaceId: string,
  auditId: string
): Promise<{
  audit: SeoAudit | null;
  pages: SeoAuditPage[];
  issues: SeoAuditIssue[];
}> {
  const supabase = await createClient();
  if (!supabase) return { audit: null, pages: [], issues: [] };

  const [auditRes, pagesRes, issuesRes] = await Promise.all([
    supabase
      .from('seo_audits')
      .select('*, website:seo_websites(domain)')
      .eq('workspace_id', workspaceId)
      .eq('id', auditId)
      .single(),
    supabase
      .from('seo_audit_pages')
      .select('*')
      .eq('audit_id', auditId)
      .order('load_time_ms', { ascending: true }),
    supabase
      .from('seo_audit_issues')
      .select('*')
      .eq('audit_id', auditId)
      .order('severity', { ascending: true }),
  ]);

  return {
    audit: (auditRes.data as SeoAudit) || null,
    pages: (pagesRes.data as SeoAuditPage[]) || [],
    issues: (issuesRes.data as SeoAuditIssue[]) || [],
  };
}

export async function triggerWebsiteAudit(
  workspaceId: string,
  websiteId: string,
  options?: { maxPages?: number; customUrls?: string[] }
): Promise<{ success: boolean; auditId?: string; healthScore?: number; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  // 1. Fetch website
  const { data: website, error: siteErr } = await supabase
    .from('seo_websites')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', websiteId)
    .single();

  if (siteErr || !website) return { success: false, error: 'Website not found' };

  // 2. Insert audit in "running" status
  const maxPages = options?.maxPages || 15;
  const { data: audit, error: auditErr } = await supabase
    .from('seo_audits')
    .insert({
      workspace_id: workspaceId,
      website_id: websiteId,
      crawl_status: 'running',
      crawl_settings: { maxPages, rateLimitMs: 250 },
      pages_crawled: 0,
      issues_count: 0,
      health_score: 0,
    })
    .select()
    .single();

  if (auditErr || !audit) return { success: false, error: auditErr?.message || 'Failed to initialize audit' };

  try {
    // 3. Execute real crawler engine
    const crawlUrl = `https://${website.domain}`;
    const crawlResult = await runWebsiteCrawl(crawlUrl, {
      maxPages,
      rateLimitMs: 250,
      customUrls: options?.customUrls,
    });

    // 4. Persist audit pages
    if (crawlResult.pages.length > 0) {
      const pageRows = crawlResult.pages.map((p) => ({
        ...p,
        audit_id: audit.id,
      }));
      await supabase.from('seo_audit_pages').insert(pageRows);
    }

    // 5. Persist audit issues
    if (crawlResult.issues.length > 0) {
      const issueRows = crawlResult.issues.map((i) => ({
        ...i,
        audit_id: audit.id,
      }));
      await supabase.from('seo_audit_issues').insert(issueRows);
    }

    // 6. Complete audit
    await supabase
      .from('seo_audits')
      .update({
        crawl_status: 'completed',
        pages_crawled: crawlResult.pages.length,
        issues_count: crawlResult.issues.length,
        health_score: crawlResult.healthScore,
        completed_at: new Date().toISOString(),
      })
      .eq('id', audit.id);

    revalidatePath('/seo/audits');
    return {
      success: true,
      auditId: audit.id,
      healthScore: crawlResult.healthScore,
    };
  } catch (err: any) {
    await supabase
      .from('seo_audits')
      .update({
        crawl_status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', audit.id);

    return { success: false, error: err.message || 'Crawl failed' };
  }
}

// ==========================================
// 3. SEO Keywords & Search Intent
// ==========================================

export async function getSeoKeywords(
  workspaceId: string,
  websiteId?: string
): Promise<SeoKeyword[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('seo_keywords')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (websiteId && websiteId !== 'all') {
    query = query.eq('website_id', websiteId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SeoKeyword[];
}

export async function addSeoKeyword(
  workspaceId: string,
  websiteId: string,
  keyword: string,
  options?: Partial<SeoKeyword>
): Promise<{ success: boolean; keyword?: SeoKeyword; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  if (!keyword.trim()) return { success: false, error: 'Keyword is required' };

  const { data, error } = await supabase
    .from('seo_keywords')
    .insert({
      workspace_id: workspaceId,
      website_id: websiteId || null,
      keyword: keyword.trim().toLowerCase(),
      target_url: options?.target_url || null,
      intent: options?.intent || 'informational',
      status: options?.status || 'tracking',
      search_volume: options?.search_volume ?? null,
      difficulty: options?.difficulty ?? null,
      cpc: options?.cpc ?? null,
      current_rank: options?.current_rank ?? null,
      previous_rank: options?.previous_rank ?? null,
      provider: options?.provider || 'Manual Entry',
      last_updated_at: options?.provider ? new Date().toISOString() : null,
      notes: options?.notes || null,
    })
    .select()
    .single();

  if (error || !data) return { success: false, error: error?.message || 'Failed to add keyword' };

  revalidatePath('/seo/keywords');
  return { success: true, keyword: data as SeoKeyword };
}

export async function bulkImportKeywordsCsv(
  workspaceId: string,
  websiteId: string,
  csvContent: string
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { success: false, imported: 0, errors: parsed.errors.map((e) => e.message) };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, imported: 0, errors: ['Database unconfigured'] };

  let imported = 0;
  const errors: string[] = [];

  for (const row of parsed.data as any[]) {
    const kw = (row.keyword || row.Keyword || row.Query || row.query || '').trim();
    if (!kw) continue;

    const intent = (row.intent || row.Intent || 'informational').toLowerCase();
    const volume = parseInt(row.volume || row.search_volume || row.Volume || '0', 10) || null;
    const diff = parseInt(row.difficulty || row.Difficulty || '0', 10) || null;
    const cpc = parseFloat(row.cpc || row.CPC || '0') || null;
    const rank = parseInt(row.rank || row.position || row.Position || '0', 10) || null;

    const { error } = await supabase.from('seo_keywords').insert({
      workspace_id: workspaceId,
      website_id: websiteId || null,
      keyword: kw.toLowerCase(),
      target_url: row.target_url || row.url || null,
      intent: ['informational', 'commercial', 'transactional', 'navigational'].includes(intent) ? intent : 'informational',
      status: 'tracking',
      search_volume: volume,
      difficulty: diff,
      cpc,
      current_rank: rank,
      provider: 'CSV Import',
      last_updated_at: new Date().toISOString(),
      notes: row.notes || null,
    });

    if (error) {
      errors.push(`${kw}: ${error.message}`);
    } else {
      imported++;
    }
  }

  revalidatePath('/seo/keywords');
  return { success: true, imported, errors };
}

export async function deleteSeoKeyword(
  workspaceId: string,
  keywordId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { error } = await supabase
    .from('seo_keywords')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', keywordId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/seo/keywords');
  return { success: true };
}

// ==========================================
// 4. On-Page SEO Live Analyzer & Briefs
// ==========================================

export async function analyzeLivePageOnDemand(
  pageUrl: string,
  targetKeyword?: string
): Promise<{
  success: boolean;
  page?: Omit<SeoAuditPage, 'id' | 'audit_id' | 'created_at'>;
  keywordScore?: number;
  checks?: Array<{ item: string; status: 'pass' | 'warning' | 'fail'; message: string }>;
  error?: string;
}> {
  try {
    const cleanUrl = normalizeUrl(pageUrl);
    const startTime = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexusMark-SEOBot/1.0)',
      },
    });
    clearTimeout(timeout);

    const loadTimeMs = Date.now() - startTime;
    const html = await res.text();
    const { pageData } = parseHtmlPage(cleanUrl, html, res.status, loadTimeMs);

    const checks: Array<{ item: string; status: 'pass' | 'warning' | 'fail'; message: string }> = [];
    let passedChecks = 0;

    // Check 1: HTTP Status
    if (res.status === 200) {
      checks.push({ item: 'HTTP Status Code', status: 'pass', message: 'Page returns 200 OK.' });
      passedChecks++;
    } else {
      checks.push({ item: 'HTTP Status Code', status: 'fail', message: `Page returned HTTP ${res.status}.` });
    }

    // Check 2: Title Tag
    if (pageData.title && pageData.title_length && pageData.title_length >= 35 && pageData.title_length <= 65) {
      checks.push({ item: 'Title Tag Length', status: 'pass', message: `Optimal title length (${pageData.title_length} chars).` });
      passedChecks++;
    } else if (pageData.title) {
      checks.push({ item: 'Title Tag Length', status: 'warning', message: `Title is ${pageData.title_length} characters (ideal: 40-60).` });
    } else {
      checks.push({ item: 'Title Tag Length', status: 'fail', message: 'No title tag found.' });
    }

    // Check 3: Meta Description
    if (pageData.meta_description && pageData.meta_description_length && pageData.meta_description_length >= 100 && pageData.meta_description_length <= 160) {
      checks.push({ item: 'Meta Description Length', status: 'pass', message: `Optimal length (${pageData.meta_description_length} chars).` });
      passedChecks++;
    } else if (pageData.meta_description) {
      checks.push({ item: 'Meta Description Length', status: 'warning', message: `Description is ${pageData.meta_description_length} chars.` });
    } else {
      checks.push({ item: 'Meta Description Length', status: 'fail', message: 'No meta description found.' });
    }

    // Check 4: H1 Tag
    if (pageData.h1) {
      checks.push({ item: 'H1 Heading', status: 'pass', message: `Found primary heading: "${pageData.h1.slice(0, 40)}..."` });
      passedChecks++;
    } else {
      checks.push({ item: 'H1 Heading', status: 'fail', message: 'Missing primary <h1> heading tag.' });
    }

    // Check 5: Images Alt
    if (pageData.images_count === 0 || pageData.images_missing_alt === 0) {
      checks.push({ item: 'Image Alt Text', status: 'pass', message: 'All images have descriptive alt attributes.' });
      passedChecks++;
    } else {
      checks.push({ item: 'Image Alt Text', status: 'warning', message: `${pageData.images_missing_alt} of ${pageData.images_count} images missing alt text.` });
    }

    // Check 6: Keyword density if provided
    if (targetKeyword?.trim()) {
      const kw = targetKeyword.trim().toLowerCase();
      const inTitle = pageData.title?.toLowerCase().includes(kw);
      const inH1 = pageData.h1?.toLowerCase().includes(kw);
      const inDesc = pageData.meta_description?.toLowerCase().includes(kw);

      if (inTitle && inH1) {
        checks.push({ item: 'Target Keyword Coverage', status: 'pass', message: `Keyword "${kw}" present in Title and H1.` });
        passedChecks += 2;
      } else if (inTitle || inH1 || inDesc) {
        checks.push({ item: 'Target Keyword Coverage', status: 'warning', message: `Keyword found in some elements but missing in ${!inTitle ? 'Title' : 'H1'}.` });
        passedChecks += 1;
      } else {
        checks.push({ item: 'Target Keyword Coverage', status: 'fail', message: `Target keyword "${kw}" was not found in Title or H1.` });
      }
    }

    const keywordScore = Math.min(100, Math.round((passedChecks / (checks.length || 1)) * 100));

    return {
      success: true,
      page: pageData,
      keywordScore,
      checks,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to analyze page' };
  }
}

export async function getSeoContentBriefs(
  workspaceId: string,
  websiteId?: string
): Promise<SeoContentBrief[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('seo_content_briefs')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (websiteId && websiteId !== 'all') {
    query = query.eq('website_id', websiteId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SeoContentBrief[];
}

export async function createSeoContentBrief(
  workspaceId: string,
  data: {
    website_id?: string;
    title: string;
    target_keyword: string;
    target_url?: string;
    word_count_target?: number;
    brief_content?: Record<string, any>;
    recommendations?: string[];
  }
): Promise<{ success: boolean; brief?: SeoContentBrief; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: brief, error } = await supabase
    .from('seo_content_briefs')
    .insert({
      workspace_id: workspaceId,
      website_id: data.website_id || null,
      title: data.title.trim(),
      target_keyword: data.target_keyword.trim().toLowerCase(),
      target_url: data.target_url?.trim() || null,
      word_count_target: data.word_count_target || 1500,
      brief_content: data.brief_content || {},
      recommendations: data.recommendations || [],
      status: 'draft',
    })
    .select()
    .single();

  if (error || !brief) return { success: false, error: error?.message || 'Failed to create brief' };
  revalidatePath('/seo/on-page');
  return { success: true, brief: brief as SeoContentBrief };
}

// ==========================================
// 5. Local SEO & NAP Verification
// ==========================================

export async function getLocalLocations(
  workspaceId: string,
  websiteId?: string
): Promise<SeoLocalLocation[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('seo_local_locations')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (websiteId && websiteId !== 'all') {
    query = query.eq('website_id', websiteId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SeoLocalLocation[];
}

export async function saveLocalLocation(
  workspaceId: string,
  data: {
    website_id?: string;
    business_name: string;
    address_street: string;
    address_city: string;
    address_state: string;
    address_postal_code: string;
    address_country?: string;
    phone: string;
    website_url: string;
  }
): Promise<{ success: boolean; location?: SeoLocalLocation; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: loc, error } = await supabase
    .from('seo_local_locations')
    .insert({
      workspace_id: workspaceId,
      website_id: data.website_id || null,
      business_name: data.business_name.trim(),
      address_street: data.address_street.trim(),
      address_city: data.address_city.trim(),
      address_state: data.address_state.trim(),
      address_postal_code: data.address_postal_code.trim(),
      address_country: data.address_country || 'USA',
      phone: data.phone.trim(),
      website_url: data.website_url.trim(),
      nap_status: 'pending_check',
    })
    .select()
    .single();

  if (error || !loc) return { success: false, error: error?.message || 'Failed to save location' };
  revalidatePath('/seo/local');
  return { success: true, location: loc as SeoLocalLocation };
}

export async function runNapAudit(
  workspaceId: string,
  locationId: string
): Promise<{ success: boolean; napStatus?: string; auditDetails?: any; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: loc, error: fetchErr } = await supabase
    .from('seo_local_locations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', locationId)
    .single();

  if (fetchErr || !loc) return { success: false, error: 'Location not found' };

  const discrepancies: string[] = [];
  let foundName: string | null = null;
  let foundPhone: string | null = null;
  let foundAddress: string | null = null;

  try {
    const res = await fetch(normalizeUrl(loc.website_url), {
      headers: { 'User-Agent': 'NexusMark-SEOBot/1.0' },
    });
    const html = await res.text();

    // Check Name presence
    if (html.toLowerCase().includes(loc.business_name.toLowerCase())) {
      foundName = loc.business_name;
    } else {
      discrepancies.push(`Business name "${loc.business_name}" not found verbatim in landing page HTML.`);
    }

    // Check Phone presence (cleaning non-digits)
    const cleanPhone = loc.phone.replace(/\D/g, '');
    if (html.replace(/\D/g, '').includes(cleanPhone)) {
      foundPhone = loc.phone;
    } else {
      discrepancies.push(`Phone number "${loc.phone}" not detected in website footer/contact markup.`);
    }

    // Check City / Zip presence
    if (html.toLowerCase().includes(loc.address_city.toLowerCase()) || html.includes(loc.address_postal_code)) {
      foundAddress = `${loc.address_street}, ${loc.address_city}, ${loc.address_state} ${loc.address_postal_code}`;
    } else {
      discrepancies.push(`City/Postal code (${loc.address_city}, ${loc.address_postal_code}) missing on verified URL.`);
    }
  } catch (err: any) {
    discrepancies.push(`Failed to connect to website URL: ${err.message}`);
  }

  const napStatus = discrepancies.length === 0 ? 'verified' : 'inconsistent';
  const auditResults = {
    foundName,
    foundAddress,
    foundPhone,
    discrepancies,
    checkedUrl: loc.website_url,
    lastChecked: new Date().toISOString(),
  };

  await supabase
    .from('seo_local_locations')
    .update({
      nap_status: napStatus,
      audit_results: auditResults,
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId);

  revalidatePath('/seo/local');
  return {
    success: true,
    napStatus,
    auditDetails: auditResults,
  };
}

// ==========================================
// 6. Search Console & GA4 Integrations
// ==========================================

export async function getSeoIntegrations(workspaceId: string): Promise<SeoIntegration[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('seo_integrations')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error || !data) return [];
  return data as SeoIntegration[];
}

export async function saveSeoIntegration(
  workspaceId: string,
  provider: SeoIntegrationProvider,
  accountName: string,
  propertyId: string,
  config: Record<string, any>,
  isConnected: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { error } = await supabase
    .from('seo_integrations')
    .upsert(
      {
        workspace_id: workspaceId,
        provider,
        account_name: accountName,
        property_id: propertyId,
        config,
        is_connected: isConnected,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,provider' }
    );

  if (error) return { success: false, error: error.message };
  revalidatePath('/seo/analytics');
  return { success: true };
}

export async function getGscPerformanceData(
  workspaceId: string,
  websiteId?: string
): Promise<SeoGscData[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('seo_gsc_data')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (websiteId && websiteId !== 'all') {
    query = query.eq('website_id', websiteId);
  }

  query = query.order('clicks', { ascending: false }).limit(100);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SeoGscData[];
}

export async function getGa4AnalyticsData(
  workspaceId: string,
  websiteId?: string
): Promise<SeoGa4Data[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('seo_ga4_data')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (websiteId && websiteId !== 'all') {
    query = query.eq('website_id', websiteId);
  }

  query = query.order('date', { ascending: false }).limit(30);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SeoGa4Data[];
}

// ==========================================
// 7. Downloadable CSV SEO Reports
// ==========================================

export async function exportSeoAuditReportCsv(
  workspaceId: string,
  auditId: string
): Promise<string> {
  const { audit, pages, issues } = await getSeoAuditDetails(workspaceId, auditId);

  const headers = ['URL', 'Severity', 'Issue Type', 'Title', 'Evidence', 'Recommendation'];
  const rows = issues.map((i) => [
    `"${i.url.replace(/"/g, '""')}"`,
    `"${i.severity}"`,
    `"${i.issue_type}"`,
    `"${i.title.replace(/"/g, '""')}"`,
    `"${i.evidence.replace(/"/g, '""')}"`,
    `"${i.recommendation.replace(/"/g, '""')}"`,
  ]);

  const metaHeader = `# NexusMark SEO Audit Report: ${audit?.website?.domain || 'Website'}\n# Health Score: ${audit?.health_score || 0}%\n# Crawled: ${audit?.pages_crawled || 0} pages\n# Exported: ${new Date().toISOString()}\n`;

  return metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export async function exportKeywordsReportCsv(
  workspaceId: string,
  websiteId?: string
): Promise<string> {
  const keywords = await getSeoKeywords(workspaceId, websiteId);

  const headers = ['Keyword', 'Target URL', 'Intent', 'Search Volume', 'Difficulty', 'CPC', 'Current Rank', 'Provider', 'Last Updated'];
  const rows = keywords.map((k) => [
    `"${k.keyword.replace(/"/g, '""')}"`,
    `"${(k.target_url || '').replace(/"/g, '""')}"`,
    `"${k.intent}"`,
    `"${k.search_volume ?? 'N/A'}"`,
    `"${k.difficulty ?? 'N/A'}"`,
    `"${k.cpc ?? 'N/A'}"`,
    `"${k.current_rank ?? 'N/A'}"`,
    `"${k.provider}"`,
    `"${k.last_updated_at || 'Never'}"`,
  ]);

  const metaHeader = `# NexusMark Keyword Tracking Report\n# Exported: ${new Date().toISOString()}\n`;
  return metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ==========================================
// 8. Competitor Live Crawl & Backlink Status
// ==========================================

export async function compareCompetitorPages(
  workspaceId: string,
  myUrl: string,
  competitorUrl: string
): Promise<{ success: boolean; comparison?: CompetitorComparisonResult; error?: string }> {
  try {
    const cleanMyUrl = normalizeUrl(myUrl.trim());
    const cleanCompUrl = normalizeUrl(competitorUrl.trim());

    if (!cleanMyUrl || !cleanCompUrl) {
      return { success: false, error: 'Both your page URL and competitor page URL are required.' };
    }

    const [myRes, compRes] = await Promise.allSettled([
      (async () => {
        const start = Date.now();
        const res = await fetch(cleanMyUrl, {
          headers: { 'User-Agent': 'NexusMark-SEOBot/1.0' },
          cache: 'no-store',
        });
        const loadTimeMs = Date.now() - start;
        const html = await res.text();
        return parseHtmlPage(cleanMyUrl, html, res.status, loadTimeMs);
      })(),
      (async () => {
        const start = Date.now();
        const res = await fetch(cleanCompUrl, {
          headers: { 'User-Agent': 'NexusMark-SEOBot/1.0' },
          cache: 'no-store',
        });
        const loadTimeMs = Date.now() - start;
        const html = await res.text();
        return parseHtmlPage(cleanCompUrl, html, res.status, loadTimeMs);
      })(),
    ]);

    const myPage = myRes.status === 'fulfilled' ? myRes.value.pageData : null;
    const compPage = compRes.status === 'fulfilled' ? compRes.value.pageData : null;

    if (!myPage && !compPage) {
      return { success: false, error: 'Failed to crawl both target URLs. Please verify the addresses are reachable and public.' };
    }

    const myWords = myPage?.word_count || 0;
    const compWords = compPage?.word_count || 0;
    const myTime = myPage?.load_time_ms || 0;
    const compTime = compPage?.load_time_ms || 0;
    const myH2 = myPage?.h2_count || 0;
    const compH2 = compPage?.h2_count || 0;
    const myInternal = myPage?.internal_links_count || 0;
    const compInternal = compPage?.internal_links_count || 0;
    const myImgs = myPage?.images_count || 0;
    const compImgs = compPage?.images_count || 0;

    const insights: string[] = [];

    if (myWords > compWords) {
      insights.push(`Your page leads in content depth with ${myWords} words vs ${compWords} words (+${myWords - compWords} words).`);
    } else if (compWords > myWords) {
      insights.push(`Competitor leads in content depth with ${compWords} words vs ${myWords} words (+${compWords - myWords} words). Consider adding more thorough sections.`);
    }

    if (myTime < compTime) {
      insights.push(`Your page loaded faster (${myTime}ms vs ${compTime}ms), offering a superior PageSpeed signal.`);
    } else if (compTime < myTime) {
      insights.push(`Competitor page loaded faster (${compTime}ms vs ${myTime}ms). Review asset sizes and caching.`);
    }

    if (compPage?.has_schema && !myPage?.has_schema) {
      insights.push(`Competitor implements structured schema markup (${compPage.structured_data_types.join(', ')}), while your page lacks Schema.org JSON-LD.`);
    } else if (myPage?.has_schema && !compPage?.has_schema) {
      insights.push(`Your page has structured data schema enabled while competitor has none.`);
    }

    if (compH2 > myH2) {
      insights.push(`Competitor uses a richer subheading architecture (${compH2} H2 tags vs ${myH2} H2 tags).`);
    }

    const comparison: CompetitorComparisonResult = {
      myPage,
      competitorPage: compPage,
      myUrl: cleanMyUrl,
      competitorUrl: cleanCompUrl,
      differential: {
        wordCountDiff: myWords - compWords,
        loadTimeDiff: myTime - compTime,
        h2Diff: myH2 - compH2,
        internalLinksDiff: myInternal - compInternal,
        imagesDiff: myImgs - compImgs,
      },
      insights,
    };

    return { success: true, comparison };
  } catch (err: any) {
    return { success: false, error: err.message || 'Comparison failed' };
  }
}

export async function getBacklinkProviderStatus(
  workspaceId: string
): Promise<{
  isConnected: boolean;
  provider: string | null;
  accountName: string | null;
  message: string;
}> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      isConnected: false,
      provider: null,
      accountName: null,
      message: 'Database unconfigured.',
    };
  }

  const { data } = await supabase
    .from('seo_integrations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('provider', ['dataforseo', 'serpapi'])
    .eq('is_connected', true)
    .maybeSingle();

  if (data) {
    return {
      isConnected: true,
      provider: data.provider,
      accountName: data.account_name,
      message: `Connected to ${data.provider} provider. Live backlink indexing active.`,
    };
  }

  return {
    isConnected: false,
    provider: null,
    accountName: null,
    message: 'No live backlink provider connected. Mock or simulated link metrics are strictly disabled.',
  };
}

