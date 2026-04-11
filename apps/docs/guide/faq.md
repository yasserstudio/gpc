---
outline: deep
---

# Frequently Asked Questions

## Getting Started

### What authentication method should I use?

Use a **service account** for CI/CD pipelines and automation. Use **OAuth** for local development and interactive use. Application Default Credentials (ADC) work automatically in Google Cloud environments (Cloud Build, Cloud Run, GKE). See [Authentication](./authentication) for setup instructions.

### How do I install GPC?

Three options:

```bash
# npm (requires Node.js 20+)
npm install -g @gpc-cli/cli

# Homebrew (macOS/Linux)
brew install yasserstudio/tap/gpc

# Standalone binary (no dependencies)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

See [Installation](./installation) for full details including Docker and CI/CD setup.

### What Node.js version is required?

Node.js 20 or later. If you use the standalone binary or Homebrew, no Node.js installation is needed.

### How do I update GPC?

```bash
# npm
npm update -g @gpc-cli/cli

# Homebrew
brew upgrade gpc

# Standalone binary — download the latest from GitHub Releases
```

GPC checks for updates automatically (once per 24 hours) and shows a notification when a new version is available.

## Comparison & Migration

### How is GPC different from Fastlane supply?

GPC covers 216 API endpoints — Fastlane supply covers about 20. GPC gives you reviews, vitals, subscriptions, purchases, reports, user management, **Managed Google Play private app publishing** (v0.9.56, first Android CLI to support it), and more. It has no Ruby dependency, supports structured JSON output for CI/CD, and starts in under 500ms (vs 2-3 seconds for Fastlane).

GPC reads Fastlane's `metadata/` directory format natively, so migration starts with zero file changes. See [Migrating from Fastlane](../migration/from-fastlane) for a step-by-step guide.

### Why TypeScript and not Go?

Android developers already have Node.js — React Native, build tools, linters. `npm install` is in every CI pipeline. And `@gpc-cli/api` works as a standalone typed SDK in any Node.js project — build dashboards, Slack bots, or custom automation on top of the same API client GPC uses. A Go binary can't offer that.

### Can I migrate from the Play Console UI?

Yes. See [Migrating from Console UI](../migration/from-console-ui) for a mapping of every Play Console UI task to its GPC command equivalent.

## CI/CD

### Can I use GPC in CI/CD?

Yes. GPC is designed for CI/CD:

- **JSON output** when piped (automatic)
- **Semantic exit codes** (0-6) for branching logic
- **Environment variable config** (`GPC_SERVICE_ACCOUNT`, `GPC_APP`)
- **`--dry-run`** on every write operation
- **`--no-interactive`** mode (auto-detected in CI)

See the [CI/CD guide](../ci-cd/) for copy-pasteable GitHub Actions, GitLab CI, Bitbucket, and CircleCI configs.

### Is it stable enough for production CI/CD?

1,892 tests across 7 packages. 90%+ line coverage on all core packages. Every write operation supports `--dry-run`. Semantic exit codes for CI branching. Validated against production apps. The CLI is in a pre-release stability soak before v1.0.

## Configuration

### Does GPC support multiple apps?

Yes. Use the `--app` flag per command, set `GPC_APP` as an environment variable, or set up named [profiles](./configuration#profiles) for different apps/accounts.

### Is GPC free?

Yes. GPC is free to use. Source code is available at [github.com/yasserstudio/gpc](https://github.com/yasserstudio/gpc).

## Features

### Can I extend GPC with plugins?

Yes. GPC has a plugin system with lifecycle hooks (`beforeCommand`, `afterCommand`, `onError`), custom command registration, and API request interception. A first-party CI plugin (`@gpc-cli/plugin-ci`) is included. See [Plugin Development](../advanced/plugins) for the SDK documentation.

### What is the difference between `iap` and `otp` commands?

The `iap` commands use the legacy in-app purchases API. The `otp` (one-time products) commands use the modern monetization API with richer features like regional pricing, product tags, and offer management. New projects should use `otp`.

### Can AI assistants use GPC?

Yes. GPC ships 16 agent skills that teach AI coding assistants (Claude Code, Cursor, etc.) how to use every GPC workflow:

```bash
gpc install-skills
```

The interactive wizard lets you pick skills and target agents. See [Agent Skills](../advanced/skills) for the full list.

### What Google Play APIs does GPC cover?

216 endpoints across the Android Publisher API v3, Play Developer Reporting API v1beta1, and Play Custom App Publishing API v1. This includes apps, releases, tracks, listings, images, reviews, vitals, subscriptions, in-app products, one-time products, purchases, users, testers, device tiers, data safety, recovery, external transactions, internal sharing, generated APKs, and **Managed Google Play private app publishing** (new in v0.9.56 — first Android publishing CLI to support this). See [API Coverage](../reference/api-coverage) for the full endpoint map.

## Color & Output

### How do I disable colored output?

Three ways:

```bash
# Per-command flag
gpc status --no-color

# Environment variable (standard no-color.org spec)
NO_COLOR=1 gpc status

# GPC-specific variable
GPC_NO_COLOR=1 gpc status
```

All three disable ANSI color sequences. `NO_COLOR` is checked first per the [no-color.org](https://no-color.org) standard.

### How do I force colors in CI?

CI environments (where stdout is not a TTY) output no color by default. To force color — for example to preserve color in GitHub Actions logs — use `FORCE_COLOR`:

```bash
FORCE_COLOR=1 gpc vitals crashes --app com.example.myapp
```

`FORCE_COLOR` is ignored if `NO_COLOR` or `GPC_NO_COLOR` is also set.

### What shows a first-run hint?

When GPC detects no configuration file exists and is not running in JSON, CI, or quiet mode, it shows a one-time hint on stderr:

```
✦ First time? Run gpc config init to get set up.
```

Run `gpc config init` to start the interactive setup wizard.

## Troubleshooting

### How do I report a bug?

Open an issue at [github.com/yasserstudio/gpc/issues](https://github.com/yasserstudio/gpc/issues). Include the output of `gpc doctor` and any error messages. Use `GPC_DEBUG=1` to capture detailed logs.

### How do I diagnose setup problems?

Run `gpc doctor` — it checks your authentication, configuration, API connectivity, and version. See [Troubleshooting](../advanced/troubleshooting) for common issues and solutions.
