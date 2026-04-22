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

Full guide for the generator: [Generating Release Notes](/guide/changelog-generation). For Play Store per-locale output via --target play-store, see [Multilingual Release Notes](/guide/multilingual-release-notes).

## Commands

| Command                                     | Description                           |
| ------------------------------------------- | ------------------------------------- |
| [`changelog`](#changelog)                   | Show release history from GitHub      |
| [`changelog generate`](#changelog-generate) | Generate notes from local git commits |

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
v0.9.63      2026-04-20   AI translation via --ai
v0.9.62      2026-04-17   Multilingual Play Store release notes
v0.9.61      2026-04-16   Smarter Changelog Generation
v0.9.60      2026-04-15   Smarter Tab-Completion
v0.9.59      2026-04-14   hotfix LMK metric set name
```

#### Show details for a specific version

```bash
gpc changelog --tag v0.9.63
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

| Option                  | Description                                                                               | Default              |
| ----------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| `--from <ref>`          | Starting git ref (tag, branch, or commit)                                                 | latest `v*` tag      |
| `--to <ref>`            | Ending git ref                                                                            | `HEAD`               |
| `--format <mode>`       | Renderer: `md`, `json`, or `prompt`                                                       | `md`                 |
| `--repo <owner/name>`   | Override auto-detected repo (e.g., `yasserstudio/gpc`)                                    | parsed from `origin` |
| `--target <mode>`       | Output target: `github` or `play-store`                                                   | `github`             |
| `--locales <csv\|auto>` | BCP 47 locales (play-store target only)                                                   | —                    |
| `--ai`                  | Translate non-source locales via LLM (play-store target only, BYO key)                    | `false`              |
| `--provider <name>`     | AI provider: `anthropic`, `openai`, or `google`                                           | auto-detect          |
| `--model <id>`          | Override per-provider model default                                                       | per-provider         |
| `--apply`               | Write notes into the draft release on `--track` (play-store target only)                  | `false`              |
| `--track <name>`        | Play Store track for `--apply`                                                            | `production`         |
| `--strict`              | Exit non-zero on linter warnings, locale overflows, or (with `--ai`) translation failures | `false`              |

Global `--dry-run` (from the root program) combined with `--ai` prints the prompt that would be sent per locale, without calling the LLM. Combined with `--apply`, it previews the release notes payload without writing to the Play Store.

### Examples

#### Default — markdown for the next release

```bash
gpc changelog generate
```

```markdown
## What's Changed

- feat: AI-assisted Play Store translation via --ai
- feat: Gateway-primary routing via Vercel AI Gateway when AI_GATEWAY_API_KEY is set
- feat: structured error-reason classification for failed translations
- release: v0.9.63 — AI translation: commit to translated Play Store notes in one flag

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.62...v0.9.63
```

#### One-command release

```bash
gpc changelog generate | gh release create v1.2.3 -F -
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
- For Play Store per-locale `recentChanges[]`, use `--target play-store --locales <csv|auto>`. See [Multilingual Release Notes](/guide/multilingual-release-notes) for the full walkthrough.

### Play Store target

Emit per-locale "What's new" text for Play Console. The en-US source is the same set of bullets as the `github` target, truncated to 500 Unicode code points per Play's limit. Non-source locales are translated via your own LLM key when you pass `--ai`, or left as a `[needs translation]` placeholder for the offline prompt workflow.

```bash
# Translate non-source locales via your own LLM key
gpc changelog generate --target play-store --locales auto --ai

# Explicit provider + model
gpc changelog generate --target play-store --locales auto --ai \
  --provider anthropic --model claude-opus-4-7

# Explicit locale list, no AI — placeholder text for non-source locales
gpc changelog generate --target play-store --locales en-US,fr-FR,de-DE

# Read locales from your live Play Store listing
gpc changelog generate --target play-store --locales auto --app com.example.app

# Preview the prompt that would be sent, no API call, zero tokens
gpc --dry-run changelog generate --target play-store --locales auto --ai

# Emit a translation-ready LLM prompt (paste into your LLM of choice)
gpc changelog generate --target play-store --locales en-US,fr-FR,de-DE --format prompt

# Fail CI if any locale overflows 500 chars OR fails to translate
gpc changelog generate --target play-store --locales auto --ai --strict
```

AI translation auto-detects whichever provider key is set, in priority order: `AI_GATEWAY_API_KEY` → `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → `GOOGLE_GENERATIVE_AI_API_KEY`. See [Multilingual Release Notes](/guide/multilingual-release-notes#ai-translation) for the full `--ai` workflow.

### Writing notes into a draft release

Use `--apply` to write the generated release notes directly into a draft release on the Play Store. This is the final step in the one-command workflow:

```bash
# One command: git log to translated Play Store release notes, written into draft
gpc changelog generate --target play-store --locales auto --ai --apply

# Write to a specific track (default: production)
gpc changelog generate --target play-store --locales auto --ai --apply --track beta

# Preview what would be written, no API call
gpc --dry-run changelog generate --target play-store --locales auto --ai --apply
```

Requirements:

- `--apply` requires `--target play-store` (exits 2 otherwise)
- `--apply` cannot be combined with `--format prompt` (exits 2)
- A draft release must exist on the target track. Upload an AAB first (`gpc releases upload`) to create one.
- Locales with `placeholder` or `failed` status are blocked from apply. With `--ai`, all non-source locales must translate successfully.
- `--apply` uses the same edit-lifecycle pattern as other GPC commands: insert edit, update track, validate, commit. On 409 Conflict, it retries with a fresh edit.

### Exit codes

| Code | Meaning                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------- |
| `0`  | Success                                                                                                  |
| `1`  | `--strict` enabled and linter warnings, locale overflows, or (with `--ai`) translation failures occurred |
| `2`  | Invalid `--format` / `--target` / `--repo` / `--locales` / `--provider` / `--model` value or combination |
| `3`  | `--ai` passed but no provider credentials found in env                                                   |
| `4`  | API error (e.g., no draft release on track when using `--apply`)                                         |

## Related

- [Generating Release Notes](/guide/changelog-generation) — full feature guide
- [GitHub Release Notes Template](/advanced/conventions#github-release-notes-template) — the template this command targets
- [`gpc publish`](/commands/publish) — end-to-end upload + release workflow
- [Multilingual Release Notes](/guide/multilingual-release-notes) — per-locale Play Store output + AI translation + `--apply`
- [`gpc releases create`](/commands/releases) — Play Console release creation
