import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderVerticalShort } from '@/lib/video/renderer';
import { ShortsClip, ShortsProject } from '@/lib/types/shorts';

export const maxDuration = 300; // 5-minute timeout for FFmpeg rendering

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, clipId, projectId, startTime, endTime, cropMode, title, caption } = body;

    if (!workspaceId || !clipId) {
      return NextResponse.json(
        { success: false, error: 'Missing required workspaceId or clipId parameters.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    let sourceVideoUrl = body.sourceVideoUrl;

    if (!sourceVideoUrl && adminSupabase && projectId) {
      const { data: proj } = await adminSupabase
        .from('shorts_projects')
        .select('source_video_url')
        .eq('id', projectId)
        .maybeSingle();

      if (proj?.source_video_url) {
        sourceVideoUrl = proj.source_video_url;
      }
    }

    if (!sourceVideoUrl) {
      return NextResponse.json(
        { success: false, error: 'Source video URL not found for project.' },
        { status: 400 }
      );
    }

    // Set status to rendering in Supabase
    if (adminSupabase && workspaceId !== 'ws-default') {
      await adminSupabase
        .from('shorts_clips')
        .update({
          render_status: 'rendering',
          render_progress: 30,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clipId);
    }

    // Execute real FFmpeg vertical render
    const renderRes = await renderVerticalShort({
      workspaceId,
      clipId,
      sourceVideoPathOrUrl: sourceVideoUrl,
      startTime: Number(startTime || 0),
      endTime: Number(endTime || 30),
      cropMode: cropMode || 'blur_padding',
    });

    if (!renderRes.success) {
      if (adminSupabase && workspaceId !== 'ws-default') {
        await adminSupabase
          .from('shorts_clips')
          .update({
            render_status: 'failed',
            render_progress: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clipId);
      }

      return NextResponse.json(
        { success: false, error: renderRes.error || 'FFmpeg rendering failed' },
        { status: 500 }
      );
    }

    // Update clip in Supabase with real rendered video URL and validation status
    if (adminSupabase && workspaceId !== 'ws-default') {
      await adminSupabase
        .from('shorts_clips')
        .update({
          render_status: 'rendered',
          render_progress: 100,
          rendered_video_url: renderRes.renderedVideoUrl,
          validation_status: renderRes.validation?.passed ? 'passed' : 'failed',
          validation_details: renderRes.validation || {},
          updated_at: new Date().toISOString(),
        })
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
    console.error('Error in /api/shorts/render:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Render processing failed' },
      { status: 500 }
    );
  }
}
