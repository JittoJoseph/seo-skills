// Turns check results into a score. The method is deliberately simple so anyone
// can recompute it: pass earns full weight, warn earns half, fail earns nothing.
// A failed blocker then caps the total.

import type { ScorableResult, ScoreSummary, Status } from './types.ts';

const CREDIT: Partial<Record<Status, number>> = { pass: 1, warn: 0.5, fail: 0 };

function weighted(results: ScorableResult[]): number | null {
  let earned = 0;
  let possible = 0;
  for (const result of results) {
    const credit = CREDIT[result.status];
    if (credit === undefined) continue;
    earned += result.weight * credit;
    possible += result.weight;
  }
  if (possible === 0) return null;
  const score = Math.round((earned / possible) * 100);
  // 100 means nothing to fix, so rounding must not award it.
  return score === 100 && earned < possible ? 99 : score;
}

export function gradeFor(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function scoreResults(results: ScorableResult[], categories: string[]): ScoreSummary {
  const raw = weighted(results) ?? 0;
  const blockers = results.filter((result) => result.gateFailed);
  const capAt = blockers.length > 0 ? Math.min(...blockers.map((result) => result.cap ?? 100)) : null;
  const score = capAt === null ? raw : Math.min(raw, capAt);
  return {
    score,
    grade: gradeFor(score),
    uncapped_score: raw,
    cap: capAt === null ? null : { at: capAt, reasons: blockers.map((result) => result.capReason ?? 'a blocker failed') },
    categories: categories
      .map((name) => ({ name, score: weighted(results.filter((result) => result.category === name)) }))
      .filter((category) => category.score !== null),
  };
}
