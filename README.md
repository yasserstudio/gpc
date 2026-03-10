# gpc

<p align="center">
  <a href="https://www.npmjs.com/package/@gpc-cli/cli"><img src="https://img.shields.io/npm/v/@gpc-cli/cli?style=for-the-badge&color=00D26A" alt="npm version"></a>
  <a href="https://github.com/yasserstudio/gpc/stargazers"><img src="https://img.shields.io/github/stars/yasserstudio/gpc?style=for-the-badge" alt="GitHub Stars"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
  <a href="https://www.npmjs.com/package/@gpc-cli/cli"><img src="https://img.shields.io/npm/dm/@gpc-cli/cli?style=for-the-badge&color=00BFA5" alt="npm downloads"></a>
  <a href="https://yasserstudio.github.io/gpc/"><img src="https://img.shields.io/badge/Docs-yasserstudio.github.io%2Fgpc-00D26A?style=for-the-badge" alt="Documentation"></a>
  <img src="https://img.shields.io/badge/Tests-597_passing-00D26A?style=for-the-badge" alt="Tests">
  <img src="https://img.shields.io/badge/Coverage-90%25+-00BFA5?style=for-the-badge" alt="Coverage">
</p>

<p align="center"><strong>Ship Android apps from your terminal.</strong></p>

<p align="center">
The complete CLI for Google Play — 162 API endpoints, one tool.<br>
Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.
</p>

<!-- ![demo](./assets/demo.gif) -->

---

## Install

```bash
# Homebrew (macOS/Linux)
brew install yasserstudio/tap/gpc

# npm (includes plugin support)
npm install -g @gpc-cli/cli

# Standalone binary (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh

# From source
git clone https://github.com/yasserstudio/gpc.git
cd gpc && pnpm install && pnpm build
```

---

## Quick Start

```bash

# Authenticate
gpc auth login --service-account path/to/key.json

# Upload and release
gpc releases upload app.aab --track internal

# Promote to production with staged rollout
gpc releases promote --from internal --to production --rollout 10

# Check app health
gpc vitals overview

# Monitor reviews
gpc reviews list --stars 1-3 --since 7d
```

---

## Why GPC?

You shouldn't need a browser to ship your app.

Every Android release follows the same ritual: open the Play Console, upload your AAB, fill in release notes, pick a track, set the rollout percentage, click through confirmation screens. Fifteen minutes of clicking. Every single time.

The alternative? Install Ruby, Bundler, and 150+ gems to run Fastlane — and get access to maybe 20 of 162 API endpoints. No reviews. No vitals. No subscriptions.

GPC covers the **entire Google Play Developer API** in one CLI. No Ruby. No browser. No ceremony.

### GPC vs Alternatives

|  | **GPC** | Fastlane supply | gradle-play-publisher | Console UI |
| --- | --- | --- | --- | --- |
| API coverage | **162 endpoints** | ~20 | ~15 | All (manual) |
| Standalone CLI | Yes | Yes | No (Gradle only) | N/A |
| Runtime | Node.js | Ruby + Bundler | JVM | Browser |
| JSON output | Structured + TTY-aware | Partial | No | No |
| Reviews & Vitals | Yes | No | No | Yes (manual) |
| Subscriptions & IAP | Yes | No | No | Yes (manual) |
| CI/CD native | JSON + exit codes + env vars | Partial | Gradle tasks | No |
| Cold start | <500ms | 2-3s | 3-5s | 5-10s |
| Plugin system | Yes | No | No | No |
| Interactive mode | Yes (guided prompts) | No | No | N/A |
| Test suite | 597 tests, 90%+ coverage | — | — | — |

See the full [command reference](https://yasserstudio.github.io/gpc/commands/) for all 162 endpoints.

---

## Commands

The simplest way to ship:

```bash
gpc publish app.aab --track beta --notes "Bug fixes"      # End-to-end flow
gpc publish app.aab --notes-dir ./release-notes/           # Multi-language notes
gpc validate app.aab --track beta                          # Pre-submission checks
gpc status                                                 # Cross-track overview
```

Every Play Store operation is covered. Here's the full breakdown.

### Releases

```bash
gpc releases upload app.aab --track beta
gpc releases promote --from beta --to production --rollout 5
gpc releases rollout increase --track production --to 50
gpc releases rollout halt --track production
gpc releases status
```

### Store Listings

```bash
gpc listings pull --dir metadata/          # Download all listings
gpc listings push --dir metadata/          # Upload local changes
gpc listings images upload --lang en-US --type phoneScreenshots ./screens/*.png
```

### Reviews

```bash
gpc reviews list --stars 1-2 --since 7d
gpc reviews reply <review-id> "Thanks for the feedback!"
gpc reviews export --format csv --output reviews.csv
```

### Vitals

```bash
gpc vitals overview                        # Summary dashboard
gpc vitals crashes --version 142
gpc vitals crashes --threshold 2.0         # Exit code 6 if breached (CI gates)
gpc vitals compare crashes --days 7        # This week vs last week
gpc vitals anr
gpc vitals startup
gpc vitals battery
gpc vitals anomalies
```

### Subscriptions & In-App Products

```bash
gpc subscriptions list
gpc subscriptions create --file subscription.json
gpc iap list
gpc iap sync --dir products/
```

### Reports

```bash
gpc reports download financial --month 2026-02
gpc reports download stats --type installs --since 30d
```

### Purchases & Pricing

```bash
gpc purchases get <token>
gpc purchases subscription get <token>
gpc purchases voided list
gpc orders refund <order-id>
gpc pricing convert --from USD --amount 9.99
```

### Testers & Users

```bash
gpc testers add user@example.com --track internal
gpc testers import --track beta --file testers.csv
gpc users list --developer-id <id>
gpc users invite dev@company.com --developer-id <id> --role ADMIN
```

### Plugins

```bash
gpc plugins list                           # Show loaded plugins
gpc plugins init my-plugin                 # Scaffold a new plugin
gpc plugins approve gpc-plugin-slack       # Approve third-party plugin
```

---

## Output

GPC auto-detects your environment — no flags needed:

- **Terminal:** formatted tables you can actually read
- **Piped or CI:** structured JSON your scripts can parse

No `--output json` in CI. No `| column -t` in your terminal. It just works.

Override when you need to:

```bash
gpc releases status --output json
gpc releases status --output yaml
gpc releases status --output markdown    # For $GITHUB_STEP_SUMMARY
```

All JSON follows a consistent contract:

```json
{
  "success": true,
  "data": { "..." },
  "metadata": {
    "command": "releases status",
    "timestamp": "2026-03-06T12:00:00Z",
    "duration_ms": 342
  }
}
```

---

## CI/CD

Drop GPC into any pipeline. JSON output, semantic exit codes (0-6), env var config — no wrapper scripts needed.

### GitHub Actions

```yaml
- name: Install GPC
  run: npm install -g @gpc-cli/cli

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

Add `@gpc-cli/plugin-ci` for automatic GitHub Actions step summaries:

```json
{
  "plugins": ["@gpc-cli/plugin-ci"]
}
```

See the full [CI/CD recipes](https://yasserstudio.github.io/gpc/ci-cd/) for GitHub Actions, GitLab CI, Bitbucket Pipelines, and CircleCI.

---

## Interactive Mode

Missing a flag? GPC will ask. In your terminal, missing required options trigger guided prompts. In CI, they fail fast with clear error messages.

```bash
gpc releases promote                    # Prompts: Source track? Target track?
gpc releases promote --from beta --to production   # No prompts
```

Destructive commands ask for confirmation:

```bash
gpc subscriptions delete my-sub         # "Delete subscription 'my-sub'?" [y/N]
gpc subscriptions delete my-sub --yes   # Skip confirmation (CI-safe)
```

Disable all prompts: `--no-interactive` or `GPC_NO_INTERACTIVE=1`.

---

## Dry Run

Test your CI pipeline against real data without shipping anything. Every write operation supports `--dry-run`:

```bash
gpc listings push --dir metadata/ --dry-run
gpc releases upload app.aab --track beta --dry-run
```

---

## Authentication

Four options — pick the one that fits:

| Method | Best for |
|--------|----------|
| Service account | CI/CD pipelines, automation |
| OAuth | Local development, quick setup |
| Environment variable | Docker, ephemeral environments |
| ADC | GCP-hosted runners (Cloud Build, GKE) |

```bash
# Service account (recommended for CI/CD)
gpc auth login --service-account path/to/key.json

# OAuth (interactive — no service account setup needed)
gpc auth login

# Environment variable
export GPC_SERVICE_ACCOUNT=/path/to/key.json

# Application Default Credentials (GCP environments)
gpc auth login --adc
```

Credentials are stored locally and never leave your machine. Manage multiple accounts:

```bash
gpc auth profiles
gpc auth switch production
gpc auth whoami
```

---

## Configuration

```bash
# Interactive setup
gpc config init

# Set defaults
gpc config set app com.example.myapp
gpc config set output json
```

Or drop a `.gpcrc.json` in your project:

```json
{
  "app": "com.example.myapp",
  "output": "table",
  "auth": {
    "serviceAccount": "./keys/play-store.json"
  }
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GPC_SERVICE_ACCOUNT` | Service account JSON string or file path | — |
| `GPC_APP` | Default package name | — |
| `GPC_PROFILE` | Auth profile name | — |
| `GPC_OUTPUT` | Default output format | `table` (TTY) / `json` (pipe) |
| `GPC_NO_COLOR` | Disable color output | — |
| `GPC_NO_INTERACTIVE` | Disable prompts (auto in CI) | — |
| `GPC_MAX_RETRIES` | Max retry attempts | `3` |
| `GPC_TIMEOUT` | Request timeout (ms) | `30000` |

---

## Packages (CLI + SDK)

GPC is a TypeScript monorepo. Each package is independently publishable — use the CLI from your terminal, or import the SDK into your own projects:

| Package | Description |
| --- | --- |
| [`@gpc-cli/cli`](https://www.npmjs.com/package/@gpc-cli/cli) | CLI entry point — the `gpc` command you run |
| [`@gpc-cli/core`](https://www.npmjs.com/package/@gpc-cli/core) | Business logic and command orchestration |
| [`@gpc-cli/api`](https://www.npmjs.com/package/@gpc-cli/api) | Typed Google Play Developer API v3 client |
| [`@gpc-cli/auth`](https://www.npmjs.com/package/@gpc-cli/auth) | Authentication strategies (service account, OAuth, ADC) |
| [`@gpc-cli/config`](https://www.npmjs.com/package/@gpc-cli/config) | Configuration loading and validation |
| [`@gpc-cli/plugin-sdk`](https://www.npmjs.com/package/@gpc-cli/plugin-sdk) | Plugin interface for third-party extensions |
| [`@gpc-cli/plugin-ci`](https://www.npmjs.com/package/@gpc-cli/plugin-ci) | CI/CD helpers and GitHub Actions step summaries |

Build custom dashboards, Slack bots, or internal tools on top of the same API client GPC uses:

```typescript
import { createApiClient } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({
  serviceAccount: "./service-account.json",
});
const client = createApiClient({ auth });

const releases = await client.tracks.list("com.example.app");
const vitals = await client.vitals.overview("com.example.app");
```

CLI for your terminal. SDK for everything else.

---

## Exit Codes

Your CI can distinguish "auth expired" from "crash rate too high" and react differently:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Usage error (bad arguments) |
| `3` | Authentication error |
| `4` | API error (rate limit, permission) |
| `5` | Network error |
| `6` | Threshold breach (vitals CI alerting) |
| `10` | Plugin error |

---

## Documentation

Full documentation at **[yasserstudio.github.io/gpc](https://yasserstudio.github.io/gpc/)**

- [Installation](https://yasserstudio.github.io/gpc/guide/installation)
- [Quick Start](https://yasserstudio.github.io/gpc/guide/quick-start)
- [Commands Reference](https://yasserstudio.github.io/gpc/commands/)
- [CI/CD Recipes](https://yasserstudio.github.io/gpc/ci-cd/)
- [Architecture](https://yasserstudio.github.io/gpc/advanced/architecture)
- [Plugin Development](https://yasserstudio.github.io/gpc/advanced/plugins)
- [Security](https://yasserstudio.github.io/gpc/advanced/security)
- [Migration from Fastlane](https://yasserstudio.github.io/gpc/migration/from-fastlane)

---

## Get Help

- [GitHub Discussions](https://github.com/yasserstudio/gpc/discussions) — questions, ideas, show what you built
- [Issues](https://github.com/yasserstudio/gpc/issues) — bug reports and feature requests
- `gpc doctor` — diagnose setup problems locally

---

## Contributing

Found a bug? Want to add a feature? PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup.

```bash
git clone https://github.com/yasserstudio/gpc.git
cd gpc
pnpm install
pnpm build
pnpm test    # 597 tests across 7 packages
```

---

## License

[MIT](./LICENSE)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yasserstudio/gpc&type=Date)](https://star-history.com/#yasserstudio/gpc&Date)

---

## Built with Claude

<p align="center">
  <a href="https://claude.ai/claude-code">
    <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Claude_AI_logo.svg" alt="Claude" width="48">
  </a>
</p>

<p align="center">
  GPC was built entirely with <a href="https://claude.ai/claude-code">Claude Code</a> — from architecture design through implementation, testing, and documentation.<br>
  597 tests, 7 packages, 90%+ coverage, all written through AI-assisted development.
</p>

---

<p align="center">
  <sub>This project is an independent, unofficial tool and is not affiliated with, endorsed by, or sponsored by Google LLC. "Google Play" and the Google Play logo are trademarks of Google LLC. The "Android" name, the Android logo, and "Google" are trademarks of Google LLC.</sub>
</p>
