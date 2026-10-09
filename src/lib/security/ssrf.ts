import dns from 'dns';
import net from 'net';

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

    // If hostname is directly an IP literal
    if (net.isIP(hostname)) {
      if (isUnsafeIp(hostname)) {
        return { safe: false, error: `Access to private/local IP address "${hostname}" is blocked.` };
      }
      return { safe: true, url: parsed, resolvedIps: [hostname] };
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

    return { safe: true, url: parsed, resolvedIps };
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
