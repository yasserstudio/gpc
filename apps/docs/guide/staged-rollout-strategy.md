---
outline: deep
---

# Staged Rollout Strategy

A staged rollout lets you release your app to a fraction of users first, then increase the percentage as you gain confidence in the build. If something goes wrong, you halt the rollout before the majority of users are affected. GPC gives you the commands to control every step from your terminal or CI pipeline.

## Why staged rollouts

Every production release carries risk. A staged rollout limits your blast radius. Instead of shipping a new version to 100% of users on day one and scrambling when a crash spike appears, you ship to 1% and watch. If crash rates stay flat, you widen. If they spike, you halt. The cost of a staged rollout is time. The cost of skipping one is a one-star review wave you cannot undo.

## Rollout stages

Two common patterns:

### Conservative (recommended for most apps)

| Stage | Percentage | Wait     |
| ----- | ---------- | -------- |
| 1     | 1%         | 24 hours |
| 2     | 5%         | 24 hours |
| 3     | 10%        | 48 hours |
| 4     | 25%        | 48 hours |
| 5     | 50%        | 48 hours |
| 6     | 100%       | Done     |

### Aggressive (hotfixes, low-risk changes)

| Stage | Percentage | Wait     |
| ----- | ---------- | -------- |
| 1     | 5%         | 12 hours |
| 2     | 20%        | 24 hours |
| 3     | 50%        | 24 hours |
| 4     | 100%       | Done     |

### Automated rollout with `gpc train`

The [`gpc train`](/commands/train) command runs a staged rollout pipeline for you. It advances through each stage, waits out the configured delay, checks vitals quality gates, and proceeds or pauses automatically. Stages and gates live in a config file, not in flags:

```json
// .gpcrc-train.json
{
  "stages": [
    { "track": "production", "rollout": 1 },
    { "track": "production", "rollout": 5, "after": "1d" },
    { "track": "production", "rollout": 25, "after": "2d" },
    { "track": "production", "rollout": 100, "after": "4d" }
  ],
  "gates": {
    "crashes": { "max": 2 },
    "anr": { "max": 0.5 }
  }
}
```

```bash
gpc train start
```

This starts at 1%, waits at least a day between each stage, and checks crash and ANR rates before advancing. Gate values are percentages (`"max": 2` is 2%). If a gate fails during `gpc train advance`, the train is paused instead of ramping further. Use `gpc train status`, `gpc train pause` and `gpc train abort` to drive it from there.

## Monitoring during rollout

### Real-time monitoring with `gpc watch`

[`gpc watch`](/commands/watch) streams vitals data while your rollout is active. It shows crash rate, ANR rate, and other metrics in real time.

```bash
gpc watch \
  --app com.example.app \
  --track production \
  --interval 900
```

`--interval` is in seconds and must be at least 60.

### Checking crash rates

Use [`gpc vitals crashes`](/commands/vitals) to pull crash data for the current release:

```bash
gpc vitals crashes \
  --app com.example.app \
  --days 1
```

### Auto-halt on threshold breach

Pass `--on-breach halt` to `gpc watch` to automatically halt the rollout if vitals exceed your thresholds. Rate thresholds are fractions, so 2% is `0.02` and 0.5% is `0.005`:

```bash
gpc watch \
  --app com.example.app \
  --track production \
  --crash-threshold 0.02 \
  --anr-threshold 0.005 \
  --on-breach halt
```

When a threshold is breached, GPC exits with code **6**. This exit code is designed for CI gating: any downstream step can check the exit code and act accordingly.

## Manual rollout control

Sometimes you need to intervene directly. The [`gpc releases`](/commands/releases) commands give you full control.

### Set a specific rollout percentage

```bash
gpc releases rollout increase \
  --app com.example.app \
  --track production \
  --to 10
```

This sets the current release to 10% of users.

### Halt a rollout

```bash
gpc releases rollout halt \
  --app com.example.app \
  --track production
```

Halting freezes the rollout at its current percentage. No new users receive the update. Users who already have it keep it.

::: info Rollout percentages cannot decrease
Google Play does not allow lowering a staged rollout percentage. If you need to slow down, your only option is to halt. Attempting to set a lower percentage returns `API_ROLLOUT_DECREASE_FORBIDDEN`. Halt the rollout, investigate, then either resume from the same percentage or deploy a new version.
:::

### Resume a halted rollout

```bash
gpc releases rollout resume \
  --app com.example.app \
  --track production
```

This resumes the rollout from where it was halted.

### Complete a rollout

```bash
gpc releases rollout complete \
  --app com.example.app \
  --track production
```

## CI/CD integration

A GitHub Actions workflow that uploads a build, starts a staged rollout, and monitors it with auto-halt:

```yaml
name: Staged Rollout
on:
  workflow_dispatch:

jobs:
  rollout:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Upload AAB
        run: |
          gpc releases upload \
            app/build/outputs/bundle/release/app-release.aab \
            --app com.example.app \
            --track production \
            --rollout 1
        env:
          GPC_SERVICE_ACCOUNT_KEY: ${{ secrets.GPC_SERVICE_ACCOUNT_KEY }}

      - name: Monitor rollout
        run: |
          gpc watch \
            --app com.example.app \
            --track production \
            --crash-threshold 0.02 \
            --anr-threshold 0.005 \
            --on-breach halt \
            --interval 900 \
            --rounds 96
        env:
          GPC_SERVICE_ACCOUNT_KEY: ${{ secrets.GPC_SERVICE_ACCOUNT_KEY }}
```

### Semantic exit codes

GPC uses semantic exit codes so CI pipelines can branch on failure reason:

| Code | Meaning          |
| ---- | ---------------- |
| 0    | Success          |
| 1    | General error    |
| 2    | Usage error      |
| 3    | Auth failure     |
| 4    | API error        |
| 5    | Network error    |
| 6    | Threshold breach |

Exit code 6 is the one that matters for rollout gating. When `gpc watch` exits with code 6, the rollout has been halted because a vitals threshold was exceeded. Your CI workflow can use this to trigger alerts, open an incident, or block promotion to the next stage.

## When to halt

Halt a rollout when any of these conditions appear:

- **Crash rate above baseline.** Compare the new version's crash rate against the previous version. A 2x increase at any rollout percentage warrants a halt.
- **ANR rate spike.** ANRs are harder to fix post-release than crashes. Any sustained increase in ANR rate above 0.5% should trigger a halt.
- **User-reported issues.** Monitor Play Store reviews for the new version. A pattern of reports about the same issue (even if vitals look clean) is a signal to halt and investigate.

The conservative approach is to halt early and investigate. Resuming a halted rollout costs nothing. Shipping a broken build to 100% of users costs everything.

## Further reading

- [`gpc train`](/commands/train) for automated staged rollout pipelines
- [`gpc watch`](/commands/watch) for real-time rollout monitoring
- [`gpc releases`](/commands/releases) for manual rollout control
- [`gpc vitals`](/commands/vitals) for crash and ANR data
- [Exit codes reference](/reference/exit-codes) for CI scripting patterns
