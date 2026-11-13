---
"@gpc-cli/cli": patch
---

`gpc status` now rejects a rate threshold that can never work, as the docs already promised. A config `vitals.thresholds` rate of 1 or more, or one that is negative, blank or not a number, and a `--threshold` value of 100 percent or more, negative or not a number, exit with `THRESHOLD_INVALID` (exit 2) before any API call, instead of leaving the gate silently open. A `--threshold` value replaces the config value for that metric, as in `gpc vitals`.
