import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { probeVideoFile, VideoMetadata } from './prober';
import { inspectAndValidateVideoFile } from './server-validator';
import { persistVideoFile } from './storage';
import { downloadSafeRemoteVideoFile } from '@/lib/security/ssrf';
import { ClipValidationResult } from '@/lib/types/shorts';

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpeg = require('@ffmpeg-installer/ffmpeg');
    if (ffmpeg?.path && fs.existsSync(ffmpeg.path)) {
      return ffmpeg.path;
    }
  } catch {
    // Fall back to system PATH
  }
  return 'ffmpeg';
}

export interface RenderOptions {
  workspaceId: string;
  clipId: string;
  sourceVideoPathOrUrl: string;
  startTime: number;
  endTime: number;
  cropMode?: 'blur_padding' | 'smart_crop' | 'fit' | 'center_crop';
  subtitlesEnabled?: boolean;
  subtitlesText?: string;
  subtitlesStyle?: {
    fontSize?: number;
    color?: string;
    background?: string;
    fontFamily?: string;
    positionY?: number;
  };
}

export interface RenderResult {
  success: boolean;
  renderedVideoUrl?: string;
  storagePath?: string;
  localFilePath?: string;
  metadata?: VideoMetadata;
  validation?: ClipValidationResult;
  error?: string;
}

function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .replace(/:/g, '\\:');
}

/**
 * Renders an authentic vertical 1080x1920 (9:16) MP4 video clip from source video using FFmpeg.
 * 1. Safely downloads remote video sources using SSRF-hardened streaming into controlled temp storage.
 *    Never gives arbitrary remote URLs directly to FFmpeg.
 * 2. Applies accurate vertical layout (blur padding, center crop, or fit).
 * 3. Burns subtitle text onto video when subtitles are enabled.
 * 4. Verifies the rendered clip with real media inspection (duration, dimensions, audio RMS, luminance variance, decoding).
 * 5. Cleans up temporary files on both success and failure.
 */
export async function renderVerticalShort(options: RenderOptions): Promise<RenderResult> {
  const {
    workspaceId,
    clipId,
    sourceVideoPathOrUrl,
    startTime,
    endTime,
    cropMode = 'blur_padding',
    subtitlesEnabled = false,
    subtitlesText,
    subtitlesStyle,
  } = options;

  const duration = Math.max(0, endTime - startTime);
  if (duration < 15.0 || duration > 60.0) {
    return {
      success: false,
      error: `Invalid clip duration (${duration.toFixed(1)}s). Shorts and Reels require between 15.0 and 60.0 seconds.`,
    };
  }

  const ffmpegPath = getFfmpegPath();
  const tempDir = path.join(os.tmpdir(), 'shorts_render_workspace');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const randomId = crypto.randomBytes(6).toString('hex');
  const tempOutputPath = path.join(tempDir, `render_${clipId}_${Date.now()}_${randomId}.mp4`);

  let localSourcePath = sourceVideoPathOrUrl;
  let remoteCleanup: (() => void) | null = null;

  try {
    // 1. Resolve source video to a verified local file
    if (sourceVideoPathOrUrl.startsWith('http://') || sourceVideoPathOrUrl.startsWith('https://')) {
      const dl = await downloadSafeRemoteVideoFile({
        url: sourceVideoPathOrUrl,
        maxBytes: 500 * 1024 * 1024,
      });
      localSourcePath = dl.localPath;
      remoteCleanup = dl.cleanup;
    } else if (sourceVideoPathOrUrl.startsWith('file://')) {
      localSourcePath = sourceVideoPathOrUrl.replace(/^file:\/\//, '');
      if (process.platform === 'win32' && localSourcePath.startsWith('/')) {
        localSourcePath = localSourcePath.slice(1);
      }
    }

    if (!fs.existsSync(localSourcePath)) {
      return {
        success: false,
        error: `Source video file was not found on local disk: ${localSourcePath}`,
      };
    }

    // 2. Build FFmpeg command args
    const ffmpegArgs: string[] = [
      '-y',
      '-ss', startTime.toFixed(3),
      '-t', duration.toFixed(3),
      '-i', localSourcePath,
    ];

    // Subtitle filter overlay if enabled
    let subtitleFilterSnippet = '';
    if (subtitlesEnabled && subtitlesText && subtitlesText.trim()) {
      const cleanSub = escapeDrawText(subtitlesText.trim().slice(0, 140));
      const fontSize = subtitlesStyle?.fontSize || 38;
      const posYPercent = (subtitlesStyle?.positionY || 72) / 100;
      subtitleFilterSnippet = `,drawtext=text='${cleanSub}':fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=10:x=(w-text_w)/2:y=(h*${posYPercent})-text_h/2`;
    }

    // Vertical layout filtering
    if (cropMode === 'blur_padding') {
      ffmpegArgs.push(
        '-filter_complex',
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2${subtitleFilterSnippet}[outv]`,
        '-map', '[outv]',
        '-map', '0:a?'
      );
    } else if (cropMode === 'smart_crop' || cropMode === 'center_crop') {
      // Accurate center crop to 1080x1920
      ffmpegArgs.push(
        '-vf',
        `scale=-2:1920,crop=1080:1920:(in_w-1080)/2:0${subtitleFilterSnippet}`,
        '-map', '0:v',
        '-map', '0:a?'
      );
    } else {
      // Fit mode (pad with black bars)
      ffmpegArgs.push(
        '-vf',
        `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:black${subtitleFilterSnippet}`,
        '-map', '0:v',
        '-map', '0:a?'
      );
    }

    // Encoding parameters
    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '44100',
      '-movflags', '+faststart',
      tempOutputPath
    );

    await execFileAsync(ffmpegPath, ffmpegArgs, { timeout: 180000 });

    if (!fs.existsSync(tempOutputPath)) {
      return {
        success: false,
        error: 'FFmpeg execution finished but output video file was not generated.',
      };
    }

    // 3. Inspect and validate the real rendered video file
    const validation = await inspectAndValidateVideoFile(tempOutputPath);
    const metadata = await probeVideoFile(tempOutputPath);

    if (!validation.passed) {
      if (fs.existsSync(tempOutputPath)) {
        try { fs.unlinkSync(tempOutputPath); } catch {}
      }
      return {
        success: false,
        error: `Render quality inspection failed: ${validation.errors.join(' ')}`,
        validation,
        metadata,
      };
    }

    // 4. Persist to storage
    const persistRes = await persistVideoFile({
      workspaceId,
      fileName: `rendered_${clipId}.mp4`,
      filePath: tempOutputPath,
      contentType: 'video/mp4',
    });

    // Clean up temporary rendered file
    if (fs.existsSync(tempOutputPath)) {
      try { fs.unlinkSync(tempOutputPath); } catch {}
    }

    if (!persistRes.success) {
      return {
        success: false,
        error: persistRes.error || 'Failed to persist rendered video to storage.',
      };
    }

    return {
      success: true,
      renderedVideoUrl: persistRes.url,
      storagePath: persistRes.storagePath,
      metadata,
      validation,
    };
  } catch (err: any) {
    if (fs.existsSync(tempOutputPath)) {
      try { fs.unlinkSync(tempOutputPath); } catch {}
    }
    return {
      success: false,
      error: `Video rendering failed: ${err.message || 'FFmpeg process failure'}`,
    };
  } finally {
    if (remoteCleanup) {
      remoteCleanup();
    }
  }
}
