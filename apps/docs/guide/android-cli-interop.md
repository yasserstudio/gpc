# Using GPC with Google's Android CLI

Google [shipped the official Android CLI on 2026-04-16](https://android-developers.googleblog.com/2026/04/build-android-apps-3x-faster-using-any-agent.html). It covers the build-and-device half of Android development. GPC covers the Play Store half. This page documents how to use them together in an agent-driven workflow.

## Scope split

Google's announcement defines the Android CLI's scope explicitly:

> "environment setup, project creation, and device management"

Concretely, the commands shipping today are:

- `android sdk install` — download SDK components
- `android create` — scaffold a project from official templates
- `android emulator` — create and manage virtual devices
- `android run` — build and deploy to a device
- `android update` — update the CLI
- `android docs` — search the Android Knowledge Base
- `android skills` — browse and apply agent skills

What the Android CLI does **not** cover:

- Play Store publishing and releases
- Track management and rollouts
- Store listings, screenshots, and metadata
- Vitals (crash rate, ANR, startup time)
- Reviews and reporting
- Subscriptions, IAP, pricing
- Pre-submission compliance scanning

That entire surface is what GPC handles. 217 typed endpoints across the Android Publisher API, the Play Developer Reporting API, and the Play Custom App Publishing API.

## The handoff

A full agent-driven flow from scaffold to shipped release looks like this:

```bash
# Scaffold a new project (Google's CLI)
android create --template compose-tutorial --name MyApp

# Install SDK components and build
android sdk install --platform 34
android run --device pixel-8

# Before uploading, run offline compliance checks (GPC)
gpc preflight ./app/build/outputs/bundle/release/app-release.aab

# Ship to internal track with 100% rollout (GPC)
gpc releases upload \
  --package com.example.app \
  --track internal \
  --file ./app/build/outputs/bundle/release/app-release.aab \
  --rollout 1.0

# Promote internal → production at 10% once vitals are healthy (GPC)
gpc vitals crashes --package com.example.app --days 7 --json
gpc releases promote --from internal --to production --rollout 0.1
```

The handoff point is deterministic: once you have an AAB on disk, you're in Play Store territory.

## Agent handoff via skills

Google's announcement standardizes `SKILL.md` as the agent-readable instruction format. Modular markdown, auto-triggered from prompt metadata, installable as a skill pack.

GPC has shipped this exact pattern since v0.9.56. Both skill packs install via `npx skills`:

```bash
# Android skills (from Google)
npx skills add android/official-skills

# GPC skills (for the publishing half)
npx skills add yasserstudio/gpc-skills
```

After both are installed, an agent has matching prompt-metadata triggers for every stage of the Android app lifecycle. A prompt like "ship this app to the internal track" routes to `gpc-release-flow`; "check crash rates" routes to `gpc-vitals-monitoring`; "scaffold a new Compose project" routes to Google's Compose skill.

The full GPC skill index:

| Skill                    | Covers                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| `gpc-setup`              | Service account, OAuth, ADC, profiles, `gpc doctor`                 |
| `gpc-onboarding`         | First-run setup and `gpc quickstart` wizard                         |
| `gpc-release-flow`       | Upload, rollout, promote, `gpc publish`, `gpc diff`, `gpc changelog`|
| `gpc-train`              | Automated staged rollout pipeline with crash and ANR gates          |
| `gpc-preflight`          | Offline AAB compliance scanning (9 scanners)                        |
| `gpc-metadata-sync`      | Store listings, images, Fastlane metadata compatibility             |
| `gpc-vitals-monitoring`  | Crashes, ANR, LMK, thresholds, reviews, reports                     |
| `gpc-ci-integration`     | GitHub Actions, GitLab CI, env vars, JSON output                    |
| `gpc-monetization`       | Subscriptions, IAP, RTDN, pricing, analytics                        |
| `gpc-user-management`    | Account users, permissions, grants, testers                         |
| `gpc-migrate-fastlane`   | Fastlane-to-GPC migration with command mapping                      |
| `gpc-plugin-development` | Plugin SDK and lifecycle hooks                                      |
| `gpc-troubleshooting`    | Exit codes, error catalog, debug mode                               |
| `gpc-sdk-usage`          | Standalone TypeScript SDK usage                                     |
| `gpc-multi-app`          | Multiple apps, profiles, batch operations                           |
| `gpc-security`           | Credential storage, key rotation, audit logging                     |

## Agent-friendly output contract

Google's announcement explicitly names "third-party agents like Claude Code or Codex" as supported clients. GPC's output contract was designed for the same audience:

### JSON on every command

```bash
gpc apps list --json
gpc releases list --package com.example.app --track production --json
gpc vitals crashes --package com.example.app --days 7 --json
```

The `--json` flag returns a stable, versioned schema. When stdout is piped (non-TTY), GPC auto-detects and emits JSON by default without the flag. See the [JSON Output Contract](/reference/json-contract) for the full schema.

### Semantic exit codes

| Code | Meaning            | Agent action                               |
| ---- | ------------------ | ------------------------------------------ |
| 0    | Success            | Proceed                                    |
| 1    | Generic error      | Show stderr, halt                          |
| 2    | Usage error        | Correct the flag, retry                    |
| 3    | Auth error         | Prompt user to re-auth, halt               |
| 4    | API error          | Back off, retry with exponential backoff   |
| 5    | Network error      | Retry after a delay                        |
| 6    | Threshold breach   | Block the release, surface the metric      |

Full catalog at [Exit Codes](/reference/exit-codes).

### LLM-ready prompts

`gpc changelog generate --format prompt` emits a ready-to-paste LLM prompt for multilingual release notes. The binary never calls an LLM — it produces a prompt with constraints, voice rules, and source text that any agent can execute:

```bash
gpc changelog generate \
  --target play-store \
  --locales auto \
  --format prompt > prompt.txt
```

This pattern (ship the prompt, not the model) is intentional. Agents choose their own model. The CLI stays dependency-free.

## Example agent prompts

These prompts work across both skill packs, assuming both are installed:

> Scaffold a new Compose project called Notes, then ship a 10% rollout to production after checking vitals.

The agent will:

1. Trigger Google's Compose skill → `android create --template compose-tutorial --name Notes`
2. Trigger Google's SDK skill → `android sdk install --platform 34`
3. Trigger Google's run skill → `android run`
4. Trigger `gpc-preflight` → `gpc preflight <aab>`
5. Trigger `gpc-vitals-monitoring` → `gpc vitals crashes --days 7 --json`
6. Trigger `gpc-release-flow` → `gpc releases upload` then `gpc releases promote --rollout 0.1`

> Generate Play Store release notes in English, French, and Japanese from the last 10 commits.

Triggers `gpc-release-flow`, then:

```bash
gpc changelog generate \
  --target play-store \
  --locales en-US,fr-FR,ja-JP \
  --format prompt
```

The emitted prompt is what the agent uses to generate the translations. GPC renders the constraints (500 code points per locale, voice rules, "don't translate CLI flags"). The agent runs the inference.

## Further reading

- **The Two Halves of Agent-First Android** — longer thesis on the build/publish split, SKILL.md as the interop layer, and why the two CLIs compose rather than compete.
  - Read on [X](https://x.com/yassersstudio/status/2045485852231414228)
  - Read on [LinkedIn](https://www.linkedin.com/pulse/two-halves-agent-first-android-yasser-berrehail-qt4qc/)

## Related

- [Installation](/guide/installation) — get GPC installed
- [Quick Start](/guide/quick-start) — first commands
- [Changelog Generation](/guide/changelog-generation) — release notes from git
- [Multilingual Release Notes](/guide/multilingual-release-notes) — per-locale Play Store notes
- [JSON Output Contract](/reference/json-contract) — full schema for agent consumption
- [Exit Codes](/reference/exit-codes) — semantic error handling
- [GPC Skills on GitHub](https://github.com/yasserstudio/gpc-skills) — skill pack source
