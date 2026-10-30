<h1 align="center">SEO Skills</h1>

<p align="center">
  <b>Your AI agent built the site. Now find out if search engines can read it.</b>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6" alt="Strict TypeScript">
  <img src="https://img.shields.io/badge/node-%3E%3D22.18-339933" alt="Node 22.18 or newer">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="No runtime dependencies">
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#what-it-catches">What it catches</a> ·
  <a href="#example-report">Example</a> ·
  <a href="#how-the-score-works">Scoring</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

SEO Skills gives your coding agent a real SEO audit. Point it at any URL and it reads the site the way a crawler does, then returns a score, the fixes that matter most, and the evidence behind every finding.

- **Free and open source.** MIT licensed, with no account and no API keys.
- **Nothing to set up.** Node runs the TypeScript directly, so there are no packages to install and no build step.
- **Evidence, not opinions.** Scripted checks produce the findings, so results are repeatable. Your agent explains them.
- **Works with your agent.** Built on the open [Agent Skills](https://agentskills.io) format, for Claude Code, Codex, Cursor and others that support it.

## Install

```bash
npx skills add JittoJoseph/seo-skills
```

Or copy the skills into your agent's folder:

```bash
git clone https://github.com/JittoJoseph/seo-skills.git
cp -r seo-skills/skills/* ~/.claude/skills/
```

## Run your first audit

Ask your agent to audit a site, or type:

```text
/seo audit https://yoursite.com
```

It also works on a local dev server, and without an agent:

```bash
node skills/seo-audit/scripts/audit.ts http://localhost:3000
```

## What it catches

Starter templates and AI builders leave behind problems that are easy to miss, because the site looks fine in a browser:

| Problem | Why it hurts |
|---|---|
| Content exists only in JavaScript | Many AI crawlers don't run JavaScript, so they see an empty page |
| The title is still "Vite + React" | That text can become your headline in search results |
| Made-up URLs return 200 | Search engines can treat them as soft 404s and index junk URLs |
| Every canonical points at the homepage | This asks search engines to drop your other pages |
| A staging `noindex` or robots.txt block shipped | Your pages stay out of search results |
| The sitemap lists `localhost` | Crawlers get pointed at the wrong site |
| `/robots.txt` returns your app's HTML | Crawlers don't get real crawl rules or a sitemap location |

In total it runs 38 checks across six areas:

| Area | What it looks at |
|---|---|
| Crawling and indexing | HTTPS, redirects, robots.txt, sitemaps, noindex, canonicals, real 404s, internal links |
| Rendering | Whether content is in the HTML, viewport, language |
| Titles and metadata | Missing, duplicate or default titles and descriptions, headings, alt text, hreflang |
| Structured data | Whether JSON-LD exists and is valid |
| Social sharing | Open Graph tags and whether the share image loads |
| AI search | Whether AI search crawlers are allowed in robots.txt |

See every check, with its weight and how to fix it, in [checks.md](skills/seo-audit/references/checks.md).

## Example report

This is real output from auditing `example.com`:

```text
Foundation score: 69/100 (C), with 5 failed, 7 warnings and 14 passed.

Fix first

1. A sitemap exists: No sitemap in robots.txt or at /sitemap.xml
2. Pages have a meta description: /: no meta description
3. Pages declare one canonical URL: /: no canonical
4. Pages have a main heading: /: no <h1>
5. Pages have Open Graph tags: /: missing og:title, og:description, og:image

Crawling and indexing   73
Rendering               67
Titles and metadata     68
Structured data         50
Social sharing           0
AI search              100
```

The full report also explains why each finding matters and how to fix it.

## How the score works

- **You can recompute it.** Every check has a published weight. A pass earns the full weight, a warning earns half and a failure earns nothing.
- **Tidy tags can't hide a broken site.** Blocking search engines or setting `noindex` on the homepage caps the score at 40. An empty client-rendered homepage caps it at 60.
- **No false scores.** If a firewall blocks the audit, you get an explanation and no score.
- **No SEO myths.** `llms.txt` is reported but not scored, because [Google says](https://developers.google.com/search/docs/appearance/ai-features) you don't need new AI text files for its AI features.

The score measures technical foundations only. It doesn't measure rankings, traffic, backlinks, content quality or Core Web Vitals, and the audit doesn't run JavaScript.

## Use it in CI

Fail a build when the score drops below your limit:

```bash
node skills/seo-audit/scripts/audit.ts https://yoursite.com --fail-under 80
```

Use `--format json` for machine-readable output, `--pages <n>` to check more pages and `--help` for every option.

## Requirements

Node.js 22.18 or newer. Without Node, the skill falls back to a manual review with no score.

## Roadmap

- [x] `/seo audit`: audit any site from its URL
- [ ] `/seo fix`: have your agent fix the findings in your code
- [ ] Framework-specific fixes for Next.js, Astro, Nuxt and WordPress
- [ ] `/seo shopify`: SEO checks and fixes for Shopify stores
- [ ] Claude Code and Codex plugin installs

## Contributing

Found a wrong result or a check that's missing? [Open an issue](https://github.com/JittoJoseph/seo-skills/issues) with the URL and what you expected. False positives are especially useful to report.

To work on the code:

```bash
npm test
npm install
npm run typecheck
npm run validate
```

The tests run without installing anything, and `npm install` only adds the type checker. Check docs are generated from the code, so run `npm run docs` after changing a check.

## License

[MIT](LICENSE) © [Jitto Joseph](https://github.com/JittoJoseph)
