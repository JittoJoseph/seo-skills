# Changelog

All notable changes to this project are recorded here. Versions follow [Semantic Versioning](https://semver.org/).

## 0.1.1 - 2026-10-30

- Install as a plugin in Claude Code and Codex.
- The report no longer says a score was capped when the cap did not lower it.
- robots.txt rules now match percent-encoded and non-ASCII paths the way RFC 9309 describes.
- A closing tag like `</scripture>` no longer ends a script or title early.
- Unknown HTML entities such as `&constructor;` are left as written.
- The private address guard now also covers IPv4-mapped IPv6 and more link-local addresses.
- Added a contributing guide, a security policy, issue templates and agent instructions.
- Added a release workflow, and an example report that a workflow keeps current.
- Sitemap URLs that return non-HTML content are now flagged instead of treated as healthy pages.
- The CLI now rejects zero-valued page and request-timeout limits.
- Oversized responses are now reported as incomplete instead of being scored from partial HTML.

## 0.1.0 - 2026-10-30

First release.

- `seo-audit` skill: audit any site from its URL, with no API keys, no install step and no dependencies beyond Node.js 22.18 or newer.
- Written in strict TypeScript that Node runs directly.
- Scripted checks for crawling and indexing, rendering, titles and metadata, structured data, social sharing and AI search.
- Evidence and a fix for every finding, with a transparent score out of 100.
- Score caps for sites that block search engines, are marked noindex, or ship an empty client-rendered homepage.
- No score when a firewall or an error stops the audit, instead of a misleading one.
- `seo` skill as the `/seo` entry point.
- Report formats: Markdown and JSON, plus `--fail-under` for CI.
