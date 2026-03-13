---
outline: deep
---

# Command Reference

GPC follows a consistent `<domain> <action> [options]` pattern for every command.

## Command Structure

```bash
gpc <domain> <action> [options]
```

All commands accept global flags, produce structured output, and return predictable exit codes.

## Commands

| Domain                                        | Description                                           |
| --------------------------------------------- | ----------------------------------------------------- |
| [`publish`](./publish)                        | End-to-end validate, upload, and release              |
| [`validate`](./publish#gpc-validate)          | Pre-submission checks                                 |
| [`status`](./publish#gpc-status)              | Cross-track release overview                          |
| [`releases`](./releases)                      | Upload, promote, rollout, release notes               |
| [`listings`](./listings)                      | Store listings, metadata, images                      |
| [`reviews`](./reviews)                        | User reviews and ratings                              |
| [`vitals`](./vitals)                          | Crash rates, ANR, startup, rendering, battery, memory |
| [`subscriptions`](./subscriptions)            | Subscriptions, base plans, offers                     |
| [`iap`](./iap)                                | In-app products (legacy one-time)                     |
| [`purchases`](./purchases)                    | Purchase verification, acknowledgment, refunds        |
| [`pricing`](./pricing)                        | Regional price conversion                             |
| [`reports`](./reports)                        | Financial and stats report downloads                  |
| [`testers`](./testers)                        | Tester management by track                            |
| [`users`](./users)                            | Developer account users and permissions               |
| [`auth`](./auth)                              | Authentication and profiles                           |
| [`apps`](./apps)                              | App info and configuration                            |
| [`config`](./config)                          | CLI configuration                                     |
| [`plugins`](./plugins)                        | Plugin management                                     |
| [`recovery`](./recovery)                      | App recovery actions                                  |
| [`data-safety`](./data-safety)                | Data safety declarations                              |
| [`external-transactions`](./external-transactions) | External transactions (alternative billing)      |
| [`device-tiers`](./device-tiers)              | Device capability targeting                           |
| [`bundle`](./bundle)                          | Local AAB/APK size analysis and comparison            |
| [`internal-sharing`](./internal-sharing)      | Review-free QA distribution                           |
| [`generated-apks`](./generated-apks)          | Device-specific APK downloads                         |
| [`one-time-products`](./one-time-products)    | One-time products and offers (alias: `otp`)           |
| [`purchase-options`](./purchase-options)      | Purchase option management for one-time products      |
| [`migrate`](./migrate)                        | Migrate from Fastlane to GPC                          |
| [`doctor` / `docs` / `completion`](./utility) | Utilities                                             |

## Global Flags

Every command accepts these flags:

| Flag               | Short | Type      | Default | Description                                        |
| ------------------ | ----- | --------- | ------- | -------------------------------------------------- |
| `--output`         | `-o`  | `string`  | auto    | Output format: `table`, `json`, `yaml`, `markdown` |
| `--quiet`          | `-q`  | `boolean` | `false` | Suppress non-essential output                      |
| `--verbose`        | `-v`  | `boolean` | `false` | Enable debug logging                               |
| `--profile`        | `-p`  | `string`  |         | Use a named auth profile                           |
| `--app`            | `-a`  | `string`  |         | App package name (overrides config)                |
| `--no-color`       |       | `boolean` | `false` | Disable colored output                             |
| `--no-interactive` |       | `boolean` | `false` | Disable interactive prompts                        |
| `--dry-run`        |       | `boolean` | `false` | Preview changes without executing                  |
| `--limit`          |       | `number`  |         | Max results per page                               |
| `--next-page`      |       | `string`  |         | Pagination token for next page                     |
| `--retry-log`      |       | `string`  |         | Log retry attempts to file (JSONL)                 |
| `--config`         |       | `string`  |         | Path to config file                                |
| `--notify`         |       | `string`  |         | Send webhook on completion (`slack`, `discord`, `custom`) |
| `--sort`           |       | `string`  |         | Sort results by field (prefix with `-` for descending)    |
| `--version`        | `-V`  | `boolean` |         | Show version                                       |
| `--help`           | `-h`  | `boolean` |         | Show help                                          |

## Output Behavior

GPC auto-detects the output environment:

| Context                    | Default Format | Reason                          |
| -------------------------- | -------------- | ------------------------------- |
| TTY (interactive terminal) | `table`        | Human-readable formatted output |
| Non-TTY (pipe, redirect)   | `json`         | Machine-parseable for scripting |
| CI environment (`CI=true`) | `json`         | Deterministic for automation    |

The `--output` flag overrides auto-detection in all cases.

## Output Formats

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

## Error Output

All errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "Access token has expired",
    "suggestion": "Run 'gpc auth login' to re-authenticate"
  }
}
```

## Exit Codes

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| `0`  | Success                                   |
| `1`  | General error                             |
| `2`  | Usage error (bad arguments)               |
| `3`  | Authentication error                      |
| `4`  | API error (rate limit, permission denied) |
| `5`  | Network error                             |
| `6`  | Threshold breach (vitals CI alerting)     |
| `10` | Plugin error                              |

## Environment Variables

| Variable              | Description                                | Default    |
| --------------------- | ------------------------------------------ | ---------- |
| `GPC_SERVICE_ACCOUNT` | Service account JSON string or file path   |            |
| `GPC_APP`             | Default package name                       |            |
| `GPC_PROFILE`         | Auth profile name                          |            |
| `GPC_OUTPUT`          | Default output format                      | auto       |
| `GPC_NO_COLOR`        | Disable color output                       |            |
| `GPC_NO_INTERACTIVE`  | Disable prompts                            | Auto in CI |
| `GPC_SKIP_KEYCHAIN`   | Skip OS keychain, use file storage         |            |
| `GPC_MAX_RETRIES`     | Max retry attempts on transient errors     | `3`        |
| `GPC_TIMEOUT`         | Request timeout in milliseconds            | `30000`    |
| `GPC_BASE_DELAY`      | Base retry delay in milliseconds           | `1000`     |
| `GPC_MAX_DELAY`       | Max retry delay in milliseconds            | `60000`    |
| `GPC_RATE_LIMIT`      | Requests per second                        | `50`       |
| `GPC_DEVELOPER_ID`    | Developer account ID (for user management) |            |
| `GPC_CA_CERT`         | Custom CA certificate path                 |            |
| `HTTPS_PROXY`         | HTTP proxy URL                             |            |

## Related

- [Authentication Guide](/guide/authentication)
- [Configuration Guide](/guide/configuration)
- [CI/CD Integration](/ci-cd/)
- [Exit Codes Reference](/reference/exit-codes)
- [JSON Output Contract](/reference/json-contract)
