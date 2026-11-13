---
status: accepted
---

# Billing Library finding severity follows the calendar, not the GPC release

`gpc preflight` rates an app's Google Play Billing Library version against Google's published update and extension deadlines using the date the scan runs, so a pipeline can move from info to warning to error on a fixed date without upgrading GPC. We chose this because it matches how Google Play enforces the deadlines, and a severity frozen at GPC's build date would go stale and tell users they are fine after Google has started rejecting their updates. Every finding states the deadline date, and users who need a stable result can pin the rule with `severityOverrides` or turn it off with `disabledRules`.

## Considered Options

- **Severity fixed when GPC is released.** Builds are reproducible, but an old GPC keeps reporting info after Google has started rejecting updates. Rejected.
- **A config key for the reference date.** This adds a new config surface that only a test needs. Rejected: tests control the date with fake system time instead, so the code needs no clock parameter.

## Consequences

- The deadline table is the one place to edit when Google adds a version or moves a date.
- Tests must fix the date with fake system time (`vi.setSystemTime`). They must never depend on the real date.
