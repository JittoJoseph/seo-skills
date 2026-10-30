# SEO Skills

SEO skills for AI coding agents. Audit any site from its URL, with no API keys and no dependencies beyond Node.js.

> Early release. The audit works today, and more skills are on the way.

## Install

```bash
npx skills add JittoJoseph/seo-skills
```

Or clone it into your agent's skills folder:

```bash
git clone https://github.com/JittoJoseph/seo-skills.git
cp -r seo-skills/skills/* ~/.claude/skills/
```

## Use

Ask your agent to audit a site, or type:

```text
/seo audit https://example.com
```

You can also run the audit without an agent:

```bash
node skills/seo-audit/scripts/audit.ts https://example.com
```

You get a score out of 100, the fixes to make first, and the evidence behind every finding.

## What it checks

It reads the raw HTML a crawler receives and checks six areas:

| Area | Examples |
|---|---|
| Crawling and indexing | robots.txt, sitemap, noindex, canonicals, real 404s, HTTPS |
| Rendering | Whether content is in the HTML or only in JavaScript |
| Titles and metadata | Missing, duplicate or template-default titles and descriptions, headings, alt text |
| Structured data | Valid JSON-LD |
| Social sharing | Open Graph tags and whether the share image loads |
| AI search | Whether AI search crawlers are allowed in robots.txt |

The full list, with the scoring method, is in [checks.md](skills/seo-audit/references/checks.md).

## How the score works

- Each check has a published weight, so you can recompute the score yourself.
- A site can't score well if crawlers can't read it. Blocking search engines or using noindex on the homepage caps the score at 40, and an empty client-rendered homepage caps it at 60.
- If a firewall blocks the audit, you get no score rather than a false one.
- `llms.txt` is reported but not scored, because [Google says](https://developers.google.com/search/docs/appearance/ai-features) you don't need new AI text files for its AI features.

The score covers technical foundations only. It doesn't measure rankings, traffic, backlinks, content quality or Core Web Vitals, and the audit doesn't run JavaScript.

## Use it in CI

```bash
node skills/seo-audit/scripts/audit.ts https://example.com --fail-under 80
```

The command exits with code 1 when the score is below 80.

## Requirements

Node.js 22.18 or newer, which runs the TypeScript directly, so there is nothing to install or build. Without Node, the skill falls back to a manual review with no score.

## Development

```bash
npm test
npm install
npm run typecheck
npm run validate
```

The tests run without installing anything. `npm install` is only needed for the type checker. The check docs are generated from the code, so run `npm run docs` after changing a check.

## License

[MIT](LICENSE)
