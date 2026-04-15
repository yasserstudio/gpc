---
outline: deep
---

# GPC vs Fastlane Supply

If you are evaluating alternatives to Fastlane for Google Play automation, here is how GPC compares.

## At a Glance

|                         | **GPC**                       | **Fastlane supply** |
| ----------------------- | ----------------------------- | ------------------- |
| API coverage            | **217 endpoints**             | ~20                 |
| Runtime                 | Node.js or standalone binary  | Ruby + Bundler      |
| Cold start              | <500ms                        | 2-3s                |
| Reviews & Vitals        | Yes                           | No                  |
| Subscriptions & IAP     | Yes                           | No                  |
| **Managed Google Play** | **Yes (Play Custom App API)** | No                  |
| Preflight scanner       | **9 offline policy checks**   | No                  |
| CI/CD native            | JSON + exit codes + env vars  | Partial             |
| Plugin system           | Yes (lifecycle hooks)         | Actions (different) |
| Interactive mode        | Yes (guided prompts)          | No                  |
| Test suite              | 1,941 tests, 90%+ coverage    | --                  |

## What GPC Covers That Fastlane Does Not

These capabilities have **no Fastlane equivalent**:

| GPC Command              | What it does                                        |
| ------------------------ | --------------------------------------------------- |
| `gpc vitals crashes`     | Query crash rates with CI threshold gates           |
| `gpc vitals anr`         | ANR rates with dimension grouping                   |
| `gpc reviews list --all` | Auto-paginate all reviews, filter by stars/language |
| `gpc reviews reply`      | Reply to reviews from the terminal                  |
| `gpc subscriptions list` | Manage subscriptions, base plans, and offers        |
| `gpc preflight app.aab`  | 9 offline policy scanners before upload             |
| `gpc status`             | Releases + vitals + reviews in one command          |
| `gpc bundle analyze`     | Per-module AAB/APK size breakdown with CI gates     |
| `gpc rtdn decode`        | Decode Real-Time Developer Notifications            |
| `gpc doctor`             | 20 automated setup checks with `--fix`              |
| `gpc diff`               | Preview release state across all tracks             |

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

**Dependency fatigue.** Fastlane requires Ruby, Bundler, and 150+ gems. GPC is one `npm install` or a standalone binary.

**API coverage.** Fastlane covers the basics: upload, metadata, screenshots. GPC covers the entire Google Play Developer API: vitals, reviews, subscriptions, purchases, reports, recovery, device tiers, and more.

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

[Full documentation](/) | [Quick Start](/guide/quick-start) | [Migration from Fastlane](/migration/from-fastlane)
