---
outline: deep
---

# ANR (Application Not Responding)

An ANR is what Android throws when an app's main thread is blocked too long. A foreground app blocks the UI thread for 5 seconds or more and the system shows the "ANR: app is not responding" dialog.

## Why it matters

ANRs are one of the two metrics (alongside crash rate) that Google Play uses to flag apps as "Bad Behavior" in Android Vitals. Apps with user-perceived ANR rates above Google's thresholds see ranking penalties, warning banners in the Play Store, and in extreme cases removal from peak-time recommendations.

For your team, ANRs mean users seeing a frozen UI, tapping through the "close app" dialog, and leaving 1-star reviews.

## How GPC handles it

Query current ANR rate for your app:

```bash
gpc vitals anr
```

Gate a CI pipeline on ANR threshold:

```bash
gpc vitals anr --threshold 0.0047 --days 7
```

Exit code 6 on threshold breach lets your CI halt a rollout or block a promote.

Full vitals view:

```bash
gpc status --sections vitals
```

## Common issues

- **User-perceived ANR rate vs raw ANR count** — Google's "bad behavior" threshold uses the user-perceived rate (28-day, percent of users who experienced an ANR). GPC reports both.
- **7-day thresholds vs 28-day** — Google Vitals dashboards default to 28-day windows. GPC supports both via `--days 7` or `--days 28`.
- **`--threshold` takes a fraction**: Google reports rates as fractions, so Google's 0.47% ANR threshold is `--threshold 0.0047`. A value of 1 or more is rejected with `THRESHOLD_INVALID` (exit 2).
- **Missing ANR data for new apps** — Google requires a minimum installed-base to aggregate ANR data. New apps under that threshold return empty responses.

## Related

- [Google Play Vitals](/glossary/google-play-vitals) — the broader health-metrics system
- [`gpc vitals`](/commands/vitals) — all vitals subcommands
- [CI vitals gates](/ci-cd/vitals-gates) — threshold gating in pipelines
- [Staged Rollout](/glossary/staged-rollout) — gating rollouts on vitals
