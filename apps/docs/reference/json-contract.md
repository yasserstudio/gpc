---
outline: deep
---

# JSON Output Contract

Every GPC command can print machine-readable JSON. This page describes exactly what you get, so scripts and CI jobs can rely on it. Within 1.x these shapes follow the [Versioning and Stability](/reference/stability) rules: fields can be added, but existing ones are not renamed or removed.

## Choosing the format

Output is a **table by default**, in a terminal, in a pipe and in CI alike. Ask for JSON explicitly:

| Flag                        | Result                                               |
| --------------------------- | ---------------------------------------------------- |
| `--json` or `-j`            | JSON                                                 |
| `--output json` / `-o json` | JSON                                                 |
| `--ci`                      | JSON, plus no interactive prompts and no colour      |
| `--output <format>`         | `table`, `yaml`, `markdown`, `junit`, `csv` or `tsv` |

You can also set a default with the `output` key in your config. A flag always wins over the config.

```bash
gpc releases status            # table
gpc releases status | cat      # still a table
gpc releases status --json     # JSON
```

## Where things go

| Stream      | Contains                                                             |
| ----------- | -------------------------------------------------------------------- |
| stdout      | The JSON result, and nothing else                                    |
| stderr      | Errors, warnings, progress and threshold messages, always plain text |
| exit status | The outcome, as listed in [Exit Codes](/reference/exit-codes)        |

Because stdout carries only the result, `gpc ... --json | jq` is always safe to parse. Decide success or failure from the **exit code**, not from the JSON.

## Success shapes

There is no shared wrapper object. Each command prints its own result, in one of three patterns.

### Lists

List commands (`tracks list`, `reviews list`, `testers list`, `users list`, `purchases ...`, `iap list` and others) print an object with the items under a descriptive key, plus paging fields:

```json
{
  "tracks": [
    { "track": "production", "releases": 1, "latestStatus": "completed", "latestVersion": "142" }
  ],
  "nextPageToken": null,
  "meta": { "count": 1 }
}
```

| Field           | Type             | Always present | Description                                                 |
| --------------- | ---------------- | -------------- | ----------------------------------------------------------- |
| `<key>`         | `array`          | Yes            | The items. The key names the resource (`tracks`, `reviews`) |
| `nextPageToken` | `string \| null` | Yes            | Pass to `--next-page` to continue; `null` on the last page  |
| `meta.count`    | `number`         | Yes            | Number of items in this response                            |
| `message`       | `string`         | When empty     | Explains an empty result, e.g. `"No reviews found"`         |

### Single resources and summaries

Commands that describe one thing print that object directly. For example `gpc apps info --json`:

```json
{ "packageName": "com.example.app", "defaultLanguage": "en-US", "contactEmail": "dev@example.com" }
```

`gpc releases status --json` prints an array with one entry per release:

```json
[
  {
    "track": "production",
    "status": "inProgress",
    "versionCodes": ["142"],
    "userFraction": 0.1,
    "releaseNotes": [{ "language": "en-US", "text": "Bug fixes and improvements." }]
  }
]
```

`gpc status --json` is the easiest place to read vitals as numbers. Rates are fractions (`0.003` means 0.3%):

```json
{
  "packageName": "com.example.app",
  "releases": [
    { "track": "production", "versionCode": "142", "status": "completed", "userFraction": null }
  ],
  "vitals": {
    "windowDays": 7,
    "crashes": {
      "value": 0.003,
      "threshold": 0.02,
      "status": "ok",
      "previousValue": 0,
      "trend": "up"
    },
    "anr": {
      "value": 0.0088,
      "threshold": 0.01,
      "status": "warn",
      "previousValue": 0.0243,
      "trend": "down"
    }
  },
  "reviews": { "windowDays": 30, "totalNew": 0 }
}
```

`status` is `ok`, `warn`, `breach` or `unknown` (no data). When any metric is at `breach`, `gpc status` still prints the JSON but exits `6`, so under `set -e` read it with `gpc status --json || true`.

### Vitals queries

`gpc vitals <metric> --json` passes through Google's Play Developer Reporting rows unchanged, so you see exactly what Google returned. Metric values are **strings**:

```json
{
  "rows": [
    {
      "startTime": { "year": 2026, "month": 10, "day": 14 },
      "dimensions": [{ "dimension": "startType", "stringValue": "COLD" }],
      "metrics": [{ "metric": "slowStartRate", "decimalValue": { "value": "0.0465" } }]
    }
  ]
}
```

To gate a build on vitals, use `--threshold` rather than parsing these rows. It checks the worst value of the latest day and exits `6` on a breach:

```bash
gpc vitals crashes --threshold 0.02   # fails the job above 2%
```

## Errors

Errors are not JSON, even with `--json`. They go to stderr as text, stdout stays empty, and the exit code tells you the category:

```text
Error [THRESHOLD_INVALID]: crashes threshold 2 can never be reached: rates are between 0 and 1.
Suggestion: Write rates as fractions: 0.02 means 2%. Check vitals.thresholds in your config too.
```

| Line           | Always present | Description                                                 |
| -------------- | -------------- | ----------------------------------------------------------- |
| `Error [CODE]` | Yes            | Stable error code; see [Error Codes](/advanced/error-codes) |
| `Suggestion:`  | When available | What to do next                                             |
| `Details:`     | When available | Extra context, such as Google's own message                 |

To branch on a specific error, match the code in stderr: `grep -q 'Error \[API_APP_NOT_FOUND\]'`.

A few commands report their own outcome inside the JSON as well, for example `gpc doctor --json` (`success`, `errors`, `warnings`, `checks[]`). Their exit code is still the source of truth.

## Parsing examples

### jq

```bash
# Version codes on every track
gpc releases status --json | jq -r '.[].versionCodes[]'

# Crash rate as a number
gpc status --json | jq -r '.vitals.crashes.value'

# Count of tracks
gpc tracks list --json | jq '.meta.count'
```

### Node.js

```javascript
import { spawnSync } from "node:child_process";

const run = spawnSync("gpc", ["releases", "status", "--json"], {
  encoding: "utf-8",
  env: { ...process.env, GPC_APP: "com.example.app" },
});

if (run.status !== 0) {
  console.error(run.stderr); // "Error [CODE]: ..." text
  process.exit(run.status);
}

for (const release of JSON.parse(run.stdout)) {
  console.log(`${release.track}: ${release.status} ${release.versionCodes.join(",")}`);
}
```

### Python

```python
import json
import os
import subprocess

run = subprocess.run(
    ["gpc", "releases", "status", "--json"],
    capture_output=True,
    text=True,
    env={**os.environ, "GPC_APP": "com.example.app"},
)

if run.returncode != 0:
    raise SystemExit(run.stderr)  # "Error [CODE]: ..." text

for release in json.loads(run.stdout):
    print(release["track"], release["status"], release["versionCodes"])
```

## Secrets redaction

All output, JSON included, redacts sensitive fields before it is printed. Keys such as `private_key`, `privateKey`, `access_token`, `refresh_token`, `client_secret`, `token`, `password`, `secret`, `credentials` and `keyFile` (and their camelCase or snake_case forms) are replaced with `[REDACTED]`. Redaction cannot be turned off.
