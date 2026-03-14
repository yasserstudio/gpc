# @gpc-cli/cli

<p align="center"><strong>Ship Android apps from your terminal.</strong></p>

<p align="center">
The complete CLI for Google Play — 187 API endpoints, one tool.<br>
Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@gpc-cli/cli"><img src="https://img.shields.io/npm/v/@gpc-cli/cli?color=00D26A" alt="npm version"></a>
  <a href="https://github.com/yasserstudio/gpc"><img src="https://img.shields.io/github/stars/yasserstudio/gpc" alt="GitHub Stars"></a>
  <img src="https://img.shields.io/badge/Tests-1358_passing-00D26A" alt="Tests">
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

## Quick Start

```bash
# Authenticate
gpc auth login --service-account path/to/key.json

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

| Group             | Examples                                                       |
| ----------------- | -------------------------------------------------------------- |
| **Releases**      | `upload`, `promote`, `rollout increase/halt/resume`, `publish` |
| **Listings**      | `pull`, `push`, `images upload/delete`, Fastlane format        |
| **Reviews**       | `list`, `reply`, `export --format csv`                         |
| **Vitals**        | `crashes`, `anr`, `startup`, `rendering`, `battery`, `memory`  |
| **Bundle**        | `analyze` (size breakdown), `compare` (size diff)              |
| **Subscriptions** | `list`, `create`, `update`, `base-plans`, `offers`             |
| **IAP**           | `list`, `create`, `sync --dir products/`, `batch-get/update`   |
| **Purchases**     | `get`, `acknowledge`, `cancel`, `refund`, `voided list`        |
| **Reports**       | `download financial`, `download stats`                         |
| **Testers**       | `add`, `remove`, `import --file testers.csv`                   |
| **Users**         | `invite`, `update`, `remove`, per-app grants                   |

## CI/CD Ready

JSON output when piped. Formatted tables in your terminal. Semantic exit codes (0-6) your CI can react to.

```yaml
- name: Upload
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.myapp
  run: |
    npm install -g @gpc-cli/cli
    gpc releases upload app.aab --track internal
```

Every write operation supports `--dry-run`.

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
