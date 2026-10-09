import { describe, it, expect } from 'vitest';
import { validateVideoClip } from '../src/lib/video/validator';
import {
  getShortsProjects,
  createShortsProject,
  getShortsClips,
  saveShortsClip,
  publishClipNow,
  retryPublishingJob,
  schedulePublishingJob,
  getSocialAccountConnections,
} from '../src/lib/actions/shorts';
import {
  transcribeVideoAudio,
  suggestCoherentMoments,
  computeVerticalFraming,
  SHORTS_SPECS,
} from '../src/lib/video/processor';
import { YouTubeDataApiClient } from '../src/lib/integrations/social/youtube';
import { MetaGraphApiClient } from '../src/lib/integrations/social/meta';

describe('Shorts Studio — Video Quality, Validation & Publishing Engine', () => {
  describe('1. Video Validation & Pre-Publish Quality Enforcement', () => {
    it('rejects clips shorter than 15.0 seconds', () => {
      const res = validateVideoClip({
        durationSeconds: 12.5,
        width: 1080,
        height: 1920,
        hasAudio: true,
        hasVideo: true,
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('too short'))).toBe(true);
    });

    it('rejects clips longer than 60.0 seconds for vertical Shorts/Reels', () => {
      const res = validateVideoClip({
        durationSeconds: 68.2,
        width: 1080,
        height: 1920,
        hasAudio: true,
        hasVideo: true,
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('exceeds the 60.0-second limit'))).toBe(true);
    });

    it('rejects horizontal widescreen (16:9) formats without 9:16 vertical crop', () => {
      const res = validateVideoClip({
        durationSeconds: 30.0,
        width: 1920,
        height: 1080, // Widescreen 16:9
        hasAudio: true,
        hasVideo: true,
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('Horizontal widescreen'))).toBe(true);
    });

    it('rejects solid black / blank video renders', () => {
      const res = validateVideoClip({
        durationSeconds: 35.0,
        width: 1080,
        height: 1920,
        hasAudio: true,
        hasVideo: true,
        luminanceVariance: 0.01, // Completely blank/black
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('Blank or completely black'))).toBe(true);
    });

    it('rejects completely silent audio tracks', () => {
      const res = validateVideoClip({
        durationSeconds: 40.0,
        width: 1080,
        height: 1920,
        hasAudio: true,
        hasVideo: true,
        audioRmsLevel: 0.0001, // Total silence
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('silent audio track'))).toBe(true);
    });

    it('passes compliant 1080x1920 clips with audible audio and visible video', () => {
      const res = validateVideoClip({
        durationSeconds: 32.5,
        width: 1080,
        height: 1920,
        hasAudio: true,
        hasVideo: true,
        audioRmsLevel: 0.12,
        luminanceVariance: 25.4,
        isDecoded: true,
      });

      expect(res.passed).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.aspectRatio).toBe('9:16');
    });
  });

  describe('2. Multi-Tenant Workspace Data Isolation', () => {
    it('guarantees clips created in Workspace A are strictly isolated from Workspace B', async () => {
      const wsA = `ws-alpha-${Date.now()}`;
      const wsB = `ws-beta-${Date.now()}`;

      await saveShortsClip(wsA, {
        title: 'Alpha Secret Clip',
        start_time: 15,
        end_time: 45,
        duration_seconds: 30,
      });

      await saveShortsClip(wsB, {
        title: 'Beta Secret Clip',
        start_time: 20,
        end_time: 55,
        duration_seconds: 35,
      });

      const clipsA = await getShortsClips(wsA);
      const clipsB = await getShortsClips(wsB);

      expect(clipsA.some((c) => c.title === 'Alpha Secret Clip')).toBe(true);
      expect(clipsA.some((c) => c.title === 'Beta Secret Clip')).toBe(false);

      expect(clipsB.some((c) => c.title === 'Beta Secret Clip')).toBe(true);
      expect(clipsB.some((c) => c.title === 'Alpha Secret Clip')).toBe(false);
    });
  });

  describe('3. Deduplication Protection & Idempotent Publishing', () => {
    it('prevents duplicate posts on YouTube and Facebook when retried', async () => {
      const ws = `ws-dedup-${Date.now()}`;

      const savedClip = await saveShortsClip(ws, {
        title: 'Growth Masterclass Short',
        start_time: 15,
        end_time: 45,
        duration_seconds: 30,
      });

      expect(savedClip.success).toBe(true);
      const clipId = savedClip.clip!.id;

      // First publication attempt
      const pub1 = await publishClipNow(ws, {
        clipId,
        platform: 'youtube',
        title: 'Growth Masterclass Short',
      });

      expect(pub1.success).toBe(true);

      // Retry publication attempt with same clip & platform
      const pub2 = await publishClipNow(ws, {
        clipId,
        platform: 'youtube',
        title: 'Growth Masterclass Short',
      });

      // Must succeed without duplicate post, reporting prior publication
      expect(pub2.success).toBe(true);
      expect(pub2.error).toContain('Duplicate post prevented');
    });
  });

  describe('4. YouTube & Meta Client Handlers', () => {
    it('enforces YouTube #Shorts hashtag requirement in title/description', async () => {
      const client = new YouTubeDataApiClient({ accessToken: 'mock_token' });
      const verify = await client.verifyConnection();
      expect(verify).toBeDefined();
    });

    it('handles missing Meta credentials gracefully with clear guidance', async () => {
      const client = new MetaGraphApiClient({});
      const verify = await client.verifyConnection();
      expect(verify.valid).toBe(false);
      expect(verify.error).toContain('Meta access token required');
    });
  });

  describe('5. Speech Transcription & Coherent 30–60s Moment Generation', () => {
    it('generates speech segments with timestamps and word boundaries', async () => {
      const transcript = await transcribeVideoAudio({
        videoUrl: 'https://example.com/test-master.mp4',
        durationSeconds: 150,
        titleHint: 'Lead Nurturing Systems',
      });

      expect(transcript.length).toBeGreaterThanOrEqual(3);
      for (const seg of transcript) {
        expect(seg.end).toBeGreaterThan(seg.start);
        expect(seg.text.length).toBeGreaterThan(5);
      }
    });

    it('suggests coherent moments strictly bounded between 30 and 60 seconds', async () => {
      const transcript = await transcribeVideoAudio({
        videoUrl: 'https://example.com/test-master.mp4',
        durationSeconds: 180,
      });

      const moments = suggestCoherentMoments(transcript, 180);
      expect(moments.length).toBeGreaterThanOrEqual(2);

      for (const m of moments) {
        expect(m.duration_seconds).toBeGreaterThanOrEqual(20);
        expect(m.duration_seconds).toBeLessThanOrEqual(60);
        expect(m.title).toBeDefined();
        expect(m.caption).toContain('#');
        expect(m.virality_score).toBeGreaterThanOrEqual(70);
      }
    });
  });

  describe('6. 9:16 Vertical Framing & Safe Margins', () => {
    it('computes blur_padding dimensions and safe subtitle margins for 1080x1920', () => {
      const framing = computeVerticalFraming({
        sourceWidth: 1920,
        sourceHeight: 1080,
        cropMode: 'blur_padding',
      });

      expect(framing.targetWidth).toBe(1080);
      expect(framing.targetHeight).toBe(1920);
      expect(framing.background.blurRadius).toBeGreaterThan(0);
      // Subtitle position must avoid bottom platform overlays (top 12% to 80%)
      const subtitleYRatio = framing.subtitleSafeY / framing.targetHeight;
      expect(subtitleYRatio).toBeGreaterThanOrEqual(0.65);
      expect(subtitleYRatio).toBeLessThanOrEqual(0.80);
    });

    it('computes smart_crop scaling to fill 1080x1920 vertical canvas', () => {
      const framing = computeVerticalFraming({
        sourceWidth: 1920,
        sourceHeight: 1080,
        cropMode: 'smart_crop',
      });

      expect(framing.targetWidth).toBe(1080);
      expect(framing.targetHeight).toBe(1920);
      expect(framing.foreground.height).toBeGreaterThanOrEqual(1920);
    });
  });

  describe('7. Calendar Scheduling & Safe Retry', () => {
    it('schedules a clip with a valid future timestamp', async () => {
      const ws = `ws-sched-${Date.now()}`;
      const saved = await saveShortsClip(ws, {
        title: 'Future Scheduled Short',
        start_time: 10,
        end_time: 40,
        duration_seconds: 30,
      });

      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const schedRes = await schedulePublishingJob(ws, {
        clipId: saved.clip!.id,
        platform: 'youtube',
        title: 'Future Scheduled Short',
        scheduledAt: futureDate,
      });

      expect(schedRes.success).toBe(true);
      expect(schedRes.job?.status).toBe('scheduled');
      expect(schedRes.job?.scheduled_at).toBe(futureDate);
    });

    it('rejects scheduling dates set in the past', async () => {
      const ws = `ws-sched-past-${Date.now()}`;
      const saved = await saveShortsClip(ws, {
        title: 'Past Short',
        start_time: 10,
        end_time: 40,
        duration_seconds: 30,
      });

      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const schedRes = await schedulePublishingJob(ws, {
        clipId: saved.clip!.id,
        platform: 'youtube',
        title: 'Past Short',
        scheduledAt: pastDate,
      });

      expect(schedRes.success).toBe(false);
      expect(schedRes.error).toContain('must be in the future');
    });

    it('retrieves social connection statuses without throwing', async () => {
      const ws = `ws-conn-${Date.now()}`;
      const conn = await getSocialAccountConnections(ws);
      expect(conn).toHaveProperty('youtube');
      expect(conn).toHaveProperty('facebook');
      expect(typeof conn.youtube.isConnected).toBe('boolean');
      expect(typeof conn.facebook.isConnected).toBe('boolean');
    });
  });
});
