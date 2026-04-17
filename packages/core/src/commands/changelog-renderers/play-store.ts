import { SECTION_ORDER, type GeneratedChangelog } from "../changelog-generate.js";

export const PLAY_STORE_LIMIT = 500;
export const PLACEHOLDER_TEXT = "[needs translation — pass --ai once v0.9.63 ships, or paste the prompt emitted by --format prompt]";

export type PlayStoreFormat = "md" | "json" | "prompt";

export interface LocaleEntry {
  language: string;
  text: string;
  chars: number;
  limit: number;
  status: "ok" | "over" | "placeholder" | "empty";
}

export interface LocaleBundle {
  from: string;
  to: string;
  limit: number;
  sourceLanguage: string;
  locales: LocaleEntry[];
  overflows: string[];
}

export interface PlayStoreRenderOptions {
  locales: string[];
  format: PlayStoreFormat;
  sourceLanguage?: string;
}

function safeLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

function countChars(s: string): number {
  return [...s].length;
}

function truncateToLimit(text: string, limit: number): string {
  if (countChars(text) <= limit) return text;
  const chars = [...text];
  return chars.slice(0, limit - 1).join("") + "…";
}

function renderEnglishBullets(g: GeneratedChangelog): string {
  const lines: string[] = [];
  for (const type of SECTION_ORDER) {
    const commits = g.grouped[type] ?? [];
    for (const commit of commits) {
      lines.push(`- ${type}: ${safeLine(commit.subject)}`);
    }
  }
  return lines.join("\n");
}

export function buildLocaleBundle(
  g: GeneratedChangelog,
  opts: PlayStoreRenderOptions,
): LocaleBundle {
  const sourceLanguage = opts.sourceLanguage ?? "en-US";
  const sourceText = renderEnglishBullets(g);
  const isEmpty = sourceText.length === 0;

  const overflows: string[] = [];
  const entries: LocaleEntry[] = opts.locales.map((language) => {
    if (language === sourceLanguage) {
      if (isEmpty) {
        const emptyText = "No notable changes.";
        return {
          language,
          text: emptyText,
          chars: countChars(emptyText),
          limit: PLAY_STORE_LIMIT,
          status: "empty",
        };
      }
      const chars = countChars(sourceText);
      const status: LocaleEntry["status"] = chars > PLAY_STORE_LIMIT ? "over" : "ok";
      if (status === "over") overflows.push(language);
      const text = status === "over" ? truncateToLimit(sourceText, PLAY_STORE_LIMIT) : sourceText;
      return {
        language,
        text,
        chars,
        limit: PLAY_STORE_LIMIT,
        status,
      };
    }

    return {
      language,
      text: PLACEHOLDER_TEXT,
      chars: countChars(PLACEHOLDER_TEXT),
      limit: PLAY_STORE_LIMIT,
      status: "placeholder",
    };
  });

  return {
    from: g.from,
    to: g.to,
    limit: PLAY_STORE_LIMIT,
    sourceLanguage,
    locales: entries,
    overflows,
  };
}

export function renderPlayStoreMd(bundle: LocaleBundle): string {
  const lines: string[] = [];
  lines.push(`# Play Store release notes (${bundle.from} → ${bundle.to})`);
  lines.push("");
  for (const entry of bundle.locales) {
    let heading: string;
    if (entry.status === "placeholder") {
      heading = `## ${entry.language} (needs translation)`;
    } else if (entry.status === "empty") {
      heading = `## ${entry.language} (empty)`;
    } else {
      const suffix = entry.status === "over" ? ` ⚠ truncated` : "";
      heading = `## ${entry.language} (${entry.chars}/${entry.limit})${suffix}`;
    }
    lines.push(heading);
    lines.push(entry.text);
    lines.push("");
  }
  lines.push("## Summary");
  for (const entry of bundle.locales) {
    if (entry.status === "placeholder") {
      lines.push(`- ${entry.language}: placeholder`);
    } else if (entry.status === "empty") {
      lines.push(`- ${entry.language}: empty`);
    } else {
      const mark = entry.status === "over" ? "✗ over limit" : "✓";
      lines.push(`- ${entry.language}: ${entry.chars}/${entry.limit} ${mark}`);
    }
  }
  return lines.join("\n");
}

export function renderPlayStoreJson(bundle: LocaleBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function renderPlayStorePrompt(bundle: LocaleBundle, g: GeneratedChangelog): string {
  const source = bundle.locales.find((e) => e.language === bundle.sourceLanguage);
  const targets = bundle.locales.filter((e) => e.language !== bundle.sourceLanguage);

  const lines: string[] = [];
  lines.push(`You are translating Play Store "What's new" release notes from ${bundle.sourceLanguage}.`);
  lines.push("");
  lines.push("TARGETS:");
  for (const t of targets) lines.push(`  - ${t.language}`);
  if (targets.length === 0) lines.push("  (none — source-only bundle)");
  lines.push("");
  lines.push("CONSTRAINTS:");
  lines.push(`- Each translation MUST be ≤ ${bundle.limit} Unicode code points`);
  lines.push("- Preserve the bullet format (one item per line, starts with \"- \")");
  lines.push("- Keep a user-facing tone (no internal jargon)");
  lines.push("- Do not translate technical names (package names, CLI flags, \"GPC\")");
  lines.push("- Drop the conventional-commit prefix (feat:/fix:) if it feels unnatural in the target language");
  lines.push("");
  lines.push(`SOURCE (${bundle.sourceLanguage}, ${source?.chars ?? 0}/${bundle.limit} chars):`);
  lines.push("```");
  lines.push(source?.text ?? "(empty)");
  lines.push("```");
  lines.push("");

  if (g.headlineCandidates.length > 0) {
    lines.push("CONTEXT (clusters, for theme awareness):");
    for (const c of g.headlineCandidates) {
      lines.push(`  - ${c.label} (${c.commits.length} commits, primary ${c.primaryType})`);
    }
    lines.push("");
  }

  lines.push("OUTPUT FORMAT (one heading + body per target language):");
  lines.push("```markdown");
  for (const t of targets) {
    lines.push(`## ${t.language}`);
    lines.push("<translation>");
    lines.push("");
  }
  if (targets.length === 0) {
    lines.push("(no target locales — nothing to translate)");
  }
  lines.push("```");
  return lines.join("\n");
}

export function renderPlayStore(
  g: GeneratedChangelog,
  opts: PlayStoreRenderOptions,
): { output: string; bundle: LocaleBundle } {
  const bundle = buildLocaleBundle(g, opts);
  switch (opts.format) {
    case "md":
      return { output: renderPlayStoreMd(bundle), bundle };
    case "json":
      return { output: renderPlayStoreJson(bundle), bundle };
    case "prompt":
      return { output: renderPlayStorePrompt(bundle, g), bundle };
  }
}
