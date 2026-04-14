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
    title: Plugin System + SDK
    details: "1,879 tests. 90%+ coverage. Extend with plugins or import @gpc-cli/api as a typed SDK."
---

<div class="stats-bar">
  <span class="stat">217 API Endpoints</span>
  <span class="stat-sep"></span>
  <span class="stat">1,866 Tests</span>
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

| Domain           | What you can do                                                                      |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Releases**     | Upload, promote, staged rollouts, halt, resume, release notes, rejected app handling |
| **Listings**     | Store metadata, screenshots, localization, Fastlane format compatible                |
| **Reviews**      | Filter by stars/language/date, reply, export to CSV                                  |
| **Vitals**       | Crashes, ANR, startup, rendering, battery, memory — with CI threshold gates          |
| **Monetization** | Subscriptions, base plans, offers, in-app products, pricing conversion               |
| **Purchases**    | Verification, acknowledgment, refunds, voided purchases                              |
| **Reports**      | Financial and stats CSV downloads                                                    |
| **Team**         | Testers, users, permissions, CSV bulk import                                         |
| **Compliance**   | Preflight scanner (9 checks), data safety, recovery actions, review-safe CI          |
| **Analysis**     | Bundle size breakdown, cross-build comparison, size CI gates                         |
| **More**         | Device tiers, internal sharing, external transactions, project scaffolding           |

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

**Managed Google Play** (v0.9.56) -- GPC is the first Android publishing CLI to support the [Play Custom App Publishing API](https://developers.google.com/android/work/play/custom-app-api). Publish private apps to enterprise customers in one command from CI/CD instead of two hours clicking through Play Console. Fastlane doesn't do this; `gradle-play-publisher` doesn't do this. See the [Enterprise publishing guide](/guide/enterprise-publishing).

```bash
gpc enterprise publish ./app.aab \
  --account 1234567890 \
  --title "My Internal App" \
  --org-id customer-acme
```

**`gpc doctor` now probes the Play Custom App API** (v0.9.56) -- Flags missing service-account permissions or a disabled API before you hit runtime errors.

**API freshness audit** (v0.9.55) -- `offerPhase` field shape corrected, typed request bodies for `revokeSubscriptionV2` and `acknowledgeSubscription` (including the new `itemBasedRefund` union and `externalAccountId`), and the `--profile` global flag now actually switches profiles.

**Rejected app support** (v0.9.51/v0.9.52) -- Apps stuck in rejection can now upload and promote with `--changes-not-sent-for-review`. CI pipelines can use `--error-if-in-review` to fail safely instead of silently cancelling an in-progress review.

[Full changelog](/reference/changelog)

## Ready to stop clicking?

```bash
npm install -g @gpc-cli/cli
gpc doctor
```

Free to use. Works with your existing Google Play service account. Every write operation supports `--dry-run`.

[Get started](/guide/quick-start) | [Full installation options](/guide/installation)
