---
outline: deep
---

# Command Reference

GPC follows a consistent `<domain> <action> [options]` pattern for every command.

## Common Workflows

Most users start with these:

```bash
# Full picture — releases, vitals, and reviews in one command
gpc status

# End-to-end: validate, upload, release
gpc publish app.aab --track beta --notes "Bug fixes"

# Upload to a specific track
gpc releases upload app.aab --track internal

# Promote between tracks
gpc releases promote --from beta --to production --rollout 10

# Analyze bundle size
gpc bundle analyze app.aab --threshold 150
```

## All Commands

### Core Workflow

| Command                              | Description                                         |
| ------------------------------------ | --------------------------------------------------- |
| [`status`](./status)                 | Releases + vitals + reviews in one unified snapshot |
| [`publish`](./publish)               | End-to-end validate, upload, and release            |
| [`validate`](./publish#gpc-validate) | Pre-submission checks                               |
| [`releases`](./releases)             | Upload, promote, rollout, release notes, diff       |
| [`tracks`](./tracks)                 | Track configuration and management                  |
| [`listings`](./listings)             | Store listings, metadata, images                    |

### Monitoring

| Command                    | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| [`reviews`](./reviews)     | User reviews and ratings                              |
| [`vitals`](./vitals)       | Crash rates, ANR, startup, rendering, battery, memory |
| [`anomalies`](./anomalies) | Automatically detected vitals anomalies               |

### Monetization

| Command                                    | Description                                      |
| ------------------------------------------ | ------------------------------------------------ |
| [`subscriptions`](./subscriptions)         | Subscriptions, base plans, offers                |
| [`one-time-products`](./one-time-products) | One-time products and offers (alias: `otp`)      |
| [`purchase-options`](./purchase-options)   | Purchase option management for one-time products |
| [`iap`](./iap)                             | In-app products (legacy API)                     |
| [`purchases`](./purchases)                 | Purchase verification, acknowledgment, refunds   |
| [`pricing`](./pricing)                     | Regional price conversion                        |

### Reporting & Team

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| [`reports`](./reports) | Financial and stats report downloads    |
| [`testers`](./testers) | Tester management by track              |
| [`users`](./users)     | Developer account users and permissions |

### Distribution

| Command                                  | Description                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| [`bundle`](./bundle)                     | Local AAB/APK size analysis and comparison                                      |
| [`internal-sharing`](./internal-sharing) | Review-free QA distribution                                                     |
| [`enterprise`](./enterprise)             | Private apps for Managed Google Play (Play Custom App Publishing API, v0.9.56+) |
| [`generated-apks`](./generated-apks)     | Device-specific APK downloads                                                   |
| [`device-tiers`](./device-tiers)         | Device capability targeting                                                     |

### Compliance & Recovery

| Command                                            | Description                                           |
| -------------------------------------------------- | ----------------------------------------------------- |
| [`preflight`](./preflight)                         | Offline AAB compliance scanner (9 scanners, CI-ready) |
| [`data-safety`](./data-safety)                     | Data safety declarations                              |
| [`recovery`](./recovery)                           | App recovery actions                                  |
| [`external-transactions`](./external-transactions) | External transactions (alternative billing)           |

### Monetization Extras

| Command                                | Description                                                      |
| -------------------------------------- | ---------------------------------------------------------------- |
| [`system-apks`](./system-apks)         | System APK variants for OEM/enterprise deployments               |
| [`rtdn`](./rtdn)                       | Real-Time Developer Notifications (Pub/Sub webhooks)             |
| [`games`](./games)                     | Play Games Services: leaderboards, achievements, events          |

### Release Automation

| Command                | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| [`train`](./train)     | Config-driven staged rollout trains with time gates and vitals gates     |
| [`quota`](./quota)     | View Google Play API quota usage tracked from the local audit log        |
| [`verify`](./verify)   | Google developer verification tooling (signing keys, readiness checklist) |

### System

| Command                                       | Description                                      |
| --------------------------------------------- | ------------------------------------------------ |
| [`auth`](./auth)                              | Authentication and profiles                      |
| [`apps`](./apps)                              | App info and configuration                       |
| [`config`](./config)                          | CLI configuration                                |
| [`plugins`](./plugins)                        | Plugin management                                |
| [`grants`](./grants)                          | Per-app permission grants for developer users    |
| [`migrate`](./migrate)                        | Migrate from Fastlane to GPC                     |
| [`doctor` / `docs` / `completion`](./utility) | Diagnostics, documentation, shell completions    |
| [`cache`](./utility#gpc-cache)                | Manage status, token, and update caches          |
| [`audit`](./utility)                          | Inspect the local audit log of API calls         |
| [`quickstart`](./utility)                     | Guided first-run setup wizard                    |
| [`update`](./utility#gpc-update)              | Self-update to the latest release                |
| [`feedback`](./utility#gpc-feedback)          | Open a pre-filled GitHub issue                   |
| [`install-skills`](./install-skills)          | Install AI agent skills for GPC workflows        |
| [`init`](./init)                              | Scaffold project config, metadata, CI templates  |
| [`diff`](./diff)                              | Preview release state and pending changes        |
| [`changelog`](./changelog)                    | Show GitHub history; `generate` makes notes from commits |
| [`validate`](./publish#gpc-validate)          | Dry-run validation of a release before committing |

## Global Flags

Every command accepts these flags:

| Flag               | Short | Type      | Default | Description                                                 |
| ------------------ | ----- | --------- | ------- | ----------------------------------------------------------- |
| `--output`         | `-o`  | `string`  | auto    | Output format: `table`, `json`, `yaml`, `markdown`, `junit` |
| `--json`           | `-j`  | `boolean` |         | Shorthand for `--output json`                               |
| `--ci`             |       | `boolean` | `false` | CI mode: JSON output, no prompts, strict exit codes         |
| `--quiet`          | `-q`  | `boolean` | `false` | Suppress non-essential output                               |
| `--verbose`        | `-v`  | `boolean` | `false` | Enable debug logging                                        |
| `--profile`        | `-p`  | `string`  |         | Use a named auth profile                                    |
| `--app`            | `-a`  | `string`  |         | App package name (overrides config)                         |
| `--no-color`       |       | `boolean` | `false` | Disable colored output                                      |
| `--no-interactive` |       | `boolean` | `false` | Disable interactive prompts                                 |
| `--dry-run`        |       | `boolean` | `false` | Preview changes without executing                           |
| `--limit`          |       | `number`  |         | Max results per page                                        |
| `--next-page`      |       | `string`  |         | Pagination token for next page                              |
| `--retry-log`      |       | `string`  |         | Log retry attempts to file (JSONL)                          |
| `--config`         |       | `string`  |         | Path to config file                                         |
| `--notify`         |       | `string`  |         | Send webhook on completion (`slack`, `discord`, `custom`)   |
| `--sort`           |       | `string`  |         | Sort results by field (prefix with `-` for descending)      |
| `--version`        | `-V`  | `boolean` |         | Show version                                                |
| `--help`           | `-h`  | `boolean` |         | Show help                                                   |

## Output Behavior

GPC auto-detects the output environment:

| Context                    | Default Format | Reason                          |
| -------------------------- | -------------- | ------------------------------- |
| TTY (interactive terminal) | `table`        | Human-readable formatted output |
| Non-TTY (pipe, redirect)   | `json`         | Machine-parseable for scripting |
| CI environment (`CI=true`) | `json`         | Deterministic for automation    |

The `--output` flag overrides auto-detection in all cases.

## Output Formats

GPC supports five output formats: `table`, `json`, `yaml`, `markdown`, and `junit`.

### table

```bash
gpc apps info com.example.app
```

```
Package Name   com.example.app
Title          My App
Default Lang   en-US
```

### json

```bash
gpc apps info com.example.app --output json
```

```json
{
  "success": true,
  "data": {
    "packageName": "com.example.app",
    "title": "My App",
    "defaultLanguage": "en-US"
  },
  "metadata": {
    "command": "apps info",
    "timestamp": "2026-03-09T12:00:00Z",
    "duration_ms": 342
  }
}
```

### yaml

```bash
gpc apps info com.example.app --output yaml
```

```yaml
success: true
data:
  packageName: com.example.app
  title: My App
  defaultLanguage: en-US
metadata:
  command: apps info
  timestamp: "2026-03-09T12:00:00Z"
  duration_ms: 342
```

### markdown

```bash
gpc releases status --output markdown >> "$GITHUB_STEP_SUMMARY"
```

Produces a Markdown table suitable for GitHub Actions step summaries.

### junit

```bash
gpc vitals crashes --output junit > test-results.xml
```

Produces JUnit XML compatible with CI systems (Jenkins, GitHub Actions, GitLab CI). Threshold breaches appear as `<failure>` elements.

### CI mode shorthand

```bash
# --ci is equivalent to --output json --no-interactive
gpc releases status --ci

# -j / --json is shorthand for --output json
gpc apps info com.example.app -j
```

## Error Output

All errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_KEY",
    "message": "Service account JSON is malformed",
    "suggestion": "Download a fresh key from Google Cloud Console"
  }
}
```

## Exit Codes

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| `0`  | Success                                   |
| `1`  | General error, config error, or plugin runtime error |
| `2`  | Usage error (bad arguments)               |
| `3`  | Authentication error                      |
| `4`  | API error (rate limit, permission denied) |
| `5`  | Network error                             |
| `6`  | Threshold breach (vitals CI alerting)     |

See [Exit Codes Reference](/reference/exit-codes) for the full error-code catalog.

## Environment Variables

| Variable              | Description                                | Default    |
| --------------------- | ------------------------------------------ | ---------- |
| `GPC_SERVICE_ACCOUNT` | Service account JSON string or file path   |            |
| `GPC_APP`             | Default package name                       |            |
| `GPC_PROFILE`         | Auth profile name                          |            |
| `GPC_OUTPUT`          | Default output format                      | auto       |
| `GPC_NO_COLOR`        | Disable color output                       |            |
| `GPC_NO_INTERACTIVE`  | Disable prompts                            | Auto in CI |
| `GPC_NO_UPDATE_CHECK` | Suppress passive update check              |            |
| `GPC_MAX_RETRIES`     | Max retry attempts on transient errors     | `5`        |
| `GPC_TIMEOUT`         | Request timeout in milliseconds            | `30000`    |
| `GPC_BASE_DELAY`      | Base retry delay in milliseconds           | `1000`     |
| `GPC_MAX_DELAY`       | Max retry delay in milliseconds            | `60000`    |
| `GPC_DEVELOPER_ID`    | Developer account ID (for user management) |            |
| `GPC_CA_CERT`         | Custom CA certificate path                 |            |
| `HTTPS_PROXY`         | HTTP proxy URL                             |            |

See [Environment Variables Reference](/reference/environment-variables) for the full list.

## Related

- [Authentication Guide](/guide/authentication)
- [Configuration Guide](/guide/configuration)
- [CI/CD Integration](/ci-cd/)
- [Exit Codes Reference](/reference/exit-codes)
- [JSON Output Contract](/reference/json-contract)
