# Changelog

All notable changes to this project are recorded here. Versions follow [Semantic Versioning](https://semver.org/).

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
