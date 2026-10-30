import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontmatter, validateSkill } from '../scripts/validate-skills.ts';

let root: string;

before(() => {
  root = mkdtempSync(join(tmpdir(), 'seo-skills-'));
});

after(() => {
  rmSync(root, { recursive: true, force: true });
});

function makeSkill(name: string, content: string | null): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  if (content !== null) writeFileSync(join(dir, 'SKILL.md'), content);
  return dir;
}

const skill = (name: string, description: string, body = 'Body'): string => `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;

test('accepts a valid skill', () => {
  assert.deepEqual(validateSkill(makeSkill('good-skill', skill('good-skill', 'Does a thing.'))), []);
});

test('rejects a missing file or frontmatter', () => {
  assert.match(validateSkill(makeSkill('no-file', null))[0], /missing SKILL.md/);
  assert.match(validateSkill(makeSkill('no-yaml', '# Hi'))[0], /frontmatter/);
});

test('rejects a name that breaks the spec', () => {
  assert.match(validateSkill(makeSkill('other-dir', skill('wrong-name', 'x')))[0], /must match the directory/);
  assert.ok(validateSkill(makeSkill('Bad--Name', skill('Bad--Name', 'x'))).some((error) => /lowercase/.test(error)));
});

test('rejects a missing or oversized description', () => {
  assert.match(validateSkill(makeSkill('no-desc', '---\nname: no-desc\n---\nBody'))[0], /missing description/);
  assert.match(validateSkill(makeSkill('long-desc', skill('long-desc', 'x'.repeat(1025))))[0], /limit is 1024/);
});

test('rejects fields outside the spec', () => {
  const errors = validateSkill(makeSkill('extra-field', '---\nname: extra-field\ndescription: x\nargument-hint: y\n---\nBody'));
  assert.match(errors[0], /"argument-hint" is not a field/);
});

test('rejects references to files that do not exist', () => {
  const errors = validateSkill(makeSkill('bad-refs', skill('bad-refs', 'x', 'See [a](references/a.md) and run\n\nnode scripts/missing.ts <url>')));
  assert.equal(errors.length, 2);
});

test('ignores external links and anchors', () => {
  const dir = makeSkill('ok-links', skill('ok-links', 'x', 'See [a](https://example.com) and [b](#steps)'));
  assert.deepEqual(validateSkill(dir), []);
});

test('reads frontmatter', () => {
  assert.equal(parseFrontmatter('---\nname: "x"\n---\nBody')?.fields.name, 'x');
  assert.equal(parseFrontmatter('no frontmatter'), null);
});
