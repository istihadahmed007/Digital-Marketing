export interface SeoWebsite {
  id: string;
  workspace_id: string;
  domain: string;
  verification_token: string;
  is_verified: boolean;
  verified_at: string | null;
  sitemap_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CrawlStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SeoAudit {
  id: string;
  workspace_id: string;
  website_id: string;
  crawl_status: CrawlStatus;
  pages_crawled: number;
  issues_count: number;
  health_score: number;
  crawl_settings: {
    maxPages: number;
    rateLimitMs: number;
  };
  started_at: string;
  completed_at: string | null;
  website?: SeoWebsite | null;
}

export interface SeoAuditPage {
  id: string;
  audit_id: string;
  url: string;
  status_code: number;
  title: string | null;
  title_length: number | null;
  meta_description: string | null;
  meta_description_length: number | null;
  canonical_url: string | null;
  h1: string | null;
  h2_count: number;
  images_count: number;
  images_missing_alt: number;
  internal_links_count: number;
  external_links_count: number;
  word_count: number;
  load_time_ms: number;
  robots_directives: string | null;
  has_schema: boolean;
  structured_data_types: string[];
  created_at: string;
}

export type IssueSeverity = 'critical' | 'warning' | 'notice';

export interface SeoAuditIssue {
  id: string;
  audit_id: string;
  page_id: string | null;
  url: string;
  issue_type: string;
  severity: IssueSeverity;
  title: string;
  evidence: string;
  recommendation: string;
  created_at: string;
}

export type KeywordIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type KeywordStatus = 'tracking' | 'opportunity' | 'ignored' | 'ranking';

export interface SeoKeyword {
  id: string;
  workspace_id: string;
  website_id: string | null;
  keyword: string;
  target_url: string | null;
  intent: KeywordIntent;
  status: KeywordStatus;
  search_volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  current_rank: number | null;
  previous_rank: number | null;
  provider: string;
  last_updated_at: string | null;
  notes: string | null;
  created_at: string;
}

export type BriefStatus = 'draft' | 'in_progress' | 'ready_for_review' | 'published';

export interface SeoContentBrief {
  id: string;
  workspace_id: string;
  website_id: string | null;
  keyword_id: string | null;
  title: string;
  target_keyword: string;
  target_url: string | null;
  status: BriefStatus;
  word_count_target: number;
  brief_content: {
    targetAudience?: string;
    searchIntent?: string;
    suggestedHeadings?: string[];
    suggestedQuestions?: string[];
    secondaryKeywords?: string[];
    competitorReferences?: string[];
    contentOutline?: string;
    aiGeneratedNotes?: string;
  };
  recommendations: string[];
  created_at: string;
  updated_at: string;
}

export type NapStatus = 'verified' | 'inconsistent' | 'pending_check';

export interface SeoLocalLocation {
  id: string;
  workspace_id: string;
  website_id: string | null;
  business_name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_country: string;
  phone: string;
  website_url: string;
  gmb_connected: boolean;
  nap_status: NapStatus;
  audit_results: {
    foundName?: string | null;
    foundAddress?: string | null;
    foundPhone?: string | null;
    discrepancies?: string[];
    checkedUrl?: string;
    lastChecked?: string;
  };
  created_at: string;
  updated_at: string;
}

export type SeoIntegrationProvider =
  | 'google_search_console'
  | 'google_analytics_4'
  | 'dataforseo'
  | 'serpapi'
  | 'google_business_profile'
  | 'openai'
  | 'gemini';

export interface SeoIntegration {
  id: string;
  workspace_id: string;
  provider: SeoIntegrationProvider;
  account_name: string | null;
  property_id: string | null;
  config: Record<string, any>;
  is_connected: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeoGscData {
  id: string;
  workspace_id: string;
  website_id: string;
  date: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  average_position: number;
  created_at: string;
}

export interface SeoGa4Data {
  id: string;
  workspace_id: string;
  website_id: string;
  date: string;
  sessions: number;
  organic_sessions: number;
  conversions: number;
  bounce_rate: number;
  created_at: string;
}

export interface CompetitorComparisonResult {
  myPage: Omit<SeoAuditPage, 'id' | 'audit_id' | 'created_at'> | null;
  competitorPage: Omit<SeoAuditPage, 'id' | 'audit_id' | 'created_at'> | null;
  myUrl: string;
  competitorUrl: string;
  differential: {
    wordCountDiff: number;
    loadTimeDiff: number;
    h2Diff: number;
    internalLinksDiff: number;
    imagesDiff: number;
  };
  insights: string[];
}

