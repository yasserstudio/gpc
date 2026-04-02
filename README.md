<p align="center">
  <img src="./assets/icon-200.png" alt="GPC icon" width="120">
</p>

<p align="center">
  by<br>
  <a href="https://yasser.studio"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/yasser-studio-logo-white.svg"><img src="./assets/yasser-studio-logo.svg" alt="Yasser's Studio" height="30"></picture></a>
</p>

# GPC — Google Play Console CLI

<p align="center">
  <a href="https://www.npmjs.com/package/@gpc-cli/cli"><img src="https://img.shields.io/npm/v/@gpc-cli/cli?style=for-the-badge&color=00D26A" alt="npm version"></a>
  <a href="https://github.com/yasserstudio/gpc/stargazers"><img src="https://img.shields.io/github/stars/yasserstudio/gpc?style=for-the-badge" alt="GitHub Stars"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
  <a href="https://www.npmjs.com/package/@gpc-cli/cli"><img src="https://img.shields.io/npm/dm/@gpc-cli/cli?style=for-the-badge&color=00BFA5" alt="npm downloads"></a>
  <a href="https://yasserstudio.github.io/gpc/"><img src="https://img.shields.io/badge/Docs-yasserstudio.github.io%2Fgpc-00D26A?style=for-the-badge" alt="Documentation"></a>
  <img src="https://img.shields.io/badge/Tests-1869_passing-00D26A?style=for-the-badge" alt="Tests">
  <img src="https://img.shields.io/badge/Coverage-90%25+-00BFA5?style=for-the-badge" alt="Coverage">
</p>

<p align="center"><strong>Ship Android apps from your terminal.</strong></p>

<p align="center"><sub>Built for Android developers, release engineers, and DevOps teams who are done clicking through the Play Console.</sub></p>

<p align="center">
The complete CLI for Google Play — 209 API endpoints, one tool.<br>
Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.<br>
<strong>Plus an offline compliance scanner that catches policy violations before you upload.</strong><br>
</p>

<p align="center"><a href="#install"><strong>Install in 30 seconds</strong></a> · <a href="https://yasserstudio.github.io/gpc/guide/quick-start">Quick Start Guide</a> · <a href="https://github.com/yasserstudio/gpc">GitHub</a></p>

---

## Install

```bash
# npm (includes plugin support)
npm install -g @gpc-cli/cli

# Homebrew (macOS/Linux)
brew install yasserstudio/tap/gpc

# Standalone binary — macOS/Linux (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh

# Standalone binary — Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.ps1 | iex
```

Free to use. No account required beyond your existing Google Play service account.

---

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

# Promote to production with staged rollout
gpc releases promote --from internal --to production --rollout 10

# Monitor reviews
gpc reviews list --stars 1-3 --since 7d
```

<p align="center">
  <img src="./assets/demo.svg" alt="gpc status — releases, vitals, reviews at a glance" width="680">
</p>

---

## Why GPC?

Every Android release is the same ritual: open the Play Console, upload your AAB, copy-paste release notes, pick a track, set the rollout percentage, click through confirmation screens. Fifteen minutes of clicking, every single time.

GPC covers the **entire Google Play Developer API** in one CLI. 209 endpoints. No Ruby. No browser. No ceremony.

|                     | **GPC**                      | Fastlane supply | gradle-play-publisher | Console UI   |
| ------------------- | ---------------------------- | --------------- | --------------------- | ------------ |
| API coverage        | **209 endpoints**            | ~20             | ~15                   | All (manual) |
| Runtime             | Node.js or standalone binary | Ruby + Bundler  | JVM                   | Browser      |
| Cold start          | <500ms                       | 2-3s            | 3-5s                  | 5-10s        |
| Reviews & Vitals    | Yes                          | No              | No                    | Yes (manual) |
| Subscriptions & IAP | Yes                          | No              | No                    | Yes (manual) |
| CI/CD native        | JSON + exit codes + env vars | Partial         | Gradle tasks          | No           |
| Preflight scanner   | **9 offline policy checks**  | No              | No                    | No           |
| Interactive mode    | Yes (guided prompts)         | No              | No                    | N/A          |
| Test suite          | 1,869 tests, 90%+ coverage   |                 |                       |              |

Already on Fastlane? See the [migration guide](https://yasserstudio.github.io/gpc/migration/from-fastlane) — most commands map one-to-one.

---

## Ship

From first upload to full production rollout, without touching a browser.

```bash
gpc publish app.aab --track beta --notes "Bug fixes"      # End-to-end flow
gpc releases upload app.aab --track internal               # Upload to any track
gpc releases promote --from beta --to production --rollout 5
gpc releases rollout increase --track production --to 50
gpc releases rollout halt --track production               # Emergency brake
gpc validate app.aab --track beta                          # Dry-run before committing
```

Manage store listings, screenshots, and localization. Works with Fastlane metadata format.

```bash
gpc listings pull --dir metadata/          # Download all listings
gpc listings push --dir metadata/          # Upload local changes
gpc listings images upload --lang en-US --type phoneScreenshots ./screens/*.png
```

---

## Monitor

Know if something broke before your users do.

```bash
gpc status                                 # Releases + vitals + reviews in one view
gpc status --watch 60                      # Live polling every 60 seconds
gpc status --all-apps                      # Check all your apps at once
gpc vitals crashes --threshold 2.0         # Exit code 6 if breached — CI gate
gpc reviews list --stars 1-2 --since 7d    # Filter reviews by stars and date
gpc reviews reply <id> --text "Thanks!"    # Reply without opening a browser
```

Handle monetization from the terminal.

```bash
gpc subscriptions list
gpc iap sync --dir products/
gpc pricing convert --from USD --amount 9.99
```

---

## Protect

Catch problems before Google does. No other tool does this.

```bash
gpc preflight app.aab                        # Run all 9 scanners
gpc preflight app.aab --fail-on error --json # CI quality gate (exit code 6)
gpc preflight permissions app.aab            # 18 restricted permissions audit
gpc preflight --source app/src               # Secrets, billing SDKs, tracking
```

9 scanners run in parallel: **manifest** (target SDK, debuggable, exported, foreground service types), **permissions** (18 restricted permissions), **native-libs** (64-bit compliance), **metadata** (listing limits, screenshots), **secrets** (AWS, Google, Stripe keys), **billing** (non-Play SDKs), **privacy** (tracking SDKs), **policy** (Families/COPPA), **size** (download warnings).

<p align="center">
  <img src="./assets/preflight.svg" alt="gpc preflight — 9 offline compliance scanners" width="680">
</p>

Diagnose your setup with 20 automated checks.

```bash
gpc doctor                  # Run all checks
gpc doctor --fix            # Auto-fix what it can
gpc doctor --json           # Structured output for CI
```

Analyze bundle size and catch regressions.

```bash
gpc bundle analyze app.aab                   # Per-module breakdown
gpc bundle compare old.aab new.aab           # Size diff between builds
gpc bundle analyze app.aab --threshold 150   # CI gate if > 150 MB
```

---

## CI/CD

Drop GPC into any pipeline. JSON output, semantic exit codes (0-6), env var config.

### GitHub Actions

```yaml
- name: Install GPC
  run: npm install -g @gpc-cli/cli

- name: Preflight Compliance Check
  run: gpc preflight app.aab --fail-on error

- name: Upload to Internal Track
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.myapp
  run: gpc releases upload app.aab --track internal

- name: Gate on Vitals
  run: |
    gpc vitals crashes --output json | jq -e '.data.crashRate < 2.0'
```

### GitLab CI

```yaml
deploy:
  image: node:20
  script:
    - npm install -g @gpc-cli/cli
    - gpc releases upload app.aab --track production --rollout 10
  variables:
    GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT
    GPC_APP: com.example.myapp
```

### Exit Codes

| Code | Meaning                               |
| ---- | ------------------------------------- |
| `0`  | Success                               |
| `1`  | General error                         |
| `2`  | Usage error (bad arguments)           |
| `3`  | Authentication error                  |
| `4`  | API error (rate limit, permission)    |
| `5`  | Network error                         |
| `6`  | Threshold breach (vitals CI alerting) |

See the full [CI/CD recipes](https://yasserstudio.github.io/gpc/ci-cd/) for GitHub Actions, GitLab CI, Bitbucket Pipelines, and CircleCI.

---

## Developer Experience

- **Smart output** — formatted tables in your terminal, structured JSON when piped or in CI. Override with `--output json|yaml|markdown`.
- **Dry run everything** — every write command supports `--dry-run`. Run your full pipeline against real data without publishing a thing.
- **Interactive prompts** — miss a required flag and GPC asks. In CI, it fails fast instead. Disable with `--no-interactive`.
- **Four auth methods** — service account, OAuth, env var, or Application Default Credentials.
- **Multiple accounts** — `gpc auth profiles`, `gpc auth switch`, `gpc auth whoami`.

---

## Packages

GPC is a TypeScript monorepo. Use the CLI from your terminal, or import the packages into your own projects as a standalone SDK.

| Package                                                                    | Description                                  |
| -------------------------------------------------------------------------- | -------------------------------------------- |
| [`@gpc-cli/cli`](https://www.npmjs.com/package/@gpc-cli/cli)               | CLI entry point — the `gpc` command          |
| [`@gpc-cli/core`](https://www.npmjs.com/package/@gpc-cli/core)             | Business logic and command orchestration     |
| [`@gpc-cli/api`](https://www.npmjs.com/package/@gpc-cli/api)               | Typed Google Play Developer API v3 client    |
| [`@gpc-cli/auth`](https://www.npmjs.com/package/@gpc-cli/auth)             | Authentication (service account, OAuth, ADC) |
| [`@gpc-cli/config`](https://www.npmjs.com/package/@gpc-cli/config)         | Configuration loading and profiles           |
| [`@gpc-cli/plugin-sdk`](https://www.npmjs.com/package/@gpc-cli/plugin-sdk) | Plugin interface for extensions              |
| [`@gpc-cli/plugin-ci`](https://www.npmjs.com/package/@gpc-cli/plugin-ci)   | CI/CD helpers and step summaries             |

See the [SDK usage guide](https://yasserstudio.github.io/gpc/advanced/sdk-usage) for building custom integrations with `@gpc-cli/api`.

---

## Documentation

Full docs at **[yasserstudio.github.io/gpc](https://yasserstudio.github.io/gpc/)**.

- [Installation](https://yasserstudio.github.io/gpc/guide/installation)
- [Quick Start](https://yasserstudio.github.io/gpc/guide/quick-start)
- [Commands Reference](https://yasserstudio.github.io/gpc/commands/)
- [CI/CD Recipes](https://yasserstudio.github.io/gpc/ci-cd/)
- [Environment Variables](https://yasserstudio.github.io/gpc/reference/environment-variables)
- [Architecture](https://yasserstudio.github.io/gpc/advanced/architecture)
- [Security](https://yasserstudio.github.io/gpc/advanced/security)
- [Migration from Fastlane](https://yasserstudio.github.io/gpc/migration/from-fastlane)

---

## Get Help

- [GitHub Discussions](https://github.com/yasserstudio/gpc/discussions) — questions, ideas, show what you built
- [Issues](https://github.com/yasserstudio/gpc/issues) — bug reports and feature requests
- `gpc doctor` — diagnose setup problems locally

---

## License

[MIT](./LICENSE)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yasserstudio/gpc&type=Date)](https://star-history.com/#yasserstudio/gpc&Date)

---

<p align="center">
  <a href="https://yasser.studio"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/yasser-studio-logo-white.svg"><img src="./assets/yasser-studio-logo.png" alt="Yasser's Studio" height="50"></picture></a>
</p>
<p align="center">
  <sub>Made by <a href="https://yasser.studio">Yasser's Studio</a> · <a href="https://x.com/yassersstudio">@yassersstudio</a></sub>
</p>

<p align="center">
  <sub>GPC is an independent project. Not affiliated with, endorsed by, or sponsored by Google LLC. "Google Play" and the Google Play logo are trademarks of Google LLC. "Android" and "Google" are trademarks of Google LLC.</sub>
</p>
