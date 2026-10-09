import { createAdminClient } from '@/lib/supabase/admin';
import { renderVerticalShort } from '@/lib/video/renderer';
import { probeVideoFile } from '@/lib/video/prober';

/**
 * Standalone Background Video Processing Worker.
 * Can be deployed to long-running worker environments (e.g., Docker, AWS ECS, Render, Railway)
 * when web hosting serverless limits prevent executing long FFmpeg transcoding jobs.
 */
export async function processNextRenderingJob(): Promise<{ processed: boolean; clipId?: string; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { processed: false, error: 'Supabase admin client not configured' };
  }

  // Find next queued render job
  const { data: clip, error } = await supabase
    .from('shorts_clips')
    .select('*, project:shorts_projects(source_video_url)')
    .eq('render_status', 'draft')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !clip) {
    return { processed: false };
  }

  const sourceUrl = clip.project?.source_video_url;
  if (!sourceUrl) {
    await supabase.from('shorts_clips').update({ render_status: 'failed' }).eq('id', clip.id);
    return { processed: true, clipId: clip.id, error: 'Source video URL missing' };
  }

  // Mark as rendering
  await supabase
    .from('shorts_clips')
    .update({ render_status: 'rendering', render_progress: 15, updated_at: new Date().toISOString() })
    .eq('id', clip.id);

  try {
    const renderRes = await renderVerticalShort({
      workspaceId: clip.workspace_id,
      clipId: clip.id,
      sourceVideoPathOrUrl: sourceUrl,
      startTime: Number(clip.start_time || 0),
      endTime: Number(clip.end_time || 30),
      cropMode: clip.crop_mode || 'blur_padding',
      subtitlesEnabled: clip.subtitles_enabled,
      subtitlesStyle: clip.subtitles_style,
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
        .eq('id', clip.id);

      return { processed: true, clipId: clip.id };
    } else {
      await supabase
        .from('shorts_clips')
        .update({
          render_status: 'failed',
          render_progress: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clip.id);

      return { processed: true, clipId: clip.id, error: renderRes.error };
    }
  } catch (err: any) {
    await supabase
      .from('shorts_clips')
      .update({ render_status: 'failed', render_progress: 0, updated_at: new Date().toISOString() })
      .eq('id', clip.id);

    return { processed: true, clipId: clip.id, error: err.message };
  }
}
