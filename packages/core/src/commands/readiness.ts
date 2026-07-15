// ---------------------------------------------------------------------------
// Release-readiness scoring
//
// Pure, side-effect-free grading engine consumed by `gpc doctor --score`. It
// takes a curated set of weighted readiness signals (derived by the CLI from
// the checks `gpc doctor` already runs) and produces an A-F grade, a weighted
// breakdown, actionable suggestions, and a shareable shields.io badge.
//
// Kept in core (no I/O, no Google API) so the grading rubric is unit-testable
// in isolation from live auth/config/network.
// ---------------------------------------------------------------------------

/** Status of a single readiness signal. `na` = not evaluated (excluded from the score). */
export type ReadinessSignalStatus = "pass" | "warn" | "fail" | "na";

export type ReadinessGrade = "A" | "B" | "C" | "D" | "F";

/** One weighted input to the score. */
export interface ReadinessSignal {
  key: string;
  label: string;
  weight: number;
  status: ReadinessSignalStatus;
  /** Short human detail (e.g. the underlying check message). */
  detail?: string;
  /** Remediation hint, surfaced when status is not `pass`. */
  suggestion?: string;
}

/** One row of the computed breakdown. */
export interface ReadinessBreakdownEntry {
  key: string;
  label: string;
  weight: number;
  status: ReadinessSignalStatus;
  /** Weight earned by this signal: `weight * fraction`, or 0 for `na`. */
  points: number;
  detail?: string;
}

export interface ReadinessScore {
  grade: ReadinessGrade;
  /** 0-100. 0 when nothing was evaluated (see `evaluated`). */
  percent: number;
  /** false when every signal was `na` — the grade is not meaningful. */
  evaluated: boolean;
  earned: number;
  possible: number;
  breakdown: ReadinessBreakdownEntry[];
  suggestions: string[];
}

/** Fraction of a signal's weight earned per status. */
const STATUS_FRACTION: Record<Exclude<ReadinessSignalStatus, "na">, number> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
};

/** Grade bands: A >= 90, B >= 80, C >= 70, D >= 60, F < 60. */
export function gradeFromPercent(percent: number): ReadinessGrade {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}

/**
 * Compute a weighted release-readiness score. `na` signals are excluded from
 * both the earned and possible totals so they never move the grade.
 */
export function scoreReadiness(signals: ReadinessSignal[]): ReadinessScore {
  let earned = 0;
  let possible = 0;
  const breakdown: ReadinessBreakdownEntry[] = [];
  const suggestions: string[] = [];

  for (const signal of signals) {
    if (signal.status === "na") {
      breakdown.push({
        key: signal.key,
        label: signal.label,
        weight: signal.weight,
        status: "na",
        points: 0,
        detail: signal.detail,
      });
      continue;
    }

    const points = signal.weight * STATUS_FRACTION[signal.status];
    earned += points;
    possible += signal.weight;
    breakdown.push({
      key: signal.key,
      label: signal.label,
      weight: signal.weight,
      status: signal.status,
      points,
      detail: signal.detail,
    });
    if (signal.status !== "pass" && signal.suggestion) {
      suggestions.push(signal.suggestion);
    }
  }

  const evaluated = possible > 0;
  const percent = evaluated ? Math.round((earned / possible) * 100) : 0;
  const grade = evaluated ? gradeFromPercent(percent) : "F";

  return { grade, percent, evaluated, earned, possible, breakdown, suggestions };
}

// ---------------------------------------------------------------------------
// Shareable badge (static shields.io URL — zero infrastructure)
// ---------------------------------------------------------------------------

const GRADE_COLOR: Record<ReadinessGrade, string> = {
  A: "brightgreen",
  B: "green",
  C: "yellow",
  D: "orange",
  F: "red",
};

export function readinessBadgeColor(grade: ReadinessGrade): string {
  return GRADE_COLOR[grade];
}

/**
 * Build a static shields.io badge URL for the score. No hosted endpoint: the
 * grade is baked into the URL, so it is safe to commit into a README.
 */
export function readinessBadgeUrl(score: ReadinessScore): string {
  const label = "GPC readiness";
  const message = score.evaluated ? `${score.grade} (${score.percent}%)` : "not evaluated";
  const color = score.evaluated ? readinessBadgeColor(score.grade) : "lightgrey";
  // shields.io escaping: literal dashes/underscores must be doubled before URL
  // encoding so they are not read as field separators.
  const enc = (segment: string): string =>
    encodeURIComponent(segment.replace(/-/g, "--").replace(/_/g, "__"));
  return `https://img.shields.io/badge/${enc(label)}-${enc(message)}-${color}`;
}

export function readinessBadgeMarkdown(score: ReadinessScore): string {
  return `![GPC readiness](${readinessBadgeUrl(score)})`;
}
