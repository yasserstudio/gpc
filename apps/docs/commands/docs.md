---
outline: deep
---

<CommandHeader
  name="gpc docs"
  description="Access embedded documentation offline in the terminal."
  usage="gpc docs <subcommand> [options]"
  :badges="['no auth required', 'offline']"
/>

## Overview

GPC embeds all documentation from the VitePress site into the CLI binary. Every guide, command reference, and tutorial is available offline via `gpc docs`. No network, no browser, no API keys.

Five subcommands:

| Command                         | Description                                        |
| ------------------------------- | -------------------------------------------------- |
| [`docs list`](#docs-list)       | List all available documentation topics             |
| [`docs show`](#docs-show)       | Show a documentation page in the terminal           |
| [`docs search`](#docs-search)   | Full-text search across all documentation           |
| [`docs init`](#docs-init)       | Create GPC.md quick-reference for AI agents         |
| [`docs web`](#docs-web)         | Open documentation in your browser                  |

---

## `docs list`

List all embedded documentation topics, grouped by section.

### Synopsis

```bash
gpc docs list
```

### Examples

```bash
# List all topics
gpc docs list

# JSON output for tooling
gpc docs list --output json
```

Output:

```
  COMMANDS
  commands/releases                    Releases
  commands/publish                     Publish
  commands/changelog                   Changelog
  ...

  GUIDE
  guide/authentication                 Authentication
  guide/configuration                  Configuration
  ...

  99 topics. Use: gpc docs show <topic>
```

JSON output returns an array of `{ slug, section, title, description }` objects.

---

## `docs show`

Render a documentation page in the terminal with ANSI formatting. Headers, code blocks, tables, and inline formatting are all rendered.

### Synopsis

```bash
gpc docs show <topic>
```

### Fuzzy matching

You don't need to type the full slug. GPC resolves your input in order:

1. Exact slug match (`guide/authentication`)
2. Filename match (`authentication` finds `guide/authentication`)
3. Prefix match (`auth` finds `guide/authentication`)
4. Contains match anywhere in slug
5. Title match

### Examples

```bash
# Full slug
gpc docs show guide/authentication

# Short name (fuzzy match)
gpc docs show auth

# JSON output
gpc docs show releases --output json
```

If the topic isn't found, GPC suggests similar topics.

---

## `docs search`

Full-text search across all embedded documentation. Results are ranked by relevance using a build-time inverted index.

### Synopsis

```bash
gpc docs search <query>
```

### Examples

```bash
# Search for rollout-related docs
gpc docs search "staged rollout"

# JSON output
gpc docs search authentication --output json
```

Output shows matching pages with a relevance score and a context snippet:

```
  Search results for "staged rollout"

  commands/releases (score: 15)
    Releases
      ...increase the rollout percentage with --fraction...

  guide/ci-cd (score: 8)
    CI/CD Integration
      ...staged rollout gate checks vitals before promoting...

  2 results. Use: gpc docs show <topic>
```

JSON output returns an array of `{ slug, section, title, score }` objects.

---

## `docs init`

Generate a `GPC.md` quick-reference file in the current directory. This file gives AI coding agents (Claude Code, Codex, Cursor) a compact summary of GPC commands and workflows without requiring network access or reading the full docs.

### Synopsis

```bash
gpc docs init [options]
```

### Options

| Option          | Description                    | Default |
| --------------- | ------------------------------ | ------- |
| `--force`       | Overwrite existing GPC.md      | —       |
| `--path <dir>`  | Output directory               | `.`     |

### Examples

```bash
# Create GPC.md in the current directory
gpc docs init

# Overwrite an existing GPC.md
gpc docs init --force

# Write to a specific directory
gpc docs init --path ./my-project
```

If `CLAUDE.md` or `AGENTS.md` exists in the target directory, GPC appends a `See also: @GPC.md` reference to them automatically.

---

## `docs web`

Open the documentation website in your default browser. Preserves the original `gpc docs` behavior from before v0.9.64.

### Synopsis

```bash
gpc docs web [topic]
```

### Examples

```bash
# Open the docs home page
gpc docs web

# Open a specific topic
gpc docs web releases
```

If the topic isn't found, the home page opens with a message.

---

## How it works

At build time, GPC reads all markdown files from `apps/docs/`, strips VitePress frontmatter and Vue components, builds an inverted search index, and emits a single `docs-bundle.json` embedded in the CLI binary. No runtime file reads, no network calls.

The terminal renderer uses GPC's built-in ANSI color utilities (no external dependencies) to format headers, code blocks, tables, blockquotes, bold text, inline code, and links.

## Related

- [GPC Documentation Site](https://yasserstudio.github.io/gpc/) -- the full browsable docs
- [`gpc help`](/commands/utility#help) -- inline help for any command
