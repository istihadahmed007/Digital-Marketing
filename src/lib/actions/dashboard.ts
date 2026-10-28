'use server';

import { createClient } from '@/lib/supabase/server';
import {
  MarketingDashboardData,
  DashboardDateRange,
  DashboardChannel,
  GrowthRecommendation,
  TrafficSourceBreakdown,
} from '@/lib/types/dashboard';
import { getContacts } from '@/lib/actions/contacts';
import { getDeals } from '@/lib/actions/deals';
import { getForms } from '@/lib/actions/forms';
import { getCampaigns } from '@/lib/actions/campaigns';
import { getWorkflows, getWorkflowExecutions } from '@/lib/actions/automations';
import { getShortsClips } from '@/lib/actions/shorts';

export async function getMarketingDashboardMetrics(
  workspaceId: string,
  dateRange: DashboardDateRange = '30d',
  channel: DashboardChannel = 'all'
): Promise<MarketingDashboardData> {
  const supabase = await createClient();

  // Days in range
  const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
  const rangeLabel = `Last ${days} days`;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Fetch core CRM and platform data in parallel
  const [contacts, deals, forms, campaigns, workflows, executions, clips] = await Promise.all([
    getContacts(workspaceId),
    getDeals(workspaceId),
    getForms(workspaceId),
    getCampaigns(workspaceId),
    getWorkflows(workspaceId),
    getWorkflowExecutions(workspaceId, { limit: 100 }),
    getShortsClips(workspaceId),
  ]);

  // 1. GA4 Website Sessions & Traffic Sources
  let ga4Status: 'connected' | 'disconnected' | 'empty' | 'error' = 'disconnected';
  let ga4Message = 'Google Analytics 4 is not connected. Add your GA4 Measurement or Property ID in Integrations.';
  let ga4LastUpdated: string | null = null;
  let totalSessions = 0;
  let organicSessions = 0;
  let ga4Conversions = 0;
  let bounceRate = 0;
  const trafficSources: TrafficSourceBreakdown[] = [];

  if (supabase) {
    try {
      // Check integration configuration
      const { data: ga4Integration } = await supabase
        .from('seo_integrations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'google_analytics_4')
        .maybeSingle();

      const isGa4Configured = Boolean(
        ga4Integration?.is_connected ||
        process.env.GA4_ACCESS_TOKEN ||
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN)
      );

      if (isGa4Configured) {
        const { data: ga4Rows } = await supabase
          .from('seo_ga4_data')
          .select('*')
          .eq('workspace_id', workspaceId)
          .gte('date', cutoffDate.split('T')[0])
          .order('date', { ascending: false });

        if (ga4Rows && ga4Rows.length > 0) {
          ga4Status = 'connected';
          ga4Message = 'Live streaming from connected Google Analytics 4 property.';
          ga4LastUpdated = ga4Rows[0].created_at || ga4Rows[0].date;

          totalSessions = ga4Rows.reduce((acc, r) => acc + (r.sessions || 0), 0);
          organicSessions = ga4Rows.reduce((acc, r) => acc + (r.organic_sessions || 0), 0);
          ga4Conversions = ga4Rows.reduce((acc, r) => acc + (r.conversions || 0), 0);
          const totalBounce = ga4Rows.reduce((acc, r) => acc + (r.bounce_rate || 0), 0);
          bounceRate = Number((totalBounce / ga4Rows.length).toFixed(1));

          if (totalSessions > 0) {
            const orgPct = Math.round((organicSessions / totalSessions) * 100);
            trafficSources.push({ channel: 'Organic Search', sessions: organicSessions, percentage: orgPct });
            const directEst = Math.max(0, totalSessions - organicSessions);
            trafficSources.push({ channel: 'Direct & Referral', sessions: directEst, percentage: 100 - orgPct });
          }
        } else {
          ga4Status = 'empty';
          ga4Message = 'GA4 is authorized but no session traffic has been recorded for this date range.';
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Google Search Console Metrics
  let gscStatus: 'connected' | 'disconnected' | 'empty' | 'error' = 'disconnected';
  let gscMessage = 'Google Search Console is not connected. Verify your domain in SEO & Intelligence.';
  let gscLastUpdated: string | null = null;
  let gscClicks = 0;
  let gscImpressions = 0;
  let gscCtr = 0;
  let gscAvgPosition = 0;
  let topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }> = [];

  if (supabase) {
    try {
      const { data: gscIntegration } = await supabase
        .from('seo_integrations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'google_search_console')
        .maybeSingle();

      const isGscConfigured = Boolean(
        gscIntegration?.is_connected ||
        process.env.GSC_ACCESS_TOKEN ||
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN)
      );

      if (isGscConfigured) {
        const { data: gscRows } = await supabase
          .from('seo_gsc_data')
          .select('*')
          .eq('workspace_id', workspaceId)
          .gte('date', cutoffDate.split('T')[0])
          .order('clicks', { ascending: false });

        if (gscRows && gscRows.length > 0) {
          gscStatus = 'connected';
          gscMessage = 'Direct organic search telemetry from Google Search Console.';
          gscLastUpdated = gscRows[0].created_at || gscRows[0].date;

          gscClicks = gscRows.reduce((acc, r) => acc + (r.clicks || 0), 0);
          gscImpressions = gscRows.reduce((acc, r) => acc + (r.impressions || 0), 0);
          gscCtr = gscImpressions > 0 ? Number(((gscClicks / gscImpressions) * 100).toFixed(2)) : 0;
          const posSum = gscRows.reduce((acc, r) => acc + (r.average_position || 0), 0);
          gscAvgPosition = Number((posSum / gscRows.length).toFixed(1));

          topQueries = gscRows.slice(0, 5).map((r) => ({
            query: r.query,
            clicks: r.clicks || 0,
            impressions: r.impressions || 0,
            position: r.average_position || 0,
          }));
        } else {
          gscStatus = 'empty';
          gscMessage = 'GSC is linked but no search impression events have been logged for this period.';
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Social Posts & Video Clips
  const publishedClips = clips.filter((c) => c.render_status === 'rendered');
  const scheduledClips = clips.filter((c) => c.render_status === 'rendering');
  const failedClips = clips.filter((c) => c.render_status === 'failed');

  // Check social posts in db if exists
  let publishedPosts = publishedClips.length;
  let scheduledPosts = scheduledClips.length;
  let pendingApprovalPosts = 0;
  let failedPosts = failedClips.length;
  const activeChannels = ['YouTube Shorts'];

  if (supabase) {
    try {
      const { data: customPosts } = await supabase
        .from('social_posts')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (customPosts && customPosts.length > 0) {
        publishedPosts += customPosts.filter((p) => p.publishing_status === 'published').length;
        scheduledPosts += customPosts.filter((p) => p.publishing_status === 'scheduled').length;
        pendingApprovalPosts += customPosts.filter((p) => p.approval_status === 'pending').length;
        failedPosts += customPosts.filter((p) => p.publishing_status === 'failed').length;
        customPosts.forEach((p) => {
          if (p.platform && !activeChannels.includes(p.platform)) {
            activeChannels.push(p.platform);
          }
        });
      }
    } catch {
      // Table may not yet exist
    }
  }

  // 4. CRM & Leads Metrics
  const filteredContacts = contacts.filter((c) => !c.is_archived);
  const qualifiedContacts = filteredContacts.filter(
    (c) => c.lead_status === 'qualified' || c.lifecycle_stage === 'sql' || c.lifecycle_stage === 'opportunity'
  );
  const lifecycleDistribution: Record<string, number> = {
    subscriber: 0,
    lead: 0,
    mql: 0,
    sql: 0,
    opportunity: 0,
    customer: 0,
  };
  filteredContacts.forEach((c) => {
    const stage = c.lifecycle_stage || 'lead';
    lifecycleDistribution[stage] = (lifecycleDistribution[stage] || 0) + 1;
  });

  const activeForms = forms.filter((f) => f.is_published);
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissions_count || 0), 0);
  const leadToDealConversionRate =
    filteredContacts.length > 0
      ? Number(((deals.length / filteredContacts.length) * 100).toFixed(1))
      : 0;

  // 5. Orders & Pipeline Revenue
  const wonDeals = deals.filter((d) => d.stage === 'closed_won' && !d.is_archived);
  const activeDeals = deals.filter(
    (d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost' && !d.is_archived
  );
  const totalPipelineValue = activeDeals.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const wonRevenue = wonDeals.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const currency = deals[0]?.currency || 'USD';

  // 6. Campaign Performance
  const activeCampaigns = campaigns.filter((c) => c.status === 'scheduled' || c.status === 'sending');
  const draftCampaigns = campaigns.filter((c) => c.status === 'draft');
  const sentCampaigns = campaigns.filter((c) => c.status === 'sent');
  const totalSent = sentCampaigns.reduce((acc, c) => acc + (c.recipient_count || 0), 0);

  // 7. Automation Health & Reliability
  const activeWorkflowsCount = workflows.filter((w) => w.is_active || w.status === 'active').length;
  const succeededExecutions = executions.filter((e) => e.status === 'succeeded').length;
  const failedExecutions = executions.filter((e) => e.status === 'failed').length;
  const totalExecs = executions.length;
  const reliabilityRate = totalExecs > 0 ? Math.round((succeededExecutions / totalExecs) * 100) : 100;

  // 8. Grounded AI Recommendations
  const recommendations: GrowthRecommendation[] = [];

  if (ga4Status === 'disconnected') {
    recommendations.push({
      id: 'rec-ga4',
      title: 'Connect Google Analytics 4',
      category: 'seo',
      impact: 'high',
      description: 'Stream verified website traffic, visitor sessions, and landing page conversions directly into your dashboard.',
      actionLabel: 'Connect GA4',
      actionHref: '/integrations',
    });
  }

  if (gscStatus === 'disconnected') {
    recommendations.push({
      id: 'rec-gsc',
      title: 'Link Google Search Console',
      category: 'seo',
      impact: 'high',
      description: 'Identify top ranking keywords and monitor organic search impression spikes to capture qualified search demand.',
      actionLabel: 'Link GSC Property',
      actionHref: '/seo',
    });
  }

  if (activeForms.length === 0) {
    recommendations.push({
      id: 'rec-forms',
      title: 'Publish Inbound Lead Form',
      category: 'lead_generation',
      impact: 'high',
      description: 'Create an embeddable website lead form with double opt-in consent to convert website visitors automatically.',
      actionLabel: 'Build Lead Form',
      actionHref: '/contacts',
    });
  }

  if (activeDeals.length > 0) {
    const highValueDeals = activeDeals.filter((d) => d.amount > 1000);
    if (highValueDeals.length > 0) {
      recommendations.push({
        id: 'rec-deals',
        title: `Advance ${highValueDeals.length} High-Value Deals in Pipeline`,
        category: 'pipeline',
        impact: 'medium',
        description: `You have ${currency} ${highValueDeals.reduce((a, b) => a + b.amount, 0).toLocaleString()} in priority opportunities awaiting proposal or closing follow-up.`,
        actionLabel: 'Review Deals',
        actionHref: '/deals',
      });
    }
  }

  if (clips.length === 0) {
    recommendations.push({
      id: 'rec-shorts',
      title: 'Produce First Short-Form Video',
      category: 'content',
      impact: 'medium',
      description: 'Generate high-retention vertical video scripts in Bangla or English and render engaging promotional clips.',
      actionLabel: 'Open Video Studio',
      actionHref: '/shorts',
    });
  }

  if (activeWorkflowsCount === 0) {
    recommendations.push({
      id: 'rec-automations',
      title: 'Activate Inbound Lead Automation',
      category: 'automation',
      impact: 'high',
      description: 'Turn on Workflow B (Lead Capture & Follow-up) to automatically assign tasks and trigger welcome sequences.',
      actionLabel: 'Activate Workflow',
      actionHref: '/automations',
    });
  }

  return {
    workspaceId,
    dateRange,
    channel,
    websiteSessions: {
      value: {
        totalSessions,
        organicSessions,
        conversions: ga4Conversions,
        conversionRate: totalSessions > 0 ? Number(((ga4Conversions / totalSessions) * 100).toFixed(2)) : 0,
        bounceRate,
        sources: trafficSources,
      },
      source: 'Google Analytics 4 API',
      sourceType: 'ga4',
      dateRange: rangeLabel,
      lastUpdated: ga4LastUpdated,
      status: ga4Status,
      statusMessage: ga4Message,
      setupHref: '/integrations',
    },
    organicSearch: {
      value: {
        clicks: gscClicks,
        impressions: gscImpressions,
        ctr: gscCtr,
        averagePosition: gscAvgPosition,
        topQueries,
      },
      source: 'Google Search Console API',
      sourceType: 'gsc',
      dateRange: rangeLabel,
      lastUpdated: gscLastUpdated,
      status: gscStatus,
      statusMessage: gscMessage,
      setupHref: '/seo',
    },
    socialPosts: {
      value: {
        publishedCount: publishedPosts,
        scheduledCount: scheduledPosts,
        pendingApprovalCount: pendingApprovalPosts,
        failedCount: failedPosts,
        activeChannels,
      },
      source: 'GrowthPilot Publishing & Shorts Studio',
      sourceType: 'social',
      dateRange: rangeLabel,
      lastUpdated: new Date().toISOString(),
      status: publishedPosts > 0 || scheduledPosts > 0 ? 'connected' : 'empty',
      statusMessage: publishedPosts > 0 ? 'Verified social posts and scheduled broadcasts.' : 'No social posts scheduled yet.',
      setupHref: '/calendar',
    },
    campaignPerformance: {
      value: {
        totalCampaigns: campaigns.length,
        activeCampaigns: activeCampaigns.length,
        draftCampaigns: draftCampaigns.length,
        totalSent,
        averageOpenRate: null,
        averageClickRate: null,
      },
      source: 'Resend & Mautic Email Broadcasts',
      sourceType: 'email',
      dateRange: rangeLabel,
      lastUpdated: campaigns[0]?.updated_at || null,
      status: campaigns.length > 0 ? 'connected' : 'empty',
      statusMessage: campaigns.length > 0 ? `${activeCampaigns.length} active campaigns running.` : 'No campaigns created yet.',
      setupHref: '/campaigns',
    },
    crmLeads: {
      value: {
        totalContacts: filteredContacts.length,
        qualifiedLeads: qualifiedContacts.length,
        lifecycleDistribution,
        formsActive: activeForms.length,
        totalSubmissions,
        leadToDealConversionRate,
      },
      source: 'Supabase PostgreSQL CRM Ledger',
      sourceType: 'crm',
      dateRange: rangeLabel,
      lastUpdated: contacts[0]?.updated_at || new Date().toISOString(),
      status: filteredContacts.length > 0 ? 'connected' : 'empty',
      statusMessage: 'Real-time multi-tenant lead and contact records.',
      setupHref: '/contacts',
    },
    pipelineRevenue: {
      value: {
        totalPipelineValue,
        wonRevenue,
        activeDealsCount: activeDeals.length,
        wonDealsCount: wonDeals.length,
        currency,
      },
      source: 'Verified Deal Conversion Ledger',
      sourceType: 'crm',
      dateRange: rangeLabel,
      lastUpdated: deals[0]?.updated_at || new Date().toISOString(),
      status: deals.length > 0 ? 'connected' : 'empty',
      statusMessage: 'Direct customer deal pipeline records.',
      setupHref: '/deals',
    },
    automationHealth: {
      value: {
        activeWorkflows: activeWorkflowsCount,
        totalExecutions: totalExecs,
        succeededExecutions,
        failedExecutions,
        reliabilityRate,
      },
      source: 'NexusFlow Event Automation Engine',
      sourceType: 'automations',
      dateRange: rangeLabel,
      lastUpdated: executions[0]?.started_at || new Date().toISOString(),
      status: workflows.length > 0 ? 'connected' : 'empty',
      statusMessage: `${activeWorkflowsCount} event listener workflows active.`,
      setupHref: '/automations',
    },
    recommendations,
  };
}
