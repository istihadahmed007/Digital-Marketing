import { describe, it, expect, beforeEach } from 'vitest';
import { initTestStore } from '@/lib/security/test-mock-store';
import { runWithTestAuth } from '@/lib/security/auth-context';
import { getMarketingDashboardMetrics } from '@/lib/actions/dashboard';
import {
  generateStudioContentAction,
  saveSocialPost,
  getSocialPosts,
  updatePostApproval,
  schedulePost,
  publishPostNow,
  duplicatePost,
  deletePost,
} from '@/lib/actions/content-studio';
import { GROWTHPILOT_PRIMARY_WORKFLOWS } from '@/lib/automations/seed-workflows';
import { AiClient } from '@/lib/integrations/ai/client';

describe('GrowthPilot AI — Production Suite Verification', () => {
  const TEST_WORKSPACE = 'ws-growthpilot-test';
  const TEST_SESSION = {
    user: { id: 'usr-marketing-director', email: 'director@growthpilot.ai' },
    workspaceId: TEST_WORKSPACE,
    role: 'owner' as const,
    memberships: [{ workspace_id: TEST_WORKSPACE, role: 'owner' as const }],
  };

  beforeEach(() => {
    initTestStore();
  });

  describe('1. Truthful Marketing Dashboard Engine', () => {
    it('returns honest disconnected states for unconfigured GA4 and GSC integrations without fake stats', async () => {
      const data = await getMarketingDashboardMetrics(TEST_WORKSPACE, '30d', 'all');

      expect(data.workspaceId).toBe(TEST_WORKSPACE);
      expect(data.dateRange).toBe('30d');
      expect(data.websiteSessions.status).toBe('disconnected');
      expect(data.websiteSessions.statusMessage).toContain('Google Analytics 4 is not connected');
      expect(data.organicSearch.status).toBe('disconnected');
      expect(data.organicSearch.statusMessage).toContain('Google Search Console is not connected');
      expect(data.recommendations.length).toBeGreaterThan(0);
      expect(data.recommendations.some((r) => r.id === 'rec-ga4')).toBe(true);
    });

    it('computes CRM pipeline metrics and automation reliability without crashing', async () => {
      const data = await getMarketingDashboardMetrics(TEST_WORKSPACE, '7d', 'all');

      expect(data.crmLeads.sourceType).toBe('crm');
      expect(data.crmLeads.value).toHaveProperty('totalContacts');
      expect(data.crmLeads.value).toHaveProperty('qualifiedLeads');
      expect(data.pipelineRevenue.value).toHaveProperty('totalPipelineValue');
      expect(data.pipelineRevenue.value).toHaveProperty('wonRevenue');
      expect(data.automationHealth.value).toHaveProperty('reliabilityRate');
      expect(typeof data.automationHealth.value.reliabilityRate).toBe('number');
    });
  });

  describe('2. AI Content Studio & Bilingual Generation', () => {
    it('generates multi-variation bilingual content in Bangla and English with hooks and CTAs', async () => {
      await runWithTestAuth(TEST_SESSION, async () => {
        const res = await generateStudioContentAction(TEST_WORKSPACE, {
          platform: 'facebook',
          topicOrPage: 'Marketing Automation Bangladesh',
          sourceType: 'service',
          targetUrl: 'https://digi.vartualtutor.com',
          language: 'both',
          brandVoice: 'persuasive',
          variationsCount: 2,
        });

        expect(res.success).toBe(true);
        expect(res.variations.length).toBe(2);

        const firstVar = res.variations[0];
        expect(firstVar.hook).toBeTruthy();
        expect(firstVar.hookBn).toBeTruthy();
        expect(firstVar.body).toBeTruthy();
        expect(firstVar.bodyBn).toBeTruthy();
        expect(firstVar.hashtags.length).toBeGreaterThan(0);
        expect(firstVar.callToAction).toBeTruthy();
      });
    });

    it('generates scene-by-scene storyboard for vertical video formats (YouTube Shorts / TikTok)', async () => {
      await runWithTestAuth(TEST_SESSION, async () => {
        const res = await generateStudioContentAction(TEST_WORKSPACE, {
          platform: 'youtube_shorts',
          topicOrPage: 'Lead Generation Blueprint',
          sourceType: 'campaign',
          language: 'both',
          brandVoice: 'educational',
          variationsCount: 1,
        });

        expect(res.success).toBe(true);
        const variation = res.variations[0];
        expect(variation.scenes).toBeDefined();
        expect(variation.scenes?.length).toBe(4);
        expect(variation.scenes?.[0]).toHaveProperty('timeRange');
        expect(variation.scenes?.[0]).toHaveProperty('visualShot');
        expect(variation.scenes?.[0]).toHaveProperty('audioVoiceover');
      });
    });
  });

  describe('3. Marketing Calendar & Idempotent Publishing System', () => {
    it('creates, schedules, and manages post approvals in the test store', async () => {
      await runWithTestAuth(TEST_SESSION, async () => {
        // 1. Create Post
        const saveRes = await saveSocialPost(TEST_WORKSPACE, {
          title: 'Ramadan Growth Campaign',
          platform: 'facebook',
          content: 'Excited to announce our new automated marketing platform.',
          content_bn: 'আমাদের নতুন অটোমেশন প্ল্যাটফর্ম আনুষ্ঠানিকভাবে উন্মোচিত হলো।',
          approval_status: 'draft',
        });

        expect(saveRes.success).toBe(true);
        expect(saveRes.post?.id).toBeDefined();
        const postId = saveRes.post!.id;

        // 2. Schedule Post
        const scheduleRes = await schedulePost(
          TEST_WORKSPACE,
          postId,
          '2026-11-01T10:00:00Z',
          'Asia/Dhaka'
        );
        expect(scheduleRes.success).toBe(true);

        // 3. Update Approval
        const approveRes = await updatePostApproval(TEST_WORKSPACE, postId, 'approved');
        expect(approveRes.success).toBe(true);

        // 4. Verify post retrieval
        const allPosts = await getSocialPosts(TEST_WORKSPACE);
        expect(allPosts.length).toBe(1);
        expect(allPosts[0].approval_status).toBe('approved');
        expect(allPosts[0].publishing_status).toBe('scheduled');
      });
    });

    it('returns honest manual fallback instructions when official API is not connected', async () => {
      await runWithTestAuth(TEST_SESSION, async () => {
        const saveRes = await saveSocialPost(TEST_WORKSPACE, {
          title: 'Unconnected Channel Post',
          platform: 'instagram',
          content: 'Test caption',
          connected_account_id: null, // Not connected
        });

        const postId = saveRes.post!.id;
        const publishRes = await publishPostNow(TEST_WORKSPACE, postId);

        expect(publishRes.success).toBe(true);
        expect(publishRes.isManualFallback).toBe(true);
        expect(publishRes.instructions).toContain('Manual Publishing Fallback for INSTAGRAM');
      });
    });

    it('protects against duplicate publishing via idempotency check', async () => {
      await runWithTestAuth(TEST_SESSION, async () => {
        const saveRes = await saveSocialPost(TEST_WORKSPACE, {
          title: 'Already Published Post',
          platform: 'youtube_shorts',
          content: 'Viral tip',
          publishing_status: 'published',
          published_url: 'https://youtube.com/shorts/xyz123',
        });

        const postId = saveRes.post!.id;
        const secondPublishRes = await publishPostNow(TEST_WORKSPACE, postId);

        expect(secondPublishRes.success).toBe(true);
        expect(secondPublishRes.publishedUrl).toBe('https://youtube.com/shorts/xyz123');
        expect(secondPublishRes.instructions).toContain('Idempotency guard prevented duplicate dispatch');
      });
    });

    it('duplicates and deletes posts cleanly', async () => {
      await runWithTestAuth(TEST_SESSION, async () => {
        const saveRes = await saveSocialPost(TEST_WORKSPACE, {
          title: 'Original Post',
          platform: 'facebook',
          content: 'Original Content',
        });

        const originalId = saveRes.post!.id;
        const dupRes = await duplicatePost(TEST_WORKSPACE, originalId);

        expect(dupRes.success).toBe(true);
        expect(dupRes.newPost?.title).toContain('Original Post (Copy)');
        expect(dupRes.newPost?.publishing_status).toBe('draft');

        const delRes = await deletePost(TEST_WORKSPACE, originalId);
        expect(delRes.success).toBe(true);

        const remaining = await getSocialPosts(TEST_WORKSPACE);
        expect(remaining.some((p) => p.id === originalId)).toBe(false);
      });
    });
  });

  describe('4. Visual Automation Engine — Priority Workflows A through F', () => {
    it('defines all 6 primary workflows with valid node graphs and triggers', () => {
      expect(GROWTHPILOT_PRIMARY_WORKFLOWS.length).toBe(6);

      const workflowNames = GROWTHPILOT_PRIMARY_WORKFLOWS.map((w) => w.name);
      expect(workflowNames.some((n) => n.includes('Workflow A'))).toBe(true);
      expect(workflowNames.some((n) => n.includes('Workflow B'))).toBe(true);
      expect(workflowNames.some((n) => n.includes('Workflow C'))).toBe(true);
      expect(workflowNames.some((n) => n.includes('Workflow D'))).toBe(true);
      expect(workflowNames.some((n) => n.includes('Workflow E'))).toBe(true);
      expect(workflowNames.some((n) => n.includes('Workflow F'))).toBe(true);

      for (const wf of GROWTHPILOT_PRIMARY_WORKFLOWS) {
        expect(wf.nodes.length).toBeGreaterThan(1);
        expect(wf.edges.length).toBeGreaterThan(0);
        // Verify trigger node exists
        const triggerNode = wf.nodes.find((n) => n.id === 'node_trigger');
        expect(triggerNode).toBeDefined();
      }
    });
  });
});
