# @gpc-cli/cli

Ship Android apps from your terminal. The complete CLI for Google Play Developer API v3.

## Install

```bash
# npm
npm install -g @gpc-cli/cli

# Homebrew
brew install yasserstudio/tap/gpc

# Standalone binary
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

## Quick Start

```bash
# Authenticate
gpc auth login --service-account path/to/key.json

# Upload and release
gpc releases upload app.aab --track internal

# Promote to production
gpc releases promote --from internal --to production --rollout 10

# Check app health
gpc vitals overview

# Monitor reviews
gpc reviews list --stars 1-3 --since 7d
```

## What You Get

187 API endpoints across 10 command groups:

| Command Group     | Examples                                                       |
| ----------------- | -------------------------------------------------------------- |
| **Releases**      | `upload`, `promote`, `rollout increase/halt/resume`, `publish` |
| **Listings**      | `pull`, `push`, `images upload/delete`, Fastlane format        |
| **Reviews**       | `list`, `reply`, `export --format csv`                         |
| **Vitals**        | `crashes`, `anr`, `startup`, `rendering`, `battery`, `memory`  |
| **Subscriptions** | `list`, `create`, `base-plans`, `offers`                       |
| **IAP**           | `list`, `create`, `sync --dir products/`                       |
| **Purchases**     | `get`, `acknowledge`, `cancel`, `refund`                       |
| **Reports**       | `download financial`, `download stats`                         |
| **Testers**       | `add`, `remove`, `import --file testers.csv`                   |
| **Users**         | `invite`, `update`, `remove`, per-app grants                   |

## CI/CD

JSON output, semantic exit codes (0-6), env var config — no wrapper scripts needed.

```yaml
- name: Install GPC
  run: npm install -g @gpc-cli/cli

- name: Upload
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.myapp
  run: gpc releases upload app.aab --track internal
```

## Output Formats

GPC auto-detects your environment:

- **Terminal:** formatted tables
- **Piped/CI:** structured JSON

Override with `--output json|yaml|markdown|table`.

## Documentation

Full docs at **[yasserstudio.github.io/gpc](https://yasserstudio.github.io/gpc/)**

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

## License

MIT
