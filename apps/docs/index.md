---
layout: home

hero:
  name: "GPC"
  text: "Ship Android apps from your terminal"
  tagline: "The complete CLI for Google Play. 187 API endpoints, one tool. No Ruby, no browser, no ceremony."
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
    title: Full API Coverage
    details: "187 endpoints: releases, rollouts, metadata, vitals, reviews, subscriptions, purchases, reports, users, testers, device tiers, and more. Fastlane covers ~20."
  - icon:
      src: /icons/terminal.svg
    title: CI/CD Native
    details: "JSON output when piped, formatted tables in your terminal. Semantic exit codes (0-6) your CI can branch on. Env var config. --dry-run on every write."
  - icon:
      src: /icons/package.svg
    title: No Ruby. No JVM. No Browser.
    details: "One npm install. Or a standalone binary — no runtime needed. Under 500ms cold start. macOS, Linux, and Windows."
  - icon:
      src: /icons/activity.svg
    title: Vitals-Gated Releases
    details: "Gate deployments on crash rate and ANR thresholds. Exit code 6 when breached — your CI stops the rollout before users notice."
  - icon:
      src: /icons/plug.svg
    title: Plugin System + SDK
    details: "Extend GPC with lifecycle hooks and custom commands. Or import @gpc-cli/api into your own projects — typed SDK for the entire Google Play API."
  - icon:
      src: /icons/shield.svg
    title: 1,299 Tests. 90%+ Coverage.
    details: "Security-audited credential handling, automatic secrets redaction, audit logging for write operations. Every write command supports --dry-run."
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

## Quick Start

```bash
# Authenticate
gpc auth login --service-account path/to/key.json

# Upload and release
gpc releases upload app.aab --track internal

# Promote to production with staged rollout
gpc releases promote --from internal --to production --rollout 10

# Check app health
gpc vitals overview

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
