import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import { persistVideoFile } from './storage';
import { probeVideoFile } from './prober';
import { validateSafePublicUrl, safeFetch } from '@/lib/security/ssrf';

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

/**
 * Searches the host environment for a system-installed yt-dlp or youtube-dl binary.
 * Avoids any node-gyp or preinstall scripts that require Python during npm install.
 */
function findSystemYtDlp(): string | null {
  try {
    const isWin = process.platform === 'win32';
    const binaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
    const checkCmd = isWin ? 'where' : 'which';
    const result = execFileSync(checkCmd, [binaryName], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const firstLine = result.trim().split(/\r?\n/)[0].trim();
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Not found in PATH
  }

  // Also check youtube-dl fallback
  try {
    const isWin = process.platform === 'win32';
    const binaryName = isWin ? 'youtube-dl.exe' : 'youtube-dl';
    const checkCmd = isWin ? 'where' : 'which';
    const result = execFileSync(checkCmd, [binaryName], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const firstLine = result.trim().split(/\r?\n/)[0].trim();
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Not found in PATH
  }

  return null;
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

export interface VideoDownloadResult {
  success: boolean;
  videoUrl?: string;
  storagePath?: string;
  title?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  platform?: string;
  error?: string;
}

/**
 * Downloads a direct video stream (MP4, WebM, MOV, Google Drive, Dropbox, public CDN/S3)
 * using pure Node.js safeFetch and @ffmpeg-installer/ffmpeg.
 * Completely dependency-free and works reliably across all host environments.
 */
export async function downloadDirectVideoStream(params: {
  url: string;
  workspaceId: string;
  titleHint?: string;
}): Promise<VideoDownloadResult> {
  const ssrfCheck = await validateSafePublicUrl(params.url);
  if (!ssrfCheck.safe) {
    return {
      success: false,
      error: ssrfCheck.error || 'The provided URL points to an unsafe destination.',
    };
  }

  const tempDir = path.join(os.tmpdir(), 'video_downloads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const randomSuffix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const tempPath = path.join(tempDir, `stream_${randomSuffix}.mp4`);

  try {
    const response = await safeFetch(params.url, {
      maxResponseBytes: 500 * 1024 * 1024,
      timeoutMs: 60000,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Could not download video stream: HTTP ${response.status}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempPath, buffer);

    if (buffer.byteLength === 0) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return { success: false, error: 'Downloaded video stream is empty (0 bytes).' };
    }

    let durationSeconds = 60;
    try {
      const probe = await probeVideoFile(tempPath);
      if (probe.durationSeconds > 0) {
        durationSeconds = probe.durationSeconds;
      }
    } catch {
      // Fallback
    }

    let derivedTitle = params.titleHint || '';
    if (!derivedTitle) {
      try {
        const parsedUrl = new URL(params.url);
        const base = path.basename(parsedUrl.pathname).replace(/\.[^/.]+$/, '');
        if (base && base.length > 2 && !base.includes('export')) {
          derivedTitle = base;
        }
      } catch {}
    }
    if (!derivedTitle) derivedTitle = 'Video Recording';

    const cleanTitle = derivedTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

    const storageRes = await persistVideoFile({
      workspaceId: params.workspaceId,
      fileName: `${cleanTitle}.mp4`,
      filePath: tempPath,
      contentType: 'video/mp4',
    });

    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    if (!storageRes.success) {
      return {
        success: false,
        error: storageRes.error || 'Failed to save downloaded video to storage.',
      };
    }

    return {
      success: true,
      videoUrl: storageRes.url,
      storagePath: storageRes.storagePath,
      title: derivedTitle,
      durationSeconds,
      fileSizeBytes: buffer.byteLength,
      platform: 'Direct Stream',
    };
  } catch (err: any) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
    return {
      success: false,
      error: `Failed to download video stream: ${err.message || 'Network error'}`,
    };
  }
}

/**
 * Downloads a YouTube video. If yt-dlp is installed in the host PATH, uses it directly.
 * If yt-dlp is not present, gracefully informs the user with instructions to upload the MP4 file.
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
  const ytDlpPath = findSystemYtDlp();

  if (!ytDlpPath) {
    return {
      success: false,
      error:
        'Server-side YouTube stream downloading is not available on this server environment (yt-dlp is not installed in system PATH). Please upload your original MP4 file directly or provide a direct downloadable video link.',
    };
  }

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
      // Ignore
    }
  };

  try {
    let videoTitle = 'YouTube Video';
    let expectedDuration = 60;

    try {
      const infoRes = await execFileAsync(ytDlpPath, [
        cleanUrl,
        '--dump-single-json',
        '--no-warnings',
        '--prefer-free-formats',
      ]);
      const info = JSON.parse(infoRes.stdout);
      if (info?.title) videoTitle = info.title;
      if (typeof info?.duration === 'number' && info.duration > 0) {
        expectedDuration = info.duration;
      }
    } catch (infoErr: any) {
      console.warn('Could not pre-fetch YouTube metadata:', infoErr?.message);
    }

    const ffmpegPath = getFfmpegPath();

    await execFileAsync(ytDlpPath, [
      cleanUrl,
      '-o',
      finalMergedPath,
      '--format',
      'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format',
      'mp4',
      '--ffmpeg-location',
      ffmpegPath,
      '--no-warnings',
      '--max-filesize',
      '500M',
    ]);

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

/**
 * Universal video downloader supporting YouTube, TikTok, Instagram, Facebook, Vimeo, X/Twitter,
 * and direct video streams (.mp4, .webm, Google Drive, Dropbox, etc.).
 */
export async function downloadVideoFromUrl(params: {
  url: string;
  workspaceId: string;
}): Promise<VideoDownloadResult> {
  const trimmed = (params.url || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Please enter a valid video URL.' };
  }

  // 1. YouTube handling
  if (isYouTubeUrl(trimmed)) {
    return downloadYouTubeVideo({
      url: trimmed,
      workspaceId: params.workspaceId,
    });
  }

  // 2. SSRF check
  const ssrfCheck = await validateSafePublicUrl(trimmed);
  if (!ssrfCheck.safe) {
    return {
      success: false,
      error: ssrfCheck.error || 'The provided URL points to an unsafe destination.',
    };
  }

  // 3. Direct video stream check (.mp4, .webm, .mov, or Google Drive / Dropbox direct)
  const isDirectVideo =
    /\.(?:mp4|webm|mov|mkv|m4v)(?:\?.*)?$/i.test(trimmed) ||
    /drive\.google\.com\/uc\?export=download/i.test(trimmed) ||
    /dropbox\.com/i.test(trimmed);

  if (isDirectVideo) {
    return downloadDirectVideoStream({
      url: trimmed,
      workspaceId: params.workspaceId,
    });
  }

  // 4. Social platform stream extraction via system yt-dlp if available
  const ytDlpPath = findSystemYtDlp();

  let detectedPlatform = 'Video';
  if (/tiktok\.com/i.test(trimmed)) detectedPlatform = 'TikTok';
  else if (/instagram\.com/i.test(trimmed)) detectedPlatform = 'Instagram';
  else if (/facebook\.com|fb\.watch/i.test(trimmed)) detectedPlatform = 'Facebook';
  else if (/vimeo\.com/i.test(trimmed)) detectedPlatform = 'Vimeo';
  else if (/twitter\.com|x\.com/i.test(trimmed)) detectedPlatform = 'X';

  if (!ytDlpPath) {
    // If it's another URL without yt-dlp, attempt direct stream download first
    const directAttempt = await downloadDirectVideoStream({
      url: trimmed,
      workspaceId: params.workspaceId,
    });
    if (directAttempt.success) {
      return directAttempt;
    }

    return {
      success: false,
      error: `Video stream extraction for ${detectedPlatform} is not available on this server environment (yt-dlp is not installed in system PATH). Please upload your original MP4 file directly or provide a direct downloadable video link (ending in .mp4, .webm, or .mov).`,
    };
  }

  const tempDir = path.join(os.tmpdir(), 'video_downloads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const randomSuffix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const tempOutputBase = path.join(tempDir, `vid_${randomSuffix}`);
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
      // Ignore
    }
  };

  try {
    let videoTitle = `${detectedPlatform} Video`;
    let expectedDuration = 60;

    try {
      const infoRes = await execFileAsync(ytDlpPath, [
        trimmed,
        '--dump-single-json',
        '--no-warnings',
        '--prefer-free-formats',
      ]);
      const info = JSON.parse(infoRes.stdout);
      if (info?.title) videoTitle = info.title;
      if (typeof info?.duration === 'number' && info.duration > 0) {
        expectedDuration = info.duration;
      }
    } catch (infoErr: any) {
      console.warn(`Could not pre-fetch ${detectedPlatform} metadata:`, infoErr?.message);
    }

    const ffmpegPath = getFfmpegPath();

    await execFileAsync(ytDlpPath, [
      trimmed,
      '-o',
      finalMergedPath,
      '--format',
      'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format',
      'mp4',
      '--ffmpeg-location',
      ffmpegPath,
      '--no-warnings',
      '--max-filesize',
      '500M',
    ]);

    let actualFilePath = finalMergedPath;
    if (!fs.existsSync(actualFilePath)) {
      const possibleExtensions = ['.mp4', '.mkv', '.webm', '.m4v'];
      const found = possibleExtensions.find((ext) => fs.existsSync(`${tempOutputBase}${ext}`));
      if (found) {
        actualFilePath = `${tempOutputBase}${found}`;
      } else {
        cleanupFiles();
        return {
          success: false,
          error: `Could not extract video stream from this ${detectedPlatform} link. If the video is private or restricted, please upload your original MP4 file directly.`,
        };
      }
    }

    const fileStats = fs.statSync(actualFilePath);
    if (fileStats.size === 0) {
      cleanupFiles();
      return { success: false, error: 'Downloaded video file is empty (0 bytes).' };
    }

    if (fileStats.size > 500 * 1024 * 1024) {
      cleanupFiles();
      return { success: false, error: 'Downloaded video exceeds 500 MB limit.' };
    }

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

    cleanupFiles();

    if (!storageRes.success) {
      return {
        success: false,
        error: storageRes.error || `Failed to save downloaded ${detectedPlatform} video to storage.`,
      };
    }

    return {
      success: true,
      videoUrl: storageRes.url,
      storagePath: storageRes.storagePath,
      title: videoTitle,
      durationSeconds: probeDuration,
      fileSizeBytes: fileStats.size,
      platform: detectedPlatform,
    };
  } catch (err: any) {
    cleanupFiles();
    return {
      success: false,
      error: `Could not download video from this URL: ${err.message || 'Stream extraction failed'}. If the video is private or restricted, please upload your original MP4 file directly.`,
    };
  }
}
