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
    title: 208 API Endpoints
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
    details: "1,863 tests. 90%+ coverage. Extend with plugins or import @gpc-cli/api as a typed SDK."
---

<div class="stats-bar">
  <span class="stat">208 API Endpoints</span>
  <span class="stat-sep"></span>
  <span class="stat">1,863 Tests</span>
  <span class="stat-sep"></span>
  <span class="stat">90%+ Coverage</span>
  <span class="stat-sep"></span>
  <span class="stat">Free to Use</span>
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

| Domain           | What you can do                                                              |
| ---------------- | ---------------------------------------------------------------------------- |
| **Releases**     | Upload, promote, staged rollouts, halt, resume, release notes, rejected app handling |
| **Listings**     | Store metadata, screenshots, localization, Fastlane format compatible        |
| **Reviews**      | Filter by stars/language/date, reply, export to CSV                          |
| **Vitals**       | Crashes, ANR, startup, rendering, battery, memory — with CI threshold gates  |
| **Monetization** | Subscriptions, base plans, offers, in-app products, pricing conversion       |
| **Purchases**    | Verification, acknowledgment, refunds, voided purchases                      |
| **Reports**      | Financial and stats CSV downloads                                            |
| **Team**         | Testers, users, permissions, CSV bulk import                                 |
| **Compliance**   | Preflight scanner (9 checks), data safety, recovery actions, review-safe CI  |
| **Analysis**     | Bundle size breakdown, cross-build comparison, size CI gates                 |
| **More**         | Device tiers, internal sharing, external transactions, project scaffolding   |

[View the full command reference →](/commands/)

## Why GPC

|                     | **GPC**                      | Fastlane supply | gradle-play-publisher | Console UI   |
| ------------------- | ---------------------------- | --------------- | --------------------- | ------------ |
| API coverage        | **208 endpoints**            | ~20             | ~15                   | All (manual) |
| Runtime             | Node.js or standalone binary | Ruby + Bundler  | JVM                   | Browser      |
| Cold start          | <500ms                       | 2-3s            | 3-5s                  | 5-10s        |
| Reviews & Vitals    | Yes                          | No              | No                    | Yes (manual) |
| Subscriptions & IAP | Yes                          | No              | No                    | Yes (manual) |
| CI/CD native        | JSON + exit codes + env vars | Partial         | Gradle tasks          | No           |
| Preflight scanner   | **9 offline policy checks**  | No              | No                    | No           |
| Plugin system       | Yes                          | No              | No                    | No           |

Already on Fastlane? See the [migration guide](/migration/from-fastlane) or the [full comparison](/alternatives/fastlane).

## What's New

**Rejected app support** (v0.9.51/v0.9.52) -- Apps stuck in rejection can now upload and promote with `--changes-not-sent-for-review`. CI pipelines can use `--error-if-in-review` to fail safely instead of silently cancelling an in-progress review.

**Native debug symbols** -- Upload NDK native debug symbols alongside your AAB with `--mapping-type nativeCode` for crash symbolication in the Play Console.

**Device tier targeting** -- Target a specific device tier config at upload time with `--device-tier-config`.

**4 new API endpoints** -- Expansion file management (OBB) for legacy APKs. Plus pagination on one-time products, `startIndex` on reviews, and `allowMissing` upsert support on monetization endpoints.

[Full changelog](/reference/changelog)

## Ready to stop clicking?

```bash
npm install -g @gpc-cli/cli
gpc doctor
```

Free to use. Works with your existing Google Play service account. Every write operation supports `--dry-run`.

[Get started](/guide/quick-start) | [Full installation options](/guide/installation)
