import type { Command } from "commander";
import * as cp from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderMarkdown, formatSearchResult } from "../docs-renderer.js";
import { bold, dim } from "../colors.js";
import { getOutputFormat } from "../format.js";
import { loadConfig } from "@gpc-cli/config";
import { formatOutput, GpcError } from "@gpc-cli/core";
import type { DocPage, DocsBundle } from "../generated/docs-types.js";

let _bundle: DocsBundle | undefined;
let _pageMap: Map<string, DocPage> | undefined;

function getBundle(): DocsBundle {
  if (!_bundle) {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    // Works from src/commands/ (dev/test) and dist/ (built output)
    const candidates = [
      join(moduleDir, "..", "generated", "docs-bundle.json"),
      join(moduleDir, "generated", "docs-bundle.json"),
    ];
    const bundlePath = candidates.find((p) => existsSync(p));
    if (!bundlePath) {
      throw new GpcError(
        "Embedded docs bundle not found. Run the build first.",
        "DOCS_BUNDLE_MISSING",
        1,
        "Run: pnpm build --filter @gpc-cli/cli",
      );
    }
    _bundle = JSON.parse(readFileSync(bundlePath, "utf-8")) as DocsBundle;
  }
  return _bundle;
}

function getPageMap(): Map<string, DocPage> {
  if (!_pageMap) {
    const bundle = getBundle();
    _pageMap = new Map<string, DocPage>();
    for (const page of bundle.pages) {
      _pageMap.set(page.slug, page);
    }
  }
  return _pageMap;
}

function fuzzyMatch(query: string, pages: DocPage[]): DocPage | undefined {
  const q = query.toLowerCase();
  // Exact full slug match (e.g., "guide/authentication")
  const exact = pages.find((p) => p.slug === q);
  if (exact) return exact;
  // Match on the filename part (e.g., "authentication" matches "guide/authentication")
  const byName = pages.find((p) => p.slug.endsWith(`/${q}`));
  if (byName) return byName;
  // Prefix match on filename part
  const prefix = pages.find((p) => {
    const name = p.slug.split("/").pop() || "";
    return name.startsWith(q);
  });
  if (prefix) return prefix;
  // Contains match anywhere in slug
  const contains = pages.find((p) => p.slug.includes(q));
  if (contains) return contains;
  // Title match
  const titleMatch = pages.find((p) => p.title.toLowerCase().includes(q));
  if (titleMatch) return titleMatch;
  return undefined;
}

function searchPages(
  query: string,
  bundle: DocsBundle,
): { page: DocPage; score: number; snippet: string }[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return [];

  const pageMap = getPageMap();
  const scores = new Map<string, number>();
  for (const word of words) {
    const entries = bundle.searchIndex[word];
    if (!entries) continue;
    for (const entry of entries) {
      scores.set(entry.slug, (scores.get(entry.slug) || 0) + entry.score);
    }
  }

  const results: { page: DocPage; score: number; snippet: string }[] = [];
  for (const [slug, score] of scores) {
    const page = pageMap.get(slug);
    if (!page) continue;
    const snippet = extractSnippet(page.content, words);
    results.push({ page, score, snippet });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 15);
}

function extractSnippet(content: string, words: string[]): string {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i]!.toLowerCase();
    if (words.some((w) => lower.includes(w))) {
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + 2);
      return lines.slice(start, end).join("\n");
    }
  }
  return lines.slice(0, 3).join("\n");
}

const DOCS_BASE = "https://yasserstudio.github.io/gpc/";

function openInBrowser(url: string): void {
  const platform = process.platform;
  if (platform === "win32") {
    cp.exec(`start "" "${url}"`, (error) => {
      if (error) console.log(`Open in your browser: ${url}`);
    });
  } else {
    const cmd = platform === "darwin" ? "open" : "xdg-open";
    cp.execFile(cmd, [url], (error) => {
      if (error) console.log(`Open in your browser: ${url}`);
    });
  }
}

export function registerDocsCommand(program: Command): void {
  const docs = program
    .command("docs")
    .description("Access embedded documentation (list, show, search, init, web)");

  docs
    .command("list")
    .description("List all available documentation topics")
    .action(async () => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      const bundle = getBundle();

      if (format === "json") {
        const data = bundle.pages.map((p) => ({
          slug: p.slug,
          section: p.section,
          title: p.title,
          description: p.description,
        }));
        console.log(formatOutput(data, "json"));
        return;
      }

      const bySection = new Map<string, DocPage[]>();
      for (const page of bundle.pages) {
        if (!bySection.has(page.section)) bySection.set(page.section, []);
        bySection.get(page.section)!.push(page);
      }

      for (const [section, pages] of bySection) {
        console.log(bold(`\n  ${section.toUpperCase()}`));
        for (const page of pages) {
          const label = page.slug.padEnd(36);
          console.log(`  ${label} ${dim(page.title || page.slug)}`);
        }
      }
      console.log("");
      console.log(dim(`  ${bundle.pageCount} topics. Use: gpc docs show <topic>`));
    });

  docs
    .command("show <topic>")
    .description("Show a documentation page in the terminal")
    .action(async (topic: string) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      const bundle = getBundle();

      const page = fuzzyMatch(topic, bundle.pages);
      if (!page) {
        const suggestions = bundle.pages
          .filter((p) => p.slug.includes(topic.toLowerCase().slice(0, 3)))
          .slice(0, 5)
          .map((p) => p.slug);

        throw new GpcError(
          `No documentation found for "${topic}"`,
          "DOCS_NOT_FOUND",
          2,
          suggestions.length > 0
            ? `Did you mean: ${suggestions.join(", ")}?\nRun: gpc docs list`
            : "Run: gpc docs list",
        );
      }

      if (format === "json") {
        console.log(
          formatOutput(
            { slug: page.slug, section: page.section, title: page.title, content: page.content },
            "json",
          ),
        );
        return;
      }

      console.log(renderMarkdown(page.content));
    });

  docs
    .command("search <query>")
    .description("Search documentation")
    .action(async (query: string) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      const bundle = getBundle();

      const results = searchPages(query, bundle);

      if (results.length === 0) {
        console.log(dim(`  No results for "${query}".`));
        console.log(dim("  Try a different search term, or: gpc docs list"));
        return;
      }

      if (format === "json") {
        const data = results.map((r) => ({
          slug: r.page.slug,
          section: r.page.section,
          title: r.page.title,
          score: r.score,
        }));
        console.log(formatOutput(data, "json"));
        return;
      }

      console.log(bold(`\n  Search results for "${query}"\n`));
      for (const r of results) {
        console.log(
          "  " +
            formatSearchResult(r.page.slug, r.page.title, r.snippet, r.score),
        );
        console.log("");
      }
      console.log(dim(`  ${results.length} result${results.length === 1 ? "" : "s"}. Use: gpc docs show <topic>`));
    });

  docs
    .command("init")
    .description("Create GPC.md quick-reference for AI agents in this directory")
    .option("--force", "Overwrite existing GPC.md")
    .option("--path <dir>", "Output directory", ".")
    .action(async (opts: { force?: boolean; path: string }) => {
      const outDir = opts.path;
      const outFile = join(outDir, "GPC.md");

      if (existsSync(outFile) && !opts.force) {
        throw new GpcError(
          `GPC.md already exists at ${outFile}`,
          "DOCS_INIT_EXISTS",
          1,
          "Use --force to overwrite.",
        );
      }

      const bundle = getBundle();
      const content = generateQuickReference(bundle);
      await writeFile(outFile, content, "utf-8");
      console.log(`Created ${outFile} (${bundle.pageCount} topics indexed)`);

      for (const agentFile of ["CLAUDE.md", "AGENTS.md"]) {
        const agentPath = join(outDir, agentFile);
        if (existsSync(agentPath)) {
          const existing = await readFile(agentPath, "utf-8");
          if (!existing.includes("GPC.md")) {
            const separator = existing.endsWith("\n") ? "\n" : "\n\n";
            await writeFile(agentPath, existing + separator + "See also: @GPC.md for GPC CLI reference.\n", "utf-8");
            console.log(`Updated ${agentPath} (added @GPC.md reference)`);
          }
        }
      }
    });

  docs
    .command("web [topic]")
    .description("Open documentation in browser")
    .action((topic?: string) => {
      const bundle = getBundle();
      if (!topic) {
        openInBrowser(DOCS_BASE);
        return;
      }
      const page = fuzzyMatch(topic, bundle.pages);
      if (page) {
        openInBrowser(`${DOCS_BASE}${page.slug}`);
      } else {
        openInBrowser(DOCS_BASE);
        console.log(dim(`Topic "${topic}" not found. Opened docs home page.`));
      }
    });
}

function generateQuickReference(bundle: DocsBundle): string {
  const lines: string[] = [
    "# GPC Quick Reference",
    "",
    "> Auto-generated by `gpc docs init`. See full docs: https://yasserstudio.github.io/gpc/",
    "",
    "## Commands",
    "",
  ];

  const commandPages = bundle.pages
    .filter((p) => p.section === "commands")
    .sort((a, b) => a.slug.localeCompare(b.slug));

  for (const page of commandPages) {
    const desc = page.description || page.title;
    lines.push(`- **gpc ${page.slug}** -- ${desc}`);
  }

  lines.push("", "## Guides", "");

  const guidePages = bundle.pages
    .filter((p) => p.section === "guide")
    .sort((a, b) => a.slug.localeCompare(b.slug));

  for (const page of guidePages) {
    lines.push(`- **${page.title || page.slug}** -- \`gpc docs show ${page.slug}\``);
  }

  lines.push(
    "",
    "## Quick Workflows",
    "",
    "```bash",
    "# Upload and publish",
    "gpc publish app.aab",
    "",
    "# Check vitals before release",
    "gpc preflight app.aab",
    "",
    "# Generate changelog with AI translation",
    "gpc changelog generate --target play-store --locales auto --ai",
    "",
    "# Staged rollout",
    "gpc releases rollout --fraction 0.1 --app com.example.app",
    "```",
    "",
    `*${bundle.pageCount} docs pages available offline via \`gpc docs show <topic>\`*`,
    "",
  );

  return lines.join("\n");
}
