import { GpcError } from "../errors.js";
import { gitExec } from "../utils/git-notes.js";

export type OutputMode = "md" | "json" | "prompt";

export interface RawCommit {
  sha: string;
  subject: string;
  body: string;
  files: string[];
  additions: number;
  deletions: number;
  authorDate: string;
}

export interface ParsedCommit {
  sha: string;
  type: string;
  scope?: string;
  subject: string;
  prRef?: string;
  files: string[];
  weight: number;
  isRevert: boolean;
  isFixup: boolean;
  authorDate: string;
}

export interface CommitCluster {
  id: string;
  label: string;
  commits: ParsedCommit[];
  weight: number;
  primaryType: string;
}

export interface GeneratedChangelog {
  from: string;
  to: string;
  repo: string | null;
  rawCommitCount: number;
  commits: ParsedCommit[];
  clusters: CommitCluster[];
  grouped: Record<string, ParsedCommit[]>;
  headlineCandidates: CommitCluster[];
  warnings: string[];
}

export interface GenerateOptions {
  from?: string;
  to?: string;
  cwd?: string;
  repo?: string;
}

export interface GitRunner {
  log(args: { from: string; to: string; cwd: string }): Promise<RawCommit[]>;
  describeLatestTag(cwd: string): Promise<string | null>;
  verifyRef(ref: string, cwd: string): Promise<boolean>;
  remoteUrl(cwd: string): Promise<string | null>;
}

const KNOWN_TYPES = new Set([
  "feat",
  "fix",
  "perf",
  "breaking",
  "docs",
  "ci",
  "chore",
  "refactor",
  "test",
  "build",
  "style",
  "release",
]);

const FILTERED_TYPES = new Set(["chore", "refactor", "test", "build", "style", "merge"]);

export const SECTION_ORDER = ["breaking", "feat", "fix", "perf", "docs", "ci", "release", "other"] as const;

const FIXUP_PATTERNS = [
  /^wip\b/i,
  /^fix\s+typo\b/i,
  /^fix\s+typos\b/i,
  /^address\s+review\b/i,
  /^review\s+fixes\b/i,
  /^fixup!/i,
  /^squash!/i,
];

const REVERT_PATTERN = /^Revert\s+"(.+?)"\s*$/i;

const VERB_CANONICALIZATIONS: Array<[RegExp, string]> = [
  [/^Added\b/, "add"],
  [/^Adds\b/, "add"],
  [/^Add\b/, "add"],
  [/^Fixed\b/, "fix"],
  [/^Fixes\b/, "fix"],
  [/^Fix\b/, "fix"],
  [/^Updated\b/, "update"],
  [/^Updates\b/, "update"],
  [/^Update\b/, "update"],
  [/^Removed\b/, "remove"],
  [/^Removes\b/, "remove"],
  [/^Remove\b/, "remove"],
];

const EMOJI_PREFIX = /^(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*)+/u;

const INTERNAL_JARGON = [
  "mutex",
  "token bucket",
  "barrel export",
  "barrel exports",
  "homedir",
  "at module level",
  "ESM",
  "tsup",
  "vi.stubGlobal",
  "execFile",
  "lazy-import",
];

const RECORD_START = "\x1e";
const FIELD_SEP = "\x1f";
const COMMIT_FORMAT = `${RECORD_START}%H${FIELD_SEP}%s${FIELD_SEP}%aI${FIELD_SEP}%b`;

function parseRawCommits(stdout: string): RawCommit[] {
  if (!stdout.trim()) return [];
  const blocks = stdout.split(RECORD_START).filter((b) => b.trim());
  const commits: RawCommit[] = [];
  for (const block of blocks) {
    const headerEnd = block.indexOf("\n");
    const header = headerEnd === -1 ? block : block.slice(0, headerEnd);
    const rest = headerEnd === -1 ? "" : block.slice(headerEnd + 1);
    const parts = header.split(FIELD_SEP);
    const sha = parts[0]?.trim() ?? "";
    const subject = parts[1]?.trim() ?? "";
    const authorDate = parts[2]?.trim() ?? "";
    const body = (parts[3] ?? "").trim();
    if (!sha) continue;
    const files: string[] = [];
    let additions = 0;
    let deletions = 0;
    for (const line of rest.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
      if (match) {
        const a = match[1] === "-" ? 0 : Number(match[1]);
        const d = match[2] === "-" ? 0 : Number(match[2]);
        additions += a;
        deletions += d;
        files.push(match[3] ?? "");
      }
    }
    commits.push({ sha, subject, body, files, additions, deletions, authorDate });
  }
  return commits;
}

export const defaultGitRunner: GitRunner = {
  async log({ from, to, cwd }) {
    const stdout = await gitExec(
      [
        "log",
        "--no-merges",
        `--format=${COMMIT_FORMAT}`,
        "--numstat",
        "--end-of-options",
        `${from}..${to}`,
      ],
      { cwd },
    );
    return parseRawCommits(stdout);
  },
  async describeLatestTag(cwd) {
    try {
      const out = await gitExec(["describe", "--tags", "--match", "v*", "--abbrev=0"], { cwd });
      return out.trim() || null;
    } catch {
      return null;
    }
  },
  async verifyRef(ref, cwd) {
    try {
      await gitExec(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], { cwd });
      return true;
    } catch {
      return false;
    }
  },
  async remoteUrl(cwd) {
    try {
      const out = await gitExec(["remote", "get-url", "origin"], { cwd });
      return out.trim() || null;
    } catch {
      return null;
    }
  },
};

export function parseRemoteUrl(url: string | null): string | null {
  if (!url) return null;
  const https = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i);
  if (https) return `${https[1]}/${https[2]}`;
  const ssh = url.match(/^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  return null;
}

function stripEmojiAndCanonicalize(subject: string): string {
  let s = subject.replace(EMOJI_PREFIX, "");
  for (const [pattern, replacement] of VERB_CANONICALIZATIONS) {
    if (pattern.test(s)) {
      s = s.replace(pattern, replacement);
      break;
    }
  }
  return s.trim();
}

function isFixupSubject(subject: string): boolean {
  return FIXUP_PATTERNS.some((p) => p.test(subject));
}

const CONVENTIONAL_RE = /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<bang>!?):\s*(?<rest>.+)$/;
const PR_REF_RE = /\s*\(#(\d+)\)\s*$/;

export function parseCommit(raw: RawCommit): ParsedCommit {
  const subject = raw.subject;
  const revertMatch = subject.match(REVERT_PATTERN);
  const isRevert = !!revertMatch;
  const effectiveSubject = revertMatch?.[1] ?? subject;

  const match = effectiveSubject.match(CONVENTIONAL_RE);
  let type = "other";
  let scope: string | undefined;
  let rest = effectiveSubject;
  if (match?.groups) {
    const rawType = match.groups["type"]?.toLowerCase() ?? "other";
    type = KNOWN_TYPES.has(rawType) ? rawType : "other";
    scope = match.groups["scope"];
    rest = match.groups["rest"] ?? effectiveSubject;
    if (match.groups["bang"]) type = "breaking";
  }

  let prRef: string | undefined;
  const prMatch = rest.match(PR_REF_RE);
  if (prMatch) {
    prRef = `#${prMatch[1]}`;
    rest = rest.replace(PR_REF_RE, "").trim();
  }

  const cleaned = stripEmojiAndCanonicalize(rest);
  const finalSubject = prRef ? `${cleaned} (${prRef})` : cleaned;

  return {
    sha: raw.sha,
    type,
    scope,
    subject: finalSubject,
    prRef,
    files: raw.files,
    weight: raw.additions + raw.deletions,
    isRevert,
    isFixup: isFixupSubject(rest) || isFixupSubject(subject),
    authorDate: raw.authorDate,
  };
}

function dedupRevertPairs(commits: ParsedCommit[]): ParsedCommit[] {
  const reverted = new Set<string>();
  for (const c of commits) {
    if (c.isRevert) reverted.add(c.subject);
  }
  return commits.filter((c) => {
    if (c.isRevert) return false;
    if (reverted.has(c.subject)) return false;
    return true;
  });
}

function topPathPrefix(file: string, depth = 2): string {
  return file.split("/").slice(0, depth).join("/");
}

function tokenize(subject: string): Set<string> {
  const STOP = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "is",
    "be",
    "by",
    "at",
  ]);
  return new Set(
    subject
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function shouldCluster(a: ParsedCommit, b: ParsedCommit, ta: Set<string>, tb: Set<string>): boolean {
  const aPrefixes = new Set(a.files.map((f) => topPathPrefix(f)));
  for (const f of b.files) {
    if (aPrefixes.has(topPathPrefix(f))) return true;
  }
  if (jaccard(ta, tb) > 0.4) return true;
  const aDate = Date.parse(a.authorDate);
  const bDate = Date.parse(b.authorDate);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    const dayDiff = Math.abs(aDate - bDate) / 86_400_000;
    if (dayDiff <= 2) {
      const aFiles = new Set(a.files);
      for (const f of b.files) if (aFiles.has(f)) return true;
    }
  }
  return false;
}

const TYPE_PRIORITY: Record<string, number> = {
  breaking: 0,
  feat: 1,
  fix: 2,
  perf: 3,
  docs: 4,
  ci: 5,
  release: 6,
  other: 7,
};

function clusterCommits(commits: ParsedCommit[]): CommitCluster[] {
  const n = commits.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const union = (i: number, j: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  };
  const tokens = commits.map((c) => tokenize(c.subject));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldCluster(commits[i]!, commits[j]!, tokens[i]!, tokens[j]!)) union(i, j);
    }
  }
  const groups = new Map<number, ParsedCommit[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(commits[i]!);
  }
  const clusters: CommitCluster[] = [];
  for (const [, members] of groups) {
    const weight = members.reduce((s, m) => s + m.weight, 0);
    const primaryType = members
      .map((m) => m.type)
      .sort((a, b) => (TYPE_PRIORITY[a] ?? 99) - (TYPE_PRIORITY[b] ?? 99))[0]!;
    const label = clusterLabel(members);
    clusters.push({
      id: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      commits: members,
      weight,
      primaryType,
    });
  }
  return clusters;
}

function clusterLabel(members: ParsedCommit[]): string {
  const pathCounts = new Map<string, number>();
  for (const m of members) {
    for (const f of m.files) {
      const top = topPathPrefix(f, 2);
      pathCounts.set(top, (pathCounts.get(top) ?? 0) + 1);
    }
  }
  let bestPath: string | null = null;
  let bestPathCount = 0;
  for (const [p, c] of pathCounts) {
    if (c > bestPathCount) {
      bestPath = p;
      bestPathCount = c;
    }
  }
  if (bestPath) return bestPath;

  const tokenCounts = new Map<string, number>();
  for (const m of members) {
    for (const t of tokenize(m.subject)) {
      tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
    }
  }
  let bestToken: string | null = null;
  let bestTokenCount = 0;
  for (const [t, c] of tokenCounts) {
    if (c > bestTokenCount) {
      bestToken = t;
      bestTokenCount = c;
    }
  }
  return bestToken ?? members[0]!.subject.slice(0, 30);
}

function scoreHeadlines(clusters: CommitCluster[]): CommitCluster[] {
  return [...clusters]
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return (TYPE_PRIORITY[a.primaryType] ?? 99) - (TYPE_PRIORITY[b.primaryType] ?? 99);
    })
    .slice(0, 3);
}

function lintJargon(commits: ParsedCommit[]): string[] {
  const warnings: string[] = [];
  for (const c of commits) {
    const lower = c.subject.toLowerCase();
    for (const word of INTERNAL_JARGON) {
      if (lower.includes(word.toLowerCase())) {
        warnings.push(`jargon: "${word}" in subject "${c.subject}" (${c.sha.slice(0, 7)})`);
      }
    }
  }
  return warnings;
}

export async function generateChangelog(
  opts: GenerateOptions = {},
  runner: GitRunner = defaultGitRunner,
): Promise<GeneratedChangelog> {
  const cwd = opts.cwd ?? process.cwd();

  let from = opts.from;
  if (!from) {
    from = (await runner.describeLatestTag(cwd)) ?? undefined;
    if (!from) {
      throw new GpcError(
        "No git tags found and --from was not provided",
        "CHANGELOG_NO_TAG",
        1,
        "Pass --from <ref> explicitly, or create an initial tag (e.g., git tag v0.0.1).",
      );
    }
  }
  const to = opts.to ?? "HEAD";

  if (!(await runner.verifyRef(from, cwd))) {
    throw new GpcError(
      `Invalid --from ref: "${from}"`,
      "CHANGELOG_BAD_REF",
      1,
      "Verify the ref exists with: git rev-parse --verify <ref>",
    );
  }
  if (!(await runner.verifyRef(to, cwd))) {
    throw new GpcError(
      `Invalid --to ref: "${to}"`,
      "CHANGELOG_BAD_REF",
      1,
      "Verify the ref exists with: git rev-parse --verify <ref>",
    );
  }

  const repo = opts.repo ?? parseRemoteUrl(await runner.remoteUrl(cwd));

  const raw = await runner.log({ from, to, cwd });
  const rawCommitCount = raw.length;
  const parsed = raw.map(parseCommit);

  const warnings: string[] = [];
  const scopeLeak = parsed.find((c) => c.scope);
  if (scopeLeak) {
    warnings.push(
      `scope: dropped per project convention (e.g., "${scopeLeak.scope}" in ${scopeLeak.sha.slice(0, 7)})`,
    );
  }

  const afterRevert = dedupRevertPairs(parsed);
  const nonFixup = afterRevert.filter((c) => !c.isFixup);
  const visible = nonFixup.filter((c) => !FILTERED_TYPES.has(c.type));

  const clusters = clusterCommits(visible);
  const headlineCandidates = scoreHeadlines(clusters);

  const grouped: Record<string, ParsedCommit[]> = {};
  for (const c of visible) {
    if (!grouped[c.type]) grouped[c.type] = [];
    grouped[c.type]!.push(c);
  }

  warnings.push(...lintJargon(visible));

  return {
    from,
    to,
    repo,
    rawCommitCount,
    commits: parsed,
    clusters,
    grouped,
    headlineCandidates,
    warnings,
  };
}
