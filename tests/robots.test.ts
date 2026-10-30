import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed, parseRobots, ruleMatches } from '../skills/seo-audit/scripts/lib/robots.ts';

test('no rules means everything is allowed', () => {
  assert.equal(isAllowed(parseRobots(''), 'Googlebot', '/'), true);
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow:'), 'Googlebot', '/'), true);
  assert.equal(isAllowed(null, 'Googlebot', '/'), true);
});

test('blocks the whole site', () => {
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow: /'), 'Googlebot', '/'), false);
});

test('a specific group replaces the * group', () => {
  const robots = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nDisallow: /private');
  assert.equal(isAllowed(robots, 'Googlebot', '/'), true);
  assert.equal(isAllowed(robots, 'Googlebot', '/private'), false);
  assert.equal(isAllowed(robots, 'Bingbot', '/'), false);
});

test('merges groups for the same agent and shares rules across stacked agents', () => {
  const robots = parseRobots('User-agent: a\nUser-agent: b\nDisallow: /x\n\nUser-agent: a\nDisallow: /y');
  assert.equal(isAllowed(robots, 'a', '/x'), false);
  assert.equal(isAllowed(robots, 'a', '/y'), false);
  assert.equal(isAllowed(robots, 'b', '/x'), false);
  assert.equal(isAllowed(robots, 'b', '/y'), true);
});

test('user-agent names ignore case and fall back to the most specific token', () => {
  const robots = parseRobots('User-agent: GOOGLEBOT\nDisallow: /a\n\nUser-agent: Googlebot-News\nDisallow: /b');
  assert.equal(isAllowed(robots, 'googlebot', '/a'), false);
  assert.equal(isAllowed(robots, 'Googlebot-News', '/a'), true);
  assert.equal(isAllowed(robots, 'Googlebot-News', '/b'), false);
  assert.equal(isAllowed(robots, 'Googlebot-Image', '/a'), false);
});

test('a token must match whole words', () => {
  const robots = parseRobots('User-agent: Claude\nDisallow: /\n');
  assert.equal(isAllowed(robots, 'ClaudeBot', '/'), true);
});

test('the longest rule wins and allow wins a tie', () => {
  const longest = parseRobots('User-agent: *\nDisallow: /folder\nAllow: /folder/page');
  assert.equal(isAllowed(longest, 'x', '/folder/page'), true);
  assert.equal(isAllowed(longest, 'x', '/folder/other'), false);
  const tie = parseRobots('User-agent: *\nDisallow: /folder\nAllow: /folder');
  assert.equal(isAllowed(tie, 'x', '/folder/page'), true);
});

test('wildcards and end anchors work as Google documents', () => {
  assert.equal(ruleMatches('/*.php', '/index.php'), true);
  assert.equal(ruleMatches('/*.php', '/a/b.php?x=1'), true);
  assert.equal(ruleMatches('/*.php$', '/index.php'), true);
  assert.equal(ruleMatches('/*.php$', '/index.php?x=1'), false);
  assert.equal(ruleMatches('/fish*', '/fish.html'), true);
  assert.equal(ruleMatches('/fish*', '/Fish.html'), false);
  assert.equal(ruleMatches('/$', '/'), true);
  assert.equal(ruleMatches('/$', '/a'), false);
  assert.equal(ruleMatches('/a*b*c', '/a-b-c-d'), true);
  assert.equal(ruleMatches('/a*b*c$', '/a-b-c-d'), false);
});

test('reads sitemaps, comments, CRLF and a BOM', () => {
  const robots = parseRobots('﻿# hello\r\nUser-agent: * # all\r\nDisallow: /x # no\r\nSitemap: https://e.com/a.xml\r\nsitemap:https://e.com/b.xml');
  assert.deepEqual(robots.sitemaps, ['https://e.com/a.xml', 'https://e.com/b.xml']);
  assert.equal(isAllowed(robots, 'a', '/x'), false);
});

test('a hostile pattern cannot hang matching', () => {
  const pattern = `/${'a*'.repeat(5000)}b`;
  const started = performance.now();
  ruleMatches(pattern, `/${'a'.repeat(50000)}`);
  assert.ok(performance.now() - started < 1000);
});
