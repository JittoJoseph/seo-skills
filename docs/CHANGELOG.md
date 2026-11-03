# Changelog

All notable changes to this project are recorded here. Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

- Tidier repository root: `CONTRIBUTING.md`, `SECURITY.md` and the README media moved to `.github/`, this changelog to `docs/`, and the demo store to `scripts/demo-shopify-store.ts`.
- README: badges, a quick start and links to the agents it works with.

## 0.2.1 - 2026-11-03

- A page found through links whose canonical points at a sitemap URL is no longer flagged. This is how Shopify handles `/collections/.../products/...` copies of a product.
- Pages whose canonical points elsewhere are no longer counted as duplicate titles or descriptions.
- New README media: a demo Shopify store, with its code in `examples/demo-shopify-store.ts` so the result can be reproduced.

## 0.2.0 - 2026-11-03

- `shopify-seo` skill: audit a Shopify store and get each fix as a Shopify admin path or theme change.
- Prompt map: turn shoppers' own words into the questions they ask AI assistants, check which ones the store answers, and give one fix per gap.
- Five Shopify checks, which run only on Shopify stores:
  - a password page
  - Product JSON-LD missing from the HTML, for example when an app adds it with JavaScript
  - product links that go through collection URLs
  - a custom robots.txt.liquid that dropped Shopify's default rules
  - a store still on its myshopify.com domain
- Shopify detection now also reads the `powered-by: Shopify` header.
- `/seo shopify` and `/seo prompts` commands.
- Six Shopify guides in `docs/shopify`.

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
