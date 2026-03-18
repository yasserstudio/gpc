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
    title: The Entire Google Play API
    details: "187 endpoints — releases, rollouts, metadata, vitals, reviews, subscriptions, purchases, reports, users, testers, and more. Nothing left out. Fastlane covers ~20."
  - icon:
      src: /icons/terminal.svg
    title: CI/CD Native
    details: "JSON output when piped, formatted tables in your terminal. Semantic exit codes (0–6) your pipeline can branch on. Env var config. --dry-run on every write. No wrapper scripts needed."
  - icon:
      src: /icons/package.svg
    title: No Ruby. No JVM. No Browser.
    details: "One npm install. Or a standalone binary with no runtime at all. Under 500ms cold start — faster than opening a browser tab. macOS, Linux, and Windows."
  - icon:
      src: /icons/activity.svg
    title: Full Picture in One Command
    details: "gpc status shows releases, vitals, and reviews without opening a browser — 6 parallel API calls, results in under 3 seconds. Exit code 6 if any vital threshold is breached."
  - icon:
      src: /icons/plug.svg
    title: Plugin System + SDK
    details: "Build Slack notifications, custom release gates, or internal dashboards — extend GPC with lifecycle hooks and custom commands. Or import @gpc-cli/api directly as a typed SDK."
  - icon:
      src: /icons/shield.svg
    title: 1,504 Tests. 90%+ Coverage.
    details: "Security-audited credential handling, automatic secrets redaction, and audit logging for every write operation. Every write command supports --dry-run. Free and open-source. MIT licensed."
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

| Domain | What you can do |
| --- | --- |
| **Releases** | Upload, promote, staged rollouts, halt, resume, release notes |
| **Listings** | Store metadata, screenshots, localization, Fastlane format compatible |
| **Reviews** | Filter by stars/language/date, reply, export to CSV |
| **Vitals** | Crashes, ANR, startup, rendering, battery, memory — with CI threshold gates |
| **Monetization** | Subscriptions, base plans, offers, in-app products, pricing conversion |
| **Purchases** | Verification, acknowledgment, refunds, voided purchases |
| **Reports** | Financial and stats CSV downloads |
| **Team** | Testers, users, permissions, CSV bulk import |
| **Analysis** | Bundle size breakdown, cross-build comparison, size CI gates |
| **More** | Device tiers, internal sharing, data safety, recovery, external transactions |

[View the full command reference →](/commands/)
