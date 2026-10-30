// Sitemap parsing. A regex is enough here: we only need <loc> values, and only
// the exact <loc> element, so image and video entries are not mistaken for pages.

import { decodeEntities } from './html.ts';

export interface ParsedSitemap {
  type: 'empty' | 'html' | 'index' | 'urlset' | 'text' | 'unknown';
  locs: string[];
}

export function parseSitemap(text: string | null | undefined): ParsedSitemap {
  const source = (text ?? '').replace(/^﻿/, '').trim();
  if (!source) return { type: 'empty', locs: [] };

  if (/^<!doctype html|^<html/i.test(source)) return { type: 'html', locs: [] };

  const isIndex = /<sitemapindex[\s>]/i.test(source);
  const isUrlset = /<urlset[\s>]/i.test(source);
  if (isIndex || isUrlset) {
    const locs: string[] = [];
    const pattern = /<loc>\s*(?:<!\[CDATA\[)?\s*([\s\S]*?)\s*(?:\]\]>)?\s*<\/loc>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const loc = decodeEntities(match[1].trim());
      if (loc) locs.push(loc);
    }
    return { type: isIndex ? 'index' : 'urlset', locs };
  }

  // Google also accepts plain text sitemaps with one URL per line.
  const lines = source.split(/\r\n|\r|\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.every((line) => /^https?:\/\//i.test(line))) return { type: 'text', locs: lines };

  return { type: 'unknown', locs: [] };
}
