---
outline: deep
---

# What is GPC?

GPC is a TypeScript CLI that wraps the entire Google Play Developer API v3 into a single command-line tool. It covers 162 API endpoints across 10 command groups: releases, listings, reviews, vitals, subscriptions, in-app products, purchases, reports, testers, and user management.

GPC replaces fragmented tooling (Fastlane supply, gradle-play-publisher, Console UI) with one tool that works identically in your terminal and in CI/CD pipelines.

## What GPC Does

| Domain | Commands | Description |
|--------|----------|-------------|
| **Releases** | `releases upload`, `releases promote`, `releases rollout`, `publish` | Upload AAB/APK, promote across tracks, manage staged rollouts |
| **Listings** | `listings get`, `listings push`, `listings pull`, `listings images` | Store metadata, screenshots, localization, Fastlane format |
| **Reviews** | `reviews list`, `reviews reply`, `reviews export` | Filter by stars/language/time, reply, export to CSV |
| **Vitals** | `vitals crashes`, `vitals anr`, `vitals startup`, `vitals rendering` | Crash rates, ANR, startup times, frame rates, CI quality gates |
| **Subscriptions** | `subscriptions list`, `subscriptions create`, `subscriptions offers` | Base plans, offers, activation, price migration |
| **In-App Products** | `iap list`, `iap create`, `iap sync` | Managed products, bulk sync from local files |
| **Purchases** | `purchases get`, `purchases acknowledge`, `orders refund` | Purchase verification, consumption, voided purchases |
| **Reports** | `reports download financial`, `reports download stats` | Earnings, installs, crashes, ratings CSV downloads |
| **Testers** | `testers list`, `testers add`, `testers import` | Track-scoped tester management, CSV bulk import |
| **Users** | `users list`, `users invite`, `users update` | Developer account user and permission management |

## Architecture

GPC is a monorepo with 7 packages:

```
gpc/
  packages/cli        CLI entry point (Commander.js)
  packages/core       Business logic and orchestration
  packages/api        Typed Google Play API client
  packages/auth       Service account, OAuth, ADC
  packages/config     Config loading, env vars, profiles
  packages/plugin-sdk Plugin interface and lifecycle hooks
  plugins/plugin-ci   CI/CD helpers (GitHub Actions summaries)
```

Dependency flow: `cli` calls `core`, which calls `api`, `auth`, and `config`. The CLI never touches the API directly.

## Comparison with Alternatives

| Feature | GPC | Fastlane supply | gradle-play-publisher | Console UI |
|---------|-----|-----------------|----------------------|------------|
| **Language** | TypeScript (Node.js) | Ruby | Kotlin (Gradle) | Browser |
| **Install** | `npm install -g @gpc-cli/cli` | `gem install fastlane` | Gradle plugin | None |
| **Releases** | Upload, promote, rollout, halt, resume, complete | Upload, promote | Upload, promote | Manual |
| **Staged rollouts** | `rollout increase`, `rollout halt`, `rollout resume` | Limited | Limited | Manual |
| **Listings** | Pull/push, images, Fastlane format compatible | Pull/push, images | Listings only | Manual |
| **Reviews** | List, filter, reply, export CSV | None | None | Manual |
| **Vitals** | Crashes, ANR, startup, rendering, battery, memory | None | None | View only |
| **CI quality gates** | `--threshold` flag, exit code 6 | None | None | None |
| **Subscriptions** | Full CRUD, base plans, offers, price migration | None | None | Manual |
| **In-app products** | CRUD, bulk sync from files | None | None | Manual |
| **Purchases** | Verify, acknowledge, consume, refund | None | None | Manual |
| **Reports** | Financial and stats CSV download | None | None | Download |
| **Testers** | List, add, remove, CSV import | None | None | Manual |
| **User management** | Invite, update, remove, per-app grants | None | None | Manual |
| **Plugins** | SDK with lifecycle hooks | Lanes + actions | None | None |
| **Output formats** | `table`, `json`, `yaml`, `markdown` | Stdout | Stdout | N/A |
| **Dry run** | All write operations | None | None | N/A |
| **Auth methods** | Service account, OAuth, ADC, env var | Service account | Service account | Google account |
| **Profiles** | Multi-profile switching | None | None | N/A |
| **API endpoints** | 162 | ~15 | ~10 | All (manual) |

## Key Design Decisions

- **Output-first**: Every command returns structured data. TTY gets `table` format; pipes get `json` automatically. Override with `--output`.
- **Idempotent operations**: Uploads use checksums. Releases are safe to retry.
- **Fail fast**: Inputs are validated before API calls. Auth issues surface immediately. Every error includes a code, message, and actionable suggestion.
- **CI-native**: Non-interactive by default in CI. Vitals thresholds exit with code 6. Markdown output for GitHub Actions step summaries.

## Next Steps

- [Installation](/guide/installation) -- Install GPC via Homebrew, npm, standalone binary, or from source
- [Quick Start](/guide/quick-start) -- Authenticate, upload, promote, and monitor in 5 minutes
- [Authentication](/guide/authentication) -- Set up service accounts, OAuth, or ADC
- [Configuration](/guide/configuration) -- Config files, environment variables, and profiles
