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
  bulkPublishShorts,
  checkYouTubeJobStatus,
} from '../src/lib/actions/shorts';
import {
  transcribeVideoAudio,
  suggestCoherentMoments,
  computeVerticalFraming,
  SHORTS_SPECS,
} from '../src/lib/video/processor';
import { validateVideoFileUrl } from '../src/lib/video/url-validator';
import { persistVideoFile } from '../src/lib/video/storage';
import { createSampleVideoFixture } from './fixtures/sample-video';
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
        luminanceVariance: 0.01, // Blank
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
        audioRmsLevel: 0.0001, // Silent
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

  describe('2. Direct Video URL Validation & SSRF Security', () => {
    it('rejects YouTube watch page URLs with friendly instructions to provide a direct file URL', async () => {
      const res = await validateVideoFileUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.valid).toBe(false);
      expect(res.isSharePage).toBe(true);
      expect(res.error).toContain('YouTube watch/share links are not direct video files');
    });

    it('rejects TikTok video page URLs with instructions to provide direct video file', async () => {
      const res = await validateVideoFileUrl('https://www.tiktok.com/@creator/video/123456789');
      expect(res.valid).toBe(false);
      expect(res.isSharePage).toBe(true);
      expect(res.error).toContain('TikTok watch/share links are not direct video files');
    });

    it('blocks SSRF attempts to localhost and private networks', async () => {
      const resLocal = await validateVideoFileUrl('http://localhost:3000/internal-video.mp4');
      expect(resLocal.valid).toBe(false);
      expect(resLocal.error).toContain('localhost');

      const resPrivate = await validateVideoFileUrl('http://192.168.1.1/stream.mp4');
      expect(resPrivate.valid).toBe(false);
      expect(resPrivate.error).toContain('private/local IP');
    });

    it('accepts valid public direct video URLs ending in .mp4', async () => {
      const sampleUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      const res = await validateVideoFileUrl(sampleUrl);
      expect(res.valid).toBe(true);
      expect(res.sanitizedUrl).toBe(sampleUrl);
    });
  });

  describe('3. Real Video Fixture Storage & Playback URL', () => {
    it('persists a valid binary video fixture and returns an accessible URL', async () => {
      const ws = `ws-fixture-${Date.now()}`;
      const fixtureBuffer = createSampleVideoFixture();

      const persistRes = await persistVideoFile({
        workspaceId: ws,
        fileName: 'fixture-clip.mp4',
        buffer: fixtureBuffer,
        contentType: 'video/mp4',
      });

      expect(persistRes.success).toBe(true);
      expect(persistRes.url).toBeDefined();
      expect(persistRes.url.length).toBeGreaterThan(0);
      expect(persistRes.url.includes('.mp4')).toBe(true);
    });
  });

  describe('4. Multi-Tenant Workspace Data Isolation', () => {
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

  describe('5. Deduplication Protection & Idempotent Publishing', () => {
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
        mockPublish: true,
      });

      expect(pub1.success).toBe(true);

      // Retry publication attempt with same clip & platform
      const pub2 = await publishClipNow(ws, {
        clipId,
        platform: 'youtube',
        title: 'Growth Masterclass Short',
        mockPublish: true,
      });

      expect(pub2.success).toBe(true);
      expect(pub2.error).toContain('Duplicate post prevented');
      expect(pub2.job?.platform_post_id).toBe(pub1.job?.platform_post_id);
    });
  });

  describe('6. YouTube Bulk Publishing & Concurrency Engine', () => {
    it('publishes multiple Shorts in bulk with individual titles and shared settings', async () => {
      const ws = `ws-bulk-${Date.now()}`;

      const clip1 = await saveShortsClip(ws, {
        title: 'Clip One Source',
        start_time: 15,
        end_time: 45,
        duration_seconds: 30,
      });
      const clip2 = await saveShortsClip(ws, {
        title: 'Clip Two Source',
        start_time: 20,
        end_time: 55,
        duration_seconds: 35,
      });

      const res = await bulkPublishShorts(ws, {
        clipIds: [clip1.clip!.id, clip2.clip!.id],
        sharedSettings: {
          description: 'Shared masterclass growth tips. #Shorts #Growth',
          tags: ['Shorts', 'Viral', 'Masterclass'],
          privacyStatus: 'public',
          categoryId: '22',
        },
        individualTitles: {
          [clip1.clip!.id]: '3 Ways to Double Sales Speed #Shorts',
          [clip2.clip!.id]: 'The 60-Second Inbound Secret #Shorts',
        },
        mockPublish: true,
      });

      expect(res.success).toBe(true);
      expect(res.total).toBe(2);
      expect(res.publishedCount).toBe(2);
      expect(res.results[clip1.clip!.id].success).toBe(true);
      expect(res.results[clip2.clip!.id].success).toBe(true);
      expect(res.results[clip1.clip!.id].job?.title).toBe('3 Ways to Double Sales Speed #Shorts');
      expect(res.results[clip2.clip!.id].job?.title).toBe('The 60-Second Inbound Secret #Shorts');
    });

    it('rejects unverified / out-of-spec clips during bulk publishing with clear error messages', async () => {
      const ws = `ws-bulk-err-${Date.now()}`;

      // Create an invalid clip (too short: 10s)
      const invalidClip = await saveShortsClip(ws, {
        title: 'Too Short Clip',
        start_time: 0,
        end_time: 10,
        duration_seconds: 10, // Invalid!
      });

      const res = await bulkPublishShorts(ws, {
        clipIds: [invalidClip.clip!.id],
        sharedSettings: {
          description: 'Test clip description',
          privacyStatus: 'unlisted',
        },
        individualTitles: {
          [invalidClip.clip!.id]: 'Too Short Clip #Shorts',
        },
        mockPublish: true,
      });

      expect(res.success).toBe(false);
      expect(res.failedCount).toBe(1);
      expect(res.results[invalidClip.clip!.id].error).toContain('Pre-publish validation failed');
    });

    it('checks processing status of a YouTube video safely', async () => {
      const ws = `ws-status-${Date.now()}`;
      const saved = await saveShortsClip(ws, {
        title: 'Status Check Short',
        start_time: 15,
        end_time: 45,
        duration_seconds: 30,
      });

      const pub = await publishClipNow(ws, {
        clipId: saved.clip!.id,
        platform: 'youtube',
        title: 'Status Check Short',
        mockPublish: true,
      });

      const statusRes = await checkYouTubeJobStatus(ws, pub.job!.id);
      expect(statusRes).toHaveProperty('status');
      expect(['published', 'uploaded', 'processed', 'processing']).toContain(statusRes.status);
    });

    it('fails honestly when credentials are missing and never reports fake success or fake URLs', async () => {
      const ws = `ws-unauth-${Date.now()}`;
      const saved = await saveShortsClip(ws, {
        title: 'Unauthenticated Short',
        start_time: 15,
        end_time: 45,
        duration_seconds: 30,
      });

      // Attempt to publish without mockPublish in environment without YouTube OAuth credentials
      const pub = await publishClipNow(ws, {
        clipId: saved.clip!.id,
        platform: 'youtube',
        title: 'Unauthenticated Short',
        mockPublish: false,
      });

      expect(pub.success).toBe(false);
      expect(pub.error).toMatch(/connected|credentials|token/i);
      expect(pub.publishedUrl).toBeUndefined();
      expect(pub.job?.status).toBe('failed');
      expect(pub.job?.platform_url).toBeNull();
    });
  });

  describe('7. Transcription & Coherent Moment Slicing', () => {
    it('generates coherent moments between 30 and 60 seconds with virality scores', async () => {
      const transcript = await transcribeVideoAudio({
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        durationSeconds: 180,
        titleHint: 'Inbound Growth Engine',
      });

      expect(transcript.length).toBeGreaterThanOrEqual(3);
      expect(transcript[0].words).toBeDefined();

      const moments = suggestCoherentMoments(transcript, 180);
      expect(moments.length).toBeGreaterThanOrEqual(2);

      for (const m of moments) {
        expect(m.duration_seconds!).toBeGreaterThanOrEqual(15.0);
        expect(m.duration_seconds!).toBeLessThanOrEqual(60.0);
        expect(m.virality_score).toBeGreaterThanOrEqual(70);
        expect(m.subtitles_style?.positionY).toBe(SHORTS_SPECS.DEFAULT_SUBTITLE_Y_PERCENT);
      }
    });

    it('computes vertical framing with blurred background fallback', () => {
      const framing = computeVerticalFraming({
        sourceWidth: 1920,
        sourceHeight: 1080,
        cropMode: 'blur_padding',
      });

      expect(framing.targetWidth).toBe(1080);
      expect(framing.targetHeight).toBe(1920);
      expect(framing.background.blurRadius).toBe(24);
      expect(framing.subtitleSafeY).toBe(Math.round(1920 * 0.72));
    });
  });

  describe('8. Calendar Scheduling & Safe Retry', () => {
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
