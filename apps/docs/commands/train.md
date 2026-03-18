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

If a gate fails during `advance`, the train is automatically **paused**.

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

Manually advance to the next stage (after checking delay and gates).

```sh
gpc train advance
```

GPC checks:

1. Has the `after` delay elapsed since the previous stage?
2. Do vitals gates pass?

If both pass, the next stage is executed.

### `train pause`

Pause a running train.

```sh
gpc train pause
```

### `train abort`

Abort and clear the train state. Prompts for confirmation.

```sh
gpc train abort
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
