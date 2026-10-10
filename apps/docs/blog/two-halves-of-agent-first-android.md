---
title: "The Two Halves of Agent-First Android"
date: 2026-04-18
description: "Google's Android CLI owns the build half of Android shipping. Play Store publishing is the other half. How the two compose into one agent-driven release."
author: Yasser Berrehail
tags: [android-cli, agents, skills, publishing, ci-cd]
image: /blog/two-halves-of-agent-first-android.webp
ogImage: /blog/two-halves-of-agent-first-android.jpg
---

<BlogPost />

# The Two Halves of Agent-First Android

::: info Updated October 2026
First published as an X Article on April 18, 2026 ([read it there](https://x.com/yassersstudio/status/2045485852231414228)) and as a [LinkedIn article](https://www.linkedin.com/pulse/two-halves-agent-first-android-yasser-berrehail-qt4qc/) two days later. The thesis has not moved; the numbers have. Google's Android CLI reached stable 1.0 at I/O on May 19, 2026, GPC is now at v1.0.0-rc.2 with 234 typed endpoints and 19 agent skills, and the commands below are verified against that release.
:::

Android shipping has two halves, and only one of them has an official CLI. Google's Android CLI covers environment setup, project creation, device management, and the build itself. Play Store publishing is out of scope by design: no releases, no rollouts, no vitals, no listings. GPC is the publishing half, and the two compose into a single agent-driven workflow because they share one instruction format and hand off at one clean boundary.

**Key takeaways**

- Google's Android CLI scope is "environment setup, project creation, and device management." Play Store publishing is not in it.
- The handoff point between the two halves is deterministic: an AAB on disk.
- `SKILL.md` is the shared layer. Google ships skills for app code; GPC ships 19 skills for everything after the build.
- GPC emits `--json` on every command and uses semantic exit codes 0 through 6, so an agent can branch on the result instead of parsing prose.
- Both skill packs installed means one prompt can cross the boundary without the user naming either tool.

## The build/publish split

Every Android release has two halves.

The build half is what Google shipped: generating the AAB, running it on a device, iterating until it is right. Android Studio stays the UI for refinement and profiling. The CLI is the scriptable, agent-driven path.

The publish half is everything between a green build and users getting the update. Upload the AAB. Pick a track (internal, closed, open, production). Set a rollout percentage. Wire the release notes. Watch crash and ANR rates in the first hours. Promote or halt. Historically the answers were Fastlane (supply), hand-rolled bash around the Play Developer API, or the Play Console UI.

None of them were designed for agents. GPC was.

| Stage       | Tool                                | What happens                                                        |
| ----------- | ----------------------------------- | ------------------------------------------------------------------- |
| **Build**   | Android CLI, Android Studio, Gradle | Scaffold, install SDK components, build, run on a device, debug     |
| **Publish** | GPC                                 | Preflight, upload, rollout, promote, vitals, metadata, monetization |

### What Google's Android CLI covers

Per the [interop guide](/guide/android-cli-interop), the stable 1.0 surface is `android sdk install`, `android create`, `android emulator`, `android run`, `android studio`, `android update`, `android docs`, and `android skills`. Supported agents are Claude Code, OpenAI Codex, and Google Antigravity.

Google AI Studio adds a second on-ramp: generate a Kotlin and Compose app from a prompt, then publish it to the Internal Testing Track in one click. It stops there. No production releases, no staged rollouts, no metadata management.

### What the publish half covers

- `gpc preflight app-release.aab` runs 9 offline policy scanners and catches rejections before submission. No network calls, one to three seconds on a typical app.
- `gpc publish app-release.aab --track internal` runs the full edit lifecycle (open, upload, release, commit) in one command.
- `gpc releases promote --from internal --to production --rollout 10` moves a build up a track at a staged percentage.
- `gpc vitals crashes --days 7 --json` reads crash and ANR rates straight from Google's Play Developer Reporting API.
- `gpc changelog generate --target play-store --locales auto` clusters commits into release notes inside the 500-character Play Store budget per locale.

That is 234 typed endpoints across four Google Play APIs (Android Publisher, Play Developer Reporting, Play Custom App Publishing, Games Configuration), under one output model: `--json` on every command, semantic exit codes 0 through 6, and `--dry-run` on every write.

Two halves. Built independently. Designed to compose.

### Why not Fastlane supply?

Fair question. Supply predates typed APIs, JSON output, and agent use cases by a decade. Retrofitting it for agents is more work than the greenfield was. The publish half needed a rewrite either way. If you are already on it, `gpc migrate fastlane` reads the existing config and the [migration guide](/migration/from-fastlane) maps command for command.

## SKILL.md as the interop layer

The quietly important part of Google's announcement is not the CLI. It is the standardization of `SKILL.md` as the agent-readable instruction format: modular markdown, auto-triggered from prompt metadata, installable as a pack.

The implication is that any third-party tool in the Android ecosystem can ship a skill pack, and an agent that understands the format loads both sides of a workflow from the same prompt.

Google's [official skills repo](https://github.com/android/skills) covers app code: AGP 9 upgrades, Navigation 3, XML to Compose migration, R8 keep rules, Perfetto traces, edge-to-edge. Those skills stop at the boundary of the built artifact.

GPC's 19 skills pick up there: release flow, preflight, vitals monitoring, metadata sync, monetization, user management, CI integration, enterprise publishing, troubleshooting. One of them, `gpc-android-cli-interop`, is the handoff itself. It tells an agent whether a task is build half or publish half and keeps context consistent across the boundary.

Installing both takes two commands:

```bash
# Google's Android skills
android skills add --all

# GPC skills (or: gpc install-skills)
npx skills add yasserstudio/gpc-skills
```

With both loaded, a prompt like "ship this feature to production at a 10 percent rollout" routes through both tools without the user ever naming them.

Shared format. Shared agent. Different halves of the work.

## Why agent-native formats matter

Agent-native is not a posture, it is a set of wire-level choices.

**Structured output by default.** Every command emits JSON. When stdout is piped, GPC detects the non-TTY and emits JSON without the flag at all. The schema is stable and versioned (see the [JSON output contract](/reference/json-contract)).

**Exit codes that carry meaning.** An agent should know what to do next from the status alone:

| Code | Meaning          | Agent action                             |
| ---- | ---------------- | ---------------------------------------- |
| 0    | Success          | Proceed                                  |
| 1    | Generic error    | Show stderr, halt                        |
| 2    | Usage error      | Correct the flag, retry                  |
| 3    | Auth error       | Prompt the user to re-auth, halt         |
| 4    | API error        | Back off, retry with exponential backoff |
| 5    | Network error    | Retry after a delay                      |
| 6    | Threshold breach | Block the release, surface the metric    |

Full catalog in the [exit codes reference](/reference/exit-codes).

**LLM-ready formats on demand, and no bundled model.** `gpc changelog generate --format prompt` emits a ready-to-execute prompt with the 500-character constraint, the voice rules, and the source text. The binary runs no inference on that path; the agent does. `--ai` flips it around and calls the model for you with your own provider key. Both paths are deliberate: an agent that wants model choice stays on the prompt, an agent that wants one shot uses `--ai`.

**No hidden interactivity.** `--no-interactive`, `--ci`, and `--dry-run` exist on the root command so every input is explicit and every output is parseable.

Google's announcement names "third-party agents like Claude Code or Codex" as supported clients. Tools that bolted agent support on afterwards are rewriting their CLI. GPC has run on this rail since day one, with 2,906 tests holding the contract in place.

## A full release, both halves

```bash
# Build half (Google's Android CLI)
android create --template compose-tutorial --name Notes
android sdk install --platform 35
android run --release

# Handoff: an AAB on disk
gpc doctor
gpc preflight app-release.aab --fail-on error

# Publish half (GPC)
gpc publish app-release.aab --app com.example.app --track production --rollout 10
gpc vitals crashes --app com.example.app --days 1 --json
```

The handoff is deterministic. Once an AAB exists, you are in Play Store territory, and it does not matter whether the Android CLI, Android Studio, Gradle, or AI Studio produced it.

The same split holds in CI. The [GPC Action](https://github.com/yasserstudio/gpc-action) wraps the publish half in one GitHub Actions step with the preflight gate already wired:

```yaml
- uses: yasserstudio/gpc-action@v1
  with:
    service-account-json: ${{ secrets.PLAY_SERVICE_ACCOUNT }}
    package-name: com.example.app
    release-file: app-release.aab
    track: production
```

See the [GitHub Actions guide](/ci-cd/github-actions) for the full input list.

## Takeaway

If you build with the official Android CLI, GPC is the publish companion.

- `android create` scaffolds
- `android run` builds and deploys
- `gpc preflight` catches policy issues before submission
- `gpc publish` releases to any track
- `gpc vitals` monitors crashes and ANRs

Same agent-first design philosophy. Same `SKILL.md` pattern. Two halves of one workflow.

**Try it on your next release**

```bash
npm install -g @gpc-cli/cli      # npm
brew install yasserstudio/tap/gpc # Homebrew
gpc install-skills                # load the skills into your agent
```

Read the [interop guide](/guide/android-cli-interop) for the end-to-end version, or the [quick start](/guide/quick-start) for the first five commands. MIT-licensed open source, free to use, code on [GitHub](https://github.com/yasserstudio/gpc).
