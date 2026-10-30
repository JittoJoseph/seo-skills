import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities, hasEmptyAppRoot, metaContent, parseHtml } from '../skills/seo-audit/scripts/lib/html.ts';

test('reads the basics of a normal page', () => {
  const page = parseHtml(`<!doctype html><html lang="en"><head>
    <title> Hello &amp; welcome </title>
    <meta name="description" content="A &quot;good&quot; page">
    <meta property="og:title" content="OG">
    <link rel="canonical" href="https://example.com/">
    </head><body><h1>Main <em>heading</em></h1><p>Some text.</p>
    <a href="/about">About</a><img src="/a.png" alt="A" width="1" height="1"><img src="/b.png"></body></html>`);
  assert.equal(page.lang, 'en');
  assert.deepEqual(page.titles, ['Hello & welcome']);
  assert.equal(metaContent(page, 'description'), 'A "good" page');
  assert.equal(metaContent(page, 'og:title'), 'OG');
  assert.equal(page.links[0].href, 'https://example.com/');
  assert.deepEqual(page.h1s, ['Main heading']);
  assert.equal(page.anchors[0].href, '/about');
  assert.equal(page.images[0].hasAlt, true);
  assert.equal(page.images[0].hasDimensions, true);
  assert.equal(page.images[1].hasAlt, false);
  assert.ok(page.text.includes('Some text.'));
});

test('ignores an SVG icon title', () => {
  const page = parseHtml('<body><svg><title>Close icon</title><path d="M0"/></svg><h1>Hi</h1></body>');
  assert.deepEqual(page.titles, []);
  assert.ok(!page.text.includes('Close icon'));
});

test('does not count script, style, noscript or head text as visible', () => {
  const page = parseHtml(`<html><head><title>T</title></head><body>
    <script>var visible = "<h1>not a heading</h1>";</script>
    <style>.x{content:"hidden"}</style>
    <noscript><img src="/pixel.gif"><p>Enable JavaScript</p></noscript>
    <!-- <h1>commented</h1> -->
    <p>Real</p></body></html>`);
  assert.equal(page.text, 'Real');
  assert.deepEqual(page.h1s, []);
  assert.equal(page.images.length, 0);
});

test('keeps ">" inside quoted attributes', () => {
  const page = parseHtml('<a href="/a?b=1>2" title="x > y">Link</a>');
  assert.equal(page.anchors[0].href, '/a?b=1>2');
  assert.equal(page.text, 'Link');
});

test('collects JSON-LD apart from other scripts', () => {
  const page = parseHtml(`<script type="application/ld+json">{"@type":"Organization"}</script>
    <script type="APPLICATION/LD+JSON; charset=utf-8">{"@type":"WebSite"}</script>
    <script src="/app.js"></script>`);
  assert.equal(page.jsonLd.length, 2);
  assert.equal(page.scripts.length, 1);
  assert.equal(page.scripts[0].src, '/app.js');
});

test('treats framework bound images as templates, not broken images', () => {
  const page = parseHtml(`<img :src="item.image" :alt="item.name"><img x-bind:src="a">
    <img src="/real.png" :alt="dynamic"><img srcset="/a.png 1x"><img data-src="/lazy.png">`);
  assert.equal(page.images.length, 3);
  assert.equal(page.images[0].hasAlt, true);
  assert.equal(page.images[1].src, '/a.png 1x');
  assert.equal(page.images[1].hasAlt, false);
  assert.equal(page.images[2].src, '/lazy.png');
});

test('uses image alt text as heading text', () => {
  const page = parseHtml('<h1><img src="/logo.png" alt="Acme"></h1>');
  assert.deepEqual(page.h1s, ['Acme']);
});

test('copes with broken markup', () => {
  for (const html of ['', '<', '<<<<', '<a href="unterminated', '<title>open', '<script>never closed', 'a < b and c > d', '</nope>']) {
    assert.doesNotThrow(() => parseHtml(html), html);
  }
  assert.deepEqual(parseHtml('<title>open').titles, ['open']);
  assert.ok(parseHtml('a < b').text.includes('a < b'));
  assert.equal(parseHtml(null).text, '');
});

test('an unclosed head does not hide the body', () => {
  const page = parseHtml('<html><head><title>T</title><body><h1>Hi</h1><p>Visible</p></body>');
  assert.ok(page.text.includes('Visible'));
});

test('a stray quote does not swallow the rest of the page', () => {
  const page = parseHtml(`<a title=it's href="/a">One</a><p>Two</p><a href="/b">Three</a>`);
  assert.ok(page.text.includes('Three'));
  assert.equal(page.anchors.at(-1)?.href, '/b');
});

test('characters that change length when lowercased do not break raw tags', () => {
  const page = parseHtml('<p>İİİİ</p><script>var a = 1;</script><p>After</p>');
  assert.ok(page.text.includes('After'));
  assert.equal(page.scripts.length, 1);
  assert.equal(page.scripts[0].inlineBytes, 'var a = 1;'.length);
});

test('decodes entities', () => {
  assert.equal(decodeEntities('&lt;a&gt; &#39;x&#x27; &amp;amp; &unknown;'), "<a> 'x' &amp; &unknown;");
  assert.equal(decodeEntities('&#x110000;'), '&#x110000;');
  assert.equal(decodeEntities(null), '');
});

test('spots an empty app mount point', () => {
  assert.equal(hasEmptyAppRoot('<body><div id="root"></div><script src="/a.js"></script></body>'), true);
  assert.equal(hasEmptyAppRoot('<div class="x" id=app>\n</div>'), true);
  assert.equal(hasEmptyAppRoot('<div id="root"><h1>Server rendered</h1></div>'), false);
  assert.equal(hasEmptyAppRoot('<div id="sidebar"></div>'), false);
});

test('stays fast on a very large page', () => {
  const html = `<body>${'<p>word <a href="/x">link</a></p>'.repeat(100_000)}</body>`;
  const started = performance.now();
  const page = parseHtml(html);
  assert.equal(page.anchors.length, 100_000);
  assert.ok(performance.now() - started < 5000);
});
