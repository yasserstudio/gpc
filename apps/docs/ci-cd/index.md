---
outline: deep
---

# CI/CD Integration

GPC is designed for automation. Every command returns structured output, uses deterministic exit codes, and accepts configuration through environment variables -- no interactive prompts in CI.

## Why GPC Is CI-Native

| Feature | How It Helps in CI |
|---------|-------------------|
| JSON output | Parse results with `jq`, store in variables, pass between steps |
| Exit codes 0-6 | Branch pipeline logic on success, auth failure, threshold breach, etc. |
| Env var config | `GPC_SERVICE_ACCOUNT`, `GPC_APP` -- no config files needed |
| `--dry-run` | Validate changes in PR checks without modifying Play Console state |
| `--no-interactive` | Auto-set when `CI=true` is detected; never blocks on prompts |
| Markdown output | Write directly to `$GITHUB_STEP_SUMMARY` with `--output markdown` |

## Exit Codes

Every GPC command exits with a code that CI systems can act on.

| Code | Meaning | CI Action |
|------|---------|-----------|
| `0` | Success | Continue pipeline |
| `1` | General error | Fail the job |
| `2` | Usage error (bad arguments) | Fix the command invocation |
| `3` | Authentication error | Check `GPC_SERVICE_ACCOUNT` secret |
| `4` | API error (rate limit, permission denied) | Retry or check permissions |
| `5` | Network error | Retry the step |
| `6` | Threshold breach (vitals gating) | Halt rollout, alert team |
| `10` | Plugin error | Check plugin configuration |

```bash
# Branch on exit code in a CI script
gpc vitals crashes --threshold 2.0
EXIT_CODE=$?

case $EXIT_CODE in
  0) echo "Vitals healthy, proceed" ;;
  6) echo "Threshold breached, halting rollout"; gpc releases rollout halt --track production ;;
  *) echo "Unexpected error: $EXIT_CODE"; exit 1 ;;
esac
```

## Install Options in CI

### npm (Node.js available)

```yaml
- run: npm install -g @gpc-cli/cli
```

Best when Node.js is already in your pipeline. Includes plugin support (`@gpc-cli/plugin-ci` for GitHub Actions step summaries).

### Standalone Binary (no dependencies)

```yaml
- run: curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

No Node.js required. Downloads the platform-specific binary with SHA256 checksum verification. Ideal for Docker images and minimal CI runners.

### Homebrew (macOS runners)

```yaml
- run: brew install yasserstudio/tap/gpc
```

## @gpc-cli/plugin-ci

Install `@gpc-cli/plugin-ci` alongside GPC to get automatic CI environment detection and GitHub Actions step summaries.

```bash
npm install -g @gpc-cli/cli @gpc-cli/plugin-ci
```

When running in GitHub Actions with `$GITHUB_STEP_SUMMARY` available, the plugin writes a markdown summary after each command with:

- Command name and arguments
- App package name
- Duration
- Exit code
- Error details (on failure)

### Detected CI Providers

| Provider | Detection Variable | Build ID | Branch Variable |
|----------|-------------------|----------|----------------|
| GitHub Actions | `GITHUB_ACTIONS=true` | `GITHUB_RUN_ID` | `GITHUB_REF_NAME` |
| GitLab CI | `GITLAB_CI=true` | `CI_JOB_ID` | `CI_COMMIT_BRANCH` |
| Jenkins | `JENKINS_URL` | `BUILD_NUMBER` | `BRANCH_NAME` |
| CircleCI | `CIRCLECI=true` | `CIRCLE_BUILD_NUM` | `CIRCLE_BRANCH` |
| Bitrise | `BITRISE_IO=true` | `BITRISE_BUILD_NUMBER` | `BITRISE_GIT_BRANCH` |
| Generic | `CI=true` | -- | -- |

## Environment Variables

Configure GPC entirely through environment variables. No config files needed in CI.

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GPC_SERVICE_ACCOUNT` | Service account JSON string or file path | Yes (CI) | -- |
| `GPC_APP` | Default package name | Recommended | -- |
| `GPC_DEVELOPER_ID` | Developer account ID (for user/permission commands) | No | -- |
| `GPC_PROFILE` | Auth profile name | No | -- |
| `GPC_OUTPUT` | Default output format | No | `json` (non-TTY) |
| `GPC_NO_COLOR` | Disable color output | No | Auto in CI |
| `GPC_NO_INTERACTIVE` | Disable interactive prompts | No | Auto when `CI=true` |
| `GPC_MAX_RETRIES` | Max retry attempts on transient errors | No | `3` |
| `GPC_TIMEOUT` | Request timeout in milliseconds | No | `30000` |
| `GPC_BASE_DELAY` | Base retry delay in milliseconds | No | `1000` |
| `GPC_MAX_DELAY` | Max retry delay in milliseconds | No | `60000` |
| `GPC_RATE_LIMIT` | Requests per second | No | `50` |
| `GPC_CA_CERT` | Custom CA certificate path | No | -- |
| `HTTPS_PROXY` | HTTP proxy URL | No | -- |

### Secrets Management

Store `GPC_SERVICE_ACCOUNT` as an encrypted secret in your CI provider. The value can be either:

- **JSON string** -- the full service account JSON content (recommended for CI)
- **File path** -- path to a mounted service account key file

```yaml
# GitHub Actions
env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}

# GitLab CI
variables:
  GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT

# CircleCI (use context or project env)
environment:
  GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT
```

::: warning
Never hardcode credentials in workflow files, echo credential values in logs, or store credentials as build artifacts.
:::

## JSON Output Contract

All GPC commands in CI default to JSON output (auto-detected when stdout is not a TTY). The format is consistent across all commands:

```json
{
  "success": true,
  "data": { },
  "metadata": {
    "command": "releases upload",
    "timestamp": "2026-03-09T12:00:00Z",
    "duration_ms": 4200
  }
}
```

Error responses:

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

Parse JSON output with `jq` in CI scripts:

```bash
# Extract version code after upload
VERSION=$(gpc releases upload app.aab --track internal --json | jq -r '.data.versionCode')

# Check if command succeeded
gpc releases status --json | jq -e '.success' > /dev/null
```

## Next Steps

- [GitHub Actions workflows](./github-actions) -- complete, copy-pasteable workflow files
- [GitLab CI](./gitlab-ci) -- multi-stage pipeline configuration
- [Bitbucket Pipelines](./bitbucket) -- tag-triggered releases
- [CircleCI](./circleci) -- orb-style job configuration
- [Vitals quality gates](./vitals-gates) -- crash rate and ANR gating for rollouts
