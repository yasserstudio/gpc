---
outline: deep
---

# Environment Variables

All `GPC_*` environment variables and external variables that GPC respects.

## Authentication

| Variable              | Type      | Description                                                                                                                   | Default |
| --------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| `GPC_SERVICE_ACCOUNT` | `string`  | Service account JSON string or file path. Accepts inline JSON (`{"type":"service_account",...}`) or a path to a `.json` file. | —       |
| `GPC_PROFILE`         | `string`  | Named auth profile to use. Profiles are created via `gpc auth login --profile <name>`.                                        | —       |
| `GPC_SKIP_KEYCHAIN`   | `boolean` | Skip OS keychain storage and use file-based token cache instead.                                                              | `false` |

## App & Project

| Variable           | Type     | Description                                                                               | Default |
| ------------------ | -------- | ----------------------------------------------------------------------------------------- | ------- |
| `GPC_APP`          | `string` | Default package name (e.g., `com.example.myapp`). Used when `--app` flag is not provided. | —       |
| `GPC_DEVELOPER_ID` | `string` | Developer account ID. Required for `gpc users` and `gpc testers` commands.                | —       |

## Output

| Variable             | Type                                         | Description                                                                                                                                              | Default                       |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `GPC_OUTPUT`         | `table \| json \| yaml \| markdown \| junit` | Default output format. Overridden by `--output` / `-o` flag. Use `-j` / `--json` as shorthand for JSON. Use `--ci` to force JSON + no prompts (CI mode). | `table` (TTY) / `json` (pipe) |
| `GPC_NO_COLOR`       | `boolean`                                    | Disable colored output. Also respected: `NO_COLOR` (standard).                                                                                           | `false`                       |
| `NO_COLOR`           | `boolean`                                    | Standard no-color.org variable. Disables all ANSI color output.                                                                                          | —                             |
| `FORCE_COLOR`        | `1 \| 2 \| 3`                                | Force colored output even when stdout is not a TTY (e.g. in CI).                                                                                         | —                             |
| `GPC_NO_INTERACTIVE` | `boolean`                                    | Disable interactive prompts. Auto-set when `CI=true` is detected.                                                                                        | Auto in CI                    |

## Network & Retry

| Variable          | Type      | Description                                                                      | Default |
| ----------------- | --------- | -------------------------------------------------------------------------------- | ------- |
| `GPC_MAX_RETRIES` | `integer` | Maximum retry attempts on transient errors (429, 5xx).                           | `3`     |
| `GPC_TIMEOUT`     | `integer` | Request timeout in milliseconds.                                                 | `30000` |
| `GPC_BASE_DELAY`  | `integer` | Base retry delay in milliseconds (exponential backoff).                          | `1000`  |
| `GPC_MAX_DELAY`   | `integer` | Maximum retry delay in milliseconds.                                             | `60000` |
| `GPC_RATE_LIMIT`  | `integer` | Client-side requests per second.                                                 | `50`    |
| `GPC_CA_CERT`     | `string`  | Path to custom CA certificate file (PEM format). For corporate proxies.          | —       |
| `HTTPS_PROXY`     | `string`  | HTTP proxy URL (e.g., `https://proxy.corp:8080`). Also respected: `https_proxy`. | —       |
| `NO_PROXY`        | `string`  | Comma-separated list of hosts to bypass proxy.                                   | —       |

## Debug & Logging

| Variable      | Type      | Description                                                                                                    | Default |
| ------------- | --------- | -------------------------------------------------------------------------------------------------------------- | ------- |
| `GPC_DEBUG`   | `boolean` | Enable debug logging. Prints internal state, request/response details, and timing info to stderr.              | `false` |
| `GPC_VERBOSE` | `boolean` | Enable verbose output. Shows additional context such as full API URLs, retry attempts, and rate-limit headers. | `false` |

```bash
# Diagnose auth issues
GPC_DEBUG=true gpc auth status

# Verbose upload with retry visibility
GPC_VERBOSE=true gpc releases upload app.aab --track internal
```

## Plugins

| Variable         | Type     | Description                                                                                  | Default                 |
| ---------------- | -------- | -------------------------------------------------------------------------------------------- | ----------------------- |
| `GPC_PLUGIN_DIR` | `string` | Custom directory for plugin discovery. GPC scans this path for installed plugins at startup. | `~/.config/gpc/plugins` |
| `GPC_AUDIT_LOG`  | `string` | File path for the audit log. When set, GPC appends a JSON line for each command invocation.  | —                       |

```bash
# Use a project-local plugin directory
export GPC_PLUGIN_DIR="./my-plugins"

# Enable audit logging for compliance
export GPC_AUDIT_LOG="/var/log/gpc-audit.jsonl"
gpc releases list
```

## CI Provider Detection

GPC auto-detects CI environments. These variables are read but not set by GPC:

| Variable              | Provider       | Purpose                                        |
| --------------------- | -------------- | ---------------------------------------------- |
| `CI`                  | Generic        | Enables CI mode (non-interactive, JSON output) |
| `GITHUB_ACTIONS`      | GitHub Actions | Enables step summary output                    |
| `GITHUB_STEP_SUMMARY` | GitHub Actions | File path for markdown summary                 |
| `GITLAB_CI`           | GitLab CI      | CI detection                                   |
| `CIRCLECI`            | CircleCI       | CI detection                                   |
| `BITRISE_IO`          | Bitrise        | CI detection                                   |
| `JENKINS_URL`         | Jenkins        | CI detection                                   |

## Precedence Order

When the same setting is configured in multiple places, GPC uses this precedence (highest to lowest):

1. **CLI flag** — `--app com.example.app`
2. **Environment variable** — `GPC_APP=com.example.app`
3. **Project config** — `.gpcrc.json` in current or parent directory
4. **User config** — `~/.config/gpc/config.json`
5. **Default value**

## Example: CI Environment

```bash
export GPC_SERVICE_ACCOUNT="${SERVICE_ACCOUNT_JSON}"
export GPC_APP="com.example.myapp"
export GPC_OUTPUT="json"
export GPC_MAX_RETRIES="5"
export GPC_TIMEOUT="60000"

gpc releases upload app.aab --track internal
```
