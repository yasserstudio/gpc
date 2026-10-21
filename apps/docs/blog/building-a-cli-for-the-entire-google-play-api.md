---
title: "I Built a CLI That Covers the Entire Google Play Developer API"
date: 2026-03-31
description: "Why I replaced the Play Console release ritual with one command: 234 API operations, an offline policy scanner, and vitals-gated rollouts from the terminal."
author: Yasser Berrehail
tags: [android, typescript, cli, google-play, devtools]
image: /blog/building-a-cli-for-the-entire-google-play-api.webp
ogImage: /blog/building-a-cli-for-the-entire-google-play-api.jpg
---

<BlogPost />

# I Built a CLI That Covers the Entire Google Play Developer API

::: info Updated October 2026
First published on Dev.to on March 31, 2026. Updated for GPC 1.0: coverage grew from 215 to 234 publisher operations across four Google Play APIs, the test suite from 1,874 to 2,906 tests, and the flags shown below match the 1.0.0 release.
:::

I was uploading an AAB to the Play Console last year and thought: why am I still clicking through this in 2026?

Every Android release is the same ritual. Open the Console, upload the bundle, fill in release notes, pick a track, set the rollout percentage, click through confirmation screens. Fifteen minutes of clicking for something that should be one command.

So I looked at what exists.

**Fastlane supply** requires Ruby, Bundler, and about 150 gems. It covers roughly 20 API operations: uploads and metadata, and that is about it. No reviews, no vitals, no subscriptions.

**Gradle-based publishing** is tied to your build. You cannot use it in a standalone script or outside a Gradle task.

**Custom bash scripts** work until the person who wrote them leaves your team.

Nothing covered the full API. So I built one.

## What is GPC?

GPC is a command-line interface that maps the Google Play Developer API v3 and its sibling APIs (Developer Reporting, Custom App Publishing, Games Configuration) to simple, consistent commands. That is 234 publisher-focused operations across four APIs.

```bash
# Upload and release
gpc releases upload app.aab --track beta

# Check vitals (the threshold is a fraction: 0.02 = 2%)
gpc vitals crashes --days 7 --threshold 0.02

# Read reviews (the API returns the last 7 days)
gpc reviews list --stars 1 --all

# Manage subscriptions
gpc subscriptions list
```

It runs on Node.js and installs via npm, Homebrew, or as a standalone binary (no Node.js required). Cold start is under 500ms. Works on macOS, Linux, and Windows.

## It is not just a release tool

The part that surprised me during development was how much of the Play Console is actually accessible through the API that nobody builds tools for.

You can sync store listings across every language your app ships in. Pull crash data and ANR rates into your monitoring pipeline. Gate a rollout on vitals: `gpc releases rollout increase --to 50 --vitals-gate` refuses to raise the percentage when your crash rate is over threshold, and tells you why. Manage subscriptions, verify purchases, convert pricing across regions. Publish privately to Managed Google Play with `gpc enterprise publish`.

But two commands ended up being my most used.

### How does preflight catch rejections before Google does?

```bash
gpc preflight app.aab
```

It runs 9 scanners on your AAB in parallel, entirely offline, with no API calls. They check targetSdk compliance, missing `exported` flags, restricted permissions, native library alignment (including the 16KB page size requirement), hardcoded API keys, non-Play billing SDKs, privacy and tracking issues, policy flags such as families and COPPA, download size, and store listing metadata.

You get a findings report with severity levels. In CI, exit code 6 means something at or above your `--fail-on` severity needs fixing before you upload.

I built this because I was tired of uploading a bundle and finding out two hours later that it was rejected. Now it is the first thing that runs in my pipeline.

### What does your app's health look like in one command?

```bash
gpc status
```

It fires up to ten parallel API calls and gives you a snapshot: active releases by track, crash rate, ANR rate, slow start rate, slow render rate, and recent reviews, with trend arrows and threshold indicators. Add `--full` for a topic and sentiment breakdown of those reviews.

Add `--watch 30` and it polls every 30 seconds. Add `--desktop-notify` and you get a desktop notification when a threshold is breached. `--since-last` shows what changed since your last check.

This replaced the "open three Console tabs and cross-reference" workflow I used to do after every release.

## Built for CI/CD

I designed GPC for pipelines from day one.

```yaml
- name: Upload to Play Store
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.SA_KEY }}
  run: |
    npm install -g @gpc-cli/cli
    gpc preflight app.aab
    gpc releases upload app.aab --track internal
    gpc status --format summary
```

On GitHub Actions you can skip the plumbing entirely: `yasserstudio/gpc-action@v1` wraps the same flow in one step, with the preflight gate built in.

A few things that make this work well:

- **Output you choose.** Tables by default, JSON on any command with `--json`, or `--ci` for JSON plus no prompts and no color.
- **Semantic exit codes.** `3` means auth failed, `4` means API error, `6` means a threshold was breached. Your CI can react differently to each.
- **`--dry-run` on every write operation.** Test your pipeline without shipping to production.
- **Vitals gating.** Block a rollout increase when crash or ANR rates exceed your threshold. One flag.

Two commands came later and now own my rollouts: `gpc watch` polls vitals during a release and can halt it on breach, and `gpc train` runs a whole staged rollout from a config file, time gates and vitals gates included.

## Why TypeScript and not Go?

GPC is a TypeScript monorepo with 7 publishable packages:

| Package               | What it does                             |
| --------------------- | ---------------------------------------- |
| `@gpc-cli/cli`        | The CLI you run                          |
| `@gpc-cli/core`       | Business logic and command orchestration |
| `@gpc-cli/api`        | Typed Google Play API client             |
| `@gpc-cli/auth`       | Service account, OAuth, ADC              |
| `@gpc-cli/config`     | Config loading, profiles, env vars       |
| `@gpc-cli/plugin-sdk` | Plugin interface for extensions          |
| `@gpc-cli/plugin-ci`  | CI/CD helpers                            |

Go would have given me a fast binary with zero dependencies, and that was tempting. But Android developers already have Node.js (React Native, build tools), npm is already in every CI pipeline, and `@gpc-cli/api` works as a standalone SDK in any Node.js project. Go gives you a binary. TypeScript gives you an ecosystem. The standalone binary turned out to be a packaging choice rather than a language one, so GPC ships one anyway for people who want no runtime at all.

## Where does it stand today?

- 234 Google Play API operations across four APIs, all covered
- 2,906 tests, 90%+ line coverage on every core package
- Available on npm, Homebrew, and as a standalone binary
- Fastlane metadata format compatible (drop-in for store listings)
- AI-assisted release notes from your git history (`gpc releases upload --changelog-ai`, using your own LLM key)
- Plugin system with lifecycle hooks
- Interactive mode for when you do not remember the flags

It reached 1.0.0, its first stable release, in October 2026. It is the most tested project I have shipped, and I use it for my own apps.

## How do you install it?

```bash
# npm
npm install -g @gpc-cli/cli

# Homebrew
brew install yasserstudio/tap/gpc

# Standalone binary
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

Then run `gpc setup` for guided authentication, or read the [quick start](/guide/quick-start).

- **Docs:** [yasserstudio.github.io/gpc](https://yasserstudio.github.io/gpc)
- **GitHub:** [github.com/yasserstudio/gpc](https://github.com/yasserstudio/gpc)

It is MIT-licensed open source, free to use.

If you ship Android apps, what is the one thing about the Play Console you wish you could automate? I am genuinely curious and happy to prioritize it.
