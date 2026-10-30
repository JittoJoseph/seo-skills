// robots.txt parsing and matching, following RFC 9309 and Google's documented
// behaviour: the most specific user-agent group wins, the longest matching rule
// wins, and allow beats disallow on a tie.

// Google ignores anything past 500 KiB.
export const ROBOTS_MAX_BYTES = 500 * 1024;

export interface RobotsRule {
  allow: boolean;
  path: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export interface Robots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

export function parseRobots(text: string | null | undefined): Robots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of (text ?? '').replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    const line = rawLine.split('#')[0].trim();
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === 'sitemap') {
      if (value) sitemaps.push(value);
    } else if (key === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === 'allow' || key === 'disallow') {
      lastWasAgent = false;
      // An empty "Disallow:" allows everything, so it adds no rule.
      if (current && value) current.rules.push({ allow: key === 'allow', path: value });
    }
  }
  return { groups, sitemaps };
}

// Picks the group with the longest user-agent token that the crawler's token
// starts with, so "Googlebot-News" falls back to a "Googlebot" group.
function rulesFor(robots: Robots, agent: string): RobotsRule[] {
  const token = agent.toLowerCase();
  let best: string | null = null;
  for (const group of robots.groups) {
    for (const name of group.agents) {
      if (name === '*') continue;
      const matches = token === name || token.startsWith(`${name}-`) || token.startsWith(`${name}/`);
      if (matches && (best === null || name.length > best.length)) best = name;
    }
  }
  const wanted = best ?? '*';
  return robots.groups.filter((group) => group.agents.includes(wanted)).flatMap((group) => group.rules);
}

// Greedy glob match that runs in linear time, because robots.txt patterns come
// from untrusted sites and must not be able to hang the audit.
export function ruleMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const parts = body.split('*');
  const first = parts[0];
  if (!path.startsWith(first)) return false;

  let cursor = first.length;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part === '') continue;
    const isLast = i === parts.length - 1;
    if (isLast && anchored) {
      return path.length - part.length >= cursor && path.endsWith(part);
    }
    const found = path.indexOf(part, cursor);
    if (found === -1) return false;
    cursor = found + part.length;
  }
  return anchored ? cursor === path.length || body.endsWith('*') : true;
}

// Compare UTF-8 octets consistently, decoding only unreserved ASCII escapes.
function normalizePath(path: string): string {
  return path.replace(/[^\x00-\x7f]/gu, (char) => [...Buffer.from(char)].map((byte) => `%${byte.toString(16).padStart(2, '0')}`).join(''))
    .replace(/%[0-9a-f]{2}/gi, (escape) => {
      const char = String.fromCharCode(parseInt(escape.slice(1), 16));
      return /^[a-z0-9._~-]$/i.test(char) ? char : escape.toUpperCase();
    });
}

export function isAllowed(robots: Robots | null | undefined, agent: string, path: string): boolean {
  if (!robots) return true;
  const target = normalizePath(path.startsWith('/') ? path : `/${path}`);
  let best: RobotsRule | null = null;
  for (const original of rulesFor(robots, agent)) {
    const rule = { ...original, path: normalizePath(original.path) };
    if (!ruleMatches(rule.path, target)) continue;
    if (
      best === null ||
      rule.path.length > best.path.length ||
      (rule.path.length === best.path.length && rule.allow && !best.allow)
    ) {
      best = rule;
    }
  }
  return best === null ? true : best.allow;
}
