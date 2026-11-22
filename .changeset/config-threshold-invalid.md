---
"@gpc-cli/cli": patch
"@gpc-cli/core": minor
---

A `vitals.thresholds` config value that is blank, `true`/`false` or not a number is now rejected with `THRESHOLD_INVALID` (exit 2) by `gpc vitals <metric>`, `gpc watch` and `gpc releases rollout increase --vitals-gate`, as `gpc status` already did. It used to be read as 0, so a gate fired on any crash and `gpc watch --on-breach halt` could halt a healthy rollout. The check runs before credentials are resolved, and on `--dry-run` for the rollout gate. Core exports `readConfigThreshold` and `configVitalThresholds`, the shared readers.
