import { validateSafePublicUrl, safeFetch } from '@/lib/security/ssrf';

export interface VideoUrlValidationResult {
  valid: boolean;
  isSharePage?: boolean;
  contentType?: string;
  contentLength?: number;
  sanitizedUrl?: string;
  error?: string;
}

const PLATFORM_SHARE_PATTERNS = [
  { regex: /(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/)/i, name: 'YouTube' },
  { regex: /tiktok\.com\//i, name: 'TikTok' },
  { regex: /instagram\.com\/(?:reel|p|tv)\//i, name: 'Instagram' },
  { regex: /facebook\.com\/(?:watch|reel|video)/i, name: 'Facebook' },
  { regex: /(?:twitter\.com|x\.com)\/.+\/status/i, name: 'X / Twitter' },
  { regex: /vimeo\.com\/\d+$/i, name: 'Vimeo' },
  { regex: /twitch\.tv\//i, name: 'Twitch' },
  { regex: /linkedin\.com\/(?:posts|feed)/i, name: 'LinkedIn' },
];

const VALID_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi'];

export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Validates whether an input URL is a direct, safe, downloadable video stream.
 * 1. Blocks social platform share/watch pages.
 * 2. Enforces strict SSRF protections (no localhost, private networks, cloud metadata).
 * 3. Inspects HTTP headers for Content-Type and Content-Length.
 */
export async function validateVideoFileUrl(inputUrl: string): Promise<VideoUrlValidationResult> {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'Please enter a valid video URL.' };
  }

  const trimmed = inputUrl.trim();

  // 1. Check for platform share / watch page URLs
  for (const platform of PLATFORM_SHARE_PATTERNS) {
    if (platform.regex.test(trimmed)) {
      return {
        valid: false,
        isSharePage: true,
        error: `${platform.name} watch/share links are not direct video files. To process this video, please upload the original file or provide a direct downloadable video URL (ending in .mp4, .webm, or .mov).`,
      };
    }
  }

  // 2. SSRF & Protocol Verification
  const ssrfCheck = await validateSafePublicUrl(trimmed);
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

  // 3. Inspect target headers via HEAD or Range GET
  const pathLower = parsedUrl.pathname.toLowerCase();
  const hasVideoExt = VALID_VIDEO_EXTENSIONS.some((ext) => pathLower.endsWith(ext));

  try {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    let headRes = await safeFetch(trimmed, {
      method: 'HEAD',
      headers: defaultHeaders,
      maxResponseBytes: MAX_VIDEO_SIZE_BYTES,
      timeoutMs: 12000,
    });

    // If server disallows HEAD (HTTP 401, 403, 405, 501), fallback to Range GET for first 1KB
    if (!headRes.ok && (headRes.status === 401 || headRes.status === 403 || headRes.status === 405 || headRes.status === 501)) {
      headRes = await safeFetch(trimmed, {
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
          sanitizedUrl: trimmed,
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

    // Check if response is HTML
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      return {
        valid: false,
        isSharePage: true,
        error: 'The provided link returned a web page (HTML) rather than a direct video stream. Please provide a direct download link (e.g. ending in .mp4).',
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
      sanitizedUrl: trimmed,
    };
  } catch (err: any) {
    // If network check fails but URL ends in a clear valid video extension, allow with warning
    if (hasVideoExt) {
      return {
        valid: true,
        contentType: 'video/mp4',
        sanitizedUrl: trimmed,
      };
    }

    return {
      valid: false,
      error: `Network error verifying video URL: ${err.message || 'Connection timed out'}`,
    };
  }
}
