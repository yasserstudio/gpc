---
outline: deep
---

# What is GPC?

GPC is a command-line tool that gives you access to the **entire Google Play Developer API** from your terminal. One tool replaces the Play Console UI, Fastlane supply, gradle-play-publisher, and any custom scripts you've been maintaining.

Upload a release, promote to production, check crash rates, reply to reviews, manage subscriptions — all without opening a browser.

```bash
gpc releases upload app.aab --track beta
gpc releases promote --from beta --to production --rollout 10
gpc vitals crashes --threshold 2.0    # Exit code 6 if breached
gpc reviews list --stars 1-2 --since 7d
```

## What GPC Covers

208 API endpoints across every Google Play domain:

| Domain              | Commands                                                             | What it does                                                   |
| ------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Releases**        | `releases upload`, `releases promote`, `releases rollout`, `publish` | Upload AAB/APK, promote across tracks, manage staged rollouts  |
| **Listings**        | `listings get`, `listings push`, `listings pull`, `listings images`  | Store metadata, screenshots, localization, Fastlane format     |
| **Reviews**         | `reviews list`, `reviews reply`, `reviews export`                    | Filter by stars/language/time, reply, export to CSV            |
| **Vitals**          | `vitals crashes`, `vitals anr`, `vitals startup`, `vitals compare`   | Crash rates, ANR, startup times, frame rates, CI quality gates |
| **Subscriptions**   | `subscriptions list`, `subscriptions create`, `subscriptions offers` | Base plans, offers, activation, price migration                |
| **In-App Products** | `iap list`, `iap create`, `iap sync`, `otp list`, `otp offers`       | Managed products, one-time products, bulk sync from files      |
| **Purchases**       | `purchases get`, `purchases acknowledge`, `orders refund`            | Purchase verification, consumption, voided purchases           |
| **Reports**         | `reports download financial`, `reports download stats`               | Earnings, installs, crashes, ratings CSV downloads             |
| **Testers**         | `testers list`, `testers add`, `testers import`                      | Track-scoped tester management, CSV bulk import                |
| **Users**           | `users list`, `users invite`, `users update`                         | Developer account user and permission management               |
| **Bundle**          | `bundle analyze`, `bundle compare`                                   | AAB/APK size analysis, cross-build comparison, CI size gates   |

Plus: device tiers, internal sharing, data safety, recovery actions, external transactions, and more. See the [full command reference](/commands/).

## Why GPC Over Alternatives?

| Feature              | GPC                                                | Fastlane supply        | gradle-play-publisher | Console UI     |
| -------------------- | -------------------------------------------------- | ---------------------- | --------------------- | -------------- |
| **API endpoints**    | 208                                                | ~20                    | ~15                   | All (manual)   |
| **Language**         | TypeScript (Node.js)                               | Ruby                   | Kotlin (Gradle)       | Browser        |
| **Install**          | `npm install -g @gpc-cli/cli` or standalone binary | `gem install fastlane` | Gradle plugin         | None           |
| **Releases**         | Upload, promote, rollout, halt, resume, complete   | Upload, promote        | Upload, promote       | Manual         |
| **Listings**         | Pull/push, images, Fastlane format compatible      | Pull/push, images      | Listings only         | Manual         |
| **Reviews**          | List, filter, reply, export CSV                    | None                   | None                  | Manual         |
| **Vitals**           | Crashes, ANR, startup, rendering, battery, memory  | None                   | None                  | View only      |
| **CI quality gates** | `--threshold` flag, exit code 6                    | None                   | None                  | None           |
| **Subscriptions**    | Full CRUD, base plans, offers, price migration     | None                   | None                  | Manual         |
| **In-app products**  | CRUD, bulk sync from files                         | None                   | None                  | Manual         |
| **Purchases**        | Verify, acknowledge, consume, refund               | None                   | None                  | Manual         |
| **Reports**          | Financial and stats CSV download                   | None                   | None                  | Download       |
| **Plugins**          | SDK with lifecycle hooks                           | Lanes + actions        | None                  | None           |
| **Output formats**   | `table`, `json`, `yaml`, `markdown`                | Stdout                 | Stdout                | N/A            |
| **Dry run**          | All write operations                               | None                   | None                  | N/A            |
| **Auth methods**     | Service account, OAuth, ADC, env var               | Service account        | Service account       | Google account |
| **Cold start**       | <500ms                                             | 2-3s                   | 3-5s                  | 5-10s          |

## Architecture

GPC is a TypeScript monorepo with 7 publishable npm packages:

```
gpc/
  packages/cli        CLI entry point (Commander.js)
  packages/core       Business logic and orchestration
  packages/api        Typed Google Play API v3 client
  packages/auth       Service account, OAuth, ADC
  packages/config     Config loading, env vars, profiles
  packages/plugin-sdk Plugin interface and lifecycle hooks
  plugins/plugin-ci   CI/CD helpers (GitHub Actions summaries)
```

Dependency flow: `cli` calls `core`, which calls `api`, `auth`, and `config`. The CLI never touches the API directly.

Each package is independently installable. Use `@gpc-cli/api` and `@gpc-cli/auth` as a standalone TypeScript SDK for the Google Play API in your own projects. See [SDK Usage](/advanced/sdk-usage).

## Key Design Decisions

- **Output-first**: Every command returns structured data. TTY gets `table` format; pipes get `json` automatically. Override with `--output`.
- **Idempotent operations**: Uploads use checksums. Releases are safe to retry.
- **Fail fast**: Inputs are validated before API calls. Auth issues surface immediately. Every error includes a code, message, and actionable suggestion.
- **CI-native**: Non-interactive by default in CI. Vitals thresholds exit with code 6. Markdown output for GitHub Actions step summaries.
- **Dry-run everything**: Every write operation supports `--dry-run`. Test your pipeline against real data without shipping anything.

## Next Steps

- [Installation](/guide/installation) — Install via Homebrew, npm, standalone binary, or from source
- [Quick Start](/guide/quick-start) — Authenticate, upload, promote, and monitor in 5 minutes
- [Authentication](/guide/authentication) — Set up service accounts, OAuth, or ADC
- [Configuration](/guide/configuration) — Config files, environment variables, and profiles
- [CI/CD Integration](/ci-cd/) — GitHub Actions, GitLab CI, Bitbucket, CircleCI recipes
