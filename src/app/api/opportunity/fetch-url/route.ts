import { NextRequest, NextResponse } from 'next/server';

/**
 * SSRF-Safe URL Fetcher for Job Descriptions.
 * Rejects private/loopback IP ranges and non-HTTP protocols.
 */
function isDisallowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  ) {
    return true;
  }

  // Check IPv4 private ranges
  const ipv4Match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (ipv4Match) {
    const octet1 = parseInt(ipv4Match[1], 10);
    const octet2 = parseInt(ipv4Match[2], 10);

    // 10.0.0.0/8
    if (octet1 === 10) return true;
    // 172.16.0.0/12
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
    // 192.168.0.0/16
    if (octet1 === 192 && octet2 === 168) return true;
    // 169.254.0.0/16 (Link Local / Cloud Metadata)
    if (octet1 === 169 && octet2 === 254) return true;
    // 127.0.0.0/8
    if (octet1 === 127) return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urlStr = body?.url;

    if (!urlStr || typeof urlStr !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid URL parameter.' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(urlStr.trim());
    } catch {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are supported.' }, { status: 400 });
    }

    if (isDisallowedHost(parsed.hostname)) {
      return NextResponse.json({ error: 'Requests to internal or private addresses are prohibited.' }, { status: 403 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote server responded with status ${response.status}: ${response.statusText}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return NextResponse.json({ error: 'Target URL does not return HTML or plain text.' }, { status: 415 });
    }

    const html = await response.text();

    // Strip scripts, styles, and tags to extract readable body text
    const textWithoutScripts = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r/g, '')
      .split('\n')
      .map((l) => l.trim().replace(/\s+/g, ' '))
      .filter((l) => l.length > 0)
      .join('\n');

    // Basic heuristic metadata extraction
    let title = '';
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    return NextResponse.json({
      text: textWithoutScripts.slice(0, 15000),
      detectedTitle: title,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
