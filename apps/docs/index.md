---
layout: home

hero:
  name: "GPC"
  text: "Google Play Console CLI"
  tagline: "The entire Google Play API in one CLI — plus AI-translated release notes from your git log. No Ruby. No browser. No ceremony."
  actions:
    - theme: brand
      text: Install in 30 seconds
      link: /guide/installation
    - theme: alt
      text: See AI translation
      link: /guide/multilingual-release-notes#ai-translation
    - theme: alt
      text: GitHub
      link: https://github.com/yasserstudio/gpc

features:
  - icon:
      src: /icons/goal.png
    title: 217 API Endpoints
    details: "Releases, vitals, reviews, subscriptions, purchases, reports, Managed Google Play, and more. Fastlane covers ~20. GPC covers everything."
  - icon:
      src: /icons/plug.png
    title: AI-Translated Release Notes
    details: "gpc changelog generate --target play-store --locales auto --ai turns your git log into per-locale Play Store notes translated via your own Anthropic, OpenAI, Google, or Vercel AI Gateway key."
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
    details: "gpc status for a snapshot. gpc watch for real-time rollout monitoring with auto-halt on threshold breach. Exit code 6 for CI."
---

<div class="stats-bar">
  <span class="stat">217 API Endpoints</span>
  <span class="stat-sep"></span>
  <span class="stat">2,170 Tests</span>
  <span class="stat-sep"></span>
  <span class="stat">90%+ Coverage</span>
  <span class="stat-sep"></span>
  <span class="stat">Free to Use</span>
</div>

## Why GPC

Every Android release is the same ritual: open the Play Console, upload your AAB, copy-paste release notes, pick a track, set the rollout percentage, click through confirmation screens. Fifteen minutes of clicking, every single time. And when you ship to 16 locales, the copy-paste ritual runs 16 times.

GPC covers the entire Google Play Developer API in one CLI. 217 endpoints. Plus a preflight compliance scanner that catches policy violations before you upload, and AI translation that turns your git log into localized "What's new" text in one command.

No Ruby. No browser. No ceremony.

## Install

```bash
npm install -g @gpc-cli/cli
```

[Homebrew, standalone binaries, Windows →](/guide/installation)

## Quick Start

```bash
# Authenticate
gpc auth login --service-account path/to/key.json

# Verify your setup
gpc doctor

# App health at a glance — releases, vitals, reviews in one command
gpc status

# Upload and release
gpc releases upload app.aab --track internal

# Promote to production with staged rollout
gpc releases promote --from internal --to production --rollout 10

# Watch your rollout, auto-halt on threshold breach
gpc watch --on-breach halt

# Translate your release notes into every locale on your live listing
gpc changelog generate --target play-store --locales auto --ai
```

## What's New

::: tip v0.9.67 — Real-time rollout monitoring
Ship your release, then watch it from the terminal. `gpc watch` monitors vitals alongside rollout progress and takes action when thresholds breach.

```bash
gpc watch                                    # crashes + ANR on production
gpc watch --track beta --on-breach halt      # auto-halt on breach
gpc watch --on-breach notify,webhook \
  --webhook-url https://hooks.slack.com/...  # Slack alerts
gpc watch --rounds 3 --interval 300 --json   # CI mode
```

[Watch command reference →](/commands/watch)
:::

**Previous releases:**

- **v0.9.66** — Developer verification tooling: `gpc verify`, `gpc verify checklist`, `gpc doctor --verify`, `gpc preflight signing`.
- **v0.9.65** — Preflight scanners for April 2026 Google Play policies (geofencing foreground service, contacts broad access, Health Connect granular permissions).
- **v0.9.64** — `--apply` writes translated release notes directly into your draft release. The v0.9.61-v0.9.64 changelog series is complete.
- **v0.9.62** — Multilingual Play Store release notes. `--target play-store --locales <csv|auto>` emits per-locale "What's new" text with the 500-character budget enforced per locale.
- **v0.9.56** — First Android publishing CLI to support the [Play Custom App Publishing API](https://developers.google.com/android/work/play/custom-app-api). Private enterprise apps in one command.

[Full changelog →](/reference/changelog)

## What GPC Covers

| Domain            | What you can do                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Releases**      | Upload, promote, staged rollouts, halt, resume, release notes, rejected app handling                                                         |
| **Listings**      | Store metadata, screenshots, localization, Fastlane format compatible                                                                        |
| **Reviews**       | Filter by stars/language/date, reply, export to CSV                                                                                          |
| **Vitals**        | Crashes, ANR, startup, rendering, battery, memory — with CI threshold gates                                                                  |
| **Monitoring**    | Real-time rollout monitoring with 6 vitals metrics, threshold alerts, auto-halt, and webhook notifications                                   |
| **Monetization**  | Subscriptions, base plans, offers, in-app products, pricing conversion                                                                       |
| **Purchases**     | Verification, acknowledgment, refunds, voided purchases                                                                                      |
| **Reports**       | Financial and stats CSV downloads                                                                                                            |
| **Team**          | Testers, users, permissions, CSV bulk import                                                                                                 |
| **Compliance**    | Preflight scanner (9 checks), signing key audit, developer verification readiness, data safety, recovery actions                             |
| **Analysis**      | Bundle size breakdown, cross-build comparison, size CI gates                                                                                 |
| **Release Notes** | GitHub Release markdown from git, per-locale Play Store text (500-char budget), AI translation via Anthropic/OpenAI/Google/Vercel AI Gateway |
| **More**          | Device tiers, internal sharing, external transactions, project scaffolding                                                                   |

[View the full command reference →](/commands/)

## Why GPC vs the alternatives

|                         | **GPC**                        | Fastlane supply | gradle-play-publisher | Console UI   |
| ----------------------- | ------------------------------ | --------------- | --------------------- | ------------ |
| API coverage            | **217 endpoints**              | ~20             | ~15                   | All (manual) |
| Runtime                 | Node.js or standalone binary   | Ruby + Bundler  | JVM                   | Browser      |
| Cold start              | **<500ms**                     | 2-3s            | 3-5s                  | 5-10s        |
| Reviews & Vitals        | Yes                            | No              | No                    | Yes (manual) |
| Subscriptions & IAP     | Yes                            | No              | No                    | Yes (manual) |
| **Managed Google Play** | **Yes (first CLI to support)** | No              | No                    | Yes (manual) |
| **AI translation**      | **`--ai`, BYO key**            | No              | No                    | No           |
| CI/CD native            | JSON + exit codes + env vars   | Partial         | Gradle tasks          | No           |
| Preflight scanner       | **9 offline policy checks**    | No              | No                    | No           |
| Plugin system           | Yes                            | No              | No                    | No           |

Already on Fastlane? See the [migration guide](/migration/from-fastlane) or the [full comparison](/alternatives/fastlane).

## Ready to stop clicking?

```bash
npm install -g @gpc-cli/cli
gpc doctor
```

Free to use. Works with your existing Google Play service account. Every write operation supports `--dry-run`.

[Get started](/guide/quick-start) · [Full installation options](/guide/installation) · [Star on GitHub](https://github.com/yasserstudio/gpc) · [Report an issue](https://github.com/yasserstudio/gpc/issues)
