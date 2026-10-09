import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { probeVideoFile, verifyVideoDecodable, VideoMetadata } from './prober';
import { persistVideoFile } from './storage';
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
  cropMode?: 'blur_padding' | 'smart_crop' | 'fit';
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

/**
 * Renders an authentic 1080x1920 (9:16) MP4 video clip from source footage using FFmpeg.
 * Applies selected crop mode (blur padding, smart center crop, or fit padding).
 * Stores the rendered file separately from source video and verifies real output decoding.
 */
export async function renderVerticalShort(options: RenderOptions): Promise<RenderResult> {
  const {
    workspaceId,
    clipId,
    sourceVideoPathOrUrl,
    startTime,
    endTime,
    cropMode = 'blur_padding',
  } = options;

  const duration = Math.max(0, endTime - startTime);
  if (duration < 15.0 || duration > 60.0) {
    return {
      success: false,
      error: `Invalid clip duration (${duration.toFixed(1)}s). Shorts and Reels require between 15.0 and 60.0 seconds.`,
    };
  }

  const ffmpegPath = getFfmpegPath();

  // Create temporary working directory for rendering
  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp_renders');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const outputFileName = `render_${clipId}_${Date.now()}.mp4`;
  const tempOutputPath = path.join(tempDir, outputFileName);

  try {
    const ffmpegArgs: string[] = [
      '-y',
      '-ss', startTime.toFixed(3),
      '-t', duration.toFixed(3),
      '-i', sourceVideoPathOrUrl,
    ];

    // Filter configuration for vertical 9:16 (1080x1920)
    if (cropMode === 'blur_padding') {
      // Professional YouTube Shorts layout:
      // Background: scale to fill 1080x1920 and heavily blur
      // Foreground: scale to fit 1080x1920 preserving aspect ratio
      // Overlay: center foreground over blurred background
      ffmpegArgs.push(
        '-filter_complex',
        '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]',
        '-map', '[outv]',
        '-map', '0:a?'
      );
    } else if (cropMode === 'smart_crop') {
      // Center crop to 1080x1920
      ffmpegArgs.push(
        '-vf',
        'scale=-2:1920,crop=1080:1920:(in_w-1080)/2:0',
        '-map', '0:v',
        '-map', '0:a?'
      );
    } else {
      // Fit mode (pad with black bars)
      ffmpegArgs.push(
        '-vf',
        'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:black',
        '-map', '0:v',
        '-map', '0:a?'
      );
    }

    // Encoding parameters: fast preset, H.264 high profile, AAC stereo audio, faststart for streaming
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
        error: 'FFmpeg finished but output video file was not created.',
      };
    }

    // Probe the rendered video file to verify actual output dimensions, streams, and decoding
    const metadata = await probeVideoFile(tempOutputPath);
    const decodeCheck = await verifyVideoDecodable(tempOutputPath);

    const validationErrors: string[] = [];
    if (metadata.width !== 1080 || metadata.height !== 1920) {
      validationErrors.push(`Expected 1080x1920 dimensions, got ${metadata.width}x${metadata.height}.`);
    }
    if (!metadata.hasVideo) {
      validationErrors.push('Rendered file contains no valid video stream.');
    }
    if (!decodeCheck.decodable) {
      validationErrors.push(`Rendered video failed decoding verification: ${decodeCheck.error || 'stream error'}`);
    }

    const validation: ClipValidationResult = {
      passed: validationErrors.length === 0,
      durationSeconds: metadata.durationSeconds,
      aspectRatio: '9:16',
      width: metadata.width,
      height: metadata.height,
      hasAudio: metadata.hasAudio,
      hasVideo: metadata.hasVideo,
      decodedSuccessfully: decodeCheck.decodable,
      errors: validationErrors,
      warnings: [],
    };

    if (!validation.passed) {
      return {
        success: false,
        error: `Render quality check failed: ${validationErrors.join(' ')}`,
        validation,
      };
    }

    // Read rendered buffer and persist to private Supabase Storage
    const renderedBuffer = fs.readFileSync(tempOutputPath);
    const persistRes = await persistVideoFile({
      workspaceId,
      fileName: `rendered_${clipId}.mp4`,
      buffer: renderedBuffer,
      contentType: 'video/mp4',
    });

    // Clean up temporary local file if uploaded to remote storage
    if (persistRes.success && persistRes.url.startsWith('http')) {
      try {
        fs.unlinkSync(tempOutputPath);
      } catch {}
    }

    return {
      success: true,
      renderedVideoUrl: persistRes.url || `/uploads/temp_renders/${outputFileName}`,
      storagePath: persistRes.storagePath,
      localFilePath: tempOutputPath,
      metadata,
      validation,
    };
  } catch (err: any) {
    if (fs.existsSync(tempOutputPath)) {
      try {
        fs.unlinkSync(tempOutputPath);
      } catch {}
    }

    return {
      success: false,
      error: `Video rendering failed: ${err.message || 'FFmpeg process failed'}`,
    };
  }
}
