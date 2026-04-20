---
outline: deep
---

# Staged Rollout

A staged rollout ships a release to a percentage of users on a track (usually production) rather than all users at once. Typical stages: 5%, 10%, 20%, 50%, 100%.

## Why it matters

If a release has a bug, you catch it with 5% of users affected rather than 100%. You can halt the rollout, ship a fix, and resume. Staged rollouts are the single most important risk-reduction pattern for mobile releases.

Google Play supports rollout percentages between 0.5 and 100. Only the production track supports staged rollouts; internal, alpha, and beta tracks are all-or-nothing.

## How GPC handles it

Start a release at 10%:

```bash
gpc releases upload app.aab --track production --rollout 10
```

Promote from beta to production at 5%:

```bash
gpc releases promote --from beta --to production --rollout 5
```

Increase an in-progress rollout:

```bash
gpc releases rollout increase --track production --to 50
```

Halt a rollout (users already at the previous percentage keep the release; no new users get it):

```bash
gpc releases rollout halt --track production
```

Complete the rollout to 100%:

```bash
gpc releases rollout complete --track production
```

For automated stage progression with time and vitals gates:

```bash
gpc train --track production --stages 5,20,50,100 --time-gate 24h --vitals-gate
```

## Common issues

- **Fastlane rollout format mismatch** — Fastlane uses decimals (0.1 = 10%); GPC uses integers (10 = 10%). Most common migration bug.
- **Rollout halted accidentally** — halted rollouts do not auto-resume. Must run `gpc releases rollout resume`.
- **Crash spike during rollout** — pair rollouts with `--vitals-gate` on the `gpc train` command to auto-halt on threshold breach.

## Related

- [`gpc releases rollout`](/commands/releases) — all rollout subcommands
- [`gpc train`](/commands/train) — automated staged rollout pipeline
- [`gpc vitals`](/commands/vitals) — monitor crash / ANR rates during rollout
- [Play Edit Lifecycle](/glossary/play-edit-lifecycle) — how rollout changes are committed atomically
