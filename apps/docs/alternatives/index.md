---
outline: deep
---

# Google Play CLI Tools Compared

Looking for a command-line tool for the Google Play Developer API? Here is how the available options compare.

## Overview

|                         | **GPC**                        | **Fastlane supply** | **gradle-play-publisher** | **play-console-cli (Go)** |
| ----------------------- | ------------------------------ | ------------------- | ------------------------- | ------------------------- |
| API coverage            | **217 endpoints**              | ~20                 | ~15                       | ~10                       |
| Runtime                 | Node.js or standalone binary   | Ruby + Bundler      | Gradle / JVM              | Go binary                 |
| Cold start              | <500ms                         | 2-3s                | 5-10s (Gradle)            | <100ms                    |
| Standalone use          | Yes                            | Yes                 | No (Gradle plugin)        | Yes                       |
| Reviews & Vitals        | Yes                            | No                  | No                        | No                        |
| Subscriptions & IAP     | Yes                            | No                  | No                        | No                        |
| **Managed Google Play** | **Yes (first CLI to support)** | No                  | No                        | No                        |
| Preflight scanner       | **9 offline policy checks**    | No                  | No                        | No                        |
| CI/CD native            | JSON + exit codes + env vars   | Partial             | Gradle tasks              | Basic                     |
| Plugin system           | Yes                            | Actions             | No                        | No                        |
| SDK / library use       | Yes (@gpc-cli/api)             | No                  | No                        | No                        |

## When to use what

**GPC** is the right choice when you need:

- Full API access beyond uploads and metadata (vitals, reviews, subscriptions, reports)
- CI/CD pipelines with semantic exit codes and JSON output
- Pre-upload policy scanning with `gpc preflight`
- A unified dashboard with `gpc status`
- A TypeScript SDK for custom automation

**Fastlane supply** works if you:

- Already use Fastlane for iOS and want one tool for both platforms
- Only need uploads and metadata sync
- Have Ruby in your environment

**gradle-play-publisher** works if you:

- Want publishing integrated into your Gradle build
- Only need upload and track management
- Don't need standalone CLI access

**play-console-cli (Go)** works if you:

- Need the fastest possible binary with zero dependencies
- Only need basic operations (list apps, upload)

## A note on Google's official Android CLI

Google [shipped an official Android CLI on 2026-04-16](https://android-developers.googleblog.com/2026/04/build-android-apps-3x-faster-using-any-agent.html). It is **not an alternative to GPC**. Its scope, per Google's own announcement, is "environment setup, project creation, and device management" -- SDK install, project scaffolding, emulator management, and on-device deployment. It does not cover Play Store publishing, releases, vitals, reviews, subscriptions, or listings.

GPC is the complementary publishing half. A full agent-driven workflow looks like `android create` → `android run` → `gpc preflight` → `gpc publish`. Both tools ship `SKILL.md` skill packs using the same convention, so agents can route prompts across the full Android app lifecycle.

See [Using GPC with Google's Android CLI](/guide/android-cli-interop) for the end-to-end workflow, skill pack install commands, and agent-friendly output contracts.

## Detailed Comparisons

- [GPC vs Fastlane Supply](/alternatives/fastlane) -- full feature-by-feature comparison with command mapping
- [Android CLI Interop](/guide/android-cli-interop) -- agent workflow spanning Google's Android CLI and GPC

## Getting Started with GPC

```bash
npm install -g @gpc-cli/cli
gpc auth login --service-account path/to/key.json
gpc doctor
gpc status
```

[Installation](/guide/installation) | [Quick Start](/guide/quick-start) | [Full Command Reference](/commands/)
