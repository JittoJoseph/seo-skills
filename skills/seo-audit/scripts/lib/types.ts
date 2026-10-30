// Shared shapes for the audit. Types are stripped when Node runs these files, so
// nothing here exists at runtime and the skill still needs no install step.

import type { ParsedHtml } from './html.ts';
import type { FetchResponse } from './http.ts';
import type { Robots } from './robots.ts';

export type Status = 'pass' | 'warn' | 'fail' | 'skip' | 'info';

export interface Page {
  requested: string;
  url: string;
  status: number;
  error: string | null;
  hops: FetchResponse['hops'];
  ok: boolean;
  isHtml: boolean;
  isHome: boolean;
  fromSitemap: boolean;
  parsed: ParsedHtml;
  headers: Record<string, string>;
  ms: number;
  bytes: number;
  title: string | null;
  description: string | null;
  noindex: boolean;
  noindexSource: string | null;
  canonicals: string[];
  canonicalResolved: string | null;
  internalLinks: string[];
  emptyRoot: boolean;
}

export interface SitemapInfo {
  sources: string[];
  urls: string[];
  lastType: string;
}

export interface AuditContext {
  start: string;
  finalUrl: string;
  isPrivate: boolean;
  home: Page;
  pages: Page[];
  robots: { response: FetchResponse; isHtml: boolean; parsed: Robots | null };
  sitemap: SitemapInfo;
  notFoundProbe: FetchResponse;
  llms: FetchResponse;
  faviconProbe: FetchResponse | null;
  ogImageProbe: FetchResponse | null;
  httpVariant: FetchResponse | null;
  altHost: FetchResponse | null;
}

export interface CheckOutcome {
  status: Status;
  evidence: string[];
  gateFailed?: boolean;
}

export interface Check {
  id: string;
  category: string;
  weight: number;
  title: string;
  why: string;
  fix: string;
  cap?: number;
  capReason?: string;
  run(ctx: AuditContext): CheckOutcome;
}

export interface CheckResult {
  id: string;
  category: string;
  title: string;
  weight: number;
  cap: number | null;
  capReason: string | null;
  status: Status;
  gateFailed: boolean;
  evidence: string[];
  why: string;
  fix: string;
}

export type ScorableResult = Pick<CheckResult, 'category' | 'weight' | 'status'> &
  Partial<Pick<CheckResult, 'cap' | 'capReason' | 'gateFailed'>>;

export interface ScoreSummary {
  score: number;
  grade: string;
  uncapped_score: number;
  cap: { at: number; reasons: string[] } | null;
  categories: { name: string; score: number | null }[];
}

interface ReportBase {
  tool: string;
  version: string;
  audited_at: string;
  input: string;
  final_url: string;
}

export interface UnreachableReport extends ReportBase {
  state: 'unreachable';
  reason: string;
}

export interface InconclusiveReport extends ReportBase {
  state: 'inconclusive';
  reason: string;
  status: number;
}

export interface PageSummary {
  url: string;
  status: number;
  title: string;
  words: number;
  ms: number;
  from_sitemap: boolean;
}

export interface CompleteReport extends ReportBase, ScoreSummary {
  state: 'complete';
  platforms: string[];
  sitemap_urls: number;
  pages: PageSummary[];
  checks: CheckResult[];
}

export type AuditReport = UnreachableReport | InconclusiveReport | CompleteReport;
