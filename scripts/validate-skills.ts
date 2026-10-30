#!/usr/bin/env node
// Validates every skill against the Agent Skills specification
// (https://agentskills.io/specification) and checks that the repo is consistent.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS_DOC_PATH, renderChecksDoc } from './gen-checks-doc.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_BODY_LINES = 500;
const ALLOWED_FIELDS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);

// Reads top-level "key: value" lines, which is all the spec's required fields need.
export function parseFrontmatter(text: string): { fields: Record<string, string>; body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return null;
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2].replace(/^["']|["']$/g, '');
  }
  return { fields, body: match[2] };
}

export function validateSkill(dir: string): string[] {
  const errors: string[] = [];
  const name = dir.split(/[\\/]/).pop() ?? dir;
  const file = join(dir, 'SKILL.md');
  if (!existsSync(file)) return [`${name}: missing SKILL.md`];

  const parsed = parseFrontmatter(readFileSync(file, 'utf8'));
  if (!parsed) return [`${name}: missing YAML frontmatter`];
  const { fields, body } = parsed;

  for (const field of Object.keys(fields)) {
    if (!ALLOWED_FIELDS.has(field)) errors.push(`${name}: "${field}" is not a field in the Agent Skills spec`);
  }

  if (!fields.name) errors.push(`${name}: missing name`);
  else {
    if (fields.name !== name) errors.push(`${name}: name "${fields.name}" must match the directory`);
    if (fields.name.length > 64) errors.push(`${name}: name is longer than 64 characters`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fields.name)) errors.push(`${name}: name must be lowercase letters, numbers and single hyphens`);
  }

  if (!fields.description) errors.push(`${name}: missing description`);
  else if (fields.description.length > 1024) errors.push(`${name}: description is ${fields.description.length} characters, the limit is 1024`);

  if (fields.compatibility && fields.compatibility.length > 500) errors.push(`${name}: compatibility is longer than 500 characters`);

  const bodyLines = body.split(/\r?\n/).length;
  if (bodyLines > MAX_BODY_LINES) errors.push(`${name}: body is ${bodyLines} lines, keep it under ${MAX_BODY_LINES}`);

  // Every relative link and script the instructions mention must exist.
  const references = [...body.matchAll(/\]\((?!https?:|#)([^)#\s]+)/g)].map((m) => m[1]);
  references.push(...[...body.matchAll(/\bnode\s+(scripts\/[\w./-]+)/g)].map((m) => m[1]));
  for (const reference of references) {
    if (!existsSync(join(dir, reference))) errors.push(`${name}: references missing file ${reference}`);
  }
  return errors;
}

function validateRepo(): string[] {
  const errors: string[] = [];
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const versionFile = readFileSync(join(ROOT, 'skills/seo-audit/scripts/lib/version.ts'), 'utf8');
  if (!versionFile.includes(`'${pkg.version}'`)) errors.push(`version.ts does not match package.json version ${pkg.version}`);

  for (const manifest of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json']) {
    const { version } = JSON.parse(readFileSync(join(ROOT, manifest), 'utf8'));
    if (version !== pkg.version) errors.push(`${manifest} has version ${version}, expected ${pkg.version}`);
  }

  const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
  if (!changelog.includes(`## ${pkg.version}`) && !changelog.includes(`## [${pkg.version}]`)) {
    errors.push(`CHANGELOG.md has no entry for ${pkg.version}`);
  }

  const normalize = (text: string): string => text.replace(/\r\n/g, '\n');
  const current = existsSync(CHECKS_DOC_PATH) ? readFileSync(CHECKS_DOC_PATH, 'utf8') : '';
  if (normalize(current) !== normalize(renderChecksDoc())) errors.push('references/checks.md is out of date, run: npm run docs');
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const skillsDir = join(ROOT, 'skills');
  const skills = readdirSync(skillsDir).filter((entry) => statSync(join(skillsDir, entry)).isDirectory());
  const errors = [...skills.flatMap((skill) => validateSkill(join(skillsDir, skill))), ...validateRepo()];
  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR ${error}`);
    process.exit(1);
  }
  console.log(`OK: ${skills.length} skills are valid`);
}
