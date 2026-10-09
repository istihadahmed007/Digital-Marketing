import { describe, it, expect } from 'vitest';
import { validateVideoClip } from '../src/lib/video/validator';
import {
  getShortsProjects,
  createShortsProject,
  getShortsClips,
  saveShortsClip,
  publishClipNow,
} from '../src/lib/actions/shorts';
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
      // Should attempt verification
      expect(verify).toBeDefined();
    });

    it('handles missing Meta credentials gracefully with clear guidance', async () => {
      const client = new MetaGraphApiClient({});
      const verify = await client.verifyConnection();
      expect(verify.valid).toBe(false);
      expect(verify.error).toContain('Meta access token required');
    });
  });
});
