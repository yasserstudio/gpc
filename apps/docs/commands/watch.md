---
outline: deep
---

<CommandHeader
  name="gpc watch"
  description="Monitor a rollout in real-time with multi-metric vitals tracking, threshold alerts, and auto-actions. Ship your release, then watch it from your terminal."
  usage="gpc watch [options]"
  :badges="['--json', '--on-breach', '--metrics']"
/>

::: info Requires Google Play Reporting API
Vitals data comes from the [Play Reporting API](https://developers.google.com/play/developer/reporting), which requires the `--app` package to have sufficient installs for Google to report metrics. Rollout status uses the standard Publishing API and works for all apps.
:::

## Synopsis

```sh
gpc watch [options]
```

## Options

| Flag                            | Default       | Description                                                      |
| ------------------------------- | ------------- | ---------------------------------------------------------------- |
| `--track <name>`                | `production`  | Track to monitor                                                 |
| `--metrics <csv>`               | `crashes,anr` | Metrics to watch (see [Metrics](#metrics))                       |
| `--interval <seconds>`          | `900`         | Poll interval (minimum 60)                                       |
| `--rounds <n>`                  | unlimited     | Stop after N polling rounds                                      |
| `--crash-threshold <pct>`       | `0.02`        | Crash rate threshold (decimal, e.g. 0.02 = 2%)                   |
| `--anr-threshold <pct>`         | `0.01`        | ANR rate threshold                                               |
| `--lmk-threshold <pct>`         | `0.03`        | LMK rate threshold                                               |
| `--slow-start-threshold <pct>`  | `0.05`        | Slow start rate threshold                                        |
| `--slow-render-threshold <pct>` | `0.1`         | Slow rendering rate threshold                                    |
| `--error-count-threshold <n>`   |               | Error report count threshold                                     |
| `--on-breach <actions>`         | `notify`      | Actions on breach: `notify`, `halt`, `webhook` (comma-separated) |
| `--webhook-url <url>`           |               | Webhook URL for breach notifications                             |
| `--json`                        |               | NDJSON output (one JSON object per round)                        |

## Metrics

| Name         | API metric set               | What it tracks                  |
| ------------ | ---------------------------- | ------------------------------- |
| `crashes`    | `crashRateMetricSet`         | App crash rate                  |
| `anr`        | `anrRateMetricSet`           | Application Not Responding rate |
| `lmk`        | `lmkRateMetricSet`           | Low Memory Killer rate          |
| `slowStarts` | `slowStartRateMetricSet`     | Cold/warm start time violations |
| `slowRender` | `slowRenderingRateMetricSet` | Slow frame rendering rate       |
| `errorCount` | `errorCountMetricSet`        | Error report count              |

## Examples

### Basic watch

Monitor crashes and ANR on the production track, polling every 15 minutes:

```sh
gpc watch
```

### Watch a beta rollout with tighter thresholds

```sh
gpc watch --track beta --crash-threshold 0.015 --anr-threshold 0.005
```

### Watch with auto-halt on breach

Automatically halt the rollout if any threshold is breached:

```sh
gpc watch --on-breach halt
```

### Watch with webhook notifications

Send a POST request to your Slack/PagerDuty webhook on breach:

```sh
gpc watch --on-breach notify,webhook --webhook-url https://hooks.slack.com/services/XXX
```

### CI-friendly: run 3 rounds, exit 6 on breach

```sh
gpc watch --rounds 3 --interval 300 --on-breach halt --json
```

### Monitor additional metrics

```sh
gpc watch --metrics crashes,anr,lmk,slowStarts
```

## Thresholds

Thresholds are resolved in priority order:

1. **CLI flags** (`--crash-threshold 0.03`)
2. **Config file** (`vitals.thresholds.crashRate` in `.gpcrc.json`)
3. **Defaults** (crash 2%, ANR 1%, LMK 3%, slow start 5%, slow render 10%)

Config example:

```json
{
  "vitals": {
    "thresholds": {
      "crashRate": 0.02,
      "anrRate": 0.01,
      "lmkRate": 0.03
    }
  }
}
```

## Breach Actions

| Action    | Effect                                           |
| --------- | ------------------------------------------------ |
| `notify`  | Send an OS notification (macOS, Linux, Windows)  |
| `halt`    | Halt the active rollout via the Google Play API  |
| `webhook` | POST the breach event as JSON to `--webhook-url` |

Multiple actions can be combined: `--on-breach notify,halt,webhook`

### Webhook payload

```json
{
  "type": "breach",
  "round": 3,
  "timestamp": "2026-04-25T14:45:00.000Z",
  "rollout": {
    "track": "production",
    "versionCode": "142",
    "userFraction": 0.1,
    "status": "inProgress"
  },
  "vitals": {
    "crashes": { "value": 0.025, "threshold": 0.02, "breached": true },
    "anr": { "value": 0.005, "threshold": 0.01, "breached": false }
  },
  "breaches": ["crashes"],
  "halted": true
}
```

You can also set the webhook URL in config to avoid passing it every time:

```json
{
  "webhooks": {
    "watch": "https://hooks.slack.com/services/XXX"
  }
}
```

## Auto-stop

The watch loop stops automatically when:

- The rollout reaches 100% (status "completed")
- A breach triggers the `halt` action
- The `--rounds` limit is reached
- You press Ctrl+C

## Exit Codes

| Code | Meaning                                                      |
| ---- | ------------------------------------------------------------ |
| `0`  | Clean exit (rollout completed, Ctrl+C, or rounds exhausted)  |
| `6`  | At least one threshold was breached during the watch session |

## Data Freshness

Vitals data from the Google Play Reporting API is typically 24-48 hours behind real-time. Rollout status (track, version code, user fraction) is near real-time. The watch command shows both, so you get immediate rollout progress alongside delayed quality signals.

For multi-day staged rollouts, the vitals data catches up and becomes actionable within the watch window.

## See Also

- [`gpc status`](/commands/status) -- one-time app health snapshot
- [`gpc vitals`](/commands/vitals) -- detailed vitals queries and single-metric watch
- [`gpc train`](/commands/train) -- automated multi-stage rollout pipeline with gates
