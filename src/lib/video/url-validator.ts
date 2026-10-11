import { validateSafePublicUrl, safeFetch } from '@/lib/security/ssrf';
import { parseAndValidateYouTubeUrl } from './youtube-downloader';

export interface VideoUrlValidationResult {
  valid: boolean;
  isSharePage?: boolean;
  isYouTube?: boolean;
  isDownloadablePlatform?: boolean;
  platform?: string;
  contentType?: string;
  contentLength?: number;
  sanitizedUrl?: string;
  error?: string;
}

export const SUPPORTED_VIDEO_PLATFORMS = [
  {
    name: 'YouTube',
    regex: /(?:youtube\.com\/(?:watch|shorts|embed|v|live)|youtu\.be\/)/i,
    isYouTube: true,
  },
  {
    name: 'TikTok',
    regex: /(?:tiktok\.com\/|vt\.tiktok\.com\/|vm\.tiktok\.com\/)/i,
  },
  {
    name: 'Instagram',
    regex: /instagram\.com\/(?:reel|p|tv|stories)\//i,
  },
  {
    name: 'Facebook',
    regex: /(?:facebook\.com\/(?:watch|reel|videos?|story\.php)|fb\.watch\/)/i,
  },
  {
    name: 'X / Twitter',
    regex: /(?:twitter\.com|x\.com)\/.+\/status/i,
  },
  {
    name: 'Vimeo',
    regex: /vimeo\.com\/(?:\d+|video\/\d+)/i,
  },
  {
    name: 'Twitch',
    regex: /twitch\.tv\/(?:videos\/\d+|clips\/[a-zA-Z0-9_-]+)/i,
  },
  {
    name: 'Loom',
    regex: /loom\.com\/share\/[a-zA-Z0-9_-]+/i,
  },
  {
    name: 'Reddit',
    regex: /reddit\.com\/r\/.+\/comments\//i,
  },
];

export const VALID_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi'];

export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Normalizes cloud storage and media share URLs into direct streaming download links.
 * E.g., Dropbox (?dl=0 -> ?raw=1) and Google Drive file view links.
 */
export function normalizeDirectMediaUrl(inputUrl: string): string {
  try {
    const parsed = new URL(inputUrl);

    // Dropbox: convert ?dl=0 to ?raw=1
    if (parsed.hostname.includes('dropbox.com')) {
      parsed.searchParams.set('raw', '1');
      parsed.searchParams.delete('dl');
      return parsed.toString();
    }

    // Google Drive share link: /file/d/FILE_ID/view -> uc?export=download&id=FILE_ID
    if (parsed.hostname === 'drive.google.com') {
      const match = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }

    return inputUrl;
  } catch {
    return inputUrl;
  }
}

/**
 * Validates whether an input URL is a direct downloadable video stream or a supported video platform link.
 * 1. Supports YouTube watch and shorts URLs via automatic stream downloader.
 * 2. Supports TikTok, Instagram, Facebook, Vimeo, X/Twitter, and Loom via universal stream extraction.
 * 3. Enforces strict SSRF protections (no localhost, private networks, cloud metadata).
 * 4. Inspects HTTP headers for Content-Type and Content-Length for direct media URLs.
 */
export async function validateVideoFileUrl(inputUrl: string): Promise<VideoUrlValidationResult> {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'Please enter a valid video URL.' };
  }

  const trimmed = inputUrl.trim();

  // 1. SSRF & Protocol Verification FIRST to protect against SSRF across all URLs
  const normalizedUrl = normalizeDirectMediaUrl(trimmed);
  const ssrfCheck = await validateSafePublicUrl(normalizedUrl);
  if (!ssrfCheck.safe) {
    return {
      valid: false,
      error: ssrfCheck.error || 'The provided URL points to an unsafe or private destination.',
    };
  }

  const parsedUrl = ssrfCheck.url!;
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return {
      valid: false,
      error: 'Only HTTPS and HTTP direct video URLs are supported.',
    };
  }

  // 2. YouTube watch/share URLs: Supported via automated stream extraction!
  const ytValidation = parseAndValidateYouTubeUrl(trimmed);
  if (ytValidation.valid && ytValidation.sanitizedUrl) {
    return {
      valid: true,
      isYouTube: true,
      isDownloadablePlatform: true,
      platform: 'YouTube',
      sanitizedUrl: ytValidation.sanitizedUrl,
      contentType: 'video/mp4',
    };
  }

  // 3. Supported Social Video Platforms (TikTok, Instagram, Facebook, Vimeo, Twitter, Loom, etc.)
  for (const platform of SUPPORTED_VIDEO_PLATFORMS) {
    if (platform.regex.test(trimmed)) {
      return {
        valid: true,
        isDownloadablePlatform: true,
        isYouTube: !!platform.isYouTube,
        platform: platform.name,
        sanitizedUrl: trimmed,
        contentType: 'video/mp4',
      };
    }
  }

  // 4. Inspect target headers via HEAD or Range GET for direct video URLs
  const pathLower = parsedUrl.pathname.toLowerCase();
  const hasVideoExt = VALID_VIDEO_EXTENSIONS.some((ext) => pathLower.endsWith(ext));

  try {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    let headRes = await safeFetch(normalizedUrl, {
      method: 'HEAD',
      headers: defaultHeaders,
      maxResponseBytes: MAX_VIDEO_SIZE_BYTES,
      timeoutMs: 12000,
    });

    // If server disallows HEAD (HTTP 401, 403, 405, 501), fallback to Range GET for first 1KB
    if (!headRes.ok && (headRes.status === 401 || headRes.status === 403 || headRes.status === 405 || headRes.status === 501)) {
      headRes = await safeFetch(normalizedUrl, {
        method: 'GET',
        headers: {
          ...defaultHeaders,
          Range: 'bytes=0-1024',
        },
        maxResponseBytes: MAX_VIDEO_SIZE_BYTES,
        timeoutMs: 12000,
      });
    }

    if (!headRes.ok) {
      if (hasVideoExt) {
        return {
          valid: true,
          contentType: 'video/mp4',
          sanitizedUrl: normalizedUrl,
        };
      }
      return {
        valid: false,
        error: `Could not access video at URL (HTTP ${headRes.status}). Ensure the link is public and accessible without login.`,
      };
    }

    const contentType = (headRes.headers.get('content-type') || '').toLowerCase();
    const contentLengthStr = headRes.headers.get('content-length');
    const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : undefined;

    // Check if response is HTML (and not a recognized video platform)
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      return {
        valid: false,
        isSharePage: true,
        error: 'The provided link returned a web page rather than a video file. Please provide a supported video link (YouTube, TikTok, Instagram, Facebook, Vimeo) or a direct video URL ending in .mp4, .webm, or .mov.',
      };
    }

    // Check Content-Type or path extension
    const isVideoMime =
      contentType.includes('video/') ||
      contentType.includes('application/mp4') ||
      contentType.includes('application/octet-stream');

    if (!isVideoMime && !hasVideoExt) {
      return {
        valid: false,
        error: `URL returned unsupported content type "${contentType || 'unknown'}". Supported formats: MP4, MOV, WebM.`,
      };
    }

    // Check file size limits
    if (contentLength && contentLength > MAX_VIDEO_SIZE_BYTES) {
      const mbSize = (contentLength / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `Video size (${mbSize} MB) exceeds maximum allowed size of 500 MB.`,
      };
    }

    return {
      valid: true,
      contentType: contentType || 'video/mp4',
      contentLength,
      sanitizedUrl: normalizedUrl,
    };
  } catch (err: any) {
    if (hasVideoExt) {
      return {
        valid: true,
        contentType: 'video/mp4',
        sanitizedUrl: normalizedUrl,
      };
    }

    return {
      valid: false,
      error: `Network error verifying video URL: ${err.message || 'Connection timed out'}`,
    };
  }
}

