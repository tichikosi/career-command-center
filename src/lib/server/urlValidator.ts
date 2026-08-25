import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export interface UrlValidationResult {
  isValid: boolean;
  status: number;
  finalUrl: string;
  finalDomain: string;
  redirectCount: number;
  checkedAt: string;
  failureReason?: string;
  htmlSnippet?: string;
}

export interface UrlValidationOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBodySizeBytes?: number;
  fetchHtmlSnippet?: boolean;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_BODY_SIZE = 512 * 1024; // 512 KB
const USER_AGENT = 'CareerCommandCenter-Bot/3.1 (+https://career-command-center.local)';

/**
 * Validates whether an IP address belongs to private, loopback, link-local, or reserved ranges.
 */
export function isPrivateIp(ip: string): boolean {
  const cleanIp = ip.trim();

  // IPv4 Loopback (127.0.0.0/8)
  if (/^127\./.test(cleanIp)) return true;

  // IPv4 Private Range (10.0.0.0/8)
  if (/^10\./.test(cleanIp)) return true;

  // IPv4 Private Range (172.16.0.0/12 -> 172.16 - 172.31)
  const match172 = cleanIp.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }

  // IPv4 Private Range (192.168.0.0/16)
  if (/^192\.168\./.test(cleanIp)) return true;

  // IPv4 Link-local / Cloud Metadata (169.254.0.0/16)
  if (/^169\.254\./.test(cleanIp)) return true;

  // IPv4 Carrier-grade NAT (100.64.0.0/10 -> 100.64 - 100.127)
  const match100 = cleanIp.match(/^100\.(\d+)\./);
  if (match100) {
    const octet = parseInt(match100[1], 10);
    if (octet >= 64 && octet <= 127) return true;
  }

  // IPv4 0.0.0.0/8
  if (/^0\./.test(cleanIp)) return true;

  // IPv6 Loopback & Unspecified
  if (cleanIp === '::1' || cleanIp === '::') return true;

  // IPv6 Unique Local Address (fc00::/7 -> fc00 - fdff)
  if (/^[fF][cCdD]/i.test(cleanIp)) return true;

  // IPv6 Link-Local (fe80::/10 -> fe80 - febf)
  if (/^[fF][eE][89aAbB]/i.test(cleanIp)) return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
  if (/^::ffff:/i.test(cleanIp)) {
    const mappedV4 = cleanIp.replace(/^::ffff:/i, '');
    return isPrivateIp(mappedV4);
  }

  return false;
}

/**
 * Checks if a hostname or URL is dangerous / private (SSRF prevention).
 */
export function isSsrfSafeHost(hostname: string): boolean {
  const normHost = hostname.toLowerCase().trim();

  if (!normHost) return false;

  // Hostname string checks
  if (
    normHost === 'localhost' ||
    normHost.endsWith('.localhost') ||
    normHost.endsWith('.local') ||
    normHost.endsWith('.internal') ||
    normHost === 'metadata.google.internal' ||
    normHost === 'metadata' ||
    normHost === 'instance-data'
  ) {
    return false;
  }

  // Literal IP check
  if (isPrivateIp(normHost)) {
    return false;
  }

  return true;
}

/**
 * Validates a job URL for SSRF safety, reachability, redirects, and content availability.
 */
export async function validateSafeJobUrl(
  rawUrl: string,
  options: UrlValidationOptions = {}
): Promise<UrlValidationResult> {
  const checkedAt = new Date().toISOString();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBodySizeBytes = options.maxBodySizeBytes ?? DEFAULT_MAX_BODY_SIZE;

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: false,
      status: 0,
      finalUrl: '',
      finalDomain: '',
      redirectCount: 0,
      checkedAt,
      failureReason: 'Empty or invalid URL provided.',
    };
  }

  let currentUrlString = rawUrl.trim();
  let redirectCount = 0;

  try {
    while (redirectCount <= maxRedirects) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(currentUrlString);
      } catch {
        return {
          isValid: false,
          status: 0,
          finalUrl: currentUrlString,
          finalDomain: '',
          redirectCount,
          checkedAt,
          failureReason: `Malformed URL: "${currentUrlString}"`,
        };
      }

      // Protocol check: only http and https
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return {
          isValid: false,
          status: 0,
          finalUrl: currentUrlString,
          finalDomain: parsedUrl.hostname,
          redirectCount,
          checkedAt,
          failureReason: `Disallowed protocol: "${parsedUrl.protocol}". Only HTTP/HTTPS allowed.`,
        };
      }

      // SSRF Host Check
      if (!isSsrfSafeHost(parsedUrl.hostname)) {
        return {
          isValid: false,
          status: 0,
          finalUrl: currentUrlString,
          finalDomain: parsedUrl.hostname,
          redirectCount,
          checkedAt,
          failureReason: `SSRF Violation: Host "${parsedUrl.hostname}" resolves to private/internal infrastructure.`,
        };
      }

      // DNS Resolution Check (verify resolved IP is not private)
      try {
        const lookup = await dnsLookup(parsedUrl.hostname);
        if (isPrivateIp(lookup.address)) {
          return {
            isValid: false,
            status: 0,
            finalUrl: currentUrlString,
            finalDomain: parsedUrl.hostname,
            redirectCount,
            checkedAt,
            failureReason: `SSRF Violation: Host "${parsedUrl.hostname}" resolved to private IP "${lookup.address}".`,
          };
        }
      } catch (dnsErr: unknown) {
        // DNS lookup failed (e.g. invalid host or offline)
        return {
          isValid: false,
          status: 0,
          finalUrl: currentUrlString,
          finalDomain: parsedUrl.hostname,
          redirectCount,
          checkedAt,
          failureReason: `DNS resolution failed for "${parsedUrl.hostname}": ${dnsErr instanceof Error ? dnsErr.message : String(dnsErr)}`,
        };
      }

      // Perform Fetch with manual redirect handling to validate every hop
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(currentUrlString, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });

        clearTimeout(timer);

        // Check for redirects (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const locationHeader = response.headers.get('location');
          if (!locationHeader) {
            return {
              isValid: false,
              status: response.status,
              finalUrl: currentUrlString,
              finalDomain: parsedUrl.hostname,
              redirectCount,
              checkedAt,
              failureReason: `Redirect status ${response.status} returned without Location header.`,
            };
          }

          const nextUrl = new URL(locationHeader, currentUrlString).toString();
          redirectCount++;
          if (redirectCount > maxRedirects) {
            return {
              isValid: false,
              status: response.status,
              finalUrl: nextUrl,
              finalDomain: parsedUrl.hostname,
              redirectCount,
              checkedAt,
              failureReason: `Exceeded maximum redirect limit (${maxRedirects}).`,
            };
          }

          currentUrlString = nextUrl;
          continue; // Validate next redirect hop
        }

        // Response status check (2xx acceptable)
        if (response.status < 200 || response.status >= 400) {
          return {
            isValid: false,
            status: response.status,
            finalUrl: currentUrlString,
            finalDomain: parsedUrl.hostname,
            redirectCount,
            checkedAt,
            failureReason: `HTTP status ${response.status}`,
          };
        }

        // Read bounded snippet for listing verification
        let htmlSnippet = '';
        if (options.fetchHtmlSnippet !== false) {
          const reader = response.body?.getReader();
          if (reader) {
            const chunks: Uint8Array[] = [];
            let totalBytes = 0;
            const decoder = new TextDecoder('utf-8');

            while (totalBytes < maxBodySizeBytes) {
              const { done, value } = await reader.read();
              if (done || !value) break;
              chunks.push(value);
              totalBytes += value.length;
            }

            htmlSnippet = decoder.decode(Buffer.concat(chunks));
          }
        }

        return {
          isValid: true,
          status: response.status,
          finalUrl: currentUrlString,
          finalDomain: parsedUrl.hostname,
          redirectCount,
          checkedAt,
          htmlSnippet: htmlSnippet.slice(0, 10000), // First 10KB snippet for verification
        };
      } catch (fetchErr: unknown) {
        clearTimeout(timer);
        const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
        return {
          isValid: false,
          status: 0,
          finalUrl: currentUrlString,
          finalDomain: parsedUrl.hostname,
          redirectCount,
          checkedAt,
          failureReason: isAbort ? `Request timed out after ${timeoutMs}ms` : (fetchErr instanceof Error ? fetchErr.message : String(fetchErr)),
        };
      }
    }

    return {
      isValid: false,
      status: 0,
      finalUrl: currentUrlString,
      finalDomain: '',
      redirectCount,
      checkedAt,
      failureReason: 'Redirect loop or exceeded max redirects.',
    };
  } catch (outerErr: unknown) {
    return {
      isValid: false,
      status: 0,
      finalUrl: currentUrlString,
      finalDomain: '',
      redirectCount,
      checkedAt,
      failureReason: outerErr instanceof Error ? outerErr.message : String(outerErr),
    };
  }
}
