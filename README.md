# gpc

**The complete Google Play CLI.**

Upload releases, manage rollouts, sync metadata, monitor vitals, respond to reviews, manage subscriptions — all from your terminal or CI/CD pipeline.

<!-- ![demo](./assets/demo.gif) -->

## Quick Start

```bash
npm install -g gpc

# Authenticate
gpc auth login --service-account path/to/key.json

# Upload and release
gpc releases upload app.aab --track internal

# Promote to production with staged rollout
gpc releases promote --from internal --to production --rollout 10

# Check vitals
gpc vitals overview

# Monitor reviews
gpc reviews list --stars 1-3 --since 7d
```

## Why GPC?

|  | GPC | Fastlane supply | gradle-play-publisher | Console UI |
| --- | --- | --- | --- | --- |
| API endpoints covered | **127** | ~20 | ~15 | All (manual) |
| Standalone CLI | Yes | Yes | No (Gradle only) | N/A |
| Runtime dependency | Node.js | Ruby + Bundler | JVM | Browser |
| JSON output | Yes | Partial | No | No |
| Reviews and Vitals | Yes | No | No | Yes (manual) |
| Subscriptions and IAP | Yes | No | No | Yes (manual) |
| CI/CD native | Yes | Partial | Gradle tasks | No |
| Cold start | <500ms | 2-3s | 3-5s | 5-10s |

## What You Can Do

```bash
# Releases
gpc releases upload app.aab --track beta
gpc releases promote --from beta --to production --rollout 5
gpc releases rollout increase --track production --to 50
gpc releases rollout halt --track production

# Store Listings
gpc listings pull --dir metadata/
gpc listings push --dir metadata/

# Reviews
gpc reviews list --stars 1-2 --since 7d
gpc reviews reply <review-id> "Thanks for the feedback!"

# Vitals
gpc vitals crashes --version 142
gpc vitals anr
gpc vitals startup

# Subscriptions
gpc subscriptions list
gpc subscriptions create --file subscription.json

# Reports
gpc reports download financial --month 2026-02

# Testers
gpc testers add --track internal user@example.com
```

## CI/CD

GPC is built for automation. Every command supports `--json` output and proper exit codes.

### GitHub Actions

```yaml
- name: Install GPC
  run: npm install -g @gpc/cli

- name: Upload to Internal Track
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.myapp
  run: gpc releases upload app.aab --track internal --json
```

See the full [CI/CD recipes](./design/engineering/CI_CD_RECIPES.md) for GitHub Actions, GitLab CI, Bitbucket Pipelines, and CircleCI.

## Authentication

GPC supports multiple authentication methods:

```bash
# Service account (recommended for CI/CD)
gpc auth login --service-account path/to/key.json

# OAuth (interactive)
gpc auth login

# Environment variable
export GPC_SERVICE_ACCOUNT=/path/to/key.json

# Application Default Credentials
gpc auth login --adc
```

Manage multiple accounts with profiles:

```bash
gpc auth switch production
gpc auth profiles
```

## Configuration

```bash
# Interactive setup
gpc config init

# Set defaults
gpc config set app com.example.myapp
gpc config set output json
```

Or create a `.gpcrc.json` in your project:

```json
{
  "app": "com.example.myapp",
  "output": "human",
  "auth": {
    "serviceAccount": "./keys/play-store.json"
  }
}
```

## Output Formats

```bash
# Human-readable (default)
gpc releases status

# JSON (for scripting)
gpc releases status --json

# Quiet (exit code only)
gpc releases status --quiet
```

All JSON output follows a consistent contract:

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

## Documentation

- [Getting Started](./docs/guide/getting-started.md)
- [Authentication](./docs/guide/authentication.md)
- [Configuration](./docs/guide/configuration.md)
- [Commands Reference](./docs/commands/)
- [CI/CD Recipes](./design/engineering/CI_CD_RECIPES.md)
- [Migration from Fastlane](./docs/migration/)

## Packages

GPC is a monorepo with focused packages:

| Package | Description |
| --- | --- |
| [`gpc`](./packages/cli) | CLI entry point |
| [`@gpc/core`](./packages/core) | Business logic and orchestration |
| [`@gpc/api`](./packages/api) | Google Play Developer API v3 client |
| [`@gpc/auth`](./packages/auth) | Authentication strategies |
| [`@gpc/config`](./packages/config) | Configuration loading and validation |
| [`@gpc/plugin-sdk`](./packages/plugin-sdk) | Plugin interface for extensions |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

```bash
git clone https://github.com/YOUR_USERNAME/gpc.git
cd gpc
pnpm install
pnpm build
pnpm test
```

## License

[MIT](./LICENSE)
