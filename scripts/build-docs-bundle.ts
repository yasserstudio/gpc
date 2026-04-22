/**
 * Build-time script: converts apps/docs/*.md into a JSON bundle
 * that the CLI embeds for offline `gpc docs show/search/list`.
 *
 * Run: tsx scripts/build-docs-bundle.ts
 * Output: packages/cli/src/generated/docs-bundle.json
 */
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "..", "apps", "docs");
const OUT_DIR = join(__dirname, "..", "packages", "cli", "src", "generated");
const OUT_FILE = join(OUT_DIR, "docs-bundle.json");

interface DocPage {
  slug: string;
  section: string;
  title: string;
  description: string;
  content: string;
}

interface SearchEntry {
  slug: string;
  score: number;
}

interface DocsBundle {
  generatedAt: string;
  pageCount: number;
  pages: DocPage[];
  searchIndex: Record<string, SearchEntry[]>;
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".vitepress") {
      results.push(...(await findMarkdownFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

// Single-line key: value only; multi-line YAML values and colons inside values are not supported.
function stripFrontmatter(raw: string): { content: string; meta: Record<string, string> } {
  const meta: Record<string, string> = {};
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { content: raw, meta };

  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key && val) meta[key] = val;
    }
  }
  return { content: raw.slice(match[0].length), meta };
}

function stripVueSyntax(content: string): string {
  // Convert CommandHeader into a markdown heading before stripping
  let result = content.replace(
    /<CommandHeader[\s\S]*?name="([^"]*)"[\s\S]*?(?:\/>|<\/CommandHeader>)/g,
    (_, name) => `# ${name}`,
  );
  // Remove known multi-line Vue components
  result = result.replace(
    /<(?:TerminalDemo|TerminalOutput|CopyForAI|Badge)[\s\S]*?(?:\/>|<\/(?:TerminalDemo|TerminalOutput|CopyForAI|Badge)>)/g,
    "",
  );
  // Catch-all: strip any remaining PascalCase self-closing or paired Vue components
  result = result.replace(/<[A-Z][A-Za-z]*[\s\S]*?(?:\/>|<\/[A-Z][A-Za-z]*>)/g, "");

  // Convert ::: containers to markdown blockquotes
  result = result.replace(
    /^:::\s*(tip|warning|danger|info|details)\s*(.*)?$/gm,
    (_, type, label) => {
      const prefix =
        type === "tip"
          ? "Tip"
          : type === "warning"
            ? "Warning"
            : type === "danger"
              ? "Danger"
              : type === "info"
                ? "Info"
                : "Details";
      return `> **${label?.trim() || prefix}:**`;
    },
  );
  result = result.replace(/^:::$/gm, "");

  // Collapse excessive blank lines
  result = result.replace(/\n{4,}/g, "\n\n\n");

  return result.trim();
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function buildSlug(filePath: string, docsRoot: string): { slug: string; section: string } {
  const rel = relative(docsRoot, filePath).replace(/\.md$/, "");
  const parts = rel.split("/");
  if (parts.length === 1) {
    return { slug: parts[0], section: "root" };
  }
  // Use section/filename as slug to avoid collisions (e.g., guide/index vs commands/index)
  return { slug: `${parts[0]}/${parts[parts.length - 1]}`, section: parts[0] };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function buildSearchIndex(pages: DocPage[]): Record<string, SearchEntry[]> {
  const index = new Map<string, SearchEntry[]>();

  for (const page of pages) {
    const titleTokens = tokenize(page.title);
    const contentTokens = tokenize(page.content);
    const seen = new Set<string>();

    for (const word of titleTokens) {
      if (!seen.has(word)) {
        seen.add(word);
        if (!index.has(word)) index.set(word, []);
        index.get(word)!.push({ slug: page.slug, score: 10 });
      }
    }

    const wordFreq = new Map<string, number>();
    for (const word of contentTokens) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    for (const [word, freq] of wordFreq) {
      if (!seen.has(word)) {
        seen.add(word);
        if (!index.has(word)) index.set(word, []);
        index.get(word)!.push({ slug: page.slug, score: Math.min(freq, 5) });
      }
    }
  }

  const result: Record<string, SearchEntry[]> = {};
  for (const [word, entries] of index) {
    entries.sort((a, b) => b.score - a.score);
    result[word] = entries.slice(0, 10);
  }
  return result;
}

async function main() {
  const files = await findMarkdownFiles(DOCS_ROOT);
  const pages: DocPage[] = [];

  for (const file of files.sort()) {
    const raw = await readFile(file, "utf-8");
    const { content: stripped, meta } = stripFrontmatter(raw);
    const content = stripVueSyntax(stripped);
    const title = extractTitle(content) || meta["title"] || basename(file, ".md");
    const description = meta["description"] || "";
    const { slug, section } = buildSlug(file, DOCS_ROOT);

    // Skip the home page (hero layout, not useful as CLI docs)
    if (slug === "index" && section === "root") continue;

    pages.push({ slug, section, title, description, content });
  }

  const searchIndex = buildSearchIndex(pages);

  const bundle: DocsBundle = {
    generatedAt: new Date().toISOString(),
    pageCount: pages.length,
    pages,
    searchIndex,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const json = JSON.stringify(bundle);
  await writeFile(OUT_FILE, json, "utf-8");

  const sizeKb = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(
    `docs-bundle.json: ${pages.length} pages, ${sizeKb} KB, ${Object.keys(searchIndex).length} index terms`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
