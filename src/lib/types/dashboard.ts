export type MetricConnectionStatus = 'connected' | 'disconnected' | 'empty' | 'error';

export type DashboardDateRange = '7d' | '30d' | '90d';
export type DashboardChannel = 'all' | 'organic_search' | 'social' | 'email' | 'direct' | 'referral';

export interface SourceBackedMetric<T> {
  value: T;
  source: string;
  sourceType: 'ga4' | 'gsc' | 'crm' | 'automations' | 'email' | 'social';
  dateRange: string;
  lastUpdated: string | null;
  status: MetricConnectionStatus;
  statusMessage?: string;
  setupHref?: string;
  changePercent?: number | null;
}

export interface TrafficSourceBreakdown {
  channel: string;
  sessions: number;
  percentage: number;
}

export interface GrowthRecommendation {
  id: string;
  title: string;
  category: 'seo' | 'lead_generation' | 'content' | 'pipeline' | 'automation';
  impact: 'high' | 'medium' | 'low';
  description: string;
  actionLabel: string;
  actionHref: string;
}

export interface MarketingDashboardData {
  workspaceId: string;
  dateRange: DashboardDateRange;
  channel: DashboardChannel;
  websiteSessions: SourceBackedMetric<{
    totalSessions: number;
    organicSessions: number;
    conversions: number;
    conversionRate: number;
    bounceRate: number;
    sources: TrafficSourceBreakdown[];
  }>;
  organicSearch: SourceBackedMetric<{
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
    topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
  }>;
  socialPosts: SourceBackedMetric<{
    publishedCount: number;
    scheduledCount: number;
    pendingApprovalCount: number;
    failedCount: number;
    activeChannels: string[];
  }>;
  campaignPerformance: SourceBackedMetric<{
    totalCampaigns: number;
    activeCampaigns: number;
    draftCampaigns: number;
    totalSent: number;
    averageOpenRate: number | null;
    averageClickRate: number | null;
  }>;
  crmLeads: SourceBackedMetric<{
    totalContacts: number;
    qualifiedLeads: number;
    lifecycleDistribution: Record<string, number>;
    formsActive: number;
    totalSubmissions: number;
    leadToDealConversionRate: number;
  }>;
  pipelineRevenue: SourceBackedMetric<{
    totalPipelineValue: number;
    wonRevenue: number;
    activeDealsCount: number;
    wonDealsCount: number;
    currency: string;
  }>;
  automationHealth: SourceBackedMetric<{
    activeWorkflows: number;
    totalExecutions: number;
    succeededExecutions: number;
    failedExecutions: number;
    reliabilityRate: number;
  }>;
  recommendations: GrowthRecommendation[];
}
