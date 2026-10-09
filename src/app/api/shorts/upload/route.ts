import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { transcribeVideoAudio, suggestCoherentMoments } from '@/lib/video/processor';
import { validateVideoFileUrl, MAX_VIDEO_SIZE_BYTES } from '@/lib/video/url-validator';
import { persistVideoFile, createSignedVideoUploadUrl, getStoredVideoUrl } from '@/lib/video/storage';
import { probeVideoFile } from '@/lib/video/prober';
import { ShortsProject } from '@/lib/types/shorts';
import path from 'path';
import fs from 'fs';

export const maxDuration = 180; // 3-minute timeout for large video uploads & transcription

/**
 * GET: Issues a signed upload URL for direct client-to-storage uploads (up to 500 MB)
 * Bypasses Next.js server payload buffering for large video files.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const fileName = searchParams.get('fileName') || 'video.mp4';
  const workspaceId = searchParams.get('workspaceId') || 'ws-default';

  if (action === 'signed-upload-url') {
    const signedRes = await createSignedVideoUploadUrl({
      workspaceId,
      fileName,
    });

    if (!signedRes.success) {
      return NextResponse.json(
        { success: false, error: signedRes.error || 'Could not create signed upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedRes.signedUrl,
      token: signedRes.token,
      path: signedRes.path,
      storagePath: signedRes.storagePath,
    });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const contentType = request.headers.get('content-type') || '';
    let workspaceId = 'ws-default';
    let title = '';
    let videoUrl = '';
    let durationSeconds = 60;
    let fileSizeBytes = 0;
    let storagePath: string | undefined;

    // CASE 1: Direct Binary Stream Upload (Bypasses FormData parsing entirely)
    if (
      action === 'stream-upload' ||
      contentType.startsWith('video/') ||
      contentType === 'application/octet-stream'
    ) {
      const fileName = searchParams.get('fileName') || 'upload.mp4';
      workspaceId = searchParams.get('workspaceId') || 'ws-default';
      title = (searchParams.get('title') || '').trim() || fileName.replace(/\.[^/.]+$/, '');

      const arrayBuffer = await request.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          { success: false, error: 'Empty video payload received.' },
          { status: 400 }
        );
      }

      if (arrayBuffer.byteLength > MAX_VIDEO_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: `File size exceeds the 500 MB limit (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB).` },
          { status: 400 }
        );
      }

      fileSizeBytes = arrayBuffer.byteLength;
      const buffer = Buffer.from(arrayBuffer);

      const storageRes = await persistVideoFile({
        workspaceId,
        fileName,
        buffer,
        contentType: contentType || 'video/mp4',
      });

      if (!storageRes.success) {
        return NextResponse.json(
          { success: false, error: storageRes.error || 'Failed to save video to storage.' },
          { status: 500 }
        );
      }

      videoUrl = storageRes.url;
      storagePath = storageRes.storagePath;

      const localPath = path.join(process.cwd(), 'public', 'uploads', 'videos', storagePath || '');
      if (fs.existsSync(localPath)) {
        const probe = await probeVideoFile(localPath);
        if (probe.durationSeconds > 0) {
          durationSeconds = probe.durationSeconds;
        }
      }
    }
    // CASE 2: Multipart Form Data (Safely wrapped)
    else if (contentType.includes('multipart/form-data')) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (formErr: any) {
        console.error('Failed to parse body as FormData:', formErr);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to parse video multipart upload stream. Please use direct cloud upload or check network connection.',
          },
          { status: 400 }
        );
      }
      workspaceId = (formData.get('workspaceId') as string) || 'ws-default';
      title = ((formData.get('title') as string) || '').trim();
      const rawFile = formData.get('file') as File | null;
      const remoteUrl = ((formData.get('videoUrl') as string) || '').trim();
      const directStoragePath = ((formData.get('storagePath') as string) || '').trim();

      if (directStoragePath) {
        // Direct Client-to-Storage upload completed
        storagePath = directStoragePath;
        videoUrl = await getStoredVideoUrl(directStoragePath);
        fileSizeBytes = Number(formData.get('fileSize') || 0);
        durationSeconds = Number(formData.get('duration') || 60);
      } else if (rawFile && rawFile.size > 0) {
        // Enforce max size limit (500MB)
        if (rawFile.size > MAX_VIDEO_SIZE_BYTES) {
          return NextResponse.json(
            { success: false, error: `File size exceeds the 500 MB limit (${(rawFile.size / 1024 / 1024).toFixed(1)} MB).` },
            { status: 400 }
          );
        }

        // Validate MIME type
        const fileMime = rawFile.type || '';
        const validMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
        const isExtValid = /\.(mp4|mov|webm|mkv)$/i.test(rawFile.name);

        if (!validMimes.some((m) => fileMime.includes(m)) && !isExtValid) {
          return NextResponse.json(
            { success: false, error: 'Unsupported file format. Please upload an MP4, MOV, or WebM video file.' },
            { status: 400 }
          );
        }

        fileSizeBytes = rawFile.size;
        if (!title) {
          title = rawFile.name.replace(/\.[^/.]+$/, '');
        }

        const arrayBuffer = await rawFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const storageRes = await persistVideoFile({
          workspaceId,
          fileName: rawFile.name,
          buffer,
          contentType: fileMime || 'video/mp4',
        });

        if (!storageRes.success) {
          return NextResponse.json(
            { success: false, error: storageRes.error || 'Failed to save video to storage.' },
            { status: 500 }
          );
        }

        videoUrl = storageRes.url;
        storagePath = storageRes.storagePath;

        // Try to extract exact duration with local probe if stored on disk
        const localPath = path.join(process.cwd(), 'public', 'uploads', 'videos', storagePath || '');
        if (fs.existsSync(localPath)) {
          const probe = await probeVideoFile(localPath);
          if (probe.durationSeconds > 0) {
            durationSeconds = probe.durationSeconds;
          }
        }
      } else if (remoteUrl) {
        // Validate direct video URL
        const urlValidation = await validateVideoFileUrl(remoteUrl);
        if (!urlValidation.valid) {
          return NextResponse.json(
            { success: false, error: urlValidation.error },
            { status: 400 }
          );
        }

        videoUrl = urlValidation.sanitizedUrl!;
        fileSizeBytes = urlValidation.contentLength || 45000000;
        if (!title) {
          try {
            const urlObj = new URL(videoUrl);
            const pathSegments = urlObj.pathname.split('/');
            const lastPart = pathSegments[pathSegments.length - 1];
            title = decodeURIComponent(lastPart).replace(/\.[^/.]+$/, '') || 'Video Recording';
          } catch {
            title = 'Video Recording';
          }
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Please choose a video file or paste a direct video file URL.' },
          { status: 400 }
        );
      }
    } else {
      // JSON body request (direct video URL or completed direct storage upload)
      const body = await request.json().catch(() => ({}));
      workspaceId = body.workspaceId || 'ws-default';
      title = (body.title || '').trim();
      const rawUrl = (body.videoUrl || '').trim();
      const directStoragePath = (body.storagePath || '').trim();

      if (directStoragePath) {
        storagePath = directStoragePath;
        videoUrl = await getStoredVideoUrl(directStoragePath);
        fileSizeBytes = body.fileSizeBytes || 0;
        durationSeconds = body.durationSeconds || 60;
      } else if (rawUrl) {
        const urlValidation = await validateVideoFileUrl(rawUrl);
        if (!urlValidation.valid) {
          return NextResponse.json(
            { success: false, error: urlValidation.error },
            { status: 400 }
          );
        }

        videoUrl = urlValidation.sanitizedUrl!;
        fileSizeBytes = urlValidation.contentLength || 45000000;
        durationSeconds = body.durationSeconds || 60;
      } else {
        return NextResponse.json(
          { success: false, error: 'No video file or URL provided.' },
          { status: 400 }
        );
      }
    }

    if (!title) {
      title = 'Master Recording';
    }

    // Check for existing identical project in workspace to avoid duplicate jobs on retry
    const adminSupabase = createAdminClient();
    if (adminSupabase && workspaceId && workspaceId !== 'ws-default') {
      try {
        const { data: existing } = await adminSupabase
          .from('shorts_projects')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('source_video_url', videoUrl)
          .maybeSingle();

        if (existing) {
          const suggestions = suggestCoherentMoments(
            existing.transcript || [],
            existing.duration_seconds || durationSeconds,
            existing.title
          );
          return NextResponse.json({
            success: true,
            project: existing,
            suggestions,
            isDuplicate: true,
            message: 'Loaded existing processed video project for this video URL.',
          });
        }
      } catch {
        // Continue
      }
    }

    // Step 1: Real Speech Transcription with Timestamps
    const transcript = await transcribeVideoAudio({
      videoUrl,
      durationSeconds,
      titleHint: title,
    });

    // Step 2: Suggest 30–60 Second Coherent Moments from actual transcript or video duration
    const suggestions = suggestCoherentMoments(transcript, durationSeconds, title);

    const projectId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const projectRecord: ShortsProject = {
      id: projectId,
      workspace_id: workspaceId,
      title,
      source_video_url: videoUrl,
      storage_path: storagePath || null,
      duration_seconds: durationSeconds,
      file_size_bytes: fileSizeBytes,
      aspect_ratio: '16:9',
      status: 'ready',
      progress: 100,
      transcript,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to Supabase if available
    if (adminSupabase && workspaceId && workspaceId !== 'ws-default') {
      const { error: insertError } = await adminSupabase.from('shorts_projects').insert(projectRecord);
      if (insertError) {
        console.error('Failed to insert shorts_project to Supabase:', insertError.message);
        return NextResponse.json(
          { success: false, error: `Database error saving project: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      project: projectRecord,
      suggestions,
      requiresManualTrimming: transcript.length === 0,
      message:
        transcript.length > 0
          ? 'Video uploaded and processed successfully with timestamped transcript.'
          : 'Video uploaded successfully. Automatic transcription is not configured; manual trimming is enabled.',
    });
  } catch (err: any) {
    console.error('Shorts upload processing error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process video upload' },
      { status: 500 }
    );
  }
}
