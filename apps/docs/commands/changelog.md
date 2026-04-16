---
outline: deep
---

<CommandHeader
  name="gpc changelog"
  description="View release history and generate release notes from git."
  usage="gpc changelog [subcommand] [options]"
  :badges="['--json', 'no auth required']"
/>

## Overview

Two modes:

- **`gpc changelog`** — fetches published release notes from GitHub Releases (read-only, no auth)
- **`gpc changelog generate`** — produces release notes from your local git log, ready to paste into `gh release create -F -`

Full guide for the generator: [Generating Release Notes](/guide/changelog-generation).

## Commands

| Command                                       | Description                                  |
| --------------------------------------------- | -------------------------------------------- |
| [`changelog`](#changelog)                     | Show release history from GitHub             |
| [`changelog generate`](#changelog-generate)   | Generate notes from local git commits        |

---

## `changelog`

Fetches release notes from GitHub and displays them in your terminal. No authentication required — uses the public GitHub Releases API.

### Synopsis

```bash
gpc changelog [options]
```

### Options

| Option              | Description                               | Default |
| ------------------- | ----------------------------------------- | ------- |
| `-n, --limit <n>`   | Number of releases to show                | `5`     |
| `--tag <tag>`       | Show a specific version (e.g., `v0.9.43`) | —       |
| `--all`             | Show all releases                         | —       |
| `-o, --output json` | JSON output                               | table   |

### Examples

#### List recent releases

```bash
gpc changelog
```

```
VERSION      DATE         TITLE
─────────────────────────────────────────────
v0.9.61      2026-04-16   Smarter Changelog Generation
v0.9.60      2026-04-15   Smarter Tab-Completion
v0.9.59      2026-04-14   hotfix LMK metric set name
v0.9.58      2026-04-14   QoL & Discoverability
v0.9.57      2026-04-13   API fixes + type completeness
```

#### Show details for a specific version

```bash
gpc changelog --tag v0.9.61
```

#### JSON output for CI

```bash
gpc changelog --limit 3 --output json
```

#### Show all releases

```bash
gpc changelog --all
```

### Notes

- Uses the public GitHub Releases API (no auth needed)
- Rate limit: 60 requests per hour (unauthenticated)
- Falls back to a docs URL link on network error
- Only shows releases with `v*` tags (matches GPC's versioning)

---

## `changelog generate`

Generate release notes from your local git log. Clusters related commits, lints against project voice, and emits one of three output formats. Pairs naturally with `gh release create -F -`.

For the full feature walkthrough — clustering, headline scoring, jargon linter, prompt-mode LLM workflow — see the [Generating Release Notes guide](/guide/changelog-generation).

### Synopsis

```bash
gpc changelog generate [options]
```

### Options

| Option                  | Description                                                | Default                |
| ----------------------- | ---------------------------------------------------------- | ---------------------- |
| `--from <ref>`          | Starting git ref (tag, branch, or commit)                  | latest `v*` tag        |
| `--to <ref>`            | Ending git ref                                             | `HEAD`                 |
| `--format <mode>`       | Renderer: `md`, `json`, or `prompt`                        | `md`                   |
| `--repo <owner/name>`   | Override auto-detected repo (e.g., `yasserstudio/gpc`)     | parsed from `origin`   |
| `--strict`              | Exit non-zero if linter warnings are emitted               | `false`                |

### Examples

#### Default — markdown for the next release

```bash
gpc changelog generate
```

```markdown
## What's Changed

- feat: shell completion walker
- fix: pre-release code review follow-ups for completion v2
- docs: sync Tests badge to 1,914
- release: v0.9.60 — Smarter Tab-Completion

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.59...v0.9.60
```

#### One-command release

```bash
gpc changelog generate | gh release create v0.9.61 -F -
```

#### LLM-prompt mode

```bash
gpc changelog generate --format prompt | pbcopy
```

Paste into Claude or ChatGPT, ask for the polished narrative, then publish.

#### JSON for CI tooling

```bash
gpc changelog generate --format json | jq '.headlineCandidates[0].label'
```

#### Strict mode in CI

```bash
gpc changelog generate --strict
```

Exits 1 if any commit subject contains internal jargon (`mutex`, `token bucket`, `homedir`, etc.). Forces voice consistency before tagging.

#### Custom range — feature branch preview

```bash
gpc changelog generate --from main --to my-feature-branch
```

### Notes

- Default `--from` resolves via `git describe --tags --match 'v*' --abbrev=0`. If no `v*` tag exists, the command fails with `CHANGELOG_NO_TAG` and a clear suggestion.
- Both `--from` and `--to` are pre-validated with `git rev-parse --verify <ref>^{commit}`.
- `--no-merges` is applied to `git log` so squash-PR repos don't double-count.
- Filters out `chore`, `refactor`, `test`, `build`, `style`, `merge` types from visible output (kept in JSON `commits[]` for tooling).
- Conventional-commit scopes (`feat(cli):`) are dropped per project convention; a one-time scope-leak warning fires per generation.
- Newlines in commit subjects are stripped to prevent injection into pasted release notes.
- For Play Store per-locale `recentChanges[]`, see [`gpc publish --notes-from-git`](/commands/publish) and [`gpc releases create --notes-from-git`](/commands/releases) — different format, different consumer. Per-locale Play Store output ships as `--target play-store` in a follow-up release.

### Exit codes

| Code | Meaning                                                              |
| ---- | -------------------------------------------------------------------- |
| `0`  | Success (default mode)                                               |
| `1`  | `--strict` enabled and linter warnings were emitted                  |
| `2`  | Invalid `--format` or `--repo` value                                 |

## Related

- [Generating Release Notes](/guide/changelog-generation) — full feature guide
- [GitHub Release Notes Template](/advanced/conventions#github-release-notes-template) — the template this command targets
- [`gpc publish`](/commands/publish) — end-to-end upload + release workflow
- [`gpc releases create`](/commands/releases) — Play Console release creation
