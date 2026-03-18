---
outline: deep
---

<CommandHeader
  name="gpc status"
  description="Everything you'd check in 4–6 Play Console screens, in one terminal command. Six parallel API calls — full picture in under 3 seconds."
  usage="gpc status [options]"
  :badges="['--json', '--watch', '--sections', '--all-apps', '--dry-run']"
/>

```
$ gpc status

App: com.example.app  (fetched 5 min ago)

RELEASES
  production   v142   completed    —
  beta         v143   inProgress  10%
  internal     v144   draft        —

VITALS  (last 7 days)
  crashes     0.80% ↓  ✓    anr         0.20% ↓  ✓
  slow starts 2.10%    ✓    slow render 4.30%    ⚠

REVIEWS  (last 30 days)
  ★ 4.6   142 new   89% positive   ↑ from 4.4
```

Six API calls fire simultaneously. You have the full picture in under 3 seconds.

## Synopsis

```bash
gpc status [options]
```

## Options

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--days <n>` | `number` | `7` | Vitals window in days (reviews always use last 30 days); must be ≥ 1, exits code 2 otherwise |
| `--cached` | flag | off | Read from cache, skip all API calls |
| `--refresh` | flag | off | Force live fetch, ignore cache TTL |
| `--ttl <seconds>` | `number` | `3600` | Cache TTL override for this run |
| `--format <fmt>` | `string` | `table` | `table` for the full view, `summary` for a one-liner |
| `--sections <list>` | `string` | `releases,vitals,reviews` | Comma-separated sections to fetch and display |
| `--watch [seconds]` | `number` | `30` | Poll and refresh every N seconds (min 10) |
| `--since-last` | flag | off | Show diff from the last cached status |
| `--all-apps` | flag | off | Run for all configured app profiles (max 5) |
| `--notify` | flag | off | Send a desktop notification on threshold breach or clear |
| `--output <format>` | `string` | `table` | `table` or `json` |
| `--app <package>` | `string` | config | Override app package name |

## How It Works

`gpc status` fires **parallel API calls** for each requested section. With all sections enabled and trend data, this is up to 10 calls total:

| Section | API | Endpoint | Calls |
| --- | --- | --- | --- |
| Releases | Publisher API v3 | `tracks.list` | 1 |
| Crash rate | Reporting API v1beta1 | `crashRateMetricSet.query` | 2 (current + previous period for trend) |
| ANR rate | Reporting API v1beta1 | `anrRateMetricSet.query` | 2 |
| Slow starts | Reporting API v1beta1 | `slowStartRateMetricSet.query` | 2 |
| Slow render | Reporting API v1beta1 | `slowRenderingRateMetricSet.query` | 2 |
| Reviews | Publisher API v3 | `reviews.list` | 1 |

Results are cached in `~/.cache/gpc/status-<packageName>.json` (XDG-compliant). Default TTL: 1 hour. Individual API failures do not abort the command — the failed section shows `—` and the exit code reflects overall health.

The header timestamp uses relative time: `fetched 5 min ago`, `fetched 2h ago`, `fetched 1d ago`.

## Output Sections

### RELEASES

One row per track. Shows all tracks that have at least one release, ordered: `production`, `beta`, `alpha`, `internal`, then custom tracks.

| Field | Description |
| --- | --- |
| track | Track name |
| versionCode | Latest version code in the track |
| status | `completed` · `inProgress` · `draft` · `halted` |
| rollout | Staged rollout percentage, or `—` for full rollout |

### VITALS (last N days)

Four metrics from the Play Reporting API. Each shows a value, an optional trend arrow, and a threshold indicator.

| Metric | Default threshold | Indicator |
| --- | --- | --- |
| crashes | 2% | `✓` ok · `⚠` within 20% of threshold · `✗` breached |
| anr | 1% | same |
| slow starts | 5% | same |
| slow render | 10% | same |

**Trend arrows** compare the current window against an equal-length prior window:

- `↑` — metric is increasing (worse for crash/ANR rates)
- `↓` — metric is decreasing (better for crash/ANR rates)
- No arrow — flat, or insufficient data for comparison

When no vitals data is available for the period, the section renders: `No vitals data available for this period.`

Configure thresholds in `.gpcrc.json`:

```json
{
  "vitals": {
    "thresholds": {
      "crashRate": 0.02,
      "anrRate": 0.01,
      "slowStartRate": 0.05,
      "slowRenderingRate": 0.10
    }
  }
}
```

Or with `gpc config set`:

```bash
gpc config set vitals.thresholds.crashRate 2.0
gpc config set vitals.thresholds.anrRate 1.0
```

If any metric breaches its threshold, `gpc status` exits **code 6** — consistent with `gpc vitals`.

### REVIEWS (last 30 days)

Computed locally from `reviews.list` — no external service.

| Field | Meaning |
| --- | --- |
| ★ 4.6 | Average star rating in the current window |
| 142 new | Reviews received in the window |
| 89% positive | Percentage with ≥ 4 stars |
| ↑ from 4.4 | Trend vs the previous 30-day window |

When no reviews exist in the period: `No reviews in this period.`

## Summary Mode

`--format summary` collapses the output to a single line. Useful for shell prompts, post-deploy hooks, and log scanning:

```bash
gpc status --format summary
```

```
com.example.app · v142 production · crashes 0.80% ↓ ✓ · ANR 0.20% ↓ ✓ · avg 4.6★ · 142 reviews
```

With a threshold breach:

```
com.example.app · v142 production · crashes 3.50% ↑ ✗ · ANR 0.20% ✓ · avg 4.6★ [ALERT]
```

Exit codes are the same as table mode — exit 6 on breach.

## Filtering Sections

`--sections` lets you fetch and display only what you need, reducing API quota usage:

```bash
# Vitals only — skips releases and reviews API calls
gpc status --sections vitals

# Releases and vitals only
gpc status --sections releases,vitals

# CI health gate: just vitals, JSON output for scripting
gpc status --sections vitals --output json
```

Valid sections: `releases`, `vitals`, `reviews`. Invalid values exit code 2.

When using `--cached`, the `--sections` filter applies at display time — only the requested sections are shown even if the cache contains all three. If the requested section was not fetched in the cached run, it shows `—`.

## Polling Mode

`--watch [N]` refreshes on a loop. The terminal clears before each update. Press Ctrl+C to stop cleanly.

::: warning --since-last with --watch
`--since-last` is not supported in watch mode and will be silently ignored. Use `--since-last` without `--watch` for a single diff run.
:::

```bash
# Refresh every 30 seconds (default)
gpc status --watch

# Refresh every 60 seconds
gpc status --watch 60

# Minimal view, polling — useful on a secondary monitor
gpc status --watch 30 --format summary --sections vitals
```

Minimum interval: 10 seconds. Values below 10 exit code 2.

## Diff Mode

`--since-last` compares the current fetch against the last cached run and prints a delta block below the main output:

```bash
gpc status --since-last
```

```
App: com.example.app  (fetched just now)

RELEASES
  ...

Changes since 1h ago:
  Version:    141 → 142
  Crash rate: 1.80% → 0.80% (−1.00%) ✓
  ANR rate:   0.30% → 0.20% (−0.10%) ✓
  Reviews:    4.4★ → 4.6★ (+0.2) ✓
```

On the first run (no prior cache): `(No prior cached status to diff against)`.

Works with `--refresh` to force a fresh fetch before diffing.

## Caching

| Invocation | Behaviour |
| --- | --- |
| `gpc status` | Use cache if fresh (< TTL), otherwise fetch live |
| `gpc status --cached` | Always read from cache; error if none exists |
| `--refresh` | Always fetch live, update cache |
| `--ttl 300` | Override TTL to 5 minutes for this run |

## Multi-App Mode

`--all-apps` runs `gpc status` for every app configured across your profiles, sequentially:

```bash
gpc status --all-apps
```

```
=== com.example.app ===
App: com.example.app  (fetched 11:00:00 AM)
...

=== com.example.app ===
App: com.example.app  (fetched 11:00:01 AM)
...
```

- Profiles are read from `.gpcrc.json` → `profiles`
- Per-app errors are printed and skipped — other apps continue
- Maximum 5 apps. Use `--app` for targeted runs if you have more
- Exits code 6 if **any** app has a breach

## Desktop Notifications

`--notify` sends a system notification when a vitals threshold breaches or clears. Only fires on state change — no repeated notifications while a breach is ongoing:

```bash
# Threshold breach: sends "GPC Alert: com.example.app: vitals threshold breached"
gpc status --notify

# Breach clears on next run: sends "GPC Status: com.example.app: vitals back to normal"
gpc status --notify
```

Platform support: macOS (`osascript`), Linux (`notify-send`), Windows (PowerShell). Silently skipped in CI (`CI` env var set) and when the notification utility is unavailable.

Combine with `--watch` for continuous monitoring with alerts:

```bash
gpc status --watch 60 --notify
```

## JSON Output

```bash
gpc status --output json
```

```json
{
  "packageName": "com.example.app",
  "fetchedAt": "2026-03-14T10:42:00Z",
  "cached": false,
  "releases": [
    { "track": "production", "versionCode": "142", "status": "completed", "userFraction": null },
    { "track": "beta",       "versionCode": "143", "status": "inProgress", "userFraction": 0.1 },
    { "track": "internal",   "versionCode": "144", "status": "draft",      "userFraction": null }
  ],
  "vitals": {
    "windowDays": 7,
    "crashes":    { "value": 0.008, "threshold": 0.02, "status": "ok", "previousValue": 0.015, "trend": "down" },
    "anr":        { "value": 0.002, "threshold": 0.01, "status": "ok", "previousValue": 0.004, "trend": "down" },
    "slowStarts": { "value": 0.021, "threshold": 0.05, "status": "ok", "previousValue": null, "trend": null },
    "slowRender": { "value": 0.043, "threshold": 0.10, "status": "warn", "previousValue": 0.041, "trend": "up" }
  },
  "reviews": {
    "windowDays": 30,
    "averageRating": 4.6,
    "previousAverageRating": 4.4,
    "totalNew": 142,
    "positivePercent": 89
  }
}
```

## CI/CD Usage

### Health gate before promoting a rollout

```bash
# Block a production rollout if any vital is breached (exit code 6)
gpc status --sections vitals
gpc releases rollout increase --track production --to 50
```

### One-liner in a deploy script

```bash
# Post-deploy: log a single-line health snapshot
gpc status --format summary --refresh
```

### Parse specific metrics

```bash
# Get crash rate
gpc status --output json | jq '.vitals.crashes.value'

# Get crash trend
gpc status --output json | jq '.vitals.crashes.trend'

# Check all vitals are ok
gpc status --output json | jq -e '[.vitals | to_entries[].value.status] | all(. == "ok")'
```

### Fast badge data (no API calls)

```bash
# Read cached data — instant, no quota used
gpc status --cached --output json | jq '{rating: .reviews.averageRating, crashes: .vitals.crashes.value}'
```

### Continuous monitoring with alerts

```bash
# Poll every 5 minutes, notify on breach
gpc status --watch 300 --notify --sections vitals
```

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | All clear — no threshold breaches |
| `1` | No cached data (only when `--cached` is used) |
| `2` | Usage error — missing package name, invalid section, watch interval too short, `--days` < 1 |
| `4` | API error |
| `6` | One or more vitals thresholds breached |

## Related Commands

- [`gpc vitals`](/commands/vitals) — detailed vitals by metric with dimension breakdowns and custom date ranges
- [`gpc reviews`](/commands/reviews) — full review list, reply, and CSV export
- [`gpc releases status`](/commands/releases) — detailed release data including version codes and rollout history
- [`gpc releases rollout`](/commands/releases#rollout) — adjust, halt, or resume a staged rollout
