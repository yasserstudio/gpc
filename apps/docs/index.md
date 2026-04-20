---
layout: home

hero:
  name: "GPC"
  text: "Google Play Console CLI"
  tagline: "The entire Google Play API in one CLI. No Ruby. No browser. No ceremony."
  actions:
    - theme: brand
      text: Install in 30 seconds
      link: /guide/installation
    - theme: alt
      text: Quick Start
      link: /guide/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/yasserstudio/gpc

features:
  - icon:
      src: /icons/goal.png
    title: 217 API Endpoints
    details: "Releases, vitals, reviews, subscriptions, purchases, reports, Managed Google Play, and more. Fastlane covers ~20. GPC covers everything."
  - icon:
      src: /icons/shield.png
    title: Preflight Scanner
    details: "9 offline policy checks on your AAB before upload. Catches rejections before they happen. No other tool does this."
  - icon:
      src: /icons/lightning-bolt.png
    title: CI/CD Native
    details: "JSON output when piped. Semantic exit codes. Env var config. --dry-run on every write. Drop into any pipeline."
  - icon:
      src: /icons/delivery-box.png
    title: Managed Google Play
    details: "First publishing CLI to support the Play Custom App API. Publish private enterprise apps in 5 minutes via CI/CD instead of 2 hours in Play Console."
  - icon:
      src: /icons/analytics.png
    title: Full Picture in One Command
    details: "gpc status — releases, vitals, and reviews in 3 seconds. Exit code 6 if any threshold is breached."
  - icon:
      src: /icons/plug.png
    title: AI-Translated Release Notes
    details: "gpc changelog generate --target play-store --locales auto --ai turns your git log into per-locale Play Store notes translated via your own Anthropic, OpenAI, Google, or Vercel AI Gateway key."
---

<div class="stats-bar">
  <span class="stat">217 API Endpoints</span>
  <span class="stat-sep"></span>
  <span class="stat">2,037 Tests</span>
  <span class="stat-sep"></span>
  <span class="stat">90%+ Coverage</span>
  <span class="stat-sep"></span>
  <span class="stat">Free to Use</span>
</div>

## Install

```bash
# npm (includes plugin support)
npm install -g @gpc-cli/cli

# Homebrew (macOS/Linux)
brew install yasserstudio/tap/gpc

# Standalone binary — macOS/Linux (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh

# Standalone binary — Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.ps1 | iex
```

Free to use. No account required beyond your existing Google Play service account.

## Quick Start

```bash
# Authenticate
gpc auth login --service-account path/to/key.json

# Verify your setup
gpc doctor

# App health at a glance — releases, vitals, and reviews in one command
gpc status

# Upload and release
gpc releases upload app.aab --track internal

# Promote to production with staged rollout
gpc releases promote --from internal --to production --rollout 10

# Monitor reviews
gpc reviews list --stars 1-3 --since 7d
```

## What GPC Covers

| Domain            | What you can do                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Releases**      | Upload, promote, staged rollouts, halt, resume, release notes, rejected app handling                                                         |
| **Listings**      | Store metadata, screenshots, localization, Fastlane format compatible                                                                        |
| **Reviews**       | Filter by stars/language/date, reply, export to CSV                                                                                          |
| **Vitals**        | Crashes, ANR, startup, rendering, battery, memory — with CI threshold gates                                                                  |
| **Monetization**  | Subscriptions, base plans, offers, in-app products, pricing conversion                                                                       |
| **Purchases**     | Verification, acknowledgment, refunds, voided purchases                                                                                      |
| **Reports**       | Financial and stats CSV downloads                                                                                                            |
| **Team**          | Testers, users, permissions, CSV bulk import                                                                                                 |
| **Compliance**    | Preflight scanner (9 checks), data safety, recovery actions, review-safe CI                                                                  |
| **Analysis**      | Bundle size breakdown, cross-build comparison, size CI gates                                                                                 |
| **Release Notes** | GitHub Release markdown from git, per-locale Play Store text (500-char budget), AI translation via Anthropic/OpenAI/Google/Vercel AI Gateway |
| **More**          | Device tiers, internal sharing, external transactions, project scaffolding                                                                   |

[View the full command reference →](/commands/)

## Why GPC

|                         | **GPC**                        | Fastlane supply | gradle-play-publisher | Console UI   |
| ----------------------- | ------------------------------ | --------------- | --------------------- | ------------ |
| API coverage            | **217 endpoints**              | ~20             | ~15                   | All (manual) |
| Runtime                 | Node.js or standalone binary   | Ruby + Bundler  | JVM                   | Browser      |
| Cold start              | <500ms                         | 2-3s            | 3-5s                  | 5-10s        |
| Reviews & Vitals        | Yes                            | No              | No                    | Yes (manual) |
| Subscriptions & IAP     | Yes                            | No              | No                    | Yes (manual) |
| **Managed Google Play** | **Yes (first CLI to support)** | No              | No                    | Yes (manual) |
| CI/CD native            | JSON + exit codes + env vars   | Partial         | Gradle tasks          | No           |
| Preflight scanner       | **9 offline policy checks**    | No              | No                    | No           |
| Plugin system           | Yes                            | No              | No                    | No           |

Already on Fastlane? See the [migration guide](/migration/from-fastlane) or the [full comparison](/alternatives/fastlane).

## What's New

**AI-assisted Play Store translation** (v0.9.63) -- `gpc changelog generate --target play-store --locales auto --ai` translates non-source locales via your own LLM key. Auto-detects whichever provider key is set: `AI_GATEWAY_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY`. Non-reasoning model defaults (`claude-sonnet-4-6`, `gpt-4o-mini`, `gemini-2.5-flash`) — no billing surprises on a translation task. See the [AI translation guide](/guide/multilingual-release-notes#ai-translation).

```bash
# Translate non-source locales via your own key
gpc changelog generate --target play-store --locales auto --ai

# Preview the prompt before spending tokens
gpc --dry-run changelog generate --target play-store --locales auto --ai
```

**Multilingual Play Store release notes** (v0.9.62) -- `gpc changelog generate --target play-store --locales <csv|auto>` emits per-locale "What's new" text with the 500-character Play Store budget enforced per locale (counted in Unicode code points). `--locales auto` reads your live Play listing to detect which locales to emit for. See the [multilingual guide](/guide/multilingual-release-notes).

**Smarter changelog generation** (v0.9.61) -- `gpc changelog generate` reads your local git log, clusters related commits, lints subjects against project voice, and emits canonical GitHub Release markdown, structured JSON, or a paste-ready LLM prompt. Pipe into `gh release create -F -` to ship a release end-to-end.

**Managed Google Play** (v0.9.56) -- First Android publishing CLI to support the [Play Custom App Publishing API](https://developers.google.com/android/work/play/custom-app-api). Publish private enterprise apps in one command from CI/CD. See the [Enterprise publishing guide](/guide/enterprise-publishing).

[Full changelog](/reference/changelog)

## Ready to stop clicking?

```bash
npm install -g @gpc-cli/cli
gpc doctor
```

Free to use. Works with your existing Google Play service account. Every write operation supports `--dry-run`.

[Get started](/guide/quick-start) | [Full installation options](/guide/installation)
