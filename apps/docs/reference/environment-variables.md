---
outline: deep
---

# Environment Variables

All `GPC_*` environment variables and external variables that GPC respects.

## Authentication

| Variable              | Type     | Description                                                                                                                   | Default |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| `GPC_SERVICE_ACCOUNT` | `string` | Service account JSON string or file path. Accepts inline JSON (`{"type":"service_account",...}`) or a path to a `.json` file. | —       |
| `GPC_PROFILE`         | `string` | Named auth profile to use. Profiles are created via `gpc auth login --profile <name>`.                                        | —       |

## App & Project

| Variable           | Type     | Description                                                                               | Default |
| ------------------ | -------- | ----------------------------------------------------------------------------------------- | ------- |
| `GPC_APP`          | `string` | Default package name (e.g., `com.example.myapp`). Used when `--app` flag is not provided. | —       |
| `GPC_DEVELOPER_ID` | `string` | Developer account ID. Required for `gpc users` and `gpc testers` commands.                | —       |

## Output

| Variable             | Type                                                       | Description                                                                                                                                              | Default                       |
| -------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `GPC_OUTPUT`         | `table \| json \| yaml \| markdown \| csv \| tsv \| junit` | Default output format. Overridden by `--output` / `-o` flag. Use `-j` / `--json` as shorthand for JSON. Use `--ci` to force JSON + no prompts (CI mode). | `table` (TTY) / `json` (pipe) |
| `GPC_NO_COLOR`       | `boolean`                                                  | Disable colored output. Also respected: `NO_COLOR` (standard).                                                                                           | `false`                       |
| `NO_COLOR`           | `boolean`                                                  | Standard no-color.org variable. Disables all ANSI color output.                                                                                          | —                             |
| `FORCE_COLOR`        | `1 \| 2 \| 3`                                              | Force colored output even when stdout is not a TTY (e.g. in CI).                                                                                         | —                             |
| `GPC_NO_INTERACTIVE` | `boolean`                                                  | Disable interactive prompts. Auto-set when `CI=true` is detected.                                                                                        | Auto in CI                    |
| `GPC_PAGER`          | `string`                                                   | Custom pager command for long outputs. Falls back to `PAGER`, then `less`, then no pager.                                                                | —                             |
| `PAGER`              | `string`                                                   | Standard pager variable. Read when `GPC_PAGER` is not set.                                                                                               | —                             |

## Network & Retry

| Variable                         | Type      | Description                                                                                                                  | Default          |
| -------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `GPC_MAX_RETRIES`                | `integer` | Maximum retry attempts on transient errors (408, 429, 5xx).                                                                  | `5`              |
| `GPC_TIMEOUT`                    | `integer` | Request timeout in milliseconds.                                                                                             | `30000`          |
| `GPC_BASE_DELAY`                 | `integer` | Base retry delay in milliseconds (exponential backoff).                                                                      | `1000`           |
| `GPC_MAX_DELAY`                  | `integer` | Maximum retry delay in milliseconds.                                                                                         | `60000`          |
| `GPC_UPLOAD_TIMEOUT`             | `integer` | Upload timeout in milliseconds. If unset, auto-scales: 30s + 1s per MB.                                                      | Auto             |
| `GPC_UPLOAD_CHUNK_SIZE`          | `integer` | Resumable upload chunk size in bytes. Must be a multiple of 256 KB (262144). Larger chunks mean fewer requests and more RAM. | `8388608` (8 MB) |
| `GPC_UPLOAD_RESUMABLE_THRESHOLD` | `integer` | File size threshold in bytes for switching from simple to resumable upload.                                                  | `5242880` (5 MB) |
| `GPC_CA_CERT`                    | `string`  | Path to custom CA certificate file (PEM format). For corporate proxies.                                                      | —                |
| `NODE_EXTRA_CA_CERTS`            | `string`  | Standard Node.js variable. Path to additional CA certificate bundle. Read at runtime by the network layer.                   | —                |
| `HTTPS_PROXY` / `HTTP_PROXY`     | `string`  | HTTP proxy URLs (e.g., `https://proxy.corp:8080`). Lowercase `https_proxy` / `http_proxy` also respected.                    | —                |

## Updates & Self-Maintenance

| Variable              | Type      | Description                                                                                              | Default |
| --------------------- | --------- | -------------------------------------------------------------------------------------------------------- | ------- |
| `GPC_NO_UPDATE_CHECK` | `boolean` | Suppress the passive update check that runs after each command.                                          | `false` |
| `GPC_GITHUB_TOKEN`    | `string`  | GitHub API token used by `gpc update` and `gpc changelog`. Raises rate limits and allows private assets. | —       |
| `GITHUB_TOKEN`        | `string`  | Standard GitHub Actions token. Fallback when `GPC_GITHUB_TOKEN` is not set.                              | —       |

## Agent Skills

| Variable          | Type     | Description                                                                          | Default                                      |
| ----------------- | -------- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| `GPC_SKILLS_REPO` | `string` | Override the git repo URL used by `gpc install-skills`. Useful for forks or mirrors. | `https://github.com/yasserstudio/gpc-skills` |

## AI Translation (v0.9.63+)

Only read when `gpc changelog generate --target play-store --ai` is invoked. GPC never imports the AI SDK deps otherwise — the cold-start budget is preserved for users who don't use this feature. The resolver auto-detects whichever key is set, in priority order from top to bottom:

| Variable                       | Type     | Description                                                                                                                                                                                                                                                               | Default model for direct path |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `AI_GATEWAY_API_KEY`           | `string` | Routes requests through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). Unlocks 20+ providers plus aggregate cost in USD reported per run, auto-fallback, observability. Defaults to `anthropic/claude-sonnet-4-6` unless `--provider` / `--model` override. | n/a (routed via Gateway)      |
| `ANTHROPIC_API_KEY`            | `string` | Direct `@ai-sdk/anthropic`. See [Anthropic Console](https://console.anthropic.com/settings/keys).                                                                                                                                                                         | `claude-sonnet-4-6`           |
| `OPENAI_API_KEY`               | `string` | Direct `@ai-sdk/openai`. See [OpenAI Platform](https://platform.openai.com/api-keys).                                                                                                                                                                                     | `gpt-4o-mini`                 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `string` | Direct `@ai-sdk/google`. See [Google AI Studio](https://aistudio.google.com/app/apikey).                                                                                                                                                                                  | `gemini-2.5-flash`            |

All defaults are non-reasoning models so you don't pay for thinking tokens on a translation task. Override with `--provider <anthropic\|openai\|google>` and `--model <id>`.

```bash
# Auto-detect (picks whichever key is set first in the priority order)
gpc changelog generate --target play-store --locales auto --ai

# Explicit overrides
gpc changelog generate --target play-store --locales auto --ai \
  --provider anthropic --model claude-opus-4-7

# Preview without spending tokens
gpc --dry-run changelog generate --target play-store --locales auto --ai
```

See the [AI translation guide](/guide/multilingual-release-notes#ai-translation) for the full workflow.

## Debug & Logging

| Variable    | Type      | Description                                                                                                        | Default |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------------------ | ------- |
| `GPC_DEBUG` | `boolean` | Enable debug logging. Prints internal state, request/response details, and shell-completion diagnostics to stderr. | `false` |

```bash
# Diagnose auth issues
GPC_DEBUG=1 gpc auth status

# Diagnose shell completion (v0.9.60+)
GPC_DEBUG=1 gpc __complete packages
```

## CI Provider Detection

GPC auto-detects CI environments. These variables are read but never set by GPC:

| Variable                  | Provider        | Purpose                                        |
| ------------------------- | --------------- | ---------------------------------------------- |
| `CI`                      | Generic         | Enables CI mode (non-interactive, JSON output) |
| `GITHUB_ACTIONS`          | GitHub Actions  | Enables step summary output                    |
| `GITLAB_CI`               | GitLab CI       | CI detection                                   |
| `CIRCLECI`                | CircleCI        | CI detection                                   |
| `TRAVIS`                  | Travis CI       | CI detection                                   |
| `JENKINS_URL`             | Jenkins         | CI detection                                   |
| `BITBUCKET_PIPELINE_UUID` | Bitbucket       | CI detection                                   |
| `BUILD_BUILDID`           | Azure Pipelines | CI detection                                   |
| `CODEBUILD_BUILD_ID`      | AWS CodeBuild   | CI detection                                   |

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
export GPC_NO_UPDATE_CHECK="1"

gpc releases upload app.aab --track internal
```
