---
layout: home

hero:
  name: "GPC"
  text: "Google Play Console CLI"
  tagline: "Ship Android apps from your terminal. The entire Google Play API in one tool — no Ruby, no browser, no ceremony. Built for Android developers, vibe coders, release engineers, DevOps teams — and iOS developers who have no idea how the Play Console works."
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
    title: 204 API Endpoints
    details: "Releases, vitals, reviews, subscriptions, purchases, reports, and more. Fastlane covers ~20. GPC covers everything."
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
    title: No Ruby. No JVM. No Browser.
    details: "One npm install, brew install, or standalone binary. Under 500ms cold start. macOS, Linux, Windows."
  - icon:
      src: /icons/analytics.png
    title: Full Picture in One Command
    details: "gpc status — releases, vitals, and reviews in 3 seconds. Exit code 6 if any threshold is breached."
  - icon:
      src: /icons/plug.png
    title: Plugin System + SDK
    details: "1,845 tests. 90%+ coverage. Extend with plugins or import @gpc-cli/api as a typed SDK. MIT licensed."
---

<div class="stats-bar">
  <span class="stat">204 API Endpoints</span>
  <span class="stat-sep"></span>
  <span class="stat">1,845 Tests</span>
  <span class="stat-sep"></span>
  <span class="stat">90%+ Coverage</span>
  <span class="stat-sep"></span>
  <span class="stat">MIT Licensed</span>
</div>

<p align="center" style="margin-top: 1rem;">
  <a href="https://www.npmjs.com/package/@gpc-cli/cli"><img src="https://img.shields.io/npm/v/@gpc-cli/cli?color=00D26A" alt="npm version"></a>
  <a href="https://github.com/yasserstudio/gpc/stargazers"><img src="https://img.shields.io/github/stars/yasserstudio/gpc" alt="GitHub Stars"></a>
  <a href="https://www.npmjs.com/package/@gpc-cli/cli"><img src="https://img.shields.io/npm/dm/@gpc-cli/cli?color=00BFA5" alt="npm downloads"></a>
</p>

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

Free. Open-source. No account required beyond your existing Google Play service account. Already on Fastlane? See the [migration guide](/migration/from-fastlane) — most commands map one-to-one.

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

| Domain           | What you can do                                                              |
| ---------------- | ---------------------------------------------------------------------------- |
| **Releases**     | Upload, promote, staged rollouts, halt, resume, release notes                |
| **Listings**     | Store metadata, screenshots, localization, Fastlane format compatible        |
| **Reviews**      | Filter by stars/language/date, reply, export to CSV                          |
| **Vitals**       | Crashes, ANR, startup, rendering, battery, memory — with CI threshold gates  |
| **Monetization** | Subscriptions, base plans, offers, in-app products, pricing conversion       |
| **Purchases**    | Verification, acknowledgment, refunds, voided purchases                      |
| **Reports**      | Financial and stats CSV downloads                                            |
| **Team**         | Testers, users, permissions, CSV bulk import                                 |
| **Compliance**   | Preflight scanner (9 checks), data safety, recovery actions                  |
| **Analysis**     | Bundle size breakdown, cross-build comparison, size CI gates                 |
| **More**         | Device tiers, internal sharing, external transactions, project scaffolding   |

[View the full command reference →](/commands/)

## Why GPC

|                     | **GPC**                      | Fastlane supply | gradle-play-publisher | Console UI   |
| ------------------- | ---------------------------- | --------------- | --------------------- | ------------ |
| API coverage        | **204 endpoints**            | ~20             | ~15                   | All (manual) |
| Runtime             | Node.js or standalone binary | Ruby + Bundler  | JVM                   | Browser      |
| Cold start          | <500ms                       | 2-3s            | 3-5s                  | 5-10s        |
| Reviews & Vitals    | Yes                          | No              | No                    | Yes (manual) |
| Subscriptions & IAP | Yes                          | No              | No                    | Yes (manual) |
| CI/CD native        | JSON + exit codes + env vars | Partial         | Gradle tasks          | No           |
| Preflight scanner   | **9 offline policy checks**  | No              | No                    | No           |
| Plugin system       | Yes                          | No              | No                    | No           |

Already on Fastlane? See the [migration guide](/migration/from-fastlane) — most commands map one-to-one.
