---
outline: deep
---

# status

Unified app health snapshot: releases, vitals, and reviews — all in one command. The fastest way to see the full picture of an app without opening the Play Console.

```
$ gpc status

App: tv.visioo.app  (fetched 10:42:01 AM)

RELEASES
  production   42   completed   —
  beta         43   inProgress  10%

VITALS  (last 7 days)
  crashes     0.80%     ✓    anr         0.20%     ✓
  slow starts 2.10%     ✓    slow render 4.30%     ⚠

REVIEWS  (last 30 days)
  ★ 4.6   142 new   89% positive   ↑ from 4.4
```

All API calls fire in parallel — 6 simultaneous requests, result in under 3 seconds.

## Synopsis

```bash
gpc status [options]
```

## Options

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--days <n>` | `number` | `7` | Vitals window in days (reviews are always last 30 days) |
| `--cached` | flag | off | Use last cached data, skip all API calls |
| `--refresh` | flag | off | Force live fetch, ignore cache TTL |
| `--ttl <seconds>` | `number` | `3600` | Cache TTL override |
| `--output <format>` | `string` | `table` | `table` or `json` |
| `--app <package>` | `string` | config | Override app package name |

## Output Sections

### RELEASES

One row per active release across all tracks. Shows track name, latest version code, release status, and rollout percentage.

| Field | Description |
| --- | --- |
| track | Track name (`production`, `beta`, `internal`, custom) |
| versionCode | Latest version code in the release |
| status | `completed`, `inProgress`, `draft`, `halted` |
| userFraction | Rollout percentage, or `—` if 100% / not rolling out |

### VITALS (last N days)

Four key metrics shown with threshold indicators. Uses the same thresholds configured in `.gpcrc.json` under `vitals.thresholds`. Falls back to sensible defaults if not configured.

| Metric | Default threshold | Indicator |
| --- | --- | --- |
| crashes | 2% | `✓` ok · `⚠` within 20% of threshold · `✗` breached |
| anr | 1% | same |
| slow starts | 5% | same |
| slow render | 10% | same |

If any metric breaches its threshold, `gpc status` exits with **code 6** — consistent with `gpc vitals`.

### REVIEWS (last 30 days)

Average star rating, new review count, positive percentage (≥ 4 stars), and trend vs the previous 30-day window.

## Caching

Results are cached in `~/.cache/gpc/status-<packageName>.json` (XDG-compliant). Default TTL: 1 hour.

| Flag | Behaviour |
| --- | --- |
| _(none)_ | Use cache if fresh, otherwise fetch live |
| `--cached` | Always read cache, error if none exists |
| `--refresh` | Always fetch live, update cache |
| `--ttl <n>` | Override TTL for this invocation |

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
    { "track": "production", "versionCode": "42", "status": "completed", "userFraction": null },
    { "track": "beta", "versionCode": "43", "status": "inProgress", "userFraction": 0.1 }
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

## CI Usage

```bash
# Health gate — exits 6 if any vital is breached
gpc status

# Parse vitals in a script
gpc status --output json | jq '.vitals.crashes'

# Fast status badge (use cached data, no API calls)
gpc status --cached --output json

# Force refresh before a deploy
gpc status --refresh
```

## Configure Thresholds

Thresholds are read from `.gpcrc.json`. If a threshold is breached, `gpc status` exits 6.

```json
{
  "app": "tv.visioo.app",
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

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | All clear |
| `1` | No cached data (with `--cached`) |
| `2` | Missing `--app` / package name not configured |
| `4` | API error |
| `6` | One or more vitals thresholds breached |

## Related Commands

- [`gpc vitals`](/commands/vitals) — detailed vitals by metric, with dimensions and date ranges
- [`gpc reviews`](/commands/reviews) — full review list, export, and reply
- [`gpc releases`](/commands/releases) — release management (upload, promote, rollout)
