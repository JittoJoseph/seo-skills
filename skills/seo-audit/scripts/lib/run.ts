// Runs an audit: fetches what a crawler would fetch, then applies the checks.

import { randomBytes } from 'node:crypto';
import { CATEGORIES, CHECKS, normalizeUrl } from './checks.ts';
import { hasEmptyAppRoot, linksByRel, metaContent, parseHtml } from './html.ts';
import { fetchUrl, isPrivateHost } from './http.ts';
import { detectPlatforms } from './platform.ts';
import { isAllowed, parseRobots, ROBOTS_MAX_BYTES } from './robots.ts';
import { scoreResults } from './score.ts';
import { parseSitemap } from './sitemap.ts';
import type { AuditContext, AuditReport, CheckOutcome, CheckResult, Page, SitemapInfo } from './types.ts';
import { VERSION } from './version.ts';
import type { FetchOptions, FetchResponse } from './http.ts';
import type { Robots } from './robots.ts';

export const DEFAULT_PAGES = 10;
export const MAX_PAGES = 100;
const CONCURRENCY = 3;
const MAX_CHILD_SITEMAPS = 5;
const MAX_SITEMAP_URLS = 50_000;
const OWN_ROBOTS_TOKEN = 'seo-skills-audit';
const SKIPPED_EXTENSIONS = /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|ts|json|xml|txt|md|zip|gz|mp4|webm|mp3|woff2?)$/i;

export function normalizeInput(input: unknown): string {
  const value = String(input ?? '').trim();
  if (!value) throw new Error('A URL is required');
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  const bare = value.split(/[/:?#]/)[0];
  const url = new URL(hasScheme ? value : `${isPrivateHost(bare) ? 'http' : 'https'}://${value}`);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`Only http and https URLs are supported, got ${url.protocol}`);
  return url.href;
}

// Text taken from a site is untrusted. It is flattened and shortened before it
// reaches a report, so a page cannot inject formatting or long instructions.
export function clean(value: unknown, max = 180): string {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ')
    .replace(/`/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function isHtmlResponse(response: FetchResponse): boolean {
  const type = (response.headers?.['content-type'] ?? '').toLowerCase();
  if (type) return type.includes('html');
  return /^\s*<(!doctype|html)/i.test(response.text ?? '');
}

function noindexIn(value: string | null | undefined): boolean {
  return /(^|[\s,;:])(noindex|none)($|[\s,;])/i.test(value ?? '');
}

function buildPage(
  response: FetchResponse,
  { isHome = false, fromSitemap = false, requested }: { isHome?: boolean; fromSitemap?: boolean; requested?: string },
): Page {
  const ok = response.status >= 200 && response.status < 300;
  const isHtml = isHtmlResponse(response);
  const parsed = parseHtml(isHtml ? response.text : '');
  const finalUrl = response.finalUrl;

  const metaRobots = [metaContent(parsed, 'robots'), metaContent(parsed, 'googlebot')].filter(Boolean).join(', ');
  const header = response.headers?.['x-robots-tag'] ?? '';
  // A header can target one crawler ("otherbot: noindex"), which is not a general noindex.
  const headerApplies = header
    .split(/,(?=\s*[a-z-]+\s*:)/i)
    .filter((part) => !/^\s*[a-z-]+\s*:/i.test(part) || /^\s*(googlebot|bingbot)\s*:/i.test(part))
    .join(', ');
  const noindexSource = noindexIn(metaRobots) ? 'meta robots' : noindexIn(headerApplies) ? 'X-Robots-Tag header' : null;

  const canonicals = linksByRel(parsed, 'canonical').map((link) => link.href).filter(Boolean);
  const headerCanonical = /<([^>]+)>\s*;\s*rel="?canonical"?/i.exec(response.headers?.link ?? '')?.[1];
  if (canonicals.length === 0 && headerCanonical) canonicals.push(headerCanonical);
  let canonicalResolved: string | null = null;
  try {
    if (canonicals[0]) canonicalResolved = new URL(canonicals[0], finalUrl).href;
  } catch {
    canonicalResolved = null;
  }

  let origin: string | null = null;
  try {
    origin = new URL(finalUrl).origin;
  } catch {
    origin = null;
  }
  const internalLinks: string[] = [];
  for (const anchor of parsed.anchors) {
    if (!anchor.href || /^(#|mailto:|tel:|javascript:|data:)/i.test(anchor.href.trim())) continue;
    try {
      const target = new URL(anchor.href.trim(), finalUrl);
      if (target.origin !== origin) continue;
      target.hash = '';
      if (normalizeUrl(target.href) !== normalizeUrl(finalUrl)) internalLinks.push(target.href);
    } catch {
      // Ignore a malformed href.
    }
  }

  return {
    requested: requested ?? response.url,
    url: finalUrl,
    status: response.status,
    error: response.error ?? null,
    hops: response.hops ?? [],
    ok,
    isHtml,
    isHome,
    fromSitemap,
    parsed,
    headers: response.headers ?? {},
    ms: Math.round(response.ms ?? 0),
    bytes: response.bytes ?? 0,
    truncated: response.truncated ?? false,
    title: parsed.titles[0] || null,
    description: metaContent(parsed, 'description') || null,
    noindex: Boolean(noindexSource),
    noindexSource,
    canonicals,
    canonicalResolved,
    internalLinks: [...new Set(internalLinks)],
    emptyRoot: isHtml && hasEmptyAppRoot(response.text),
  };
}

async function loadSitemaps(robotsParsed: Robots | null, origin: string, fetchOptions: FetchOptions): Promise<SitemapInfo> {
  const declared = robotsParsed?.sitemaps ?? [];
  const candidates = declared.length > 0 ? declared.slice(0, MAX_CHILD_SITEMAPS) : [`${origin}/sitemap.xml`];
  const sources: string[] = [];
  const urls: string[] = [];
  let lastType = 'none';

  const load = async (url: string) => {
    const response = await fetchUrl(url, { ...fetchOptions, maxBytes: 50 * 1024 * 1024 });
    if (response.error || response.status !== 200) return null;
    return parseSitemap(response.text);
  };

  for (const candidate of candidates) {
    const parsed = await load(candidate);
    if (!parsed) continue;
    lastType = parsed.type;
    // An app's HTML fallback page at /sitemap.xml is not a sitemap.
    if (parsed.type === 'html' || parsed.type === 'empty') continue;
    sources.push(candidate);
    if (parsed.type === 'index') {
      for (const child of parsed.locs.slice(0, MAX_CHILD_SITEMAPS)) {
        const childParsed = await load(child);
        if (childParsed) urls.push(...childParsed.locs);
        if (urls.length >= MAX_SITEMAP_URLS) break;
      }
    } else {
      urls.push(...parsed.locs);
    }
    if (urls.length >= MAX_SITEMAP_URLS) break;
  }
  return { sources, urls: [...new Set(urls)].slice(0, MAX_SITEMAP_URLS), lastType };
}

// Takes an even spread across the sitemap rather than only the first URLs, so
// the sample covers more than one section of a site.
function evenSample<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}

function selectPages(home: Page, sitemapUrls: string[], robotsParsed: Robots | null, limit: number): { url: string; fromSitemap: boolean }[] {
  const origin = new URL(home.url).origin;
  const homeKey = normalizeUrl(home.url);
  const usable = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return (
        parsed.origin === origin &&
        !parsed.search &&
        !SKIPPED_EXTENSIONS.test(parsed.pathname) &&
        normalizeUrl(url) !== homeKey &&
        isAllowed(robotsParsed, OWN_ROBOTS_TOKEN, parsed.pathname)
      );
    } catch {
      return false;
    }
  };
  const room = limit - 1;
  const fromSitemap = evenSample(sitemapUrls.filter(usable), room);
  const chosen = new Map(fromSitemap.map((url) => [normalizeUrl(url), { url, fromSitemap: true }]));
  for (const url of home.internalLinks.filter(usable)) {
    if (chosen.size >= room) break;
    if (!chosen.has(normalizeUrl(url))) chosen.set(normalizeUrl(url), { url, fromSitemap: false });
  }
  return [...chosen.values()];
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function inconclusiveReason(home: FetchResponse): string | null {
  const { status, headers } = home;
  if (headers['cf-mitigated'] === 'challenge' || status === 401 || status === 403 || status === 406 || status === 429) {
    return `The site answered our request with ${status}. That usually means a firewall or bot protection, not a problem Googlebot would see, so a score would be misleading.`;
  }
  if (status === 503 || status >= 600) return `The site returned ${status}. It may be down, or a firewall may be challenging automated requests. Try again, or audit a local or staging copy.`;
  if (status < 200 || status >= 300) return `The homepage returned ${status}. Fix that first, because nothing else can be judged while it fails.`;
  if (!isHtmlResponse(home)) return `The URL returned ${home.headers['content-type'] ?? 'an unknown content type'} rather than an HTML page.`;
  if (home.truncated) return 'The homepage exceeded the audit response-size limit, so the HTML could not be checked completely.';
  return null;
}

export async function runAudit(input: string, options: { pages?: number; timeoutMs?: number } = {}): Promise<AuditReport> {
  const start = normalizeInput(input);
  const pagesLimit = Math.min(Math.max(1, options.pages ?? DEFAULT_PAGES), MAX_PAGES);
  const isPrivate = isPrivateHost(new URL(start).hostname);
  const fetchOptions: FetchOptions = { allowPrivate: isPrivate, ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}) };

  const base = { tool: 'seo-skills', version: VERSION, audited_at: new Date().toISOString(), input: clean(input, 500) };

  const homeResponse = await fetchUrl(start, fetchOptions);
  if (homeResponse.error) {
    return { ...base, state: 'unreachable', reason: `Could not reach ${clean(start)} (${clean(homeResponse.error)}).`, final_url: clean(homeResponse.finalUrl, 500) };
  }
  const reason = inconclusiveReason(homeResponse);
  if (reason) return { ...base, state: 'inconclusive', reason, status: homeResponse.status, final_url: clean(homeResponse.finalUrl, 500) };

  const finalUrl = homeResponse.finalUrl;
  const { origin, hostname, protocol } = new URL(finalUrl);
  const home = buildPage(homeResponse, { isHome: true, requested: start });

  const robotsResponse = await fetchUrl(`${origin}/robots.txt`, { ...fetchOptions, maxBytes: ROBOTS_MAX_BYTES });
  const robotsIsHtml = robotsResponse.status === 200 && (isHtmlResponse(robotsResponse) || /^\s*</.test(robotsResponse.text));
  // Only a real robots.txt has rules. Errors and HTML fallbacks leave crawlers unrestricted.
  const robotsParsed = robotsResponse.status === 200 && !robotsIsHtml ? parseRobots(robotsResponse.text) : null;
  const robots = { response: robotsResponse, isHtml: robotsIsHtml, parsed: robotsParsed };

  const sitemap = await loadSitemaps(robotsParsed, origin, fetchOptions);
  const selected = selectPages(home, sitemap.urls, robotsParsed, pagesLimit);
  const others = await mapLimit(selected, CONCURRENCY, async ({ url, fromSitemap }) =>
    buildPage(await fetchUrl(url, fetchOptions), { fromSitemap, requested: url }),
  );
  // The sitemap lists the final homepage URL, not whatever the user typed, so a
  // redirect from the typed URL says nothing about the sitemap's health.
  if (sitemap.urls.some((url) => normalizeUrl(url) === normalizeUrl(finalUrl))) {
    home.fromSitemap = true;
    home.requested = finalUrl;
  }
  const pages = [home, ...others];

  const notFoundProbe = await fetchUrl(`${origin}/seo-skills-audit-${randomBytes(6).toString('hex')}`, { ...fetchOptions, maxBytes: 1024 * 1024 });
  const llms = await fetchUrl(`${origin}/llms.txt`, { ...fetchOptions, maxBytes: 64 * 1024 });

  const light = { ...fetchOptions, readBodyText: false };
  const hasIconLink = linksByRel(home.parsed, 'icon').length > 0;
  const faviconProbe = hasIconLink ? null : await fetchUrl(`${origin}/favicon.ico`, light);

  let ogImageProbe: FetchResponse | null = null;
  const ogImage = metaContent(home.parsed, 'og:image');
  if (ogImage) {
    try {
      ogImageProbe = await fetchUrl(new URL(ogImage, finalUrl).href, light);
    } catch {
      ogImageProbe = { url: ogImage, finalUrl: ogImage, status: 0, error: 'invalid URL', hops: [], headers: {}, text: '', ms: 0 };
    }
  }

  let httpVariant: FetchResponse | null = null;
  let altHost: FetchResponse | null = null;
  if (!isPrivate) {
    if (protocol === 'https:') httpVariant = await fetchUrl(`http://${hostname}/`, light);
    const isIp = /^[\d.]+$/.test(hostname) || hostname.includes(':');
    if (!isIp) {
      const other = hostname.startsWith('www.') ? hostname.slice(4) : `www.${hostname}`;
      altHost = await fetchUrl(`${protocol}//${other}/`, light);
    }
  }

  const ctx: AuditContext = {
    start,
    finalUrl,
    isPrivate,
    home,
    pages,
    robots,
    sitemap,
    notFoundProbe,
    llms,
    faviconProbe,
    ogImageProbe,
    httpVariant,
    altHost,
  };

  const results: CheckResult[] = CHECKS.map((check) => {
    let outcome: CheckOutcome;
    try {
      outcome = check.run(ctx);
    } catch (error) {
      outcome = { status: 'skip', evidence: [`Check could not run: ${(error as Error).message}`] };
    }
    return {
      id: check.id,
      category: check.category,
      title: check.title,
      weight: check.weight,
      cap: check.cap ?? null,
      capReason: check.capReason ?? null,
      status: outcome.status,
      gateFailed: Boolean(outcome.gateFailed),
      evidence: outcome.evidence.map((line) => clean(line, 300)),
      why: check.why,
      fix: check.fix,
    };
  });

  const generator = metaContent(home.parsed, 'generator');
  return {
    ...base,
    state: 'complete',
    final_url: clean(finalUrl, 500),
    ...scoreResults(results, CATEGORIES),
    platforms: detectPlatforms(homeResponse.text, homeResponse.headers, generator),
    sitemap_urls: sitemap.urls.length,
    pages: pages.map((page) => ({
      url: clean(page.url, 300),
      status: page.status,
      title: clean(page.title ?? '', 120),
      words: page.parsed.text ? page.parsed.text.split(' ').length : 0,
      ms: page.ms,
      from_sitemap: page.fromSitemap,
    })),
    checks: results,
  };
}
