---
outline: deep
---

# anomalies

Detect automatically identified spikes and deviations in your app's vitals metrics.

## Commands

| Command                               | Description                              |
| ------------------------------------- | ---------------------------------------- |
| [`anomalies list`](#anomalies-list)   | List detected anomalies in app vitals    |

## `anomalies list`

Query the Android Vitals anomaly detection system for your app. Returns any automatically detected deviations or spikes across crash rate, ANR rate, startup, rendering, battery, and memory metrics.

### Synopsis

```bash
gpc anomalies list [options]
```

### Options

No command-specific options. Uses global `--app` and `--output` flags.

### Output

The output table shows:

| Column              | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `name`              | Anomaly resource name (API identifier)               |
| `metricSet`         | Which metric set the anomaly was detected in         |
| `aggregationPeriod` | Time period used for detection (e.g. `DAILY`)        |

When no anomalies are detected, the command prints: `No anomalies detected.`

### Example

List anomalies for your app:

```bash
gpc anomalies list --app com.example.myapp
```

```
name                                     metricSet             aggregationPeriod
───────────────────────────────────────  ────────────────────  ─────────────────
apps/com.example.myapp/anomalies/abc123  crashRateMetricSet    DAILY
```

JSON output:

```bash
gpc anomalies list --app com.example.myapp --output json
```

```json
{
  "success": true,
  "data": {
    "anomalies": [
      {
        "name": "apps/com.example.myapp/anomalies/abc123",
        "metricSet": "crashRateMetricSet",
        "timelineSpec": { "aggregationPeriod": "DAILY" },
        "dimensions": [{ "dimension": "versionCode", "value": "43" }],
        "metric": "crashRate",
        "anomalyValue": 4.2,
        "baselineValue": 1.1
      }
    ]
  }
}
```

When there are no anomalies:

```bash
gpc anomalies list --app com.example.myapp
# No anomalies detected.
```

## Related

- [vitals](./vitals) — Detailed metric queries (crashes, ANR, startup, rendering, battery, memory)
- [reviews](./reviews) — User feedback monitoring
- [CI/CD Vitals Gates](/ci-cd/vitals-gates) — Automated quality gates with exit code 6
