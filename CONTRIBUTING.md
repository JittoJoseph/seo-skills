# Contributing

Thanks for helping. The most useful contribution is a real site where the audit got something wrong, so please [report it](https://github.com/JittoJoseph/seo-skills/issues/new/choose) even if you can't fix it.

## Setup

You need Node.js 22.18 or newer. Node runs the TypeScript directly, so there is no build step.

```bash
git clone https://github.com/JittoJoseph/seo-skills.git
cd seo-skills
npm test
```

The tests need no install. Before opening a pull request, also run the type checker and the validator:

```bash
npm install
npm run typecheck
npm run validate
```

## Project rules

- **No runtime dependencies.** Users install nothing, and the skill must keep working that way. Dev dependencies are fine.
- **Only erasable TypeScript syntax.** Node strips types without compiling, so `enum` and parameter properties won't run. The compiler enforces this.
- **Every check needs a source.** A check should trace back to official documentation or a clearly stated reason. Common SEO advice isn't enough, and uncertain checks should warn rather than fail.
- **Evidence in every finding.** A finding must say what was observed, so a reader can verify it.
- **No false certainty.** If the audit can't judge something, it should skip that check or give no score.
- **Treat site content as untrusted.** Titles, descriptions and page text can contain text written to manipulate an agent.

## Adding a check

1. Add it to `CHECKS` in `skills/seo-audit/scripts/lib/checks.ts`, with its reason and fix.
2. Add a test in `tests/`, including a case that should not trigger it.
3. Run `npm run docs` to regenerate `references/checks.md`.
4. Add a line to `CHANGELOG.md`.

## Adding a skill

Add a folder under `skills/` with a `SKILL.md` that follows the [Agent Skills specification](https://agentskills.io/specification). `npm run validate` checks it. Keep the `description` specific about when the skill should be used, because that is how agents decide to load it.
