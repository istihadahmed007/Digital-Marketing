import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { transcribeVideoAudio, suggestCoherentMoments } from '@/lib/video/processor';
import { validateVideoFileUrl, MAX_VIDEO_SIZE_BYTES } from '@/lib/video/url-validator';
import { persistVideoFile, createSignedVideoUploadUrl, getStoredVideoUrl } from '@/lib/video/storage';
import { probeVideoFile } from '@/lib/video/prober';
import { downloadYouTubeVideo, downloadVideoFromUrl } from '@/lib/video/youtube-downloader';
import { ShortsProject } from '@/lib/types/shorts';
import { getAuthorizedWorkspace, AuthorizationError } from '@/lib/security/auth-context';
import path from 'path';
import fs from 'fs';

export const maxDuration = 180; // 3-minute timeout for large video uploads & transcription

function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * GET: Issues a signed upload URL for direct client-to-storage uploads (up to 500 MB)
 * Verifies authenticated session and workspace membership.
 * Restricts upload storage path strictly to the authorized workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const rawFileName = searchParams.get('fileName') || 'video.mp4';
    const fileName = sanitizeFileName(rawFileName);

    // Enforce server-side authorization
    const auth = await getAuthorizedWorkspace({
      requestedWorkspaceId: searchParams.get('workspaceId'),
    });
    const workspaceId = auth.workspaceId;

    if (action === 'signed-upload-url') {
      const ext = path.extname(fileName).toLowerCase();
      const validExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.m4v'];
      if (!validExtensions.includes(ext)) {
        return NextResponse.json(
          { success: false, error: 'Invalid file extension. Supported: MP4, MOV, WebM, MKV.' },
          { status: 400 }
        );
      }

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
  } catch (err: any) {
    const status = err instanceof AuthorizationError ? err.statusCode : 401;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const contentType = request.headers.get('content-type') || '';

    let requestedWsId = searchParams.get('workspaceId');
    let title = '';
    let videoUrl = '';
    let durationSeconds = 60;
    let fileSizeBytes = 0;
    let storagePath: string | undefined;

    // CASE 1: Direct Binary Stream Upload
    if (
      action === 'stream-upload' ||
      contentType.startsWith('video/') ||
      contentType === 'application/octet-stream'
    ) {
      const rawFileName = searchParams.get('fileName') || 'upload.mp4';
      const fileName = sanitizeFileName(rawFileName);
      title = (searchParams.get('title') || '').trim() || fileName.replace(/\.[^/.]+$/, '');

      const auth = await getAuthorizedWorkspace({ requestedWorkspaceId: requestedWsId });
      const workspaceId = auth.workspaceId;

      const arrayBuffer = await request.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          { success: false, error: 'Empty video payload received.' },
          { status: 400 }
        );
      }

      if (arrayBuffer.byteLength > MAX_VIDEO_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: `File size exceeds the 500 MB limit (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB).`,
          },
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

      return await processCompletedProject({
        workspaceId,
        title,
        videoUrl,
        storagePath,
        fileSizeBytes,
        durationSeconds,
      });
    }

    // CASE 2: Multipart Form Data
    if (contentType.includes('multipart/form-data')) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (formErr: any) {
        return NextResponse.json(
          { success: false, error: 'Failed to parse video multipart upload stream.' },
          { status: 400 }
        );
      }

      requestedWsId = (formData.get('workspaceId') as string) || requestedWsId;
      const auth = await getAuthorizedWorkspace({ requestedWorkspaceId: requestedWsId });
      const workspaceId = auth.workspaceId;

      title = ((formData.get('title') as string) || '').trim();
      const rawFile = formData.get('file') as File | null;
      const remoteUrl = ((formData.get('videoUrl') as string) || '').trim();
      const directStoragePath = ((formData.get('storagePath') as string) || '').trim();

      if (directStoragePath) {
        // Direct Client-to-Storage upload completed: verify path is in authorized workspace
        const expectedPrefix = `videos/${workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_')}/`;
        if (!directStoragePath.startsWith(expectedPrefix) && !directStoragePath.includes(workspaceId)) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Storage path does not belong to authorized workspace.' },
            { status: 403 }
          );
        }
        storagePath = directStoragePath;
        videoUrl = await getStoredVideoUrl(directStoragePath);
        fileSizeBytes = Number(formData.get('fileSize') || 0);
        durationSeconds = Number(formData.get('duration') || 60);
      } else if (rawFile && rawFile.size > 0) {
        if (rawFile.size > MAX_VIDEO_SIZE_BYTES) {
          return NextResponse.json(
            {
              success: false,
              error: `File size exceeds the 500 MB limit (${(rawFile.size / 1024 / 1024).toFixed(1)} MB).`,
            },
            { status: 400 }
          );
        }

        const fileName = sanitizeFileName(rawFile.name);
        const ext = path.extname(fileName).toLowerCase();
        const validExtensions = ['.mp4', '.mov', '.webm', '.mkv'];
        if (!validExtensions.includes(ext)) {
          return NextResponse.json(
            { success: false, error: 'Unsupported file format. Supported: MP4, MOV, WebM, MKV.' },
            { status: 400 }
          );
        }

        fileSizeBytes = rawFile.size;
        if (!title) {
          title = fileName.replace(/\.[^/.]+$/, '');
        }

        const arrayBuffer = await rawFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const storageRes = await persistVideoFile({
          workspaceId,
          fileName,
          buffer,
          contentType: rawFile.type || 'video/mp4',
        });

        if (!storageRes.success) {
          return NextResponse.json(
            { success: false, error: storageRes.error || 'Failed to save video to storage.' },
            { status: 500 }
          );
        }

        videoUrl = storageRes.url;
        storagePath = storageRes.storagePath;
      } else if (remoteUrl) {
        const urlValidation = await validateVideoFileUrl(remoteUrl);
        if (!urlValidation.valid) {
          return NextResponse.json({ success: false, error: urlValidation.error }, { status: 400 });
        }

        if (urlValidation.isYouTube || urlValidation.isDownloadablePlatform) {
          const dlRes = await downloadVideoFromUrl({
            url: remoteUrl,
            workspaceId,
          });

          if (!dlRes.success) {
            return NextResponse.json(
              { success: false, error: dlRes.error || 'Failed to download and process video.' },
              { status: 400 }
            );
          }

          videoUrl = dlRes.videoUrl!;
          storagePath = dlRes.storagePath;
          title = title || dlRes.title || `${dlRes.platform || 'Video'} Clip`;
          durationSeconds = dlRes.durationSeconds || 60;
          fileSizeBytes = dlRes.fileSizeBytes || 0;
        } else {
          videoUrl = urlValidation.sanitizedUrl!;
          fileSizeBytes = urlValidation.contentLength || 45000000;
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Please choose a video file or provide a valid video URL.' },
          { status: 400 }
        );
      }

      return await processCompletedProject({
        workspaceId,
        title,
        videoUrl,
        storagePath,
        fileSizeBytes,
        durationSeconds,
      });
    }

    // CASE 3: JSON body request
    const body = await request.json().catch(() => ({}));
    requestedWsId = body.workspaceId || requestedWsId;
    const auth = await getAuthorizedWorkspace({ requestedWorkspaceId: requestedWsId });
    const workspaceId = auth.workspaceId;

    title = (body.title || '').trim();
    const rawUrl = (body.videoUrl || '').trim();
    const directStoragePath = (body.storagePath || '').trim();

    if (directStoragePath) {
      const expectedPrefix = `videos/${workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_')}/`;
      if (!directStoragePath.startsWith(expectedPrefix) && !directStoragePath.includes(workspaceId)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Storage path does not belong to authorized workspace.' },
          { status: 403 }
        );
      }

      storagePath = directStoragePath;
      videoUrl = await getStoredVideoUrl(directStoragePath);
      fileSizeBytes = body.fileSizeBytes || 0;
      durationSeconds = body.durationSeconds || 60;
    } else if (rawUrl) {
      const urlValidation = await validateVideoFileUrl(rawUrl);
      if (!urlValidation.valid) {
        return NextResponse.json({ success: false, error: urlValidation.error }, { status: 400 });
      }

      if (urlValidation.isYouTube || urlValidation.isDownloadablePlatform) {
        const dlRes = await downloadVideoFromUrl({
          url: rawUrl,
          workspaceId,
        });

        if (!dlRes.success) {
          return NextResponse.json(
            { success: false, error: dlRes.error || 'Failed to download and process video.' },
            { status: 400 }
          );
        }

        videoUrl = dlRes.videoUrl!;
        storagePath = dlRes.storagePath;
        title = title || dlRes.title || `${dlRes.platform || 'Video'} Clip`;
        durationSeconds = dlRes.durationSeconds || 60;
        fileSizeBytes = dlRes.fileSizeBytes || 0;
      } else {
        videoUrl = urlValidation.sanitizedUrl!;
        fileSizeBytes = urlValidation.contentLength || 45000000;
        durationSeconds = body.durationSeconds || 60;
      }
    } else {
      return NextResponse.json({ success: false, error: 'No video file or URL provided.' }, { status: 400 });
    }

    return await processCompletedProject({
      workspaceId,
      title,
      videoUrl,
      storagePath,
      fileSizeBytes,
      durationSeconds,
    });
  } catch (err: any) {
    const status = err instanceof AuthorizationError ? err.statusCode : 500;
    return NextResponse.json({ success: false, error: err.message || 'Processing error' }, { status });
  }
}

async function processCompletedProject(params: {
  workspaceId: string;
  title: string;
  videoUrl: string;
  storagePath?: string;
  fileSizeBytes: number;
  durationSeconds: number;
}) {
  const { workspaceId, title: rawTitle, videoUrl, storagePath, fileSizeBytes, durationSeconds } = params;
  const title = (rawTitle || 'Video Recording').trim();

  // Deduplication check
  const supabase = (await createClient()) || createAdminClient();
  if (supabase) {
    try {
      const { data: existing } = await supabase
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

  // Real Speech Transcription
  const transcript = await transcribeVideoAudio({
    videoUrl,
    durationSeconds,
    titleHint: title,
  });

  // Suggest 30–60 Second Coherent Moments
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

  if (process.env.NODE_ENV === 'test') {
    const { getTestStore } = await import('@/lib/security/test-mock-store');
    const testStore = getTestStore();
    if (testStore) {
      if (!testStore.projects.has(workspaceId)) testStore.projects.set(workspaceId, []);
      testStore.projects.get(workspaceId)!.unshift(projectRecord);
    }
  } else if (supabase) {
    const { error: insertError } = await supabase.from('shorts_projects').insert(projectRecord);
    if (insertError) {
      console.error('Failed to insert shorts_project to Supabase:', insertError.message);
      const isMissingTable =
        insertError.code === 'PGRST205' ||
        insertError.message?.includes('schema cache') ||
        insertError.message?.includes('Could not find the table');
      return NextResponse.json(
        {
          success: false,
          error: isMissingTable
            ? "Database setup required: The table 'public.shorts_projects' does not exist in your Supabase project yet. Please run the Shorts Studio SQL migration in your Supabase SQL Editor."
            : `Database error saving project: ${insertError.message}`,
        },
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
}
