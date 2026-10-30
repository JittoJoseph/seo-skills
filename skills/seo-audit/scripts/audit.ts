#!/usr/bin/env node
// Audits a site from its URL and prints a report. No dependencies, no API keys.

import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { renderMarkdown } from './lib/report.ts';
import { DEFAULT_PAGES, MAX_PAGES, runAudit } from './lib/run.ts';
import type { AuditReport } from './lib/types.ts';

const USAGE = `Usage: node audit.ts <url> [options]

  --pages <n>       Pages to check, up to ${MAX_PAGES} (default ${DEFAULT_PAGES})
  --format <type>   md or json (default md)
  --out <file>      Write the report to a file instead of printing it
  --fail-under <n>  Exit with code 1 when the score is below n, for CI
  --timeout <ms>    Timeout per request (default 15000)
  -h, --help        Show this help

Exit codes: 0 done, 1 below --fail-under, 2 bad input or unreachable, 3 inconclusive.`;

function fail(message: string): never {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(2);
}

function intOption(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) fail(`--${name} must be a whole number`);
  return number;
}

function parseCommandLine() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        pages: { type: 'string' },
        format: { type: 'string', default: 'md' },
        out: { type: 'string' },
        'fail-under': { type: 'string' },
        timeout: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (error) {
    fail((error as Error).message);
  }
}

const { values, positionals } = parseCommandLine();
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const [url] = positionals;
if (positionals.length !== 1 || url === undefined) fail('Give exactly one URL.');
if (values.format !== 'md' && values.format !== 'json') fail('--format must be md or json');

const pages = intOption(values.pages, 'pages');
const failUnder = intOption(values['fail-under'], 'fail-under');
const timeoutMs = intOption(values.timeout, 'timeout');

let report: AuditReport;
try {
  report = await runAudit(url, { pages, timeoutMs });
} catch (error) {
  fail((error as Error).message);
}

const output = values.format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report);
if (values.out) {
  writeFileSync(values.out, output);
  console.log(`Wrote ${values.out}`);
} else {
  process.stdout.write(output);
}

if (report.state === 'unreachable') process.exitCode = 2;
else if (report.state === 'inconclusive') process.exitCode = 3;
else if (failUnder !== undefined && report.score < failUnder) process.exitCode = 1;
