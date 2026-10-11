import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Checks if an IP address is private, loopback, link-local, or otherwise unsafe.
 */
export function isUnsafeIp(ip: string): boolean {
  if (!ip || !net.isIP(ip)) {
    return true; // Invalid IP is considered unsafe
  }

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4) return true;

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-local & AWS/Cloud metadata service 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Test-Net documentation)
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    if (a === 203 && b === 0 && parts[2] === 113) return true;

    // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;

    // 255.255.255.255 (Broadcast)
    if (ip === '255.255.255.255') return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();

    // Loopback ::1
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

    // IPv4-mapped IPv6 ::ffff:127.0.0.1, ::ffff:10.0.0.1, etc.
    if (normalized.startsWith('::ffff:')) {
      const v4Part = normalized.substring(7);
      if (net.isIPv4(v4Part)) {
        return isUnsafeIp(v4Part);
      }
    }

    // Link-local fe80::/10
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
      return true;
    }

    // Unique local fc00::/7 (fc00:: - fdff::)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }

    // Multicast ff00::/8
    if (normalized.startsWith('ff')) {
      return true;
    }

    return false;
  }

  return true;
}

/**
 * Validates whether a URL is a safe public HTTP or HTTPS destination.
 * Performs DNS resolution and rejects private/loopback/metadata destinations.
 */
export async function validateSafePublicUrl(inputUrl: string): Promise<{
  safe: boolean;
  error?: string;
  url?: URL;
  resolvedIps?: string[];
  pinnedIp?: string;
}> {
  try {
    const parsed = new URL(inputUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: `Invalid protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check for explicit localhost or dotless hostnames
    if (hostname === 'localhost' || !hostname.includes('.')) {
      return { safe: false, error: `Direct access to localhost or internal hostname "${hostname}" is prohibited.` };
    }

    // Reject cloud metadata hostnames directly
    if (hostname === 'metadata.google.internal' || hostname === 'instance-data') {
      return { safe: false, error: `Direct access to cloud metadata service is prohibited.` };
    }

    // If hostname is directly an IP literal
    if (net.isIP(hostname)) {
      if (isUnsafeIp(hostname)) {
        return { safe: false, error: `Access to private/local IP address "${hostname}" is blocked.` };
      }
      return { safe: true, url: parsed, resolvedIps: [hostname], pinnedIp: hostname };
    }

    // Resolve hostname via DNS
    const lookupResults = await dns.promises.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { safe: false, error: `Could not resolve hostname "${hostname}".` };
    }

    const resolvedIps = lookupResults.map((r) => r.address);
    for (const ip of resolvedIps) {
      if (isUnsafeIp(ip)) {
        return {
          safe: false,
          error: `Hostname "${hostname}" resolves to unsafe/private IP address "${ip}".`,
        };
      }
    }

    return { safe: true, url: parsed, resolvedIps, pinnedIp: resolvedIps[0] };
  } catch (err: any) {
    return { safe: false, error: err.message || 'Invalid URL' };
  }
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
}

/**
 * SSRF-Safe HTTP Fetch with DNS verification, redirect inspection, and body byte clamp.
 * Inspects all redirect destinations to prevent redirect SSRF attacks.
 */
export async function safeFetch(
  targetUrl: string,
  options?: SafeFetchOptions
): Promise<Response> {
  const timeoutMs = options?.timeoutMs || 8000;
  const maxBytes = options?.maxResponseBytes || 2 * 1024 * 1024; // 2MB default max
  const maxRedirects = options?.maxRedirects ?? 3;

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const validation = await validateSafePublicUrl(currentUrl);
    if (!validation.safe || !validation.url) {
      throw new Error(`SSRF Security Error: ${validation.error}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchOptions: RequestInit = {
        ...options,
        redirect: 'manual', // Manually inspect redirects to prevent SSRF bypass
        signal: controller.signal,
      };

      const response = await fetch(currentUrl, fetchOptions);
      clearTimeout(timeout);

      // Handle redirects manually
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          return response;
        }

        const nextUrl = new URL(locationHeader, currentUrl).href;
        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          throw new Error(`Too many redirects (exceeded limit of ${maxRedirects})`);
        }

        // Validate the redirected destination before following
        const redirectCheck = await validateSafePublicUrl(nextUrl);
        if (!redirectCheck.safe) {
          throw new Error(`SSRF Security Error on redirect: ${redirectCheck.error}`);
        }

        currentUrl = nextUrl;
        continue;
      }

      // Check Content-Length if present (skip for HEAD requests since they have no response body)
      const isHead = (options?.method || 'GET').toUpperCase() === 'HEAD';
      const contentLength = response.headers.get('content-length');
      if (!isHead && contentLength && parseInt(contentLength, 10) > maxBytes) {
        throw new Error(`Response size (${contentLength} bytes) exceeds maximum limit of ${maxBytes} bytes`);
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  throw new Error(`Exceeded maximum redirects`);
}

/**
 * Safely reads text from a response up to maxBytes.
 */
export async function safeReadText(res: Response, maxBytes: number = 2 * 1024 * 1024): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    return text.slice(0, maxBytes);
  }

  const decoder = new TextDecoder();
  let result = '';
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      result += decoder.decode(value.subarray(0, maxBytes - (bytesRead - value.byteLength)), { stream: false });
      reader.cancel();
      break;
    }
    result += decoder.decode(value, { stream: true });
  }

  return result;
}

export interface DownloadedFileResult {
  localPath: string;
  fileSizeBytes: number;
  contentType: string;
  cleanup: () => void;
}

/**
 * Downloads a remote video into controlled temporary storage with strict DNS-rebinding protection,
 * stream byte size enforcement, and cleanup callbacks.
 * Never gives remote URLs to external tools (like FFmpeg).
 */
export async function downloadSafeRemoteVideoFile(params: {
  url: string;
  maxBytes?: number;
  timeoutMs?: number;
}): Promise<DownloadedFileResult> {
  const maxBytes = params.maxBytes || 500 * 1024 * 1024; // 500MB
  const timeoutMs = params.timeoutMs || 120000; // 2 minutes

  let currentUrl = params.url;
  let redirects = 0;
  const maxRedirects = 3;

  while (redirects <= maxRedirects) {
    const validation = await validateSafePublicUrl(currentUrl);
    if (!validation.safe || !validation.url || !validation.pinnedIp) {
      throw new Error(`SSRF validation failed: ${validation.error}`);
    }

    const pinnedIp = validation.pinnedIp;
    const targetUrlObj = validation.url;

    const tempDir = path.join(os.tmpdir(), 'secure_video_downloads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(
      tempDir,
      `dl_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.mp4`
    );

    const cleanup = () => {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch {
        // Ignore unlink error
      }
    };

    try {
      const isHttps = targetUrlObj.protocol === 'https:';
      const transport = isHttps ? https : http;

      // Pinned IP lookup to eliminate DNS rebinding TOCTOU attacks
      const lookupAgent = isHttps
        ? new https.Agent({
            lookup: (_hostname, _opts, cb) => cb(null, pinnedIp, net.isIPv6(pinnedIp) ? 6 : 4),
            rejectUnauthorized: true,
            servername: targetUrlObj.hostname,
          })
        : new http.Agent({
            lookup: (_hostname, _opts, cb) => cb(null, pinnedIp, net.isIPv6(pinnedIp) ? 4 : 4),
          });

      const res = await new Promise<{
        statusCode?: number;
        headers: http.IncomingHttpHeaders;
        stream: http.IncomingMessage;
      }>((resolve, reject) => {
        const req = transport.request(
          targetUrlObj,
          {
            method: 'GET',
            agent: lookupAgent,
            timeout: timeoutMs,
            headers: {
              'User-Agent': 'NexusMark-MediaDownloader/1.0',
              'Accept': 'video/*,*/*;q=0.8',
            },
          },
          (resMsg) => {
            resolve({
              statusCode: resMsg.statusCode,
              headers: resMsg.headers,
              stream: resMsg,
            });
          }
        );

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Download connection timed out after ${timeoutMs}ms`));
        });
        req.end();
      });

      // Handle redirect
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.stream.resume(); // drain
        const location = res.headers.location;
        if (!location) {
          throw new Error('Redirect response missing Location header');
        }
        currentUrl = new URL(location, currentUrl).href;
        redirects++;
        continue;
      }

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.stream.resume();
        throw new Error(`Remote server responded with HTTP ${res.statusCode}`);
      }

      const contentType = (res.headers['content-type'] as string) || 'video/mp4';
      const contentLength = res.headers['content-length'] ? parseInt(res.headers['content-length'] as string, 10) : 0;
      if (contentLength > maxBytes) {
        res.stream.resume();
        throw new Error(`Video file size (${contentLength} bytes) exceeds limit of ${maxBytes} bytes`);
      }

      // Stream to temporary file while counting bytes
      let downloadedBytes = 0;
      const fileStream = fs.createWriteStream(tempFilePath);

      await new Promise<void>((resolve, reject) => {
        res.stream.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          if (downloadedBytes > maxBytes) {
            res.stream.destroy();
            fileStream.destroy();
            cleanup();
            reject(new Error(`Download exceeded maximum limit of ${maxBytes} bytes`));
          }
        });

        res.stream.pipe(fileStream);

        fileStream.on('finish', () => resolve());
        fileStream.on('error', (err) => {
          cleanup();
          reject(err);
        });
        res.stream.on('error', (err) => {
          cleanup();
          reject(err);
        });
      });

      return {
        localPath: tempFilePath,
        fileSizeBytes: downloadedBytes,
        contentType,
        cleanup,
      };
    } catch (err) {
      cleanup();
      throw err;
    }
  }

  throw new Error('Exceeded maximum allowed redirects');
}
