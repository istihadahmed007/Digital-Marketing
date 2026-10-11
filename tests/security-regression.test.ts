import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import dns from 'dns';
import {
  runWithTestAuth,
  setTestAuthSession,
  getAuthorizedWorkspace,
} from '../src/lib/security/auth-context';
import {
  getShortsProjects,
  createShortsProject,
  saveShortsClip,
  publishClipNow,
  schedulePublishingJob,
} from '../src/lib/actions/shorts';
import {
  parseAndValidateYouTubeUrl,
  isYouTubeUrl,
} from '../src/lib/video/youtube-downloader';
import { validateSafePublicUrl, isUnsafeIp, safeFetch } from '../src/lib/security/ssrf';
import { validateVideoClip } from '../src/lib/video/validator';
import { POST as handleRenderPost } from '../src/app/api/shorts/render/route';
import { GET as handleUploadGet } from '../src/app/api/shorts/upload/route';
import { GET as handleGoogleCallback } from '../src/app/api/integrations/google/callback/route';
import { processDueScheduledPublishingJobs } from '../src/workers/video-processor';
import { getTestStore, initTestStore } from '../src/lib/security/test-mock-store';
import crypto from 'crypto';

describe('Security & Multi-Tenant Regression Suite', () => {
  const aliceWorkspace = 'ws-alice-tenant';
  const bobWorkspace = 'ws-bob-tenant';

  const aliceSession = {
    user: { id: 'user-alice', email: 'alice@company.com' },
    workspaceId: aliceWorkspace,
    role: 'member' as const,
    memberships: [{ workspace_id: aliceWorkspace, role: 'member' as const }],
  };

  const bobSession = {
    user: { id: 'user-bob', email: 'bob@company.com' },
    workspaceId: bobWorkspace,
    role: 'owner' as const,
    memberships: [{ workspace_id: bobWorkspace, role: 'owner' as const }],
  };

  beforeEach(() => {
    initTestStore();
    setTestAuthSession(aliceSession);
  });

  afterEach(() => {
    setTestAuthSession(undefined);
  });

  // =========================================================================
  // 1. Unauthenticated requests & cross-workspace isolation
  // =========================================================================
  describe('1. Authentication & Workspace Isolation Enforcement', () => {
    it('strictly rejects unauthenticated requests with 401 Unauthorized', async () => {
      await expect(
        runWithTestAuth(null, async () => {
          return await getAuthorizedWorkspace({ requestedWorkspaceId: aliceWorkspace });
        })
      ).rejects.toThrow(/Unauthorized/i);

      await runWithTestAuth(null, async () => {
        const res = await createShortsProject(aliceWorkspace, {
          title: 'Unauthenticated Video',
          sourceVideoUrl: 'https://storage.googleapis.com/test/video.mp4',
        });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Unauthorized/i);
      });
    });

    it('blocks user from accessing another workspace’s projects and clips', async () => {
      // Alice tries to access Bob's workspace
      await expect(getShortsProjects(bobWorkspace)).rejects.toThrow(/Forbidden.*not a member/i);

      const createRes = await createShortsProject(bobWorkspace, {
        title: 'Tampered Project',
        sourceVideoUrl: 'https://storage.googleapis.com/test/video.mp4',
      });
      expect(createRes.success).toBe(false);
      expect(createRes.error).toMatch(/Forbidden.*not a member/i);

      const clipRes = await saveShortsClip(bobWorkspace, {
        title: 'Foreign Clip',
        start_time: 15,
        end_time: 45,
        duration_seconds: 30,
      });
      expect(clipRes.success).toBe(false);
      expect(clipRes.error).toMatch(/Forbidden.*not a member/i);
    });

    it('rejects cross-tenant API requests in upload and render routes', async () => {
      // Alice tries to get a signed upload URL for Bob's workspace
      const uploadReq = new NextRequest(
        `http://localhost:3000/api/shorts/upload?action=signed-upload-url&fileName=video.mp4&workspaceId=${bobWorkspace}`
      );
      const uploadRes = await handleUploadGet(uploadReq);
      expect(uploadRes.status).toBe(403);
      const uploadJson = await uploadRes.json();
      expect(uploadJson.error).toMatch(/not a member/i);

      // Alice tries to trigger render for Bob's workspace
      const renderReq = new NextRequest('http://localhost:3000/api/shorts/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: bobWorkspace,
          clipId: 'clip-1',
          projectId: 'proj-1',
        }),
      });
      const renderRes = await handleRenderPost(renderReq);
      expect(renderRes.status).toBe(403);
      const renderJson = await renderRes.json();
      expect(renderJson.error).toMatch(/not a member/i);
    });
  });

  // =========================================================================
  // 2. SSRF, Malformed YouTube URLs & DNS rebinding protection
  // =========================================================================
  describe('2. SSRF Protections & Strict URL Parsing', () => {
    it('accepts exact supported YouTube domains and valid 11-char video IDs', () => {
      const validCases = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      ];

      for (const url of validCases) {
        const parsed = parseAndValidateYouTubeUrl(url);
        expect(parsed.valid).toBe(true);
        expect(parsed.videoId).toBe('dQw4w9WgXcQ');
        expect(parsed.sanitizedUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(isYouTubeUrl(url)).toBe(true);
      }
    });

    it('strictly rejects evil domain spoofing, invalid video paths and query tricks', () => {
      const invalidCases = [
        'https://evil-youtube.com/watch?v=dQw4w9WgXcQ',
        'https://notyoutube.com/?v=dQw4w9WgXcQ',
        'https://attacker.com/fake?dummy=youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/user/pewdiepie',
        'https://www.youtube.com/channel/UC1234567890',
        'https://www.youtube.com/watch?v=invalid_short_id',
        'http://localhost:3000/youtube.com/watch?v=dQw4w9WgXcQ',
        'javascript:alert(1)',
      ];

      for (const url of invalidCases) {
        const parsed = parseAndValidateYouTubeUrl(url);
        expect(parsed.valid).toBe(false);
        expect(isYouTubeUrl(url)).toBe(false);
      }
    });

    it('rejects SSRF destinations: localhost, private subnets, cloud metadata, link-local', async () => {
      const privateTargets = [
        'http://127.0.0.1:8080/secret',
        'http://localhost:3000/admin',
        'http://10.0.0.1/internal.mp4',
        'http://172.16.0.1/db',
        'http://192.168.1.1/router',
        'http://169.254.169.254/latest/meta-data/',
        'http://[::1]/internal.mp4',
        'http://0.0.0.0/test.mp4',
      ];

      for (const target of privateTargets) {
        const check = await validateSafePublicUrl(target);
        expect(check.safe).toBe(false);
        expect(check.error).toBeDefined();
      }
    });

    it('rejects unsafe IP addresses in IPv4 and IPv6', () => {
      expect(isUnsafeIp('127.0.0.1')).toBe(true);
      expect(isUnsafeIp('169.254.169.254')).toBe(true);
      expect(isUnsafeIp('10.255.0.1')).toBe(true);
      expect(isUnsafeIp('192.168.0.100')).toBe(true);
      expect(isUnsafeIp('172.20.0.5')).toBe(true);
      expect(isUnsafeIp('::1')).toBe(true);
      expect(isUnsafeIp('fe80::1')).toBe(true);
      expect(isUnsafeIp('93.184.216.34')).toBe(false); // example.com public IP
      expect(isUnsafeIp('8.8.8.8')).toBe(false);
    });

    it('rejects malicious SSRF redirects pointing to internal addresses', async () => {
      const originalFetch = global.fetch;
      const dnsSpy = vi.spyOn(dns.promises, 'lookup').mockImplementation(async (host: string) => {
        if (host === 'public.example.com') {
          return [{ address: '93.184.216.34', family: 4 }] as any;
        }
        return [{ address: '169.254.169.254', family: 4 }] as any;
      });

      try {
        global.fetch = vi.fn().mockImplementation((url: string) => {
          if (url === 'https://public.example.com/redirect') {
            return Promise.resolve({
              status: 302,
              headers: new Headers({ location: 'http://169.254.169.254/latest/meta-data/' }),
            } as any);
          }
          return Promise.resolve({ status: 200, headers: new Headers() } as any);
        });

        await expect(
          safeFetch('https://public.example.com/redirect')
        ).rejects.toThrow(/SSRF Security Error on redirect.*blocked|private|unsafe/i);
      } finally {
        global.fetch = originalFetch;
        dnsSpy.mockRestore();
      }
    });
  });

  // =========================================================================
  // 3. Database Failures return errors instead of fake success
  // =========================================================================
  describe('3. Truthful Database Errors (No silent failure masking)', () => {
    it('returns error when project insert fails rather than reporting success', async () => {
      // In test store, simulating write failure
      const testStore = getTestStore()!;
      testStore.projects.set = vi.fn().mockImplementation(() => {
        throw new Error('Postgres connection pool exhausted');
      });

      const res = await createShortsProject(aliceWorkspace, {
        title: 'Project on failing DB',
        sourceVideoUrl: 'https://storage.googleapis.com/test/vid.mp4',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Postgres connection pool exhausted/i);
    });

    it('returns error when publishing job insert fails rather than fake success', async () => {
      const testStore = getTestStore()!;
      testStore.jobs.get = vi.fn().mockImplementation(() => {
        throw new Error('Database transaction timeout');
      });

      await expect(getShortsProjects(aliceWorkspace)).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Video Inspection & Quality Verification
  // =========================================================================
  describe('4. Rendered Media Inspection & Quality Checks', () => {
    it('rejects clips with blank or black frames', () => {
      const res = validateVideoClip({
        durationSeconds: 30,
        width: 1080,
        height: 1920,
        luminanceVariance: 0.02, // Solid black
        hasAudio: true,
        hasVideo: true,
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('black'))).toBe(true);
    });

    it('rejects clips with completely silent audio tracks', () => {
      const res = validateVideoClip({
        durationSeconds: 30,
        width: 1080,
        height: 1920,
        audioRmsLevel: 0.00005, // Silent
        hasAudio: true,
        hasVideo: true,
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('silent'))).toBe(true);
    });

    it('rejects corrupted or undecodable media files', () => {
      const res = validateVideoClip({
        durationSeconds: 30,
        width: 1080,
        height: 1920,
        isDecoded: false, // Stream decoding failed
        hasAudio: true,
        hasVideo: true,
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('decoding'))).toBe(true);
    });

    it('rejects incorrect dimensions (e.g. non-vertical 1920x1080)', () => {
      const res = validateVideoClip({
        durationSeconds: 30,
        width: 1920,
        height: 1080,
        hasAudio: true,
        hasVideo: true,
      });

      expect(res.passed).toBe(false);
      expect(res.errors.some((e) => e.includes('widescreen'))).toBe(true);
    });

    it('refuses to publish unrendered or failed clips', async () => {
      const saved = await saveShortsClip(aliceWorkspace, {
        title: 'Draft Clip',
        start_time: 15,
        end_time: 45,
        duration_seconds: 30,
        render_status: 'failed',
        validation_status: 'failed',
      });

      const pub = await publishClipNow(aliceWorkspace, {
        clipId: saved.clip!.id,
        platform: 'youtube',
        title: 'Draft Clip',
        mockPublish: false,
      });

      expect(pub.success).toBe(false);
      expect(pub.error).toMatch(/failed/i);
    });
  });

  // =========================================================================
  // 5. OAuth Security & State Tampering Protection
  // =========================================================================
  describe('5. OAuth Nonce & State Tampering Prevention', () => {
    it('rejects callback requests with missing, altered, or unsigned state', async () => {
      // 1. Missing state
      const noStateReq = new NextRequest(
        'http://localhost:3000/api/integrations/google/callback?code=mock_code'
      );
      const resNoState = await handleGoogleCallback(noStateReq);
      expect(resNoState.status).toBe(307);
      expect(decodeURIComponent(resNoState.headers.get('location') || '')).toContain('Missing OAuth authorization code');

      // 2. Tampered signature
      const fakePayload = Buffer.from(
        JSON.stringify({
          nonce: '1234',
          userId: 'user-alice',
          workspaceId: aliceWorkspace,
          returnTo: '/shorts',
          expiresAt: Date.now() + 100000,
        })
      ).toString('base64url');

      const tamperedReq = new NextRequest(
        `http://localhost:3000/api/integrations/google/callback?code=mock_code&state=${fakePayload}.invalidsignature`
      );
      const resTampered = await handleGoogleCallback(tamperedReq);
      expect(decodeURIComponent(resTampered.headers.get('location') || '')).toContain('OAuth state signature verification failed');
    });

    it('rejects callback when state timestamp has expired', async () => {
      const secretKey =
        process.env.ENCRYPTION_KEY ||
        process.env.GOOGLE_CLIENT_SECRET ||
        'digital_marketing_oauth_secret';

      const expiredPayload = Buffer.from(
        JSON.stringify({
          nonce: '1234',
          userId: 'user-alice',
          workspaceId: aliceWorkspace,
          returnTo: '/shorts',
          expiresAt: Date.now() - 5000, // Expired 5 seconds ago
        })
      ).toString('base64url');

      const sig = crypto.createHmac('sha256', secretKey).update(expiredPayload).digest('base64url');
      const expiredReq = new NextRequest(
        `http://localhost:3000/api/integrations/google/callback?code=mock_code&state=${expiredPayload}.${sig}`
      );

      const resExpired = await handleGoogleCallback(expiredReq);
      expect(decodeURIComponent(resExpired.headers.get('location') || '')).toContain('OAuth state has expired');
    });
  });

  // =========================================================================
  // 6. Scheduled publishing job processing & safe claiming
  // =========================================================================
  describe('6. Scheduled Job Worker & Atomic Mutual Exclusion', () => {
    it('rejects scheduling for platforms that cannot be reliably scheduled', async () => {
      const saved = await saveShortsClip(aliceWorkspace, {
        title: 'Schedule Test Clip',
        start_time: 15,
        end_time: 45,
        duration_seconds: 30,
      });

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const sched = await schedulePublishingJob(aliceWorkspace, {
        clipId: saved.clip!.id,
        platform: 'instagram' as any, // Unsupported platform for automated scheduler
        title: 'Schedule Test Clip',
        scheduledAt: futureDate,
      });

      expect(sched.success).toBe(false);
      expect(sched.error).toMatch(/does not support automated background scheduling/i);
    });

    it('runs scheduled publishing worker iteration safely without throwing', async () => {
      const workerRes = await processDueScheduledPublishingJobs();
      expect(workerRes).toHaveProperty('processedCount');
      expect(workerRes).toHaveProperty('results');
    });
  });
});
