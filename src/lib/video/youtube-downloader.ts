import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
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

export const EXACT_SUPPORTED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export interface ValidatedYouTubeUrl {
  valid: boolean;
  sanitizedUrl?: string;
  videoId?: string;
  error?: string;
}

/**
 * Parses and validates YouTube URLs using standard new URL() parser.
 * Strictly verifies supported hostnames and video path structures.
 * Never searches the raw string for substrings like "youtube.com".
 */
export function parseAndValidateYouTubeUrl(inputUrl: string): ValidatedYouTubeUrl {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'Empty or invalid URL.' };
  }

  try {
    const parsed = new URL(inputUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'Only HTTP and HTTPS YouTube URLs are supported.' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!EXACT_SUPPORTED_YOUTUBE_HOSTS.has(hostname)) {
      return { valid: false, error: `Hostname "${hostname}" is not an authorized YouTube domain.` };
    }

    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      const candidate = parsed.pathname.slice(1).split('/')[0];
      if (candidate && VIDEO_ID_REGEX.test(candidate)) {
        videoId = candidate;
      }
    } else {
      if (parsed.pathname === '/watch') {
        const v = parsed.searchParams.get('v');
        if (v && VIDEO_ID_REGEX.test(v)) {
          videoId = v;
        }
      } else if (parsed.pathname.startsWith('/shorts/') || parsed.pathname.startsWith('/embed/')) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const candidate = parts[1];
          if (VIDEO_ID_REGEX.test(candidate)) {
            videoId = candidate;
          }
        }
      }
    }

    if (!videoId) {
      return {
        valid: false,
        error: 'URL does not contain a valid 11-character YouTube video ID in path or query.',
      };
    }

    return {
      valid: true,
      videoId,
      sanitizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return { valid: false, error: 'Malformed URL.' };
  }
}

export function isYouTubeUrl(url: string): boolean {
  return parseAndValidateYouTubeUrl(url).valid;
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
 * Downloads a YouTube video using yt-dlp with bundled FFmpeg.
 * Validates the YouTube URL, removes noCheckCertificates, enforces byte limits,
 * and ensures cleanup of temporary files on both success and failure.
 */
export async function downloadYouTubeVideo(params: {
  url: string;
  workspaceId: string;
}): Promise<YouTubeDownloadResult> {
  const validation = parseAndValidateYouTubeUrl(params.url);
  if (!validation.valid || !validation.sanitizedUrl) {
    return {
      success: false,
      error: validation.error || 'The provided URL is not a recognized YouTube URL.',
    };
  }

  const cleanUrl = validation.sanitizedUrl;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const youtubedl = require('youtube-dl-exec');
  const tempDir = path.join(os.tmpdir(), 'youtube_downloads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const randomSuffix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const tempOutputBase = path.join(tempDir, `yt_${randomSuffix}`);
  const finalMergedPath = `${tempOutputBase}.mp4`;

  const cleanupFiles = () => {
    try {
      const extensions = ['.mp4', '.mkv', '.webm', '.m4v', '.part', '.ytdl'];
      for (const ext of extensions) {
        const p = `${tempOutputBase}${ext}`;
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      if (fs.existsSync(finalMergedPath)) fs.unlinkSync(finalMergedPath);
    } catch {
      // Ignore cleanup error
    }
  };

  try {
    // 1. Fetch metadata without disabling certificate checks
    let videoTitle = 'YouTube Video';
    let expectedDuration = 60;

    try {
      const info = await youtubedl(cleanUrl, {
        dumpSingleJson: true,
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

    await youtubedl(cleanUrl, {
      output: finalMergedPath,
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      mergeOutputFormat: 'mp4',
      ffmpegLocation: ffmpegPath,
      noWarnings: true,
      maxFilesize: '500M',
    });

    // Verify output file exists
    let actualFilePath = finalMergedPath;
    if (!fs.existsSync(actualFilePath)) {
      const possibleExtensions = ['.mkv', '.webm', '.m4v'];
      const found = possibleExtensions.find((ext) => fs.existsSync(`${tempOutputBase}${ext}`));
      if (found) {
        actualFilePath = `${tempOutputBase}${found}`;
      } else {
        cleanupFiles();
        return {
          success: false,
          error: 'Failed to download YouTube video: output file was not produced.',
        };
      }
    }

    const fileStats = fs.statSync(actualFilePath);
    if (fileStats.size === 0) {
      cleanupFiles();
      return { success: false, error: 'Downloaded YouTube video is empty (0 bytes).' };
    }

    if (fileStats.size > 500 * 1024 * 1024) {
      cleanupFiles();
      return { success: false, error: 'Downloaded YouTube video exceeds 500 MB limit.' };
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

    const cleanTitle = videoTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageRes = await persistVideoFile({
      workspaceId: params.workspaceId,
      fileName: `${cleanTitle}.mp4`,
      filePath: actualFilePath,
      contentType: 'video/mp4',
    });

    // Clean up temporary local files on success
    cleanupFiles();

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
    cleanupFiles();
    return {
      success: false,
      error: `Could not download YouTube video: ${err.message || 'Stream extraction failed'}`,
    };
  }
}
