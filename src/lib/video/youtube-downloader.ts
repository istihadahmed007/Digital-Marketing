import path from 'path';
import fs from 'fs';
import os from 'os';
import { persistVideoFile } from './storage';
import { probeVideoFile } from './prober';

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

export function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/)/i.test(url.trim());
}

export interface YouTubeDownloadResult {
  success: boolean;
  videoUrl?: string;
  storagePath?: string;
  title?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  error?: string;
}

/**
 * Downloads a YouTube video using yt-dlp with bundled FFmpeg,
 * merges video + audio into a clean MP4 file, and persists it into Supabase Storage.
 */
export async function downloadYouTubeVideo(params: {
  url: string;
  workspaceId: string;
}): Promise<YouTubeDownloadResult> {
  const url = params.url.trim();
  if (!isYouTubeUrl(url)) {
    return { success: false, error: 'The provided URL is not a recognized YouTube URL.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const youtubedl = require('youtube-dl-exec');
  const tempDir = os.tmpdir();
  const tempOutputBase = path.join(tempDir, `yt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const finalMergedPath = `${tempOutputBase}.mp4`;

  try {
    // 1. Fetch info / metadata first
    let videoTitle = 'YouTube Video';
    let expectedDuration = 60;

    try {
      const info = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      });

      if (info?.title) {
        videoTitle = info.title;
      }
      if (typeof info?.duration === 'number' && info.duration > 0) {
        expectedDuration = info.duration;
      }
    } catch (infoErr: any) {
      console.warn('Could not pre-fetch YouTube video info:', infoErr.message);
    }

    // 2. Download and merge into a single MP4 file with FFmpeg
    const ffmpegPath = getFfmpegPath();

    await youtubedl(url, {
      output: finalMergedPath,
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      mergeOutputFormat: 'mp4',
      ffmpegLocation: ffmpegPath,
      noCheckCertificates: true,
      noWarnings: true,
      maxFilesize: '500M',
    });

    // Verify output file exists
    let actualFilePath = finalMergedPath;
    if (!fs.existsSync(actualFilePath)) {
      // Check if yt-dlp wrote with another extension (.mkv or .webm)
      const possibleExtensions = ['.mkv', '.webm', '.m4v'];
      const found = possibleExtensions.find((ext) => fs.existsSync(`${tempOutputBase}${ext}`));
      if (found) {
        actualFilePath = `${tempOutputBase}${found}`;
      } else {
        return {
          success: false,
          error: 'Failed to download YouTube video: output file was not produced.',
        };
      }
    }

    const fileStats = fs.statSync(actualFilePath);
    if (fileStats.size === 0) {
      if (fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath);
      return { success: false, error: 'Downloaded YouTube video is empty (0 bytes).' };
    }

    // Probe file for exact duration and streams
    let probeDuration = expectedDuration;
    try {
      const probed = await probeVideoFile(actualFilePath);
      if (probed.durationSeconds > 0) {
        probeDuration = probed.durationSeconds;
      }
    } catch {
      // Use expectedDuration
    }

    // Read buffer and persist into Supabase Storage
    const videoBuffer = fs.readFileSync(actualFilePath);

    // Clean up temporary local file
    try {
      fs.unlinkSync(actualFilePath);
    } catch {
      // Ignore cleanup error
    }

    const storageRes = await persistVideoFile({
      workspaceId: params.workspaceId,
      fileName: `${videoTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`,
      buffer: videoBuffer,
      contentType: 'video/mp4',
    });

    if (!storageRes.success) {
      return {
        success: false,
        error: storageRes.error || 'Failed to save downloaded YouTube video to storage.',
      };
    }

    return {
      success: true,
      videoUrl: storageRes.url,
      storagePath: storageRes.storagePath,
      title: videoTitle,
      durationSeconds: probeDuration,
      fileSizeBytes: fileStats.size,
    };
  } catch (err: any) {
    if (fs.existsSync(finalMergedPath)) {
      try {
        fs.unlinkSync(finalMergedPath);
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      error: `Could not download YouTube video: ${err.message || 'Stream extraction failed'}`,
    };
  }
}
