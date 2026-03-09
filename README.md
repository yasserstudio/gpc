# gpc

<p align="center">
  <a href="https://www.npmjs.com/package/gpc"><img src="https://img.shields.io/npm/v/gpc?style=for-the-badge&color=00D26A" alt="npm version"></a>
  <a href="https://github.com/yasserstudio/gpc/stargazers"><img src="https://img.shields.io/github/stars/yasserstudio/gpc?style=for-the-badge" alt="GitHub Stars"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
  <a href="https://www.npmjs.com/package/gpc"><img src="https://img.shields.io/npm/dm/gpc?style=for-the-badge&color=00BFA5" alt="npm downloads"></a>
</p>

<p align="center"><strong>Ship Android apps from your terminal.</strong></p>

<p align="center">
The complete CLI for Google Play. Upload releases, manage rollouts, sync metadata, monitor vitals, respond to reviews, manage subscriptions — all from one tool.
</p>

<!-- ![demo](./assets/demo.gif) -->

---

## Install

```bash
# npm (recommended — includes plugin support)
npm install -g gpc

# Standalone binary (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
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

Every Android release follows the same ritual: open the Play Console, upload your AAB, fill in release notes, pick a track, set the rollout percentage, click through confirmation screens. Or you set up Fastlane — install Ruby, Bundler, 150+ gems — and get access to maybe 20% of the API.

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

---

## What You Can Do

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

### High-Level Workflows

```bash
gpc publish app.aab --track beta --notes "Bug fixes"      # End-to-end flow
gpc publish app.aab --notes-dir ./release-notes/           # Multi-language notes
gpc validate app.aab --track beta                          # Pre-submission checks
gpc status                                                 # Cross-track overview
```

### Plugins

```bash
gpc plugins list                           # Show loaded plugins
gpc plugins init my-plugin                 # Scaffold a new plugin
gpc plugins approve gpc-plugin-slack       # Approve third-party plugin
```

---

## Output (TTY-Aware)

GPC auto-detects your environment:

- **Terminal (TTY):** formatted tables — human-readable
- **Pipe / CI:** JSON — machine-parseable, zero config

Override anytime:

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

GPC is built for automation. Every command supports structured output and proper exit codes.

### GitHub Actions

```yaml
- name: Install GPC
  run: npm install -g gpc

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
    - npm install -g gpc
    - gpc releases upload app.aab --track production --rollout 10
  variables:
    GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT
    GPC_APP: com.example.myapp
```

Add `@gpc/plugin-ci` for automatic GitHub Actions step summaries:

```json
{
  "plugins": ["@gpc/plugin-ci"]
}
```

See the full [CI/CD recipes](./docs/CI_CD.md) for GitHub Actions, GitLab CI, Bitbucket Pipelines, and CircleCI.

---

## Dry Run

All write operations support `--dry-run` to preview changes without executing:

```bash
gpc listings push --dir metadata/ --dry-run
gpc releases upload app.aab --track beta --dry-run
```

---

## Authentication

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

Manage multiple accounts:

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

## Packages

GPC is a TypeScript monorepo. Each package is independently publishable and usable:

| Package | Description |
| --- | --- |
| [`gpc`](./packages/cli) | CLI entry point — the command you run |
| [`@gpc/core`](./packages/core) | Business logic and command orchestration |
| [`@gpc/api`](./packages/api) | Typed Google Play Developer API v3 client |
| [`@gpc/auth`](./packages/auth) | Authentication strategies (service account, OAuth, ADC) |
| [`@gpc/config`](./packages/config) | Configuration loading and validation |
| [`@gpc/plugin-sdk`](./packages/plugin-sdk) | Plugin interface for third-party extensions |

Use `@gpc/api` directly in your own projects:

```typescript
import { createClient } from "@gpc/api";
import { serviceAccount } from "@gpc/auth";

const client = createClient({
  auth: serviceAccount("./key.json"),
});

const releases = await client.tracks.get("com.example.app", "production");
```

---

## Exit Codes

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

- [Commands Reference](./docs/COMMANDS.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [CI/CD Recipes](./docs/CI_CD.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Plugin Spec](./docs/PLUGIN_SPEC.md)
- [Security](./docs/SECURITY.md)
- [Roadmap](./docs/ROADMAP.md)

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

```bash
git clone https://github.com/yasserstudio/gpc.git
cd gpc
pnpm install
pnpm build
pnpm test
```

---

## License

[MIT](./LICENSE)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yasserstudio/gpc&type=Date)](https://star-history.com/#yasserstudio/gpc&Date)

---

<p align="center">
  <sub>This project is an independent, unofficial tool and is not affiliated with, endorsed by, or sponsored by Google LLC. Google Play, Android, and Google are trademarks of Google LLC.</sub>
</p>
