import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSitemap } from '../skills/seo-audit/scripts/lib/sitemap.ts';

test('reads a urlset and skips image entries', () => {
  const result = parseSitemap(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="x">
    <url><loc>https://e.com/</loc><image:image><image:loc>https://e.com/a.png</image:loc></image:image></url>
    <url><loc> https://e.com/a?x=1&amp;y=2 </loc></url></urlset>`);
  assert.equal(result.type, 'urlset');
  assert.deepEqual(result.locs, ['https://e.com/', 'https://e.com/a?x=1&y=2']);
});

test('reads a sitemap index and CDATA', () => {
  const result = parseSitemap('<sitemapindex><sitemap><loc><![CDATA[https://e.com/s1.xml]]></loc></sitemap></sitemapindex>');
  assert.equal(result.type, 'index');
  assert.deepEqual(result.locs, ['https://e.com/s1.xml']);
});

test('reads a plain text sitemap', () => {
  assert.deepEqual(parseSitemap('https://e.com/\nhttps://e.com/a\n'), { type: 'text', locs: ['https://e.com/', 'https://e.com/a'] });
});

test('recognises an HTML fallback page and junk', () => {
  assert.equal(parseSitemap('<!DOCTYPE html><html><div id="root"></div></html>').type, 'html');
  assert.equal(parseSitemap('not a sitemap').type, 'unknown');
  assert.equal(parseSitemap('').type, 'empty');
  assert.equal(parseSitemap(null).type, 'empty');
});
