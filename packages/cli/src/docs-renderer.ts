import { bold, dim, yellow, green, gray } from "./colors.js";

export function renderMarkdown(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];

  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        out.push(dim("  ┌─────────────────────────────────────"));
      } else {
        out.push(dim("  └─────────────────────────────────────"));
      }
      continue;
    }

    if (inCodeBlock) {
      out.push(dim(`  │ ${line}`));
      continue;
    }

    // Headers
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      out.push("");
      out.push(bold(green(`  ${h1[1]!}`)));
      out.push(green("  " + "─".repeat(h1[1]!.length)));
      out.push("");
      continue;
    }
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      out.push("");
      out.push(bold(yellow(`  ${h2[1]}`)));
      out.push("");
      continue;
    }
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      out.push(bold(`  ${h3[1]}`));
      continue;
    }

    // Blockquotes (converted from ::: containers)
    if (line.startsWith("> ")) {
      out.push(dim(`  │ ${renderInline(line.slice(2))}`));
      continue;
    }

    // Table rows
    if (line.startsWith("|")) {
      if (line.match(/^\|[\s-|]+\|$/)) {
        out.push(gray("  " + "─".repeat(Math.min(line.length, 60))));
        continue;
      }
      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      out.push("  " + cells.join("  "));
      continue;
    }

    // List items
    if (line.match(/^\s*[-*]\s/)) {
      out.push(`  ${renderInline(line)}`);
      continue;
    }

    // Numbered list items
    if (line.match(/^\s*\d+\.\s/)) {
      out.push(`  ${renderInline(line)}`);
      continue;
    }

    // Regular text
    out.push(`  ${renderInline(line)}`);
  }

  // Close unclosed code block gracefully
  if (inCodeBlock) {
    out.push(dim("  └─────────────────────────────────────"));
  }

  return out.join("\n");
}

function renderInline(text: string): string {
  let result = text.replace(/\*\*(.+?)\*\*/g, (_, t) => bold(t));
  result = result.replace(/`([^`]+)`/g, (_, t) => dim(t));
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `${label} ${dim(`(${url})`)}`);
  return result;
}

export function formatSearchResult(
  slug: string,
  title: string,
  snippet: string,
  score: number,
): string {
  const header = bold(slug) + dim(` (score: ${score})`);
  const titleLine = `  ${title}`;
  const snippetLines = snippet
    .split("\n")
    .slice(0, 3)
    .map((l) => gray(`    ${l.trim()}`))
    .join("\n");
  return `${header}\n${titleLine}\n${snippetLines}`;
}
