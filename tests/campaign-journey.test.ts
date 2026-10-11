import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get4DCampaignJourneyData } from '../src/lib/actions/journey';
import * as shortsModule from '../src/lib/actions/shorts';
import * as campaignsModule from '../src/lib/actions/campaigns';
import * as dealsModule from '../src/lib/actions/deals';
import * as formsModule from '../src/lib/actions/forms';
import * as seoModule from '../src/lib/actions/seo';
import { ShortsClip, ShortsPublishingJob } from '../src/lib/types/shorts';
import { EmailCampaign, Deal, Form } from '../src/lib/types/crm';
import { SeoWebsite } from '../src/lib/types/seo';

describe('4D Campaign Journey — Coordinates & Multi-Channel Engine', () => {
  const testWorkspace = 'ws-journey-test';

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('synthesizes campaign touchpoints across all four 4D coordinates', async () => {
    const mockClips: ShortsClip[] = [
      {
        id: 'clip-journey-1',
        workspace_id: testWorkspace,
        project_id: 'proj-1',
        title: 'Viral YouTube Short',
        duration_seconds: 45,
        virality_score: 92,
        render_status: 'rendered',
        validation_status: 'passed',
        start_time: 0,
        end_time: 45,
        crop_mode: 'blur_padding',
        subtitles_enabled: true,
        subtitles_style: { fontSize: 38, color: '#FFF', background: '', fontFamily: 'Inter', positionY: 72 },
        render_progress: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockJobs: ShortsPublishingJob[] = [
      {
        id: 'job-1',
        workspace_id: testWorkspace,
        clip_id: 'clip-journey-1',
        platform: 'youtube',
        title: 'Scheduled Shorts Release',
        hashtags: ['#marketing'],
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'scheduled',
        retry_count: 0,
        idempotency_key: 'key-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockCampaigns = [
      {
        id: 'email-camp-1',
        workspace_id: testWorkspace,
        name: 'Monthly Newsletter Announcement',
        subject: 'New features live!',
        preview_text: 'Check out the update',
        content_html: '<p>Update</p>',
        status: 'sent' as const,
        delivered_count: 1250,
        opened_count: 550,
        clicked_count: 180,
        unsubscribed_count: 2,
        recipient_count: 1300,
        scheduled_for: null,
        sent_at: new Date().toISOString(),
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ] as any as EmailCampaign[];

    const mockDeals = [
      {
        id: 'deal-1',
        workspace_id: testWorkspace,
        contact_id: null,
        company_id: null,
        title: 'Enterprise Growth Tier Deal',
        amount: 15000,
        currency: '$',
        stage: 'closed_won' as const,
        probability: 100,
        expected_close_date: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ] as any as Deal[];

    const mockForms = [
      {
        id: 'form-1',
        workspace_id: testWorkspace,
        title: 'Strategy Session Form',
        slug: 'strategy-session',
        description: 'Book consultation',
        fields: [],
        is_published: true,
        success_message: 'Thanks',
        redirect_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submissions_count: 28,
      },
    ] as any as Form[];

    const mockWebsites = [
      {
        id: 'site-1',
        workspace_id: testWorkspace,
        domain: 'example.com',
        created_at: new Date().toISOString(),
      },
    ] as any as SeoWebsite[];

    vi.spyOn(shortsModule, 'getShortsClips').mockResolvedValue(mockClips);
    vi.spyOn(shortsModule, 'getPublishingJobs').mockResolvedValue(mockJobs);
    vi.spyOn(campaignsModule, 'getCampaigns').mockResolvedValue(mockCampaigns);
    vi.spyOn(dealsModule, 'getDeals').mockResolvedValue(mockDeals);
    vi.spyOn(formsModule, 'getForms').mockResolvedValue(mockForms);
    vi.spyOn(seoModule, 'getSeoWebsites').mockResolvedValue(mockWebsites);

    const journey = await get4DCampaignJourneyData(testWorkspace);

    expect(journey).toBeDefined();
    expect(journey.activities.length).toBeGreaterThanOrEqual(4);

    // Verify Dimension 2: Channel classification
    const channels = new Set(journey.activities.map((a) => a.channel));
    expect(channels.has('video')).toBe(true);
    expect(channels.has('email')).toBe(true);
    expect(channels.has('crm')).toBe(true);
    expect(channels.has('forms')).toBe(true);
    expect(channels.has('seo')).toBe(true);

    // Verify Dimension 3: Customer stage mapping
    const videoNode = journey.activities.find((a) => a.channel === 'video');
    expect(videoNode?.stage).toBe('discover');

    const emailNode = journey.activities.find((a) => a.channel === 'email');
    expect(emailNode?.stage).toBe('consider');

    const dealNode = journey.activities.find((a) => a.channel === 'crm');
    expect(dealNode?.stage).toBe('convert');

    // Verify Dimension 4: Verified real outcomes
    expect(emailNode?.outcome.primaryValue).toMatch(/% Open/);
    expect(dealNode?.outcome.primaryValue).toContain('$ 15,000');
    expect(dealNode?.outcome.metricType).toBe('revenue');

    // Verify Summary statistics
    expect(journey.summary.activeChannelsCount).toBe(5);
    expect(journey.summary.pipelineValueGenerated).toBe(15000);
    expect(journey.summary.totalLeadsGenerated).toBe(28);
    expect(journey.summary.scheduledCount).toBe(1);
  });

  it('truthfully handles empty workspaces without fabricating data', async () => {
    vi.spyOn(shortsModule, 'getShortsClips').mockResolvedValue([]);
    vi.spyOn(shortsModule, 'getPublishingJobs').mockResolvedValue([]);
    vi.spyOn(campaignsModule, 'getCampaigns').mockResolvedValue([]);
    vi.spyOn(dealsModule, 'getDeals').mockResolvedValue([]);
    vi.spyOn(formsModule, 'getForms').mockResolvedValue([]);
    vi.spyOn(seoModule, 'getSeoWebsites').mockResolvedValue([]);

    const journey = await get4DCampaignJourneyData('ws-empty-new');
    expect(journey.activities).toEqual([]);
    expect(journey.summary.totalActivities).toBe(0);
    expect(journey.summary.totalLeadsGenerated).toBe(0);
    expect(journey.summary.pipelineValueGenerated).toBe(0);
  });
});
