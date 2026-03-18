# @gpc-cli/cli

<p align="center"><strong>Ship Android apps from your terminal.</strong></p>

<p align="center">
The complete CLI for Google Play — 187 API endpoints, one tool.<br>
Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@gpc-cli/cli"><img src="https://img.shields.io/npm/v/@gpc-cli/cli?color=00D26A" alt="npm version"></a>
  <a href="https://github.com/yasserstudio/gpc"><img src="https://img.shields.io/github/stars/yasserstudio/gpc" alt="GitHub Stars"></a>
  <img src="https://img.shields.io/badge/Tests-1504_passing-00D26A" alt="Tests">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

## Install

```bash
# npm (includes plugin support)
npm install -g @gpc-cli/cli

# Homebrew (macOS/Linux)
brew install yasserstudio/tap/gpc

# Standalone binary (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

Free. Open-source. No account required beyond your existing Google Play service account.

## Quick Start

```bash
# Authenticate
gpc auth login --service-account path/to/key.json

# Verify your setup
gpc doctor

# App health at a glance — releases, vitals, and reviews in one command
gpc status

# Upload and release
gpc releases upload app.aab --track internal

# Promote to production
gpc releases promote --from internal --to production --rollout 10

# Monitor reviews
gpc reviews list --stars 1-3 --since 7d
```

## App Health at a Glance

```
$ gpc status

App: com.example.myapp · My App  (fetched 10:42:01 AM)

RELEASES
  production   v1.4.2   completed    —
  beta         v1.5.0   inProgress  10%
  internal     v1.5.1   draft        —

VITALS  (last 7 days)
  crashes     0.80%  ✓    anr         0.20%  ✓
  slow starts 2.10%  ✓    slow render 4.30%  ⚠

REVIEWS  (last 30 days)
  ★ 4.6   142 new   89% positive   ↑ from 4.4
```

6 parallel API calls, results in under 3 seconds. Results cached — `--cached` skips the network entirely.

## What You Get

187 API endpoints across these command groups:

| Group             | What you can do                                                                       |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Releases**      | Upload, promote, rollout increase/halt/resume, end-to-end `publish`                  |
| **Listings**      | Pull and push store listings, upload screenshots — works with Fastlane metadata format |
| **Reviews**       | Filter by stars, reply to users, export to CSV                                        |
| **Vitals**        | Crash rates, ANR, startup, rendering — with CI threshold gates                        |
| **Bundle**        | Per-module size breakdown, build-to-build diff, size CI gates                         |
| **Subscriptions** | Create and manage base plans, offers, and pricing                                      |
| **IAP**           | Sync products from local files, batch get and update                                  |
| **Purchases**     | Verify, acknowledge, cancel, refund, list voided                                      |
| **Reports**       | Download financial and stats reports                                                  |
| **Testers**       | Add, remove, import from CSV                                                           |
| **Users**         | Invite, update, remove, manage per-app grants                                          |

## CI/CD Ready

JSON output when piped. Formatted tables in your terminal. Semantic exit codes (0–6) your CI can react to. Every write operation supports `--dry-run`.

```yaml
- name: Upload
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.myapp
  run: |
    npm install -g @gpc-cli/cli
    gpc releases upload app.aab --track internal
```

Already on Fastlane? See the [migration guide](https://yasserstudio.github.io/gpc/migration/from-fastlane) — most commands map one-to-one.

## Part of the GPC Monorepo

| Package                                                                  | Description                                  |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| **@gpc-cli/cli**                                                         | CLI entry point (this package)               |
| [@gpc-cli/core](https://www.npmjs.com/package/@gpc-cli/core)             | Business logic and orchestration             |
| [@gpc-cli/api](https://www.npmjs.com/package/@gpc-cli/api)               | Typed Google Play API v3 client              |
| [@gpc-cli/auth](https://www.npmjs.com/package/@gpc-cli/auth)             | Authentication (service account, OAuth, ADC) |
| [@gpc-cli/config](https://www.npmjs.com/package/@gpc-cli/config)         | Configuration and profiles                   |
| [@gpc-cli/plugin-sdk](https://www.npmjs.com/package/@gpc-cli/plugin-sdk) | Plugin interface and lifecycle hooks         |
| [@gpc-cli/plugin-ci](https://www.npmjs.com/package/@gpc-cli/plugin-ci)   | CI/CD helpers                                |

## Documentation

Full docs at **[yasserstudio.github.io/gpc](https://yasserstudio.github.io/gpc/)**

## License

MIT
