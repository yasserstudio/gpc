---
"@gpc-cli/core": patch
"@gpc-cli/cli": patch
---

`gpc status` now rates a cached status against the thresholds of the current run. A status served from the cache (while the cache entry is fresh, or with `--cached`) kept the thresholds of the run that fetched it, so `--threshold` and config `vitals.thresholds` were ignored until the entry expired, and a loose threshold from one run could let a later CI gate pass. Core exports `applyVitalThresholds` for SDK users who cache statuses themselves.
