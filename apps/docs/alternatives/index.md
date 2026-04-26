---
outline: deep
---

# Google Play CLI Tools Compared

A **Google Play CLI tool** is a command-line interface that wraps the Google Play Developer API, letting you manage Android app releases, metadata, and monitoring from your terminal or CI/CD pipeline instead of the Play Console web UI. Several tools exist, each with different language runtimes, API coverage, and feature sets.

This page compares every actively maintained option as of April 2026.

## At a Glance

|                              | **GPC**                        | **Fastlane supply**  | **gradle-play-publisher** | **Go-based CLIs** |
| ---------------------------- | ------------------------------ | -------------------- | ------------------------- | ----------------- |
| Language                     | TypeScript                     | Ruby                 | Kotlin                    | Go                |
| API coverage                 | **217 endpoints**              | ~20                  | ~15                       | ~80               |
| Runtime                      | Node.js or standalone binary   | Ruby + Bundler       | Gradle / JVM              | Single binary     |
| Cold start                   | <500ms                         | 2-3s                 | 5-10s (Gradle boot)       | <100ms            |
| Standalone use               | Yes                            | Yes                  | No (Gradle plugin)        | Yes               |
| Reviews and vitals           | Yes                            | No                   | No                        | No                |
| Subscriptions and IAP        | Yes                            | No                   | No                        | No                |
| **Managed Google Play**      | **Yes (first CLI to support)** | No                   | No                        | No                |
| Preflight scanner            | **9 offline policy checks**    | No                   | No                        | No                |
| Rollout monitoring           | **`gpc watch` with auto-halt** | No                   | No                        | No                |
| Multilingual release notes   | **AI-assisted translation**    | No                   | No                        | No                |
| CI/CD integration            | JSON + exit codes (0-6)        | Partial              | Gradle tasks              | Basic             |
| Plugin system                | Yes (lifecycle hooks, SDK)     | Actions              | No                        | No                |
| SDK / library use            | Yes (@gpc-cli/api)             | No                   | No                        | No                |
| Test suite                   | 2,143 tests, 90%+ coverage     | Community-maintained | Kotlin tests              | Minimal           |
| Image sync (SHA-256 diffing) | Planned (v0.9.69)              | Yes                  | No                        | No                |
| Upload progress reporting    | Planned (v0.9.69)              | No                   | Yes (progress callbacks)  | No                |

## How to Choose a Google Play CLI

1. **You need full API access** (vitals, reviews, subscriptions, reports, Managed Google Play) - Use GPC. No other CLI covers these endpoints.
2. **You already use Fastlane for iOS** and want one tool for both platforms - Use Fastlane supply for Android uploads and metadata, and consider GPC alongside it for vitals, reviews, and compliance scanning.
3. **Your build system is Gradle** and you want publishing baked into `./gradlew` - Use gradle-play-publisher. It integrates at the build level but only covers ~15 operations.
4. **You want the smallest possible binary with zero runtime** - Go-based CLIs start in under 100ms, but cover a fraction of the API surface and lack vitals, reviews, subscriptions, and compliance scanning.
5. **You run CI/CD pipelines that gate on crash rates or ANR** - Use GPC. Semantic exit codes (code 6 = threshold breach) and `--json` output are designed for pipeline scripting.
6. **You publish private apps to Managed Google Play** - Use GPC. It is the only CLI with Play Custom App Publishing API support.

## Feature Deep Dive

### What Only GPC Offers

These capabilities have no equivalent in any other Google Play CLI tool:

| Feature                      | Command                       | What it does                                                                                                                                                                 |
| ---------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline compliance scanning  | `gpc preflight app.aab`       | 9 parallel scanners check target SDK, restricted permissions, 64-bit compliance, secrets in code, billing SDKs, tracking libraries, Families/COPPA policy, and download size |
| Real-time rollout monitoring | `gpc watch --on-breach halt`  | Multi-metric vitals tracking with configurable thresholds and auto-halt                                                                                                      |
| App health dashboard         | `gpc status`                  | Releases, vitals, and reviews in one command with 6 parallel API calls                                                                                                       |
| AI-assisted release notes    | `gpc changelog generate --ai` | Git log to translated Play Store "What's new" text across all locales                                                                                                        |
| Enterprise publishing        | `gpc enterprise publish`      | Create and update private Managed Google Play apps from the terminal                                                                                                         |
| Developer verification       | `gpc verify`                  | Check verification readiness before the September 2026 enforcement deadline                                                                                                  |
| Bundle size analysis         | `gpc bundle analyze`          | Per-module AAB breakdown with CI gates via `--threshold`                                                                                                                     |
| Setup diagnostics            | `gpc doctor --fix`            | 20 automated checks with auto-repair                                                                                                                                         |

### Where Fastlane Supply Leads

Fastlane supply has a few features GPC does not have yet:

- **SHA-256 image diffing** - Only uploads images that changed, avoiding re-uploading your entire screenshot set. GPC plans this for v0.9.69.
- **iOS and Android in one tool** - If you ship both platforms, Fastlane gives you a single toolchain. GPC is Android-only by design.

### Where gradle-play-publisher Leads

- **Gradle-native workflow** - Publishing is a Gradle task, not a separate CLI step. If your CI already runs `./gradlew`, this is zero additional setup.
- **Upload progress callbacks** - Shows upload percentage during large AAB uploads. GPC plans this for v0.9.69.

## A Note on Google's Official Android CLI

Google [shipped an official Android CLI on 2026-04-16](https://android-developers.googleblog.com/2026/04/build-android-apps-3x-faster-using-any-agent.html). It is **not an alternative to GPC**. Its scope is SDK management, project scaffolding, emulator control, and on-device deployment. It does not cover Play Store publishing, releases, vitals, reviews, subscriptions, or listings.

GPC is the complementary publishing half. A full agent-driven workflow looks like `android create` then `android run` then `gpc preflight` then `gpc publish`.

See [Using GPC with Google's Android CLI](/guide/android-cli-interop) for the end-to-end workflow.

## FAQ

**Can any CLI tool create new apps on Google Play?**
No. Google Play has no public API for app creation. Every CLI tool (GPC, Fastlane, gradle-play-publisher, Go-based CLIs) requires that you create the app once in the Play Console web UI. After that, the CLI handles the full lifecycle.

**Which tool has the most complete API coverage?**
GPC, with 217 endpoints. This includes the full Google Play Developer API v3 surface plus the Play Custom App Publishing API for Managed Google Play. The next closest covers around 80 endpoints.

**Do I need Node.js to run GPC?**
No. GPC is available as a standalone binary for macOS (arm64, x64), Linux (arm64, x64), and Windows (x64) with no runtime dependencies. Install via `brew install yasserstudio/tap/gpc` or the install script.

**Can I use GPC and Fastlane together?**
Yes. GPC reads Fastlane's metadata directory format (`fastlane/metadata/android/`). You can migrate incrementally, command by command.

## Detailed Comparisons

- [GPC vs Fastlane Supply](/alternatives/fastlane) - full feature-by-feature comparison with command mapping
- [GPC vs gradle-play-publisher](/alternatives/gradle-play-publisher) - Gradle plugin vs standalone CLI
- [Android Release Automation](/alternatives/android-release-automation) - broader automation landscape
- [Using GPC with Google's Android CLI](/guide/android-cli-interop) - agent workflow combining both tools

## Getting Started with GPC

```bash
npm install -g @gpc-cli/cli
gpc auth login --service-account path/to/key.json
gpc doctor
gpc status
```

[Installation](/guide/installation) | [Quick Start](/guide/quick-start) | [Full Command Reference](/commands/)
