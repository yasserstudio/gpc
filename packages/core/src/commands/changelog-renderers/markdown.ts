import { SECTION_ORDER, type GeneratedChangelog } from "../changelog-generate.js";

function safeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

export function renderMarkdown(g: GeneratedChangelog): string {
  if (g.commits.length === 0) {
    const compare = g.repo
      ? `\n**Full Changelog**: https://github.com/${g.repo}/compare/${g.from}...${g.to}`
      : "";
    return `## What's Changed\n\n_No notable changes._\n${compare}`.trim();
  }

  const lines: string[] = ["## What's Changed", ""];
  let emittedAny = false;

  for (const type of SECTION_ORDER) {
    const commits = g.grouped[type] ?? [];
    if (commits.length === 0) continue;

    for (const commit of commits) {
      lines.push(`- ${type}: ${safeSubject(commit.subject)}`);
      emittedAny = true;
    }
  }

  if (!emittedAny) {
    lines.push("_No notable changes._");
  }

  if (g.repo) {
    lines.push("");
    lines.push(`**Full Changelog**: https://github.com/${g.repo}/compare/${g.from}...${g.to}`);
  }

  return lines.join("\n");
}
