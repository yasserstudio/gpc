#!/usr/bin/env node
// Checks that every `gpc ...` command shown in the docs and READMEs exists:
// each subcommand path and each flag must resolve in the real Commander tree.
// Needs the CLI built first (packages/cli/dist). Exits 1 on any finding.
// The docs once carried 105 commands and flags that did not exist; this keeps
// them from drifting again. Run: node scripts/validate-doc-commands.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { createProgram } = await import(join(ROOT, "packages/cli/dist/index.js"));
const program = await createProgram();

// ---------- command tree ----------
function flagNames(cmd) {
  const set = new Set();
  for (const o of cmd.options ?? []) {
    if (o.long) set.add(o.long);
    if (o.short) set.add(o.short);
    // --no-x options: Commander stores long as --no-x; also accept --x
    if (o.long?.startsWith("--no-")) set.add("--" + o.long.slice(5));
  }
  set.add("--help");
  set.add("-h");
  return set;
}

function hasFlag(chain, flag) {
  return chain.some((c) => flagNames(c).has(flag));
}

function expectsValue(chain, flag) {
  for (const c of chain) {
    for (const o of c.options ?? []) {
      if (o.long === flag || o.short === flag) return !!(o.required || o.optional);
    }
  }
  return false;
}

// ---------- file collection ----------
const FILES = [];
function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === "dist" || e === ".vitepress") continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (e.endsWith(".md")) FILES.push(p);
  }
}
walk(join(ROOT, "apps/docs"));
FILES.push(join(ROOT, "README.md"));
for (const pkg of readdirSync(join(ROOT, "packages"))) {
  const p = join(ROOT, "packages", pkg, "README.md");
  try {
    if (statSync(p).isFile()) FILES.push(p);
  } catch {}
}
const SKIP = new Set([join(ROOT, "CHANGELOG.md"), join(ROOT, "apps/docs/reference/changelog.md")]);

// ---------- extraction ----------
const FENCE_LANGS = /^(bash|sh|shell|zsh|console|yaml|yml)\b/;
const CMD_START = /^(gpc|npx\s+@gpc-cli\/cli)\s/;

function extractFromFile(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const out = []; // {line, lineNo, inline}
  let fence = null; // {lang, char}
  let pending = null; // {text, lineNo}
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    const fm = t.match(/^(`{3,}|~{3,})(.*)$/);
    if (fm) {
      if (fence && t.startsWith(fence.marker) && !fm[2].trim()) {
        fence = null;
        pending = null;
        continue;
      }
      if (!fence) {
        fence = { marker: fm[1], lang: fm[2].trim().toLowerCase() };
        continue;
      }
      continue;
    }
    if (fence) {
      if (!FENCE_LANGS.test(fence.lang)) continue;
      // strip shell prompt, yaml `run:` / `- run:` prefixes, yaml list dashes
      let s = t
        .replace(/^\$\s+/, "")
        .replace(/^-\s+/, "")
        .replace(/^run:\s*\|?-?\s*/, "")
        .replace(/^#.*/, "");
      if (pending) {
        pending.text += " " + t.replace(/\\$/, "").trim();
        if (!t.endsWith("\\")) {
          out.push({ line: pending.text, lineNo: pending.lineNo });
          pending = null;
        } else {
          pending.text = pending.text.replace(/\\$/, "").trim();
        }
        continue;
      }
      if (CMD_START.test(s)) {
        if (s.endsWith("\\")) {
          pending = { text: s.replace(/\\$/, "").trim(), lineNo: i + 1 };
        } else {
          out.push({ line: s, lineNo: i + 1 });
        }
      }
      continue;
    }
    // prose inline code spans
    for (const m of raw.matchAll(/`([^`\n]+)`/g)) {
      const s = m[1].trim();
      if (CMD_START.test(s)) out.push({ line: s, lineNo: i + 1, inline: true });
    }
  }
  return out;
}

// ---------- tokenizing ----------
function tokenize(line) {
  // drop shell pipelines / redirections / chaining tails
  let s = line.replace(/\$\{\{[^}]*\}\}/g, "PLACEHOLDER");
  const ell = s.indexOf(" ... ");
  if (ell > -1) s = s.slice(0, ell);
  const cut = s.search(/\s(\||&&|\|\||>|>>|;|#)\s|\s#\s/);
  if (cut > -1) s = s.slice(0, cut);
  // strip trailing `2>/dev/null` etc
  s = s.replace(/\s2?>[^\s]*$/, "");
  const toks = [];
  let cur = "";
  let q = null;
  for (const ch of s) {
    if (q) {
      if (ch === q) q = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      q = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) toks.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) toks.push(cur);
  return toks;
}

// ---------- validation ----------
function isPlaceholder(t) {
  return (
    t.includes("<") ||
    t.includes(">") ||
    t.includes("[") ||
    t.includes("]") ||
    t.includes("${") ||
    t.includes("|") ||
    (t.includes("/") && !t.startsWith("-")) ||
    t === "..." ||
    t === "…"
  );
}

const findings = [];
let checked = 0;

for (const file of FILES) {
  if (SKIP.has(file)) continue;
  let cands;
  try {
    cands = extractFromFile(file);
  } catch {
    continue;
  }
  for (const c of cands) {
    let toks = tokenize(c.line);
    // drop the binary prefix
    if (toks[0] === "npx") toks = toks.slice(2);
    else toks = toks.slice(1);
    if (!toks.length) continue;
    // skip template/placeholder command names
    checked++;
    const rel = relative(ROOT, file);
    const loc = `${rel}:${c.lineNo}`;

    // interleaved parse: flags may appear between subcommands
    let cmd = program;
    const chain = [program];
    let positional = false; // once a positional arg is seen, stop descending
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (isPlaceholder(t)) {
        positional = true;
        continue;
      }
      if (t.startsWith("-") && t !== "-" && t !== "--" && !/^-\d/.test(t)) {
        const flag = t.includes("=") ? t.slice(0, t.indexOf("=")) : t;
        if (flag.startsWith("--")) {
          if (hasFlag(chain, flag)) {
            if (expectsValue(chain, flag) && !t.includes("=")) k++;
          } else {
            findings.push({
              loc,
              line: c.line,
              kind: "unknown-flag",
              detail: flag,
              inline: c.inline,
            });
          }
        } else {
          const body = flag.slice(1);
          if (hasFlag(chain, flag)) {
            if (expectsValue(chain, flag) && !t.includes("=")) k++;
          } else if ([...body].every((ch) => hasFlag(chain, "-" + ch))) {
            // valid short cluster of boolean flags
          } else {
            findings.push({
              loc,
              line: c.line,
              kind: "unknown-flag",
              detail: flag,
              inline: c.inline,
            });
          }
        }
        continue;
      }
      // non-flag token
      if (positional) continue;
      if (t === "help") {
        positional = true; // `gpc help [command]` is Commander's implicit help
        continue;
      }
      const next = (cmd.commands ?? []).find(
        (sc) => sc.name() === t || (sc.aliases?.() ?? []).includes(t),
      );
      if (next) {
        cmd = next;
        chain.push(cmd);
        continue;
      }
      const takesArgs = (cmd.registeredArguments ?? cmd._args ?? []).length > 0;
      if (!takesArgs && (cmd.commands ?? []).length > 0) {
        findings.push({
          loc,
          line: c.line,
          kind: "unknown-subcommand",
          detail: t,
          inline: c.inline,
        });
        positional = true; // avoid cascading reports on the same line
        continue;
      }
      positional = true;
    }
  }
}

const onlyFence = process.argv.includes("--fence-only");
const shown = onlyFence ? findings.filter((f) => !f.inline) : findings;
for (const f of shown) {
  console.log(`${f.loc} [${f.kind}${f.inline ? "/inline" : ""}] ${f.detail}\n    ${f.line}`);
}
console.log(
  `\nchecked ${checked} command lines across ${FILES.length - SKIP.size} files; ${shown.length} findings`,
);
if (shown.length > 0) process.exitCode = 1;
