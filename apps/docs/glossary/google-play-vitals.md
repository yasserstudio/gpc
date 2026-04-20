---
outline: deep
---

# Google Play Vitals

Google Play Vitals is the operational-health system Google Play runs against every app on the Store. It tracks crashes, ANRs, startup latency, rendering performance, battery drain, wakeup frequency, and low-memory kills, and surfaces thresholds in Play Console as "Core vitals" and "App vitals".

## Why it matters

Apps with vitals above Google's "bad behavior" thresholds see reduced visibility, warning banners in the Play Store, and lower ranking in recommendations. Apps well below the thresholds get preferential placement.

Beyond the Play Store, vitals are the truest signal of app health. If your crash rate climbs after a release, users are seeing your app break and not telling you. Vitals catch that before reviews do.

Vitals data is exposed via the Play Developer Reporting API. GPC wraps the full API surface.

## How GPC handles it

Overview of all vitals in one command:

```bash
gpc vitals overview
```

Per-metric queries:

```bash
gpc vitals crashes       # crash rate
gpc vitals anr           # ANR rate
gpc vitals startup       # slow/frozen startup
gpc vitals rendering     # slow frames
gpc vitals battery       # battery drain
gpc vitals wakeup        # excessive wakeups
gpc vitals lmk           # low-memory kill rate
```

CI-gated thresholds:

```bash
gpc vitals crashes --threshold 2.0 --window 7d
```

Exit code 6 on breach.

Full release + vitals view for daily standups:

```bash
gpc status
```

## Common issues

- **Vitals data takes 24-72 hours to populate** after a release. Monitoring within the first day may show stale data.
- **User-perceived vs raw rates** — Play Console defaults to user-perceived metrics (percent of users affected). Raw counts are available but less meaningful for thresholds.
- **Data requires a minimum installed base** — small apps may not have enough data for all metrics.
- **`--window 7d` vs `--window 28d`** — Play Console dashboards usually show 28-day. 7-day is better for catching regressions post-release.

## Related

- [ANR](/glossary/anr) — one of the two primary "bad behavior" signals
- [`gpc vitals`](/commands/vitals) — all vitals subcommands
- [`gpc status`](/commands/status) — releases + vitals + reviews in one view
- [CI vitals gates](/ci-cd/vitals-gates) — threshold gating in pipelines
- [Staged Rollout](/glossary/staged-rollout) — gating rollout progression on vitals
