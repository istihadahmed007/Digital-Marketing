'use server';

import { createClient } from '@/lib/supabase/server';
import {
  JourneyActivity,
  JourneySummaryStats,
} from '@/lib/types/journey';
import { getCampaigns } from '@/lib/actions/campaigns';
import { getShortsClips, getPublishingJobs } from '@/lib/actions/shorts';
import { getForms } from '@/lib/actions/forms';
import { getDeals } from '@/lib/actions/deals';
import { getSeoWebsites } from '@/lib/actions/seo';

export async function get4DCampaignJourneyData(
  workspaceId: string
): Promise<{
  activities: JourneyActivity[];
  summary: JourneySummaryStats;
}> {
  const activities: JourneyActivity[] = [];

  // 1. Fetch real Video / Shorts data
  try {
    const [clips, publishingJobs] = await Promise.all([
      getShortsClips(workspaceId),
      getPublishingJobs(workspaceId),
    ]);

    // Map publishing jobs or rendered clips to Discover stage
    for (const job of publishingJobs) {
      const isScheduled = job.status === 'scheduled';
      const isPublished = job.status === 'published';

      activities.push({
        id: `job-${job.id}`,
        title: job.title || 'Social Short / Reel',
        description: job.caption || `Published to ${job.platform}`,
        channel: 'video',
        stage: 'discover',
        timeState: isScheduled ? 'scheduled' : isPublished ? 'live' : 'completed',
        date: job.published_at || job.scheduled_at || job.created_at,
        displayDate: new Date(job.published_at || job.scheduled_at || job.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        statusLabel: isScheduled ? 'Scheduled on YouTube' : isPublished ? 'Published Live' : job.status,
        platformBadge: job.platform === 'youtube' ? 'YouTube Shorts' : job.platform === 'facebook' ? 'Facebook Reels' : 'Instagram Reel',
        externalUrl: job.platform_url || undefined,
        internalHref: '/shorts',
        connectionStatus: isPublished ? 'connected' : 'internal',
        outcome: {
          metricType: 'views',
          primaryValue: isPublished ? 'Live on Feed' : isScheduled ? 'Queued' : 'Ready',
          primaryLabel: 'Delivery State',
          secondaryValue: '9:16 Vertical HD',
          secondaryLabel: 'Format',
        },
      });
    }

    // Also include rendered clips that haven't been queued yet
    const unqueuedClips = clips.filter((c) => !publishingJobs.some((j) => j.clip_id === c.id));
    for (const clip of unqueuedClips.slice(0, 5)) {
      activities.push({
        id: `clip-${clip.id}`,
        title: clip.title,
        description: clip.hook_summary || 'Vertical short video ready for distribution',
        channel: 'video',
        stage: 'discover',
        timeState: clip.render_status === 'rendered' ? 'completed' : 'draft',
        date: clip.created_at,
        displayDate: new Date(clip.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        statusLabel: clip.render_status === 'rendered' ? 'Render Completed' : 'Draft In Progress',
        platformBadge: 'Video Studio',
        internalHref: '/shorts',
        connectionStatus: 'internal',
        outcome: {
          metricType: 'rate',
          primaryValue: `${clip.virality_score || 85}/100`,
          primaryLabel: 'Virality Score',
          secondaryValue: `${Math.round(clip.duration_seconds)}s`,
          secondaryLabel: 'Duration',
        },
      });
    }
  } catch (err) {
    console.error('Error loading video journey items:', err);
  }

  // 2. Fetch real Email Campaigns (Consider stage)
  try {
    const campaigns = await getCampaigns(workspaceId);
    for (const camp of campaigns) {
      const isSent = camp.status === 'sent';
      const isScheduled = camp.status === 'scheduled';
      const isDraft = camp.status === 'draft';

      const openRate = camp.delivered_count > 0
        ? Math.round((camp.opened_count / camp.delivered_count) * 100)
        : 0;

      activities.push({
        id: `email-${camp.id}`,
        title: camp.name,
        description: camp.subject || 'Email Broadcast',
        channel: 'email',
        stage: 'consider',
        timeState: isScheduled ? 'scheduled' : isSent ? 'completed' : isDraft ? 'draft' : 'live',
        date: camp.sent_at || camp.scheduled_for || camp.created_at,
        displayDate: new Date(camp.sent_at || camp.scheduled_for || camp.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        statusLabel: isSent ? 'Sent to Subscribers' : isScheduled ? 'Scheduled Send' : 'Draft Campaign',
        platformBadge: 'Email Broadcast',
        internalHref: '/campaigns',
        connectionStatus: isSent ? 'connected' : 'internal',
        outcome: {
          metricType: 'rate',
          primaryValue: isSent ? `${openRate}% Open` : `${camp.recipient_count || 0} Recipients`,
          primaryLabel: isSent ? 'Engagement Rate' : 'Audience Target',
          secondaryValue: `${camp.delivered_count || 0} Delivered`,
          secondaryLabel: 'Confirmed Inboxes',
          rawCount: camp.delivered_count,
        },
      });
    }
  } catch (err) {
    console.error('Error loading email journey items:', err);
  }

  // 3. Fetch real SEO Websites & Tracked Presence (Discover stage)
  try {
    const websites = await getSeoWebsites(workspaceId);
    for (const site of websites) {
      activities.push({
        id: `seo-${site.id}`,
        title: `Search Console: ${site.domain}`,
        description: 'Organic search traffic and keyword visibility tracking',
        channel: 'seo',
        stage: 'discover',
        timeState: 'live',
        date: site.created_at,
        displayDate: 'Continuous',
        statusLabel: 'Rankings Monitored',
        platformBadge: 'Google Search Console',
        internalHref: '/seo/analytics',
        connectionStatus: 'connected',
        outcome: {
          metricType: 'views',
          primaryValue: 'Search Rankings',
          primaryLabel: 'Active Monitoring',
          secondaryValue: site.domain,
          secondaryLabel: 'Target Property',
        },
      });
    }
  } catch (err) {
    console.error('Error loading SEO journey items:', err);
  }

  // 4. Fetch real Inbound Forms (Consider / Convert stage)
  try {
    const forms = await getForms(workspaceId);
    for (const form of forms) {
      activities.push({
        id: `form-${form.id}`,
        title: form.title,
        description: form.description || 'Public lead capture and inquiry form',
        channel: 'forms',
        stage: 'consider',
        timeState: form.is_published ? 'live' : 'draft',
        date: form.created_at,
        displayDate: new Date(form.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        statusLabel: form.is_published ? 'Active Form' : 'Unpublished Draft',
        platformBadge: 'Inbound Form',
        internalHref: '/forms',
        connectionStatus: 'connected',
        outcome: {
          metricType: 'leads',
          primaryValue: `${form.submissions_count || 0} Inquiries`,
          primaryLabel: 'Leads Captured',
          secondaryValue: `${form.fields?.length || 0} Form Fields`,
          secondaryLabel: 'Data Points',
          rawCount: form.submissions_count || 0,
        },
      });
    }
  } catch (err) {
    console.error('Error loading form journey items:', err);
  }

  // 5. Fetch real CRM Deals (Convert stage)
  try {
    const deals = await getDeals(workspaceId);
    for (const deal of deals.slice(0, 10)) {
      const isWon = deal.stage === 'closed_won';
      const isLost = deal.stage === 'closed_lost';

      activities.push({
        id: `deal-${deal.id}`,
        title: deal.title,
        description: `Deal conversion in ${deal.stage.replace(/_/g, ' ')} stage`,
        channel: 'crm',
        stage: 'convert',
        timeState: isWon || isLost ? 'completed' : 'live',
        date: deal.created_at,
        displayDate: new Date(deal.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        statusLabel: isWon ? 'Won Customer' : isLost ? 'Closed Lost' : 'Active Pipeline Deal',
        platformBadge: 'Sales Pipeline',
        internalHref: `/deals/${deal.id}`,
        connectionStatus: 'internal',
        outcome: {
          metricType: 'revenue',
          primaryValue: `${deal.currency || '$'} ${(deal.amount || 0).toLocaleString()}`,
          primaryLabel: 'Opportunity Value',
          secondaryValue: isWon ? 'Won Deal' : deal.stage.toUpperCase(),
          secondaryLabel: 'Pipeline Status',
          rawCount: deal.amount,
        },
      });
    }
  } catch (err) {
    console.error('Error loading deal journey items:', err);
  }

  // Sort activities chronologically (newest first, with scheduled at the top)
  activities.sort((a, b) => {
    if (a.timeState === 'scheduled' && b.timeState !== 'scheduled') return -1;
    if (b.timeState === 'scheduled' && a.timeState !== 'scheduled') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Calculate summary statistics
  const summary: JourneySummaryStats = {
    totalActivities: activities.length,
    scheduledCount: activities.filter((a) => a.timeState === 'scheduled').length,
    liveCount: activities.filter((a) => a.timeState === 'live').length,
    completedCount: activities.filter((a) => a.timeState === 'completed').length,
    activeChannelsCount: new Set(activities.map((a) => a.channel)).size,
    totalLeadsGenerated: activities
      .filter((a) => a.outcome.metricType === 'leads')
      .reduce((sum, a) => sum + (a.outcome.rawCount || 0), 0),
    pipelineValueGenerated: activities
      .filter((a) => a.channel === 'crm')
      .reduce((sum, a) => sum + (a.outcome.rawCount || 0), 0),
  };

  return { activities, summary };
}
