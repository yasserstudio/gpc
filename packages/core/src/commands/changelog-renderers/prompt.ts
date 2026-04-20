import type { GeneratedChangelog } from "../changelog-generate.js";

function safeLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

export function renderPrompt(g: GeneratedChangelog): string {
  const lines: string[] = [];
  lines.push("You are writing a draft of GitHub Release notes from clustered git commits.");
  lines.push("");
  lines.push("VOICE RULES (from project conventions):");
  lines.push("- Terse, present tense, user-facing language");
  lines.push('- No internal jargon (no "mutex", "token bucket", "barrel exports", "homedir")');
  lines.push("- One bullet per feature/fix, not one per commit");
  lines.push("- Drop conventional-commit scopes (e.g., feat(cli) → feat:)");
  lines.push("- Open with a single-sentence highlight describing the release theme");
  lines.push("");
  lines.push(`RANGE: ${g.from}..${g.to}`);
  if (g.repo) lines.push(`REPO:  ${g.repo}`);
  lines.push(`COMMITS: ${g.rawCommitCount} raw, ${g.clusters.length} clusters after dedup`);
  lines.push("");

  if (g.headlineCandidates.length > 0) {
    lines.push("HEADLINE CANDIDATES (largest first):");
    for (const c of g.headlineCandidates) {
      lines.push(
        `  ${c.label} (weight ${c.weight}, ${c.commits.length} commits, primary ${c.primaryType})`,
      );
    }
    lines.push("");
  }

  lines.push("CLUSTERED COMMITS:");
  lines.push("");
  for (const cluster of g.clusters) {
    lines.push(
      `[cluster: ${cluster.label}, weight ${cluster.weight}, ${cluster.commits.length} commits, primary ${cluster.primaryType}]`,
    );
    for (const commit of cluster.commits) {
      lines.push(`- ${commit.type}: ${safeLine(commit.subject)} (${commit.sha.slice(0, 7)})`);
      if (commit.files.length > 0) {
        const fileSummary = commit.files.slice(0, 3).join(", ");
        const more = commit.files.length > 3 ? ` (+${commit.files.length - 3} more)` : "";
        lines.push(`  files: ${fileSummary}${more}`);
      }
    }
    lines.push("");
  }

  if (g.warnings.length > 0) {
    lines.push("LINTER WARNINGS (review before publishing):");
    for (const w of g.warnings) lines.push(`  - ${w}`);
    lines.push("");
  }

  const compare = g.repo
    ? `https://github.com/${g.repo}/compare/${g.from}...${g.to}`
    : `${g.from}..${g.to}`;
  lines.push("OUTPUT FORMAT (match exactly):");
  lines.push("```markdown");
  lines.push("<one-sentence highlight>");
  lines.push("");
  lines.push("## What's Changed");
  lines.push("");
  lines.push("- breaking: ...");
  lines.push("- feat: ...");
  lines.push("- fix: ...");
  lines.push("- perf: ...");
  lines.push("");
  lines.push(`**Full Changelog**: ${compare}`);
  lines.push("```");

  return lines.join("\n");
}
