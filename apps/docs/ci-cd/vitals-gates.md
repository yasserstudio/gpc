---
outline: deep
---

# Vitals Quality Gates

Use GPC's vitals commands and exit code 6 to block rollout progression when app quality degrades. This prevents bad releases from reaching more users.

## How Threshold Exit Code 6 Works

When you pass `--threshold` to a vitals command, GPC compares the current metric value against your threshold. If the metric exceeds the threshold, GPC exits with code `6` instead of `0`.

```bash
# Exits 0 if crash rate <= 2.0%, exits 6 if crash rate > 2.0%
gpc vitals crashes --threshold 0.02

# Exits 0 if ANR rate <= 0.47%, exits 6 if ANR rate > 0.47%
gpc vitals anr --threshold 0.0047
```

Rates come back from Google as fractions, and `--threshold` takes the same form: `0.02` is 2%. A rate threshold of 1 or more can never breach, so GPC rejects it with `THRESHOLD_INVALID` (exit 2) rather than leaving the gate silently open.

The value compared is the worst slice of the most recent day with data. Vitals rows arrive one per day per slice (start type, report type, or whatever `--dim` groups by), so a gate that read "the last row" would be gating on an arbitrary slice.

On breach, the metric data still goes to stdout and the comparison goes to stderr:

```
✗ Threshold breached: 0.024 > 0.02
```

A gate that cannot read a value also exits 6, with the code `THRESHOLD_NO_DATA`. Vitals data lags two to four days, so a wrong `--app` or a low-traffic app would otherwise pass the gate without ever seeing a metric.

| Exit code | Meaning                                                            |
| --------- | ------------------------------------------------------------------ |
| `0`       | Metric read and within threshold                                   |
| `2`       | Usage error, including `THRESHOLD_INVALID` (a percent, not a rate) |
| `4`       | API error, including a 403 from the Reporting API                  |
| `6`       | Threshold breached, or `THRESHOLD_NO_DATA`                         |

Exit code 6 is distinct from other error codes. CI systems can differentiate between "command failed" (exit 1) and "quality gate breached" (exit 6).

## Crash Rate Gating

Google Play's "bad behavior" threshold for crashes is 1.09%. A common CI threshold is 2.0% (roughly double the Play Console warning level).

```bash
# In CI: fail the job if crash rate exceeds 2.0%
gpc vitals crashes --threshold 0.02 --json

# Grouped by version: one row per version code per day
gpc vitals crashes --dim versionCode --threshold 0.02 --json
```

`--threshold` on `gpc vitals crashes` compares `crashRate`, the first metric in the response. Google's own
bad-behavior threshold is on `userPerceivedCrashRate`, which is always the lower of the two. To gate on the
user-perceived rate instead, read it out of the JSON as shown in [Reading a value out of the JSON](#reading-a-value-out-of-the-json).

### Crash Rate Thresholds

| Level                | Threshold | Action                          |
| -------------------- | --------- | ------------------------------- |
| Google Play warning  | 1.09%     | Play Console shows warning      |
| Conservative CI gate | 1.5%      | Block promotion, alert team     |
| Standard CI gate     | 2.0%      | Block rollout increase          |
| Emergency halt       | 3.0%      | Halt active rollout immediately |

`--threshold` takes the fraction, not the percent: 1.09% is `0.0109`, 1.5% is `0.015`, 2% is `0.02`, 3% is `0.03`. A rate threshold of 1 or more can never breach, so GPC rejects it with `THRESHOLD_INVALID` (exit 2).

## ANR Rate Gating

Google Play's "bad behavior" threshold for ANR is 0.47%.

```bash
# Fail if ANR rate exceeds 0.47% (Google's threshold)
gpc vitals anr --threshold 0.0047 --json

# More lenient threshold
gpc vitals anr --threshold 0.01 --json
```

### ANR Rate Thresholds

| Level                | Threshold | Action                     |
| -------------------- | --------- | -------------------------- |
| Google Play warning  | 0.47%     | Play Console shows warning |
| Conservative CI gate | 0.5%      | Block promotion            |
| Standard CI gate     | 1.0%      | Block rollout increase     |
| Emergency halt       | 2.0%      | Halt active rollout        |

As with crash rate, pass the fraction: 0.47% is `0.0047`, 0.5% is `0.005`, 1% is `0.01`, 2% is `0.02`.

## Reading a Value Out of the JSON

With `--json`, a vitals command prints the Play Developer Reporting response as Google returns it. Metrics are an
array of named entries, not an object keyed by metric name:

```json
{
  "rows": [
    {
      "startTime": { "year": 2026, "month": 10, "day": 9 },
      "metrics": [
        { "metric": "crashRate", "decimalValue": { "value": "0.0241" } },
        { "metric": "userPerceivedCrashRate", "decimalValue": { "value": "0.0160" } },
        { "metric": "distinctUsers", "decimalValue": { "value": "39001" } }
      ]
    }
  ]
}
```

Rows carry a `dimensions` array too when the query is grouped, either by `--dim` or by a dimension the API requires
(`startType` for `gpc vitals startup`, `reportType` for `gpc vitals error-count`).

This jq filter returns the worst value of one metric on the most recent day, which is the same number `--threshold`
compares, and prints nothing when there is no data:

```bash
LATEST_WORST='(.rows // []) as $r
  | ($r | map([.startTime.year, .startTime.month, .startTime.day]) | max) as $last
  | [ $r[] | select([.startTime.year, .startTime.month, .startTime.day] == $last)
      | .metrics[] | select(.metric == $m) | .decimalValue.value | tonumber ]
  | max // empty'

CRASH_RATE=$(gpc vitals crashes --json | jq -r --arg m crashRate "$LATEST_WORST")
echo "Crash rate: $CRASH_RATE"   # 0.0241, a fraction
```

For a single unsliced metric set, the shorter path works too:

```bash
gpc vitals crashes --json \
  | jq -r '.rows[-1].metrics[] | select(.metric == "crashRate") | .decimalValue.value'
```

::: tip
Values are fractions, so compare them with `awk` or `bc -l` rather than `[[ ]]`, which only does integer arithmetic:
`awk "BEGIN{exit !($CRASH_RATE > 0.02)}" && echo breached`.
:::

## Multi-Metric Gating Script

Check several vitals metrics in a single script. Each metric is read once: `--threshold` does the comparison and sets
the exit code, and the same JSON is reused for the report. Use this as a reusable gate before any rollout increase.

```bash
#!/usr/bin/env bash
# vitals-gate.sh -- multi-metric quality gate
# Usage: ./vitals-gate.sh [--halt-on-breach]
set -uo pipefail

# Thresholds are fractions: 0.02 means 2%.
CRASH_THRESHOLD=0.02
ANR_THRESHOLD=0.005
SLOW_START_THRESHOLD=0.30

HALT_ON_BREACH=false
if [[ "${1:-}" == "--halt-on-breach" ]]; then
  HALT_ON_BREACH=true
fi

# Worst value of $m on the most recent day in a vitals --json response.
LATEST_WORST='(.rows // []) as $r
  | ($r | map([.startTime.year, .startTime.month, .startTime.day]) | max) as $last
  | [ $r[] | select([.startTime.year, .startTime.month, .startTime.day] == $last)
      | .metrics[] | select(.metric == $m) | .decimalValue.value | tonumber ]
  | max // empty'

BREACHED=false
REPORT=""

check() {
  local label=$1 command=$2 metric=$3 threshold=$4
  local out status value

  out=$(gpc vitals "$command" --threshold "$threshold" --json)
  status=$?
  value=$(printf '%s' "$out" | jq -r --arg m "$metric" "$LATEST_WORST")

  case $status in
    0)
      REPORT+="PASS: ${label} ${value} (threshold ${threshold})"$'\n'
      ;;
    6)
      if [[ -z "$value" ]]; then
        REPORT+="FAIL: ${label} has no data to gate on"$'\n'
      else
        REPORT+="FAIL: ${label} ${value} exceeds ${threshold}"$'\n'
      fi
      BREACHED=true
      ;;
    *)
      # Auth, API, or network failure: fail closed rather than skip the gate.
      REPORT+="FAIL: ${label} could not be read (gpc exit ${status})"$'\n'
      BREACHED=true
      ;;
  esac
}

check "Crash rate" crashes crashRate "$CRASH_THRESHOLD"
check "ANR rate" anr anrRate "$ANR_THRESHOLD"
check "Slow cold starts" startup slowStartRate "$SLOW_START_THRESHOLD"

echo
echo "=== Vitals Quality Gate ==="
printf '%s' "$REPORT"

if [[ "$BREACHED" == "true" ]]; then
  if [[ "$HALT_ON_BREACH" == "true" ]]; then
    echo "Halting production rollout..."
    gpc releases rollout halt --track production --json
  fi
  exit 6
fi

echo "All vitals within thresholds."
exit 0
```

`gpc vitals startup` reports `slowStartRate`, the fraction of app starts Google considers slow, not a cold start time
in milliseconds. Rows are sliced by `startType` (cold, warm, hot), and the gate compares the worst slice.

### Using the Script in CI

```yaml
# GitHub Actions
- name: Quality gate
  run: |
    chmod +x ./scripts/vitals-gate.sh
    ./scripts/vitals-gate.sh --halt-on-breach
  continue-on-error: false
```

```yaml
# GitLab CI
vitals-gate:
  script:
    - chmod +x ./scripts/vitals-gate.sh
    - ./scripts/vitals-gate.sh --halt-on-breach
  allow_failure: false
```

## Integration with Staged Rollout

The recommended pattern is to run a vitals gate before every rollout percentage increase. This ensures bad releases are caught early, before they affect a large portion of users.

GPC can also do this in one command. `gpc releases rollout increase --vitals-gate` checks the crash rate before it
touches the rollout, and the rollout is left untouched if the gate fails. The gate reads its limit from
`vitals.thresholds.crashRate` in your config, and it fails closed: a missing threshold, a read error, or no data
blocks the increase instead of skipping the check.

```json
{
  "vitals": {
    "thresholds": {
      "crashRate": 0.02
    }
  }
}
```

```bash
gpc releases rollout increase --track production --to 25 --vitals-gate
```

On breach the command prints the comparison to stderr and exits 6 without changing the rollout. `--vitals-gate` is
ignored under `--dry-run`, which GPC warns about on stderr.

### Rollout Progression with Gates

```
Upload AAB
    |
    v
Release to 5% (internal track promotion)
    |
    v
[Wait 24-48 hours for data]
    |
    v
Run vitals gate -----> BREACH? --> Halt rollout, alert team
    |                              |
    | PASS                         v
    v                          Fix issues, upload new build
Increase to 25%
    |
    v
[Wait 24-48 hours]
    |
    v
Run vitals gate -----> BREACH? --> Halt rollout
    |
    | PASS
    v
Increase to 50%
    |
    v
[Wait 24-48 hours]
    |
    v
Run vitals gate -----> BREACH? --> Halt rollout
    |
    | PASS
    v
Complete rollout (100%)
```

### Automated Staged Rollout Script

Combines the gate with the rollout increase in a single script. `gpc releases status --json` returns one entry per
release per track, so the active staged rollout is the entry whose `status` is `inProgress`, and its
`userFraction` is a fraction (`0.1` is 10%).

```bash
#!/usr/bin/env bash
# staged-rollout-step.sh -- gate + increase in one step
set -uo pipefail

TRACK="production"
CRASH_THRESHOLD=0.02
ANR_THRESHOLD=0.005

# Step 1: find the active staged rollout on the track
ROLLOUT=$(gpc releases status --track "$TRACK" --json \
  | jq -c 'map(select(.status == "inProgress")) | .[0] // empty')

if [[ -z "$ROLLOUT" ]]; then
  echo "No active staged rollout on $TRACK. Exiting."
  exit 0
fi

CURRENT=$(printf '%s' "$ROLLOUT" | jq -r '((.userFraction // 0) * 100) | round')

# Step 2: determine next percentage
case $CURRENT in
  5)  NEXT=10 ;;
  10) NEXT=25 ;;
  25) NEXT=50 ;;
  50) NEXT=100 ;;
  *)
    echo "Rollout at ${CURRENT}%, no predefined next step."
    exit 0
    ;;
esac

echo "Current: ${CURRENT}%, Target: ${NEXT}%"

# Step 3: run the vitals gate. --threshold sets the exit code; 6 means breached
# or no data, anything else means the metric could not be read. Both block.
echo "Checking vitals..."

gpc vitals crashes --threshold "$CRASH_THRESHOLD" --json > /dev/null
CRASH_EXIT=$?
gpc vitals anr --threshold "$ANR_THRESHOLD" --json > /dev/null
ANR_EXIT=$?

if [[ "$CRASH_EXIT" != "0" || "$ANR_EXIT" != "0" ]]; then
  echo "Gate failed (crashes: $CRASH_EXIT, anr: $ANR_EXIT). Halting rollout."
  gpc releases rollout halt --track "$TRACK" --json
  exit 6
fi

# Step 4: increase rollout
echo "Vitals healthy. Increasing rollout to ${NEXT}%..."

if [[ "$NEXT" == "100" ]]; then
  gpc releases rollout complete --track "$TRACK" --json
else
  gpc releases rollout increase --track "$TRACK" --to "$NEXT" --json
fi

echo "Rollout increased to ${NEXT}%."
```

## Handling Exit Code 6 in CI

### GitHub Actions

The default shell is `bash -e`, so the step would abort before it could record the exit code. Turn that off and let the
step always succeed, then branch on the recorded code.

```yaml
- name: Vitals gate
  id: vitals
  shell: bash
  run: |
    set +e
    gpc vitals crashes --threshold 0.02 --json
    echo "code=$?" >> "$GITHUB_OUTPUT"

- name: Handle breach
  if: steps.vitals.outputs.code == '6'
  run: |
    echo "::warning::Vitals threshold breached"
    gpc releases rollout halt --track production --json
    # Notify team via Slack, PagerDuty, etc.

- name: Handle gate failure
  if: steps.vitals.outputs.code != '0' && steps.vitals.outputs.code != '6'
  run: |
    echo "::error::Vitals could not be read (exit ${{ steps.vitals.outputs.code }})"
    exit 1
```

### GitLab CI

```yaml
vitals-gate:
  script:
    - gpc vitals crashes --threshold 0.02 --json || GATE_EXIT=$?
    - |
      if [[ "${GATE_EXIT:-0}" == "6" ]]; then
        echo "Threshold breached, halting rollout"
        gpc releases rollout halt --track production --json
        exit 1
      elif [[ "${GATE_EXIT:-0}" != "0" ]]; then
        echo "Vitals command failed with exit code $GATE_EXIT"
        exit 1
      fi
```

### Shell Script (Any CI)

```bash
gpc vitals crashes --threshold 0.02 --json
EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "Vitals healthy"
    ;;
  6)
    echo "Threshold breached, or no data to gate on"
    # Take action: halt rollout, send alert, etc.
    ;;
  2)
    echo "Usage error -- is --threshold a fraction? 2% is 0.02"
    exit 1
    ;;
  3)
    echo "Authentication error -- check GPC_SERVICE_ACCOUNT"
    exit 1
    ;;
  4)
    echo "API error -- check permissions and that the Reporting API is enabled"
    exit 1
    ;;
  5)
    echo "Network error -- retry"
    exit 1
    ;;
  *)
    echo "Unexpected error: $EXIT_CODE"
    exit 1
    ;;
esac
```

## Google Play "Bad Behavior" Thresholds

For reference, these are the thresholds Google Play uses to flag apps. Exceeding these can affect your app's visibility in the Play Store.

| Metric                    | Threshold   | Consequence                                       |
| ------------------------- | ----------- | ------------------------------------------------- |
| User-perceived crash rate | 1.09%       | Play Console warning, potential visibility impact |
| User-perceived ANR rate   | 0.47%       | Play Console warning, potential visibility impact |
| Excessive wakeups         | 10 per hour | Battery vitals warning                            |
| Stuck wakelocks           | 0.70%       | Battery vitals warning                            |

::: tip
Set your CI thresholds slightly above Google's thresholds to catch regressions before Google flags your app. A common approach is to use 1.5x the Google threshold as a CI gate and 2x as an emergency halt trigger.
:::

## Related

- [`gpc status`](/commands/status) -- unified app health snapshot with threshold indicators
- [`gpc vitals`](/commands/vitals) -- detailed per-metric breakdowns and custom date ranges
- [GitHub Actions](/ci-cd/github-actions) -- full CI/CD workflow examples
