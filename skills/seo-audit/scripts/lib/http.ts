// HTTP fetching with manual redirects, a timeout and a size cap, so one bad
// response cannot hang or flood the audit.

import { gunzipSync } from 'node:zlib';
import { VERSION } from './version.ts';

export const USER_AGENT = `Mozilla/5.0 (compatible; seo-skills-audit/${VERSION}; +https://github.com/JittoJoseph/seo-skills)`;

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 8;

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  allowPrivate?: boolean;
  method?: string;
  readBodyText?: boolean;
}

export interface FetchResponse {
  url: string;
  finalUrl: string;
  status: number;
  error?: string;
  hops: { from: string; status: number }[];
  headers: Record<string, string>;
  text: string;
  bytes?: number;
  truncated?: boolean;
  ms: number;
}

export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (host.includes(':')) return host === '::1' || /^(fe80|fc|fd)/.test(host);
  const octets = host.split('.').map(Number);
  if (octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = octets;
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return false;
}

async function readBody(response: Response, maxBytes: number): Promise<{ buffer: Buffer; truncated: boolean }> {
  if (!response.body) return { buffer: Buffer.alloc(0), truncated: false };
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        chunks.push(value.subarray(0, value.length - (total - maxBytes)));
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return { buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))), truncated };
}

function decode(buffer: Buffer, contentType: string | undefined): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1];
  try {
    return new TextDecoder(charset ?? 'utf-8').decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function describeError(error: unknown): string {
  const details = error as { name?: string; code?: string; message?: string; cause?: { code?: string } } | null;
  const code = details?.cause?.code ?? details?.code;
  if (details?.name === 'TimeoutError' || details?.name === 'AbortError') return 'timed out';
  return code ? String(code) : details?.message ?? 'request failed';
}

// allowPrivate is off unless the audit itself started on a private host, so a
// public page cannot redirect the audit into the local network.
export async function fetchUrl(url: string, options: FetchOptions = {}): Promise<FetchResponse> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    allowPrivate = false,
    method = 'GET',
    readBodyText = true,
  } = options;

  const hops: FetchResponse['hops'] = [];
  let current = url;
  const started = performance.now();

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return { url, finalUrl: current, status: 0, error: 'invalid URL', hops, headers: {}, text: '', ms: 0 };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url, finalUrl: current, status: 0, error: `unsupported scheme ${parsed.protocol}`, hops, headers: {}, text: '', ms: 0 };
    }
    if (!allowPrivate && isPrivateHost(parsed.hostname)) {
      return { url, finalUrl: current, status: 0, error: 'refused private address', hops, headers: {}, text: '', ms: 0 };
    }

    let response: Response;
    try {
      response = await fetch(current, {
        method,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      });
    } catch (error) {
      return { url, finalUrl: current, status: 0, error: describeError(error), hops, headers: {}, text: '', ms: performance.now() - started };
    }

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel().catch(() => {});
      hops.push({ from: current, status: response.status });
      try {
        current = new URL(location, current).href;
      } catch {
        return { url, finalUrl: current, status: response.status, error: 'invalid redirect target', hops, headers: {}, text: '', ms: performance.now() - started };
      }
      continue;
    }

    const headers = Object.fromEntries(response.headers.entries());
    if (!readBodyText) {
      await response.body?.cancel().catch(() => {});
      return { url, finalUrl: current, status: response.status, hops, headers, text: '', bytes: 0, truncated: false, ms: performance.now() - started };
    }

    try {
      const body = await readBody(response, maxBytes);
      const { truncated } = body;
      let buffer: Buffer = body.buffer;
      // A .xml.gz sitemap is served gzipped without a Content-Encoding header.
      if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b && !truncated) {
        try {
          buffer = gunzipSync(buffer, { maxOutputLength: maxBytes * 8 });
        } catch {
          // Not valid gzip after all, so keep the raw bytes.
        }
      }
      return {
        url,
        finalUrl: current,
        status: response.status,
        hops,
        headers,
        text: decode(buffer, headers['content-type']),
        bytes: buffer.length,
        truncated,
        ms: performance.now() - started,
      };
    } catch (error) {
      return { url, finalUrl: current, status: response.status, error: describeError(error), hops, headers, text: '', ms: performance.now() - started };
    }
  }

  return { url, finalUrl: current, status: 0, error: 'too many redirects', hops, headers: {}, text: '', ms: performance.now() - started };
}
