---
outline: deep
---

# GPC vs Fastlane Supply

If you are evaluating alternatives to Fastlane for Google Play automation, here is how GPC compares.

## At a Glance

|                         | **GPC**                                                    | **Fastlane supply** |
| ----------------------- | ---------------------------------------------------------- | ------------------- |
| API coverage            | **217 endpoints**                                          | ~20                 |
| Runtime                 | Node.js or standalone binary                               | Ruby + Bundler      |
| Cold start              | <500ms                                                     | 2-3s                |
| Reviews & Vitals        | Yes                                                        | No                  |
| Subscriptions & IAP     | Yes                                                        | No                  |
| **Managed Google Play** | **Yes (Play Custom App API)**                              | No                  |
| Preflight scanner       | **9 offline policy checks**                                | No                  |
| CI/CD native            | JSON + exit codes + env vars                               | Partial             |
| Plugin system           | Yes (lifecycle hooks)                                      | Actions (different) |
| Interactive mode        | Yes (guided prompts)                                       | No                  |
| Release notes generator | **`gpc changelog generate`** (clusters, lints, LLM prompt) | No                  |
| Test suite              | 2,093 tests, 90%+ coverage                                 | --                  |

## What GPC Covers That Fastlane Does Not

These capabilities have **no Fastlane equivalent**:

| GPC Command              | What it does                                                           |
| ------------------------ | ---------------------------------------------------------------------- |
| `gpc vitals crashes`     | Query crash rates with CI threshold gates                              |
| `gpc vitals anr`         | ANR rates with dimension grouping                                      |
| `gpc reviews list --all` | Auto-paginate all reviews, filter by stars/language                    |
| `gpc reviews reply`      | Reply to reviews from the terminal                                     |
| `gpc subscriptions list` | Manage subscriptions, base plans, and offers                           |
| `gpc preflight app.aab`  | 9 offline policy scanners before upload                                |
| `gpc status`             | Releases + vitals + reviews in one command                             |
| `gpc bundle analyze`     | Per-module AAB/APK size breakdown with CI gates                        |
| `gpc rtdn decode`        | Decode Real-Time Developer Notifications                               |
| `gpc doctor`             | 20 automated setup checks with `--fix`                                 |
| `gpc diff`               | Preview release state across all tracks                                |
| `gpc changelog generate` | Generate GitHub Release notes from local commits with smart clustering |

## Command Mapping

If you are migrating from Fastlane, most commands map directly:

| Fastlane                                 | GPC                                        |
| ---------------------------------------- | ------------------------------------------ |
| `fastlane supply --apk app.apk`          | `gpc releases upload app.apk`              |
| `fastlane supply --aab app.aab`          | `gpc releases upload app.aab`              |
| `fastlane supply --track beta`           | `gpc releases upload app.aab --track beta` |
| `supply(rollout: "0.1")`                 | `gpc releases upload --rollout 10`         |
| `fastlane supply --skip_upload_metadata` | `gpc listings push --dir metadata/`        |
| `fastlane supply init`                   | `gpc listings pull --dir metadata/`        |

::: warning Rollout percentage
Fastlane uses decimals (0.1 = 10%). GPC uses percentages (10 = 10%). This is the most common migration mistake.
:::

See the full [Migration Guide](/migration/from-fastlane) for CI workflow examples and edge cases.

## Why Developers Switch

**Dependency fatigue.** Fastlane requires Ruby, Bundler, and 150+ gems. GPC is one `npm install` or a standalone binary. This has been a known pain point across the lifetime of Fastlane. Felix Krause, Fastlane's creator, acknowledged it [on Hacker News in 2015](https://news.ycombinator.com/item?id=8894653):

> "You are right, installation is not super easy right now, due to Ruby dependencies, which also depend on Nokogiri and phantomjs."
>
> — Felix Krause (@krausefx), Fastlane creator

The Ruby dependency has persisted for the decade since. In 2021, a developer summarized the ecosystem cost [on Hacker News](https://news.ycombinator.com/item?id=29576183):

> "A lot of iOS build automation tooling is dependent on Ruby. fastlane is the de-facto standard in this space, which is a Ruby gem and CLI application. As a result, every iOS developer almost inevitably has to learn at least some basic Ruby to cobble together a deployment pipeline for their app."

GPC is TypeScript and ships a standalone binary for teams that do not want Ruby, Bundler, or `rbenv` anywhere near their CI runners.

**API coverage.** Fastlane covers the basics: upload, metadata, screenshots. GPC covers the entire Google Play Developer API: vitals, reviews, subscriptions, purchases, reports, recovery, device tiers, and more. Specific gaps in Fastlane supply have been open as GitHub Issues for years. One representative example, [filed against fastlane/fastlane in January 2023](https://github.com/fastlane/fastlane/issues/21004):

> "[supply] can't upload changelog unless all languages are translated"

`gpc changelog generate --target play-store --locales auto --ai` handles the multilingual changelog case end-to-end. Each locale gets its own 500-character budget; the AI-translation flag (v0.9.63) fills non-source locales using the user's own LLM key.

**CI integration.** GPC outputs structured JSON when piped, uses semantic exit codes (0-6), and reads configuration from environment variables. No wrapper scripts needed.

**Preflight scanning.** GPC can scan your AAB against Google Play policies before upload — offline, free, and CI-ready. No other tool does this.

## Getting Started

```bash
npm install -g @gpc-cli/cli
gpc auth login --service-account path/to/key.json
gpc doctor
gpc status
```

Every write operation supports `--dry-run`. Works with your existing Google Play service account. No new credentials required.

## Frequently Asked Questions

### Is GPC a drop-in replacement for Fastlane supply?

For uploads, tracks, rollouts, and metadata sync, yes. Most commands map one-to-one with the same service account key and Fastlane metadata directory format. The [migration guide](/migration/from-fastlane) documents every mapping. For the ~197 Google Play API endpoints Fastlane does not cover (vitals, reviews, subscriptions, reports, Managed Google Play), GPC adds capability rather than replacing it.

### Does my existing Google Play service account work with GPC?

Yes. GPC uses the same Google Play Developer API v3 service account you already created for Fastlane. No new credentials, no additional IAM roles, no re-verification step. `gpc auth login --service-account path/to/key.json` reuses the key file directly.

### Can I run GPC alongside Fastlane during migration?

Yes. They do not conflict. A common migration pattern is to keep Fastlane's `fastlane supply` lane for uploads while adding GPC for capabilities Fastlane does not cover (`gpc preflight`, `gpc vitals`, `gpc reviews`). Once the team is comfortable, the upload step can be migrated to `gpc releases upload` and Fastlane removed.

### How much of the Fastlane supply API does GPC replace?

Fastlane supply covers roughly 20 Google Play Developer API endpoints. GPC covers 217 across three Google APIs (Android Publisher v3, Play Developer Reporting v1beta1, Play Custom App Publishing v1). That is an additional ~197 capabilities, including reviews, vitals (crashes, ANR, startup, rendering, battery, memory), subscriptions, in-app products, financial reports, and private enterprise app publishing.

### Do I need to rewrite my Fastfile?

No. GPC is a standalone CLI — it does not require the Fastlane DSL, a Fastfile, or a Ruby runtime. If you still use Fastlane for iOS, your existing Fastfile stays unchanged. If you are migrating fully off Fastlane, replace `fastlane supply` calls in your Fastfile with direct `gpc releases upload` invocations in your CI script.

[Full documentation](/) | [Quick Start](/guide/quick-start) | [Migration from Fastlane](/migration/from-fastlane)
