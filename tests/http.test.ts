import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { fetchUrl, isPrivateHost } from '../skills/seo-audit/scripts/lib/http.ts';

let server: Server;
let base: string;

before(async () => {
  server = createServer((req, res) => {
    if (req.url === '/hop1') return res.writeHead(301, { location: '/hop2' }).end();
    if (req.url === '/hop2') return res.writeHead(302, { location: '/end' }).end();
    if (req.url === '/end') return res.writeHead(200, { 'content-type': 'text/plain' }).end('done');
    if (req.url === '/loop') return res.writeHead(302, { location: '/loop' }).end();
    if (req.url === '/big') return res.writeHead(200).end('x'.repeat(5000));
    if (req.url === '/gz') return res.writeHead(200).end(gzipSync('<urlset></urlset>'));
    if (req.url === '/hang') return undefined;
    if (req.url === '/to-public') return res.writeHead(302, { location: 'http://127.0.0.1:1/private' }).end();
    return res.writeHead(404).end('missing');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

test('follows redirects and records each hop', async () => {
  const res = await fetchUrl(`${base}/hop1`, { allowPrivate: true });
  assert.equal(res.status, 200);
  assert.equal(res.text, 'done');
  assert.equal(res.hops.length, 2);
  assert.equal(new URL(res.finalUrl).pathname, '/end');
});

test('gives up on a redirect loop', async () => {
  const res = await fetchUrl(`${base}/loop`, { allowPrivate: true });
  assert.equal(res.error, 'too many redirects');
});

test('caps the response size', async () => {
  const res = await fetchUrl(`${base}/big`, { allowPrivate: true, maxBytes: 100 });
  assert.equal(res.truncated, true);
  assert.equal(res.text.length, 100);
});

test('unpacks a gzipped sitemap file', async () => {
  const res = await fetchUrl(`${base}/gz`, { allowPrivate: true });
  assert.equal(res.text, '<urlset></urlset>');
});

test('times out on a stalled server', async () => {
  const res = await fetchUrl(`${base}/hang`, { allowPrivate: true, timeoutMs: 100 });
  assert.equal(res.error, 'timed out');
});

test('refuses private addresses by default', async () => {
  const res = await fetchUrl(`${base}/end`);
  assert.equal(res.error, 'refused private address');
  assert.equal(res.status, 0);
});

test('refuses other schemes and bad URLs', async () => {
  assert.match((await fetchUrl('file:///etc/passwd')).error ?? '', /unsupported scheme/);
  assert.equal((await fetchUrl('not a url')).error, 'invalid URL');
});

test('recognises private hosts without false alarms', () => {
  for (const host of ['localhost', 'app.localhost', '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '[::1]', 'printer.local']) {
    assert.equal(isPrivateHost(host), true, host);
  }
  for (const host of ['example.com', 'fcbarcelona.com', 'fd.com', '8.8.8.8', '172.32.0.1', 'localhost.example.com']) {
    assert.equal(isPrivateHost(host), false, host);
  }
});
