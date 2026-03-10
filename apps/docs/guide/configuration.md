---
outline: deep
---

# Configuration

GPC loads configuration from three sources, merged in precedence order. Every setting can be specified as a CLI flag, environment variable, or config file value.

## Precedence Order

Configuration is resolved in this order (highest priority first):

| Priority    | Source                | Example                                      |
| ----------- | --------------------- | -------------------------------------------- |
| 1 (highest) | CLI flags             | `--app com.example.myapp`                    |
| 2           | Environment variables | `GPC_APP=com.example.myapp`                  |
| 3           | Project config file   | `.gpcrc.json` in current or parent directory |
| 4 (lowest)  | User config file      | `~/.config/gpc/config.json`                  |

A CLI flag always overrides an environment variable, which always overrides a config file value.

## Config File

GPC looks for a config file in two locations:

1. **Project config**: `.gpcrc.json` in the current directory or any parent directory (walks up the tree)
2. **User config**: `~/.config/gpc/config.json` (XDG-compliant)

If both exist, the project config values override the user config values. Within each file, all fields are optional.

### Create a config file interactively

```bash
gpc config init
```

This prompts for common settings and writes a `.gpcrc.json` file in the current directory.

### Show resolved configuration

```bash
gpc config show
```

Expected output:

```
Source              Key             Value
.gpcrc.json         app             com.example.myapp
.gpcrc.json         profile         default
default             output          table
GPC_MAX_RETRIES     maxRetries      5
default             timeout         30000
```

### Show config file path

```bash
gpc config path
```

Expected output:

```
/Users/developer/projects/my-app/.gpcrc.json
```

### Set a config value

```bash
gpc config set app com.example.myapp
```

```bash
gpc config set profile production
```

### Full config file example

`.gpcrc.json` with all supported fields:

```json
{
  "app": "com.example.myapp",
  "profile": "default",
  "output": "table",
  "developerId": "1234567890",
  "maxRetries": 3,
  "timeout": 30000,
  "baseDelay": 1000,
  "maxDelay": 60000,
  "rateLimit": 50,
  "caCert": "/path/to/custom-ca.pem",
  "proxy": "http://proxy.example.com:8080",
  "noColor": false,
  "noInteractive": false,
  "plugins": ["@gpc-cli/plugin-ci", "gpc-plugin-slack"]
}
```

### Config file field reference

| Field           | Type                                        | Default                           | Description                                                      |
| --------------- | ------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `app`           | `string`                                    | `undefined`                       | Default package name (e.g., `com.example.myapp`)                 |
| `profile`       | `string`                                    | `"default"`                       | Active auth profile name                                         |
| `output`        | `"table" \| "json" \| "yaml" \| "markdown"` | `"table"` (TTY) / `"json"` (pipe) | Default output format                                            |
| `developerId`   | `string`                                    | `undefined`                       | Developer account ID for user management commands                |
| `maxRetries`    | `number`                                    | `3`                               | Maximum retry attempts on transient errors (429, 5xx)            |
| `timeout`       | `number`                                    | `30000`                           | Request timeout in milliseconds                                  |
| `baseDelay`     | `number`                                    | `1000`                            | Base retry delay in milliseconds (used with exponential backoff) |
| `maxDelay`      | `number`                                    | `60000`                           | Maximum retry delay in milliseconds (backoff cap)                |
| `rateLimit`     | `number`                                    | `50`                              | Maximum requests per second to the Google Play API               |
| `caCert`        | `string`                                    | `undefined`                       | Path to a custom CA certificate file (PEM format)                |
| `proxy`         | `string`                                    | `undefined`                       | HTTP/HTTPS proxy URL                                             |
| `noColor`       | `boolean`                                   | `false`                           | Disable colored output                                           |
| `noInteractive` | `boolean`                                   | `false` (auto-set in CI)          | Disable interactive prompts                                      |
| `plugins`       | `string[]`                                  | `[]`                              | List of plugin package names to load                             |

## Environment Variables

Every config file field has a corresponding environment variable. Environment variables override config file values but are overridden by CLI flags.

| Variable              | Type                        | Default                           | Description                                                                                                                   |
| --------------------- | --------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GPC_SERVICE_ACCOUNT` | `string`                    | `undefined`                       | Service account JSON key file path or JSON string. When set, overrides profile-based auth.                                    |
| `GPC_APP`             | `string`                    | `undefined`                       | Default package name. Equivalent to `--app` flag.                                                                             |
| `GPC_PROFILE`         | `string`                    | `"default"`                       | Auth profile name. Equivalent to `--profile` flag.                                                                            |
| `GPC_OUTPUT`          | `string`                    | `"table"` (TTY) / `"json"` (pipe) | Default output format. Equivalent to `--output` flag.                                                                         |
| `GPC_NO_COLOR`        | `string`                    | `undefined`                       | Set to any value to disable colored output. Equivalent to `--no-color` flag.                                                  |
| `GPC_NO_INTERACTIVE`  | `string`                    | `undefined`                       | Set to any value to disable interactive prompts. Automatically set in CI environments. Equivalent to `--no-interactive` flag. |
| `GPC_MAX_RETRIES`     | `string` (parsed as number) | `"3"`                             | Maximum retry attempts on transient errors (429, 5xx).                                                                        |
| `GPC_TIMEOUT`         | `string` (parsed as number) | `"30000"`                         | Request timeout in milliseconds.                                                                                              |
| `GPC_BASE_DELAY`      | `string` (parsed as number) | `"1000"`                          | Base retry delay in milliseconds. Used with exponential backoff and jitter.                                                   |
| `GPC_MAX_DELAY`       | `string` (parsed as number) | `"60000"`                         | Maximum retry delay in milliseconds. Caps the exponential backoff.                                                            |
| `GPC_RATE_LIMIT`      | `string` (parsed as number) | `"50"`                            | Maximum requests per second to the Google Play API.                                                                           |
| `GPC_DEVELOPER_ID`    | `string`                    | `undefined`                       | Developer account ID. Required for `gpc users` commands.                                                                      |
| `GPC_CA_CERT`         | `string`                    | `undefined`                       | Path to a custom CA certificate file (PEM format). Used for corporate proxies with TLS interception.                          |
| `HTTPS_PROXY`         | `string`                    | `undefined`                       | HTTP/HTTPS proxy URL. Standard environment variable, not GPC-specific.                                                        |
| `GPC_SKIP_KEYCHAIN`   | `string`                    | `undefined`                       | Set to any value to skip OS keychain and use file-based credential storage instead.                                           |

### Setting environment variables

```bash
# Single command
GPC_APP=com.example.myapp gpc releases status

# Shell session
export GPC_APP=com.example.myapp
export GPC_MAX_RETRIES=5
gpc releases status
```

### CI/CD environment variables

```yaml
# GitHub Actions
env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT_JSON }}
  GPC_APP: com.example.myapp
  GPC_NO_COLOR: "1"
  GPC_NO_INTERACTIVE: "1"
```

```yaml
# GitLab CI
variables:
  GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT_JSON
  GPC_APP: com.example.myapp
  GPC_NO_COLOR: "1"
  GPC_NO_INTERACTIVE: "1"
```

## Profiles

Profiles let you store multiple authentication configurations and switch between them. Each profile has its own credentials and can optionally override any config value.

### Create profiles

```bash
gpc auth login --service-account /path/to/dev-key.json --profile development
gpc auth login --service-account /path/to/prod-key.json --profile production
```

### List profiles

```bash
gpc auth profiles
```

Expected output:

```
Profiles:

  * default        play-deploy@my-project.iam.gserviceaccount.com  (active)
    development    dev-deploy@my-project.iam.gserviceaccount.com
    production     prod-deploy@my-project.iam.gserviceaccount.com
```

### Switch profiles

```bash
gpc auth switch production
```

### Use a profile for a single command

```bash
gpc apps list --profile development
```

### Profile storage

Profiles are stored in the user config directory:

```
~/.config/gpc/
  config.json         User-level configuration
  profiles/
    default.json      Default profile credentials
    development.json  Development profile credentials
    production.json   Production profile credentials
```

## Proxy and Custom CA

For corporate networks with HTTP proxies or TLS-intercepting firewalls.

### HTTP/HTTPS proxy

```bash
export HTTPS_PROXY=http://proxy.example.com:8080
gpc apps list
```

Or in the config file:

```json
{
  "proxy": "http://proxy.example.com:8080"
}
```

### Custom CA certificate

For corporate proxies that perform TLS interception:

```bash
export GPC_CA_CERT=/path/to/corporate-ca.pem
gpc apps list
```

Or in the config file:

```json
{
  "caCert": "/path/to/corporate-ca.pem"
}
```

The CA certificate must be in PEM format. GPC appends this certificate to the default Node.js CA bundle, so standard Google API certificates continue to work.

## Retry and Rate Limiting

GPC automatically retries transient errors (HTTP 429, 5xx) with exponential backoff and jitter.

### Default retry behavior

| Parameter   | Default    | Description                                 |
| ----------- | ---------- | ------------------------------------------- |
| Max retries | `3`        | Maximum number of retry attempts            |
| Base delay  | `1000` ms  | Initial delay before first retry            |
| Max delay   | `60000` ms | Maximum delay between retries (backoff cap) |
| Jitter      | Full       | Random jitter applied to each delay         |
| Rate limit  | `50` req/s | Maximum requests per second                 |

### Customize retry behavior

```bash
# Environment variables
export GPC_MAX_RETRIES=5
export GPC_BASE_DELAY=2000
export GPC_MAX_DELAY=120000
export GPC_RATE_LIMIT=25
```

```json
{
  "maxRetries": 5,
  "baseDelay": 2000,
  "maxDelay": 120000,
  "rateLimit": 25
}
```

### Rate limit buckets

The Google Play Developer API has separate rate limit buckets. GPC respects these automatically:

| API                     | Rate Limit                                |
| ----------------------- | ----------------------------------------- |
| Publisher API (general) | Default `GPC_RATE_LIMIT` value            |
| Reviews API (GET)       | 200 requests per hour                     |
| Reviews API (POST)      | 2,000 requests per day                    |
| Voided purchases API    | 6,000 requests per day, 30 per 30 seconds |

## Global CLI Flags

These flags are available on every command and override all other configuration sources.

| Flag                  | Short | Type                                        | Description                       |
| --------------------- | ----- | ------------------------------------------- | --------------------------------- |
| `--app <package>`     | `-a`  | `string`                                    | App package name                  |
| `--profile <name>`    | `-p`  | `string`                                    | Auth profile name                 |
| `--output <format>`   | `-o`  | `"table" \| "json" \| "yaml" \| "markdown"` | Output format                     |
| `--quiet`             | `-q`  | `boolean`                                   | Suppress non-essential output     |
| `--verbose`           | `-v`  | `boolean`                                   | Enable debug logging              |
| `--no-color`          |       | `boolean`                                   | Disable colored output            |
| `--no-interactive`    |       | `boolean`                                   | Disable interactive prompts       |
| `--dry-run`           |       | `boolean`                                   | Preview changes without executing |
| `--limit <n>`         |       | `number`                                    | Maximum results per page          |
| `--next-page <token>` |       | `string`                                    | Pagination token for next page    |
| `--retry-log <path>`  |       | `string`                                    | Log retry attempts to file        |
| `--config <path>`     |       | `string`                                    | Path to config file               |
| `--version`           | `-V`  | `boolean`                                   | Show version                      |
| `--help`              | `-h`  | `boolean`                                   | Show help                         |

## Example: Complete Project Setup

A typical project setup with config file, environment-specific profiles, and CI/CD variables.

### Project config file (`.gpcrc.json`)

```json
{
  "app": "com.example.myapp",
  "output": "table",
  "maxRetries": 3,
  "timeout": 30000,
  "plugins": ["@gpc-cli/plugin-ci"]
}
```

### Development machine setup

```bash
# Create development profile
gpc auth login --service-account dev-service-account.json --profile development

# Create production profile
gpc auth login --service-account prod-service-account.json --profile production

# Set development as active profile
gpc auth switch development
```

### CI/CD setup (GitHub Actions)

```yaml
name: Deploy to Play Store
on:
  push:
    tags: ["v*"]

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT_JSON }}
  GPC_APP: com.example.myapp
  GPC_NO_INTERACTIVE: "1"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Upload to internal
        run: gpc publish app-release.aab --track internal --notes "Build ${{ github.run_number }}"

      - name: Check vitals
        run: |
          gpc vitals crashes --threshold 2.0
          gpc vitals anr --threshold 0.47

      - name: Promote to production
        run: gpc releases promote --from internal --to production --rollout 10
```

## Next Steps

- [Authentication](/guide/authentication) -- Full guide to all 4 auth methods
- [Commands](/commands/) -- Complete command reference
- [CI/CD Integration](/ci-cd/) -- Platform-specific CI/CD guides
