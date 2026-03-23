---
layout: home

hero:
  name: "GPC"
  text: "Google Play Console CLI"
  tagline: "Ship Android apps from your terminal. The entire Google Play API in one tool — no Ruby, no browser, no ceremony."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View Commands
      link: /commands/
    - theme: alt
      text: GitHub
      link: https://github.com/yasserstudio/gpc

features:
  - icon:
      src: /icons/layers.svg
      wrap: true
    title: The Entire Google Play API
    details: "187 endpoints — releases, rollouts, metadata, vitals, reviews, subscriptions, purchases, reports, users, testers, and more. Nothing left out. Fastlane covers ~20."
  - icon:
      src: /icons/shield.svg
      wrap: true
    title: Preflight Compliance Scanner
    details: "No other tool does this. Scan your AAB against Google Play policies before uploading — offline, no API calls. 9 scanners check target SDK, permissions, 64-bit libs, secrets, billing SDKs, tracking, app size, and more."
  - icon:
      src: /icons/terminal.svg
      wrap: true
    title: CI/CD Native
    details: "JSON output when piped, formatted tables in your terminal. Semantic exit codes (0–6) your pipeline can branch on. Env var config. --dry-run on every write. Preflight gates before upload."
  - icon:
      src: /icons/package.svg
      wrap: true
    title: No Ruby. No JVM. No Browser.
    details: "One npm install. Or a standalone binary with no runtime at all. Under 500ms cold start — faster than opening a browser tab. macOS, Linux, and Windows."
  - icon:
      src: /icons/activity.svg
      wrap: true
    title: Full Picture in One Command
    details: "gpc status shows releases, vitals, and reviews without opening a browser — 6 parallel API calls, results in under 3 seconds. Exit code 6 if any vital threshold is breached."
  - icon:
      src: /icons/plug.svg
      wrap: true
    title: 1,710 Tests. Plugin System. SDK.
    details: "90%+ coverage across 7 packages. Extend GPC with lifecycle hooks and custom commands. Or import @gpc-cli/api directly as a typed SDK. Security-audited. MIT licensed."
---

## Install

```bash
# npm (includes plugin support)
npm install -g @gpc-cli/cli

# Homebrew (macOS/Linux)
brew install yasserstudio/tap/gpc

# Standalone binary (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
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
