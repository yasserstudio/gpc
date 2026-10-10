# gpc train

Config-driven staged rollout pipeline. The release train automates multi-stage rollout progression with configurable delays and vitals gates.

## Synopsis

```sh
gpc train <subcommand>
```

## Config File

Create `.gpcrc-train.json` in your project root:

```json
{
  "stages": [
    { "track": "internal", "rollout": 100 },
    { "track": "alpha", "rollout": 100, "after": "2d" },
    { "track": "production", "rollout": 10, "after": "7d" },
    { "track": "production", "rollout": 100, "after": "14d" }
  ],
  "gates": {
    "crashes": { "max": 1.5 },
    "anr": { "max": 0.5 }
  }
}
```

**Stage fields:**

| Field     | Description                                                                            |
| --------- | -------------------------------------------------------------------------------------- |
| `track`   | Target track name (`internal`, `alpha`, `beta`, `production`)                          |
| `rollout` | Rollout percentage (1–100)                                                             |
| `after`   | Minimum delay before this stage runs: `"2d"` (days), `"4h"` (hours), `"30m"` (minutes) |

**Gate fields:**

| Gate          | Description                              |
| ------------- | ---------------------------------------- |
| `crashes.max` | Maximum crash rate % (e.g. `1.5` = 1.5%) |
| `anr.max`     | Maximum ANR rate %                       |

Train gates are percentages, unlike `gpc vitals crashes --threshold` and `gpc watch`, which take fractions (`0.015` = 1.5%).

Gates read the worst value of the most recent day of vitals. If a gate fails during `advance`, the train is automatically **paused** and the command exits 6 (`TRAIN_CRASH_GATE_FAILED` or `TRAIN_ANR_GATE_FAILED`). If a gate has no data yet (vitals lag 2 to 4 days), the train stays on its current stage and exits 6 with `TRAIN_GATE_NO_DATA`; run `advance` again later.

## Subcommands

### `train start`

Start a release train from a config file.

```sh
gpc train start --config .gpcrc-train.json
gpc train start --force  # restart a running train
```

Stage 0 executes immediately on start.

### `train status`

Show the current state of the release train.

```sh
gpc train status
gpc train status --output json
```

### `train advance`

Advance to the next stage (after checking delay and gates). Nothing advances on its own: run this on a schedule, for example a CI cron job.

```sh
gpc train advance
```

GPC checks:

1. Has the `after` delay elapsed since the previous stage?
2. Do vitals gates pass?

If both pass, the next stage is executed.

### `train pause`

Pause a running train. `advance` will not move it. Pausing does not change any rollout on Google Play. There is no resume command: restart with `gpc train start --force`, which runs stage 0 again.

```sh
gpc train pause
```

### `train abort`

Abort and clear the train state. Prompts for confirmation. Aborting does **not** halt the rollout; to stop a release, halt it:

```sh
gpc train abort
gpc releases rollout halt --track production
```

## State File

Train state is persisted to `~/.cache/gpc/train-<packageName>.json`. This allows you to resume or inspect a train across terminal sessions.

## Example Workflow

```sh
# 1. Start the train (pushes to internal immediately)
gpc train start

# 2. After 2 days, advance to alpha
gpc train advance

# 3. After 7 days, advance to production at 10%
gpc train advance

# 4. After 14 days, complete rollout
gpc train advance
```

## See Also

- [`gpc releases rollout`](/commands/releases) — manual rollout control
- [`gpc vitals`](/commands/vitals) — monitor vitals that power the gates
- [`gpc watch`](/commands/watch) — real-time rollout monitoring with threshold alerts
