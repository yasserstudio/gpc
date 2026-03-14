---
outline: deep
---

# status

Everything you'd check in 4–6 Play Console screens, in one terminal command.

```
$ gpc status

App: tv.visioo.app · Visioo TV  (fetched 10:42:01 AM)

RELEASES
  production   v1.4.2   completed    —
  beta         v1.5.0   inProgress  10%
  internal     v1.5.1   draft        —

VITALS  (last 7 days)
  crashes     0.80%  ✓    anr         0.20%  ✓
  slow starts 2.10%  ✓    slow render 4.30%  ⚠

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
| `--days <n>` | `number` | `7` | Vitals window in days (reviews are always last 30 days) |
| `--cached` | flag | off | Read from cache, skip all API calls |
| `--refresh` | flag | off | Force live fetch, ignore cache TTL |
| `--ttl <seconds>` | `number` | `3600` | Cache TTL override for this invocation |
| `--watch <seconds>` | `number` | off | Auto-refresh on an interval (e.g. `--watch 60`) |
| `--output <format>` | `string` | `table` | `table` or `json` |
| `--app <package>` | `string` | config | Override app package name |

## How It Works

`gpc status` fires **6 parallel API calls** and merges the results:

| Section | API | Endpoint |
| --- | --- | --- |
| Releases | Publisher API v3 | `tracks.list` |
| Crash rate | Reporting API v1beta1 | `crashRateMetricSet.query` |
| ANR rate | Reporting API v1beta1 | `anrRateMetricSet.query` |
| Slow starts | Reporting API v1beta1 | `slowStartRateMetricSet.query` |
| Slow render | Reporting API v1beta1 | `slowRenderingRateMetricSet.query` |
| Reviews | Publisher API v3 | `reviews.list` |

Results are cached in `~/.cache/gpc/status-<packageName>.json` (XDG-compliant). Default TTL: 1 hour. Individual API failures do not abort the command — the failed section shows `unavailable` and the exit code reflects the overall health.

## Output Sections

### RELEASES

One row per track. Shows all tracks that have at least one release, in order: `production`, `beta`, `alpha`, `internal`, then any custom tracks.

| Field | Description |
| --- | --- |
| track | Track name |
| versionName | Latest version name in the track (or version code if name is absent) |
| status | `completed` · `inProgress` · `draft` · `halted` |
| rollout | Staged rollout percentage, or `—` if full rollout / no active release |

### VITALS (last N days)

Four key metrics from the Play Reporting API. Each shows a `✓` / `⚠` / `✗` indicator against configured thresholds.

| Metric | Default threshold | Indicator |
| --- | --- | --- |
| crashes | 2% | `✓` ok · `⚠` within 20% of threshold · `✗` breached |
| anr | 1% | same |
| slow starts | 5% | same |
| slow render | 10% | same |

If any metric breaches its threshold, `gpc status` exits **code 6** — consistent with `gpc vitals`. Configure thresholds in `.gpcrc.json`:

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

Or set them with `gpc config set`:

```bash
gpc config set vitals.thresholds.crashRate 2.0
gpc config set vitals.thresholds.anrRate 1.0
```

### REVIEWS (last 30 days)

Computed locally from the `reviews.list` response — no external service.

| Field | Meaning |
| --- | --- |
| ★ 4.6 | Average star rating (current 30-day window) |
| 142 new | Reviews received in the window |
| 89% positive | Percentage with ≥ 4 stars |
| ↑ from 4.4 | Trend vs previous 30-day window |

## Caching

| Invocation | Behaviour |
| --- | --- |
| `gpc status` | Use cache if fresh (< TTL), otherwise fetch live |
| `gpc status --cached` | Always read from cache; error if none exists |
| `gpc status --refresh` | Always fetch live, update cache regardless of TTL |
| `gpc status --ttl 300` | Override TTL to 5 minutes for this run |

## Continuous Monitoring

```bash
# Refresh every 60 seconds — useful on a dashboard display
gpc status --watch 60
```

`--watch` clears the terminal on each refresh and shows the time of last fetch. Exit with `Ctrl+C`.

## JSON Output

```bash
gpc status --output json
```

```json
{
  "packageName": "tv.visioo.app",
  "fetchedAt": "2026-03-14T10:42:00Z",
  "cached": false,
  "releases": [
    { "track": "production", "versionName": "1.4.2", "status": "completed", "userFraction": null },
    { "track": "beta",       "versionName": "1.5.0", "status": "inProgress", "userFraction": 0.1 },
    { "track": "internal",   "versionName": "1.5.1", "status": "draft",      "userFraction": null }
  ],
  "vitals": {
    "windowDays": 7,
    "crashes":    { "value": 0.008, "threshold": 0.02, "status": "ok" },
    "anr":        { "value": 0.002, "threshold": 0.01, "status": "ok" },
    "slowStarts": { "value": 0.021, "threshold": 0.05, "status": "ok" },
    "slowRender": { "value": 0.043, "threshold": 0.10, "status": "warn" }
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
gpc status
gpc releases rollout increase --track production --to 50
```

### Parse specific metrics in scripts

```bash
# Get crash rate as a number
gpc status --output json | jq '.vitals.crashes.value'

# Check if all vitals are ok
gpc status --output json | jq -e '[.vitals | to_entries[].value.status] | all(. == "ok")'
```

### Fast badge data (no API calls)

```bash
# Read cached data for a status badge — instant, no quota used
gpc status --cached --output json | jq '{rating: .reviews.averageRating, crashes: .vitals.crashes.value}'
```

### Force refresh before a deploy

```bash
gpc status --refresh   # Ensures you're looking at the latest data before shipping
```

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | All clear — no threshold breaches |
| `1` | No cached data (only when `--cached` is used) |
| `2` | Missing `--app` / package name not configured |
| `4` | API error on one or more calls |
| `6` | One or more vitals thresholds breached |

## Related Commands

- [`gpc vitals`](/commands/vitals) — detailed vitals by metric, with dimension breakdowns and custom date ranges
- [`gpc reviews`](/commands/reviews) — full review list, reply, and CSV export
- [`gpc releases status`](/commands/releases) — detailed release data including version codes, track configs, and rollout history
- [`gpc releases rollout`](/commands/releases#rollout) — adjust, halt, or resume a staged rollout
