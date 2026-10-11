import { createAdminClient } from '@/lib/supabase/admin';
import { renderVerticalShort } from '@/lib/video/renderer';
import { YouTubeDataApiClient } from '@/lib/integrations/social/youtube';
import { MetaGraphApiClient } from '@/lib/integrations/social/meta';
import { decryptSecret } from '@/lib/security/crypto';

export interface WorkerProcessingResult {
  renderedCount: number;
  publishedCount: number;
  failedCount: number;
  jobsProcessed: string[];
  errors: string[];
}

/**
 * Atomically claims and renders the next queued video rendering job.
 * Ensures two workers cannot process the same clip at once.
 */
export async function processNextRenderingJob(): Promise<{
  processed: boolean;
  clipId?: string;
  error?: string;
}> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { processed: false, error: 'Supabase admin client not configured' };
  }

  // 1. Fetch candidate clips with status 'draft'
  const { data: candidates, error: findError } = await supabase
    .from('shorts_clips')
    .select('id')
    .eq('render_status', 'draft')
    .order('created_at', { ascending: true })
    .limit(5);

  if (findError || !candidates || candidates.length === 0) {
    return { processed: false };
  }

  // 2. Atomically claim one candidate with conditional update (render_status = 'draft')
  let claimedClip: any = null;
  for (const candidate of candidates) {
    const { data: claimed, error: claimErr } = await supabase
      .from('shorts_clips')
      .update({
        render_status: 'rendering',
        render_progress: 10,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
      .eq('render_status', 'draft')
      .select('*, project:shorts_projects(source_video_url, workspace_id)')
      .maybeSingle();

    if (!claimErr && claimed) {
      claimedClip = claimed;
      break;
    }
  }

  if (!claimedClip) {
    return { processed: false }; // Another worker claimed in parallel
  }

  const sourceUrl = claimedClip.project?.source_video_url;
  if (!sourceUrl) {
    await supabase
      .from('shorts_clips')
      .update({
        render_status: 'failed',
        render_progress: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimedClip.id);
    return { processed: true, clipId: claimedClip.id, error: 'Source video URL missing for clip' };
  }

  try {
    const renderRes = await renderVerticalShort({
      workspaceId: claimedClip.workspace_id,
      clipId: claimedClip.id,
      sourceVideoPathOrUrl: sourceUrl,
      startTime: Number(claimedClip.start_time || 0),
      endTime: Number(claimedClip.end_time || 30),
      cropMode: claimedClip.crop_mode || 'blur_padding',
      subtitlesEnabled: claimedClip.subtitles_enabled,
      subtitlesText: claimedClip.title,
      subtitlesStyle: claimedClip.subtitles_style,
    });

    if (renderRes.success && renderRes.renderedVideoUrl) {
      await supabase
        .from('shorts_clips')
        .update({
          render_status: 'rendered',
          render_progress: 100,
          rendered_video_url: renderRes.renderedVideoUrl,
          validation_status: renderRes.validation?.passed ? 'passed' : 'failed',
          validation_details: renderRes.validation || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimedClip.id);

      return { processed: true, clipId: claimedClip.id };
    } else {
      await supabase
        .from('shorts_clips')
        .update({
          render_status: 'failed',
          render_progress: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimedClip.id);

      return { processed: true, clipId: claimedClip.id, error: renderRes.error };
    }
  } catch (err: any) {
    await supabase
      .from('shorts_clips')
      .update({
        render_status: 'failed',
        render_progress: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimedClip.id);

    return { processed: true, clipId: claimedClip.id, error: err.message };
  }
}

/**
 * Processes all due scheduled publishing jobs in the background.
 * Uses atomic job claiming, idempotency, retry backoff, and accurate provider error logging.
 */
export async function processDueScheduledPublishingJobs(): Promise<{
  processedCount: number;
  results: Array<{ jobId: string; status: 'published' | 'retry_scheduled' | 'failed'; error?: string }>;
}> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { processedCount: 0, results: [] };
  }

  const nowIso = new Date().toISOString();

  // Find due scheduled jobs
  const { data: dueJobs, error: findError } = await supabase
    .from('shorts_publishing_jobs')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (findError || !dueJobs || dueJobs.length === 0) {
    return { processedCount: 0, results: [] };
  }

  const results: Array<{ jobId: string; status: 'published' | 'retry_scheduled' | 'failed'; error?: string }> = [];

  for (const candidate of dueJobs) {
    // Atomically claim candidate job
    const { data: job, error: claimErr } = await supabase
      .from('shorts_publishing_jobs')
      .update({
        status: 'publishing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
      .eq('status', 'scheduled')
      .select('*, clip:shorts_clips(*)')
      .maybeSingle();

    if (claimErr || !job) {
      continue; // Another worker claimed this job
    }

    const clip = job.clip;
    if (!clip || !clip.rendered_video_url || clip.render_status !== 'rendered') {
      const errorMsg = 'Referenced clip is missing or has not completed rendering.';
      await supabase
        .from('shorts_publishing_jobs')
        .update({
          status: 'failed',
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      results.push({ jobId: job.id, status: 'failed', error: errorMsg });
      continue;
    }

    // Publish to target platform
    let publishOutcome: { success: boolean; url?: string; id?: string; error?: string } = {
      success: false,
    };

    try {
      if (job.platform === 'youtube') {
        const credentials = await getWorkspaceStoredYouTubeCreds(supabase, job.workspace_id);
        const ytClient = new YouTubeDataApiClient(credentials);
        const token = await ytClient.getAccessToken();

        if (!token) {
          publishOutcome = {
            success: false,
            error: 'Workspace YouTube account is not connected. Re-connect in Settings.',
          };
        } else {
          const res = await ytClient.publishShort({
            title: job.title || clip.title,
            description: job.caption || clip.caption || '',
            tags: job.hashtags || ['Shorts'],
            videoUrl: clip.rendered_video_url,
            idempotencyKey: job.idempotency_key,
          });
          publishOutcome = {
            success: res.success,
            url: res.videoUrl,
            id: res.videoId,
            error: res.error,
          };
        }
      } else if (job.platform === 'facebook') {
        const credentials = await getWorkspaceStoredMetaCreds(supabase, job.workspace_id);
        const metaClient = new MetaGraphApiClient(credentials);
        const conn = await metaClient.verifyConnection();

        if (!conn.valid) {
          publishOutcome = {
            success: false,
            error: 'Workspace Facebook Page is not connected. Re-connect in Settings.',
          };
        } else {
          const res = await metaClient.publishReel({
            title: job.title || clip.title,
            description: job.caption || clip.caption || '',
            videoUrl: clip.rendered_video_url,
          });
          publishOutcome = {
            success: res.success,
            url: res.permalinkUrl,
            id: res.reelId,
            error: res.error,
          };
        }
      } else {
        publishOutcome = {
          success: false,
          error: `Platform "${job.platform}" is not supported for scheduled publishing.`,
        };
      }
    } catch (pubErr: any) {
      publishOutcome = {
        success: false,
        error: pubErr.message || 'Publishing exception encountered',
      };
    }

    // Handle outcome and retries
    if (publishOutcome.success) {
      await supabase
        .from('shorts_publishing_jobs')
        .update({
          status: 'published',
          platform_post_id: publishOutcome.id || null,
          platform_url: publishOutcome.url || null,
          published_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      results.push({ jobId: job.id, status: 'published' });
    } else {
      const currentRetries = Number(job.retry_count || 0) + 1;
      const maxRetries = 3;

      if (currentRetries < maxRetries) {
        // Schedule next retry with 5-minute backoff
        const nextAttempt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await supabase
          .from('shorts_publishing_jobs')
          .update({
            status: 'scheduled',
            scheduled_at: nextAttempt,
            retry_count: currentRetries,
            error_message: `Attempt ${currentRetries} failed: ${publishOutcome.error || 'Provider error'}. Retrying at ${nextAttempt}.`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({
          jobId: job.id,
          status: 'retry_scheduled',
          error: publishOutcome.error,
        });
      } else {
        // Exhausted retries
        await supabase
          .from('shorts_publishing_jobs')
          .update({
            status: 'failed',
            retry_count: currentRetries,
            error_message: `Publishing failed after ${maxRetries} attempts: ${publishOutcome.error || 'Provider error'}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({
          jobId: job.id,
          status: 'failed',
          error: publishOutcome.error,
        });
      }
    }
  }

  return {
    processedCount: results.length,
    results,
  };
}

async function getWorkspaceStoredYouTubeCreds(supabase: any, workspaceId: string) {
  const creds: { accessToken?: string; refreshToken?: string; clientId?: string; clientSecret?: string } = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };

  const { data: integ } = await supabase
    .from('integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .in('provider', ['google_calendar', 'youtube'])
    .maybeSingle();

  if (integ?.config) {
    const cfg = integ.config;
    if (cfg.accessToken) creds.accessToken = decryptSecret(cfg.accessToken) || cfg.accessToken;
    if (cfg.refreshToken) creds.refreshToken = decryptSecret(cfg.refreshToken) || cfg.refreshToken;
    if (cfg.clientId) creds.clientId = cfg.clientId;
    if (cfg.clientSecret) creds.clientSecret = decryptSecret(cfg.clientSecret) || cfg.clientSecret;
  }

  return creds;
}

async function getWorkspaceStoredMetaCreds(supabase: any, workspaceId: string) {
  const creds: { accessToken?: string; pageId?: string } = {};

  const { data: integ } = await supabase
    .from('integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .in('provider', ['meta', 'facebook'])
    .maybeSingle();

  if (integ?.config) {
    const cfg = integ.config;
    if (cfg.accessToken) creds.accessToken = decryptSecret(cfg.accessToken) || cfg.accessToken;
    if (cfg.pageId) creds.pageId = cfg.pageId;
  }

  return creds;
}
