---
outline: deep
---

# vitals

Monitor app vitals, crash rates, ANR, startup times, rendering performance, battery usage, and memory. Supports threshold-based CI gating with exit code 6.

## Commands

| Command                                         | Description                            |
| ----------------------------------------------- | -------------------------------------- |
| [`vitals overview`](#vitals-overview)           | Dashboard summary of all vital metrics |
| [`vitals crashes`](#vitals-crashes)             | Query crash rate metrics               |
| [`vitals anr`](#vitals-anr)                     | Query ANR rate metrics                 |
| [`vitals startup`](#vitals-startup)             | Query slow startup metrics             |
| [`vitals rendering`](#vitals-rendering)         | Query slow rendering metrics           |
| [`vitals battery`](#vitals-battery)             | Query excessive wakeup metrics         |
| [`vitals wakeup`](#vitals-battery)              | Alias for `vitals battery`             |
| [`vitals memory`](#vitals-memory)               | Query stuck wakelock metrics           |
| [`vitals lmk`](#vitals-memory)                  | Alias for `vitals memory`              |
| [`vitals errors search`](#vitals-errors-search) | Search error issues and reports        |
| [`vitals compare`](#vitals-compare)             | Compare metric trend across periods    |

## Shared Options

The metric commands (`crashes`, `anr`, `startup`, `rendering`, `battery`, `memory`) share these options:

| Flag          | Short | Type     | Default | Description                                               |
| ------------- | ----- | -------- | ------- | --------------------------------------------------------- |
| `--dim`       |       | `string` |         | Group by dimension                                        |
| `--days`      |       | `number` |         | Number of days to query                                   |
| `--threshold` |       | `number` |         | Threshold value for CI alerting (exit code 6 if breached) |

Valid dimensions: `apiLevel`, `versionCode`, `deviceModel`, `deviceType`, `countryCode`, `deviceRamBucket`, `deviceSocName`, `deviceCpuMakeModel`, `deviceGlEsVersion`, `deviceVulkanVersion`, `deviceOpenGlVersion`, `deviceBrand`.

## `vitals overview`

Dashboard summary aggregating all vital metrics into a single view.

### Synopsis

```bash
gpc vitals overview
```

### Options

No command-specific options. Uses global `--app` flag.

### Example

```bash
gpc vitals overview --app com.example.myapp
```

```json
{
  "crashRate": { "value": 1.2, "threshold": "bad" },
  "anrRate": { "value": 0.3, "threshold": "good" },
  "slowStartRate": { "value": 5.1, "threshold": "acceptable" },
  "slowRenderingRate": { "value": 2.8, "threshold": "good" },
  "excessiveWakeupRate": { "value": 0.1, "threshold": "good" },
  "stuckWakelockRate": { "value": 0.05, "threshold": "good" }
}
```

---

## `vitals crashes`

Query crash rate metrics, optionally grouped by dimension.

### Synopsis

```bash
gpc vitals crashes [options]
```

### Options

| Flag          | Short | Type     | Default | Description                                    |
| ------------- | ----- | -------- | ------- | ---------------------------------------------- |
| `--dim`       |       | `string` |         | Group by dimension                             |
| `--days`      |       | `number` |         | Number of days to query                        |
| `--threshold` |       | `number` |         | Crash rate threshold (exit code 6 if breached) |

### Example

Query crash rate:

```bash
gpc vitals crashes --app com.example.myapp
```

Query crash rate by version code:

```bash
gpc vitals crashes --app com.example.myapp --dim versionCode --days 30
```

CI gating with threshold:

```bash
gpc vitals crashes --app com.example.myapp --threshold 2.0
```

If the crash rate exceeds 2.0%, the command exits with code 6:

```
Threshold breached: 2.4 > 2.0
```

Use in CI pipelines:

```yaml
- name: Check crash rate
  run: gpc vitals crashes --app com.example.myapp --threshold 2.0
```

---

## `vitals anr`

Query ANR (Application Not Responding) rate metrics.

### Synopsis

```bash
gpc vitals anr [options]
```

### Options

| Flag          | Short | Type     | Default | Description                                  |
| ------------- | ----- | -------- | ------- | -------------------------------------------- |
| `--dim`       |       | `string` |         | Group by dimension                           |
| `--days`      |       | `number` |         | Number of days to query                      |
| `--threshold` |       | `number` |         | ANR rate threshold (exit code 6 if breached) |

### Example

```bash
gpc vitals anr --app com.example.myapp --threshold 0.5
```

Group by device model:

```bash
gpc vitals anr --app com.example.myapp --dim deviceModel --days 14
```

---

## `vitals startup`

Query cold and warm startup time metrics.

### Synopsis

```bash
gpc vitals startup [options]
```

### Options

| Flag          | Short | Type     | Default | Description                                         |
| ------------- | ----- | -------- | ------- | --------------------------------------------------- |
| `--dim`       |       | `string` |         | Group by dimension                                  |
| `--days`      |       | `number` |         | Number of days to query                             |
| `--threshold` |       | `number` |         | Slow start rate threshold (exit code 6 if breached) |

### Example

```bash
gpc vitals startup --app com.example.myapp --days 7
```

---

## `vitals rendering`

Query slow rendering (frame rate) metrics.

### Synopsis

```bash
gpc vitals rendering [options]
```

### Options

| Flag          | Short | Type     | Default | Description                                             |
| ------------- | ----- | -------- | ------- | ------------------------------------------------------- |
| `--dim`       |       | `string` |         | Group by dimension                                      |
| `--days`      |       | `number` |         | Number of days to query                                 |
| `--threshold` |       | `number` |         | Slow rendering rate threshold (exit code 6 if breached) |

### Example

```bash
gpc vitals rendering --app com.example.myapp --dim apiLevel
```

---

## `vitals battery`

Query excessive wakeup metrics (battery impact). Also available as `vitals wakeup`.

### Synopsis

```bash
gpc vitals battery [options]
gpc vitals wakeup [options]   # alias
```

### Options

| Flag          | Short | Type     | Default | Description                                               |
| ------------- | ----- | -------- | ------- | --------------------------------------------------------- |
| `--dim`       |       | `string` |         | Group by dimension                                        |
| `--days`      |       | `number` |         | Number of days to query                                   |
| `--threshold` |       | `number` |         | Excessive wakeup rate threshold (exit code 6 if breached) |

### Example

```bash
gpc vitals battery --app com.example.myapp --threshold 1.0
```

---

## `vitals memory`

Query stuck background wakelock metrics (memory/battery impact). Also available as `vitals lmk` (low-memory killer).

### Synopsis

```bash
gpc vitals memory [options]
gpc vitals lmk [options]   # alias
```

### Options

| Flag          | Short | Type     | Default | Description                                             |
| ------------- | ----- | -------- | ------- | ------------------------------------------------------- |
| `--dim`       |       | `string` |         | Group by dimension                                      |
| `--days`      |       | `number` |         | Number of days to query                                 |
| `--threshold` |       | `number` |         | Stuck wakelock rate threshold (exit code 6 if breached) |

### Example

```bash
gpc vitals memory --app com.example.myapp --days 30
```

---

## `vitals errors search`

Search error issues and reports across all error types.

### Synopsis

```bash
gpc vitals errors search [options]
```

### Options

| Flag       | Short | Type     | Default | Description       |
| ---------- | ----- | -------- | ------- | ----------------- |
| `--filter` |       | `string` |         | Filter expression |
| `--max`    |       | `number` |         | Maximum results   |

### Example

Search all errors:

```bash
gpc vitals errors search --app com.example.myapp
```

Search with filter and limit:

```bash
gpc vitals errors search \
  --app com.example.myapp \
  --filter "NullPointerException" \
  --max 20
```

---

## `vitals compare`

Compare a vitals metric between the current period and the previous period of the same length.

### Synopsis

```bash
gpc vitals compare <metric> [options]
```

The `<metric>` argument accepts: `crashes`, `anr`, `startup`, `rendering`, `battery`, `memory`.

### Options

| Flag     | Short | Type     | Default | Description           |
| -------- | ----- | -------- | ------- | --------------------- |
| `--days` |       | `number` | `7`     | Period length in days |

### Example

Compare crash rate this week vs last week:

```bash
gpc vitals compare crashes --app com.example.myapp --days 7
```

```json
{
  "metric": "crashRateMetricSet",
  "currentPeriod": { "start": "2026-03-02", "end": "2026-03-09", "value": 1.2 },
  "previousPeriod": { "start": "2026-02-23", "end": "2026-03-02", "value": 1.5 },
  "change": -0.3,
  "changePercent": -20.0
}
```

Compare ANR rate over 30 days:

```bash
gpc vitals compare anr --app com.example.myapp --days 30
```

## Related

- [anomalies](./anomalies) -- Automatic anomaly detection across all vitals metrics
- [reviews](./reviews) -- User feedback monitoring
- [CI/CD Vitals Gates](/ci-cd/vitals-gates) -- Automated quality gates
- [Exit Codes](/reference/exit-codes) -- Exit code 6 for threshold breach
