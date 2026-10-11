import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderVerticalShort } from '@/lib/video/renderer';
import {
  getAuthorizedWorkspace,
  verifyProjectOwnership,
  verifyClipOwnership,
  AuthorizationError,
} from '@/lib/security/auth-context';

export const maxDuration = 300; // 5-minute timeout for FFmpeg rendering

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clipId, projectId, startTime, endTime, cropMode } = body;

    if (!clipId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing required clipId or projectId parameters.' },
        { status: 400 }
      );
    }

    // 1. Enforce server-side session authentication and workspace membership
    const auth = await getAuthorizedWorkspace({ requestedWorkspaceId: body.workspaceId });
    const workspaceId = auth.workspaceId;

    // 2. Derive source video URL strictly from verified project in authorized workspace
    // Never trust arbitrary client-supplied sourceVideoUrl to prevent SSRF injection into FFmpeg
    const project = await verifyProjectOwnership(workspaceId, projectId);
    const clip = await verifyClipOwnership(workspaceId, clipId);

    const sourceVideoUrl = project.source_video_url;
    if (!sourceVideoUrl) {
      return NextResponse.json(
        { success: false, error: 'Source video URL not found for project.' },
        { status: 400 }
      );
    }

    const supabase = (await createClient()) || createAdminClient();

    // 3. Mark rendering in database
    if (supabase) {
      await supabase
        .from('shorts_clips')
        .update({
          render_status: 'rendering',
          render_progress: 25,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)
        .eq('id', clipId);
    }

    // 4. Execute authentic FFmpeg vertical render with SSRF protections and real validation
    const renderRes = await renderVerticalShort({
      workspaceId,
      clipId,
      sourceVideoPathOrUrl: sourceVideoUrl,
      startTime: Number(startTime ?? clip.start_time ?? 0),
      endTime: Number(endTime ?? clip.end_time ?? 30),
      cropMode: cropMode || clip.crop_mode || 'blur_padding',
      subtitlesEnabled: clip.subtitles_enabled,
      subtitlesText: clip.title,
      subtitlesStyle: clip.subtitles_style,
    });

    if (!renderRes.success) {
      if (supabase) {
        await supabase
          .from('shorts_clips')
          .update({
            render_status: 'failed',
            render_progress: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', workspaceId)
          .eq('id', clipId);
      }

      return NextResponse.json(
        { success: false, error: renderRes.error || 'FFmpeg rendering failed' },
        { status: 500 }
      );
    }

    // 5. Update clip in database with rendered URL and media validation results
    if (supabase) {
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
        .eq('workspace_id', workspaceId)
        .eq('id', clipId);
    }

    return NextResponse.json({
      success: true,
      renderedVideoUrl: renderRes.renderedVideoUrl,
      validation: renderRes.validation,
      metadata: renderRes.metadata,
      message: 'Rendered authentic 1080x1920 (9:16) MP4 clip and verified video stream.',
    });
  } catch (err: any) {
    const status = err instanceof AuthorizationError ? err.statusCode : 500;
    return NextResponse.json(
      { success: false, error: err.message || 'Render processing failed' },
      { status }
    );
  }
}
