---
outline: deep
---

# JSON Output Contract

All GPC commands return structured output. The format depends on TTY detection or the `--output` flag.

## Output Formats

| Format | Flag | When Used | Purpose |
|--------|------|-----------|---------|
| `table` | `--output table` | Default in TTY (terminal) | Human-readable |
| `json` | `--output json` | Default in pipe/CI | Machine-parseable |
| `yaml` | `--output yaml` | Explicit only | Config-friendly |
| `markdown` | `--output markdown` | Explicit only | GitHub `$GITHUB_STEP_SUMMARY` |

## Auto-Detection

```bash
# Terminal (TTY) — renders a table
gpc releases status

# Pipe — outputs JSON automatically
gpc releases status | jq '.data'

# CI (CI=true) — outputs JSON automatically
CI=true gpc releases status

# Override in any context
gpc releases status --output json
gpc releases status --output yaml
gpc releases status --output markdown
```

## Success Response

```json
{
  "success": true,
  "data": {
    "track": "production",
    "status": "inProgress",
    "versionCodes": ["142"],
    "rolloutPercentage": 10,
    "releaseNotes": [
      {
        "language": "en-US",
        "text": "Bug fixes and performance improvements."
      }
    ]
  },
  "metadata": {
    "command": "releases status",
    "app": "com.example.myapp",
    "timestamp": "2026-03-06T12:00:00Z",
    "duration_ms": 342
  }
}
```

### Fields

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| `success` | `boolean` | Yes | `true` on success, `false` on error |
| `data` | `object \| array` | Yes (on success) | Command-specific response data |
| `metadata` | `object` | Yes | Execution metadata |
| `metadata.command` | `string` | Yes | The command that was executed |
| `metadata.app` | `string` | When available | Package name used |
| `metadata.timestamp` | `string` | Yes | ISO 8601 timestamp |
| `metadata.duration_ms` | `number` | Yes | Execution time in milliseconds |

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "API_FORBIDDEN",
    "message": "The service account does not have permission to manage releases for this app.",
    "suggestion": "Ensure the service account has the required permissions for this operation."
  },
  "metadata": {
    "command": "releases upload",
    "app": "com.example.myapp",
    "timestamp": "2026-03-06T12:00:05Z",
    "duration_ms": 1203
  }
}
```

### Error Fields

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| `error.code` | `string` | Yes | Machine-readable error code (e.g., `API_FORBIDDEN`) |
| `error.message` | `string` | Yes | Human-readable error description |
| `error.suggestion` | `string` | When available | Actionable fix suggestion |

## Parsing Examples

### jq

```bash
# Extract data
gpc releases status --output json | jq '.data.rolloutPercentage'

# Check success
gpc releases upload app.aab --output json | jq -e '.success'

# Extract error
gpc releases upload app.aab --output json | jq -r '.error.suggestion // "No suggestion"'

# List all version codes across tracks
gpc status --output json | jq -r '.data.tracks[].releases[].versionCodes[]'
```

### Node.js

```javascript
import { execSync } from "node:child_process";

const output = execSync("gpc releases status --output json", {
  encoding: "utf-8",
  env: {
    ...process.env,
    GPC_APP: "com.example.myapp",
  },
});

const result = JSON.parse(output);

if (result.success) {
  console.log(`Rollout: ${result.data.rolloutPercentage}%`);
} else {
  console.error(`Error: ${result.error.code} — ${result.error.message}`);
}
```

### Python

```python
import json
import subprocess

result = subprocess.run(
    ["gpc", "releases", "status", "--output", "json"],
    capture_output=True,
    text=True,
    env={**os.environ, "GPC_APP": "com.example.myapp"},
)

data = json.loads(result.stdout)

if data["success"]:
    print(f"Rollout: {data['data']['rolloutPercentage']}%")
else:
    print(f"Error: {data['error']['code']}")
```

## Secrets Redaction

All output (including JSON) automatically redacts sensitive fields:

| Field | Redacted To |
|-------|-------------|
| `private_key` | `[REDACTED]` |
| `private_key_id` | `[REDACTED]` |
| `access_token` | `[REDACTED]` |
| `refresh_token` | `[REDACTED]` |
| `client_secret` | `[REDACTED]` |
| `token` | `[REDACTED]` |
| `password` | `[REDACTED]` |
| `secret` | `[REDACTED]` |
| `credentials` | `[REDACTED]` |

Redaction is applied before output formatting and cannot be disabled.
