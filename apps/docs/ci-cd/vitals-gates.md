---
outline: deep
---

# Vitals Quality Gates

Use GPC's vitals commands and exit code 6 to block rollout progression when app quality degrades. This prevents bad releases from reaching more users.

## How Threshold Exit Code 6 Works

When you pass `--threshold` to a vitals command, GPC compares the current metric value against your threshold. If the metric exceeds the threshold, GPC exits with code `6` instead of `0`.

```bash
# Exits 0 if crash rate <= 2.0%, exits 6 if crash rate > 2.0%
gpc vitals crashes --threshold 2.0

# Exits 0 if ANR rate <= 0.47%, exits 6 if ANR rate > 0.47%
gpc vitals anr --threshold 0.47
```

The JSON output includes the threshold comparison:

```json
{
  "success": true,
  "data": {
    "crashRate": 2.4,
    "threshold": 2.0,
    "breached": true
  }
}
```

Exit code 6 is distinct from other error codes. CI systems can differentiate between "command failed" (exit 1) and "quality gate breached" (exit 6).

## Crash Rate Gating

Google Play's "bad behavior" threshold for crashes is 1.09%. A common CI threshold is 2.0% (roughly double the Play Console warning level).

```bash
# In CI: fail the job if crash rate exceeds 2.0%
gpc vitals crashes --threshold 2.0 --json

# With version filter: check only the version being rolled out
gpc vitals crashes --version 42 --threshold 2.0 --json
```

### Crash Rate Thresholds

| Level                | Threshold | Action                          |
| -------------------- | --------- | ------------------------------- |
| Google Play warning  | 1.09%     | Play Console shows warning      |
| Conservative CI gate | 1.5%      | Block promotion, alert team     |
| Standard CI gate     | 2.0%      | Block rollout increase          |
| Emergency halt       | 3.0%      | Halt active rollout immediately |

## ANR Rate Gating

Google Play's "bad behavior" threshold for ANR is 0.47%.

```bash
# Fail if ANR rate exceeds 0.47% (Google's threshold)
gpc vitals anr --threshold 0.47 --json

# More lenient threshold
gpc vitals anr --threshold 1.0 --json
```

### ANR Rate Thresholds

| Level                | Threshold | Action                     |
| -------------------- | --------- | -------------------------- |
| Google Play warning  | 0.47%     | Play Console shows warning |
| Conservative CI gate | 0.5%      | Block promotion            |
| Standard CI gate     | 1.0%      | Block rollout increase     |
| Emergency halt       | 2.0%      | Halt active rollout        |

## Multi-Metric Gating Script

Check multiple vitals metrics in a single script. Use this as a reusable gate before any rollout increase.

```bash
#!/bin/bash
# vitals-gate.sh — Multi-metric quality gate
# Usage: ./vitals-gate.sh [--halt-on-breach]
set -euo pipefail

# Thresholds (customize per app)
CRASH_THRESHOLD=2.0
ANR_THRESHOLD=0.5
STARTUP_THRESHOLD=5000  # Cold start in ms

HALT_ON_BREACH=false
if [[ "${1:-}" == "--halt-on-breach" ]]; then
  HALT_ON_BREACH=true
fi

BREACHED=false
REPORT=""

# Check crash rate
CRASH_RATE=$(gpc vitals crashes --json | jq -r '.data.crashRate')
if (( $(echo "$CRASH_RATE > $CRASH_THRESHOLD" | bc -l) )); then
  REPORT+="FAIL: Crash rate ${CRASH_RATE}% exceeds ${CRASH_THRESHOLD}%\n"
  BREACHED=true
else
  REPORT+="PASS: Crash rate ${CRASH_RATE}% (threshold: ${CRASH_THRESHOLD}%)\n"
fi

# Check ANR rate
ANR_RATE=$(gpc vitals anr --json | jq -r '.data.anrRate')
if (( $(echo "$ANR_RATE > $ANR_THRESHOLD" | bc -l) )); then
  REPORT+="FAIL: ANR rate ${ANR_RATE}% exceeds ${ANR_THRESHOLD}%\n"
  BREACHED=true
else
  REPORT+="PASS: ANR rate ${ANR_RATE}% (threshold: ${ANR_THRESHOLD}%)\n"
fi

# Check cold start time
COLD_START=$(gpc vitals startup --json | jq -r '.data.coldStartTime // 0')
if (( $(echo "$COLD_START > $STARTUP_THRESHOLD" | bc -l) )); then
  REPORT+="FAIL: Cold start ${COLD_START}ms exceeds ${STARTUP_THRESHOLD}ms\n"
  BREACHED=true
else
  REPORT+="PASS: Cold start ${COLD_START}ms (threshold: ${STARTUP_THRESHOLD}ms)\n"
fi

# Print report
echo -e "\n=== Vitals Quality Gate ==="
echo -e "$REPORT"

# Handle breach
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

Combines the gate with the rollout increase in a single script.

```bash
#!/bin/bash
# staged-rollout-step.sh — Gate + increase in one step
set -euo pipefail

TRACK="production"
CRASH_THRESHOLD=2.0
ANR_THRESHOLD=0.5

# Step 1: Get current rollout percentage
CURRENT=$(gpc releases status --track $TRACK --json | jq -r '.data.rolloutPercentage // "100"')
STATUS=$(gpc releases status --track $TRACK --json | jq -r '.data.status // "completed"')

if [[ "$STATUS" != "inProgress" ]]; then
  echo "No active staged rollout (status: $STATUS). Exiting."
  exit 0
fi

# Step 2: Determine next percentage
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

# Step 3: Run vitals gate
echo "Checking vitals..."

CRASH_RATE=$(gpc vitals crashes --json | jq -r '.data.crashRate')
ANR_RATE=$(gpc vitals anr --json | jq -r '.data.anrRate')

echo "Crash rate: ${CRASH_RATE}% (threshold: ${CRASH_THRESHOLD}%)"
echo "ANR rate: ${ANR_RATE}% (threshold: ${ANR_THRESHOLD}%)"

if (( $(echo "$CRASH_RATE > $CRASH_THRESHOLD" | bc -l) )); then
  echo "BREACH: Crash rate exceeds threshold. Halting rollout."
  gpc releases rollout halt --track $TRACK --json
  exit 6
fi

if (( $(echo "$ANR_RATE > $ANR_THRESHOLD" | bc -l) )); then
  echo "BREACH: ANR rate exceeds threshold. Halting rollout."
  gpc releases rollout halt --track $TRACK --json
  exit 6
fi

# Step 4: Increase rollout
echo "Vitals healthy. Increasing rollout to ${NEXT}%..."

if [[ "$NEXT" == "100" ]]; then
  gpc releases rollout complete --track $TRACK --json
else
  gpc releases rollout increase --track $TRACK --to $NEXT --json
fi

echo "Rollout increased to ${NEXT}%."
```

## Handling Exit Code 6 in CI

### GitHub Actions

```yaml
- name: Vitals gate
  id: vitals
  run: gpc vitals crashes --threshold 2.0 --json
  continue-on-error: true

- name: Handle breach
  if: steps.vitals.outcome == 'failure'
  run: |
    echo "::warning::Vitals threshold breached"
    gpc releases rollout halt --track production --json
    # Notify team via Slack, PagerDuty, etc.
```

### GitLab CI

```yaml
vitals-gate:
  script:
    - gpc vitals crashes --threshold 2.0 --json || GATE_EXIT=$?
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
gpc vitals crashes --threshold 2.0 --json
EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "Vitals healthy"
    ;;
  6)
    echo "Threshold breached"
    # Take action: halt rollout, send alert, etc.
    ;;
  3)
    echo "Authentication error — check GPC_SERVICE_ACCOUNT"
    exit 1
    ;;
  4)
    echo "API error — check permissions"
    exit 1
    ;;
  5)
    echo "Network error — retry"
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
