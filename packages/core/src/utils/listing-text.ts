/** Listing text lint and diff utilities. No external deps — pure functions. */

export interface ListingFieldLimits {
  title: number;
  shortDescription: number;
  fullDescription: number;
  video: number;
}

export const DEFAULT_LIMITS: ListingFieldLimits = {
  title: 30,
  shortDescription: 80,
  fullDescription: 4000,
  video: 256,
};

export interface FieldLintResult {
  field: string;
  chars: number;
  limit: number;
  pct: number;
  status: "ok" | "warn" | "over";
}

export interface ListingLintResult {
  language: string;
  fields: FieldLintResult[];
  valid: boolean;
}

export interface LintableFields {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  video?: string;
  [key: string]: string | undefined;
}

/** Lint a single listing's fields against character limits. */
export function lintListing(
  language: string,
  fields: LintableFields,
  limits: ListingFieldLimits = DEFAULT_LIMITS,
): ListingLintResult {
  const fieldResults: FieldLintResult[] = [];

  for (const [field, limit] of Object.entries(limits) as [keyof ListingFieldLimits, number][]) {
    const value = fields[field] ?? "";
    const chars = [...value].length; // Unicode-aware char count
    const pct = Math.round((chars / limit) * 100);
    let status: FieldLintResult["status"] = "ok";
    if (chars > limit) status = "over";
    else if (pct >= 80) status = "warn";
    fieldResults.push({ field, chars, limit, pct, status });
  }

  const valid = fieldResults.every((r) => r.status !== "over");
  return { language, fields: fieldResults, valid };
}

/** Lint multiple listings. */
export function lintListings(
  listings: { language: string; fields: LintableFields }[],
  limits?: ListingFieldLimits,
): ListingLintResult[] {
  return listings.map((l) => lintListing(l.language, l.fields, limits));
}

// ---------------------------------------------------------------------------
// Word-level diff (LCS-based)
// ---------------------------------------------------------------------------

export interface DiffToken {
  text: string;
  type: "equal" | "insert" | "delete";
}

function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

/** Compute word-level LCS diff between two strings. */
export function wordDiff(before: string, after: string): DiffToken[] {
  const aTokens = tokenize(before);
  const bTokens = tokenize(after);
  const m = aTokens.length;
  const n = bTokens.length;

  // LCS DP
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0) as number[]);
  const cell = (r: number, c: number): number => (dp[r]?.[c] ?? 0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      (dp[i] as number[])[j] = aTokens[i - 1] === bTokens[j - 1]
        ? (cell(i - 1, j - 1) + 1)
        : Math.max(cell(i - 1, j), cell(i, j - 1));
    }
  }

  // Backtrack
  const result: DiffToken[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aTokens[i - 1] === bTokens[j - 1]) {
      result.unshift({ text: aTokens[i - 1] ?? "", type: "equal" });
      i--; j--;
    } else if (j > 0 && (i === 0 || cell(i, j - 1) >= cell(i - 1, j))) {
      result.unshift({ text: bTokens[j - 1] ?? "", type: "insert" });
      j--;
    } else {
      result.unshift({ text: aTokens[i - 1] ?? "", type: "delete" });
      i--;
    }
  }
  return result;
}

/** Format a word diff as an inline string with +/- markers. */
export function formatWordDiff(diff: DiffToken[]): string {
  return diff
    .map((t) => {
      if (t.type === "equal") return t.text;
      if (t.type === "insert") return `[+${t.text}]`;
      return `[-${t.text}]`;
    })
    .join("");
}
