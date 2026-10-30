// A small, tolerant HTML reader. It extracts only what a crawler cares about
// and has no dependencies, so the skill runs anywhere Node runs.

export interface ParsedHtml {
  lang: string | null;
  titles: string[];
  metas: { name: string | null; property: string | null; httpEquiv: string | null; content: string }[];
  links: { rel: string; href: string; hreflang: string | null }[];
  h1s: string[];
  anchors: { href: string; rel: string }[];
  images: { src: string; hasAlt: boolean; alt: string | null; hasDimensions: boolean }[];
  jsonLd: string[];
  scripts: { src: string | null; type: string; id: string | null; inlineBytes: number }[];
  text: string;
}

type Attributes = Record<string, string | undefined>;

const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea']);
const HIDDEN_ELEMENTS = new Set(['noscript', 'template', 'svg', 'head']);
const MAX_TEXT_CHARS = 200_000;
const MAX_QUOTED_TAG_SCAN = 64 * 1024;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

export function decodeEntities(text: string | null | undefined): string {
  if (!text || !text.includes('&')) return text ?? '';
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] !== '#') return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    const hex = body[1] === 'x' || body[1] === 'X';
    const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
    return String.fromCodePoint(code);
  });
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// Finds the ">" that ends a tag, skipping any ">" inside quoted attributes. A
// stray quote must not swallow the rest of the page, so the quote-aware scan is
// bounded and falls back to the next ">".
function findTagEnd(html: string, start: number): number {
  const limit = Math.min(html.length, start + MAX_QUOTED_TAG_SCAN);
  let quote: string | null = null;
  for (let i = start; i < limit; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return html.indexOf('>', start);
}

function parseAttributes(source: string): Attributes {
  const attrs: Attributes = {};
  const pattern = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const name = match[1].toLowerCase();
    if (name in attrs) continue;
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function hasBoundAttribute(attrs: Attributes, name: string): boolean {
  return [`:${name}`, `v-bind:${name}`, `x-bind:${name}`, `[${name}]`, `[attr.${name}]`].some((key) => key in attrs);
}

function findCloseTag(source: string, name: string, from: number): number {
  const pattern = new RegExp(`</${name}`, 'gi');
  pattern.lastIndex = from;
  const match = pattern.exec(source);
  return match ? match.index : source.length;
}

export function parseHtml(html: string | null | undefined): ParsedHtml {
  const source = html ?? '';
  const result: ParsedHtml = {
    lang: null,
    titles: [],
    metas: [],
    links: [],
    h1s: [],
    anchors: [],
    images: [],
    jsonLd: [],
    scripts: [],
    text: '',
  };

  const hiddenDepth: Record<string, number> = Object.fromEntries([...HIDDEN_ELEMENTS].map((name) => [name, 0]));
  const isHidden = () => Object.values(hiddenDepth).some((depth) => depth > 0);
  const textParts: string[] = [];
  let textLength = 0;
  let h1Depth = 0;
  let h1Parts: string[] = [];

  const addText = (raw: string): void => {
    const text = decodeEntities(raw);
    if (h1Depth > 0) h1Parts.push(text);
    if (isHidden() || textLength >= MAX_TEXT_CHARS) return;
    textParts.push(text);
    textLength += text.length;
  };

  let pos = 0;
  while (pos < source.length) {
    const open = source.indexOf('<', pos);
    if (open === -1) {
      addText(source.slice(pos));
      break;
    }
    if (open > pos) addText(source.slice(pos, open));

    if (source.startsWith('<!--', open)) {
      const end = source.indexOf('-->', open + 4);
      pos = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source[open + 1] === '!' || source[open + 1] === '?') {
      const end = source.indexOf('>', open);
      pos = end === -1 ? source.length : end + 1;
      continue;
    }

    const closing = source[open + 1] === '/';
    const nameStart = open + (closing ? 2 : 1);
    const nameMatch = /^[a-zA-Z][^\s/>]*/.exec(source.slice(nameStart, nameStart + 64));
    if (!nameMatch) {
      addText('<');
      pos = open + 1;
      continue;
    }
    const name = nameMatch[0].toLowerCase();
    const tagEnd = findTagEnd(source, nameStart + name.length);
    if (tagEnd === -1) break;

    if (closing) {
      if (name in hiddenDepth && hiddenDepth[name] > 0) hiddenDepth[name]--;
      if (name === 'h1' && h1Depth > 0) {
        h1Depth--;
        if (h1Depth === 0) {
          result.h1s.push(collapse(h1Parts.join(' ')));
          h1Parts = [];
        }
      }
      if (isBlock(name)) addText(' ');
      pos = tagEnd + 1;
      continue;
    }

    const rawAttrs = source.slice(nameStart + name.length, tagEnd);
    const selfClosed = rawAttrs.trimEnd().endsWith('/');
    const attrs = parseAttributes(rawAttrs);
    pos = tagEnd + 1;

    // SVG icons carry their own <title>, which is not the page title.
    if (name === 'title' && hiddenDepth.svg === 0) {
      const end = findCloseTag(source, 'title', pos);
      result.titles.push(collapse(decodeEntities(source.slice(pos, end))));
      const after = source.indexOf('>', end);
      pos = after === -1 ? source.length : after + 1;
      continue;
    }

    if (RAW_TEXT_ELEMENTS.has(name)) {
      const end = findCloseTag(source, name, pos);
      const body = source.slice(pos, end);
      if (name === 'script') {
        const type = (attrs.type ?? '').toLowerCase().split(';')[0].trim();
        if (type === 'application/ld+json') result.jsonLd.push(body.trim());
        else result.scripts.push({ src: attrs.src ?? null, type, id: attrs.id ?? null, inlineBytes: body.length });
      } else if (name === 'textarea') {
        addText(body);
      }
      const after = source.indexOf('>', end);
      pos = after === -1 ? source.length : after + 1;
      continue;
    }

    // </head> is optional in HTML, so <body> always ends the head.
    if (name === 'body') hiddenDepth.head = 0;
    if (name in hiddenDepth && !selfClosed) hiddenDepth[name]++;
    const inNoscript = hiddenDepth.noscript > 0;

    switch (name) {
      case 'html':
        result.lang ??= attrs.lang ?? null;
        break;
      case 'meta':
        if (!inNoscript) {
          result.metas.push({
            name: attrs.name?.toLowerCase() ?? null,
            property: attrs.property?.toLowerCase() ?? null,
            httpEquiv: attrs['http-equiv']?.toLowerCase() ?? null,
            content: attrs.content ?? '',
          });
        }
        break;
      case 'link':
        if (!inNoscript) {
          result.links.push({
            rel: (attrs.rel ?? '').toLowerCase(),
            href: attrs.href ?? '',
            hreflang: attrs.hreflang ?? null,
          });
        }
        break;
      case 'a':
        if (!inNoscript && attrs.href !== undefined) {
          result.anchors.push({ href: attrs.href, rel: (attrs.rel ?? '').toLowerCase() });
        }
        break;
      case 'img':
        if (!inNoscript) {
          const src = attrs.src ?? attrs['data-src'] ?? attrs.srcset ?? attrs['data-srcset'] ?? '';
          // An image with only a bound source, like :src in Vue or Alpine, is a
          // client-side template and not an image a crawler would see.
          if (!src && hasBoundAttribute(attrs, 'src')) break;
          result.images.push({
            src,
            hasAlt: attrs.alt !== undefined || hasBoundAttribute(attrs, 'alt'),
            alt: attrs.alt ?? null,
            hasDimensions: attrs.width !== undefined && attrs.height !== undefined,
          });
          if (h1Depth > 0 && attrs.alt) h1Parts.push(attrs.alt);
        }
        break;
      case 'h1':
        if (!selfClosed) h1Depth++;
        break;
      default:
        break;
    }
    if (isBlock(name)) addText(' ');
  }

  if (h1Depth > 0) result.h1s.push(collapse(h1Parts.join(' ')));
  result.text = collapse(textParts.join(''));
  return result;
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'li', 'ul', 'ol',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'td', 'th', 'table', 'br', 'hr', 'blockquote', 'pre',
]);

function isBlock(name: string): boolean {
  return BLOCK_TAGS.has(name);
}

export function metaContent(page: ParsedHtml, key: string): string | null {
  const wanted = key.toLowerCase();
  const found = page.metas.find((meta) => meta.name === wanted || meta.property === wanted);
  return found ? collapse(found.content) : null;
}

export function linksByRel(page: ParsedHtml, rel: string): ParsedHtml['links'] {
  return page.links.filter((link) => link.rel.split(/\s+/).includes(rel));
}

// The empty mount point a client-rendered app ships before JavaScript runs.
export function hasEmptyAppRoot(html: string | null | undefined): boolean {
  return /<div\b[^>]*\bid\s*=\s*["']?(root|app|__next|__nuxt|___gatsby|svelte)["']?[^>]*>\s*<\/div>/i.test(html ?? '');
}
