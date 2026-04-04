---
outline: deep
---

# Google Play CLI Tools Compared

Looking for a command-line tool for the Google Play Developer API? Here is how the available options compare.

## Overview

|                     | **GPC**                      | **Fastlane supply** | **gradle-play-publisher** | **play-console-cli (Go)** |
| ------------------- | ---------------------------- | ------------------- | ------------------------- | ------------------------- |
| API coverage        | **215 endpoints**            | ~20                 | ~15                       | ~10                       |
| Runtime             | Node.js or standalone binary | Ruby + Bundler      | Gradle / JVM              | Go binary                 |
| Cold start          | <500ms                       | 2-3s                | 5-10s (Gradle)            | <100ms                    |
| Standalone use      | Yes                          | Yes                 | No (Gradle plugin)        | Yes                       |
| Reviews & Vitals    | Yes                          | No                  | No                        | No                        |
| Subscriptions & IAP | Yes                          | No                  | No                        | No                        |
| Preflight scanner   | **9 offline policy checks**  | No                  | No                        | No                        |
| CI/CD native        | JSON + exit codes + env vars | Partial             | Gradle tasks              | Basic                     |
| Plugin system       | Yes                          | Actions             | No                        | No                        |
| SDK / library use   | Yes (@gpc-cli/api)           | No                  | No                        | No                        |

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

## Detailed Comparisons

- [GPC vs Fastlane Supply](/alternatives/fastlane) -- full feature-by-feature comparison with command mapping

## Getting Started with GPC

```bash
npm install -g @gpc-cli/cli
gpc auth login --service-account path/to/key.json
gpc doctor
gpc status
```

[Installation](/guide/installation) | [Quick Start](/guide/quick-start) | [Full Command Reference](/commands/)
