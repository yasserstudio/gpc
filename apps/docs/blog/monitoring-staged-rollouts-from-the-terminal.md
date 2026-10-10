---
title: "Monitoring Android Staged Rollouts from the Terminal"
date: 2026-04-25
description: "Watch a Google Play staged rollout from your terminal: crash and ANR thresholds, auto-halt on a breach, and CI gates that fail loudly instead of passing blind."
author: Yasser Berrehail
tags: [staged-rollout, vitals, monitoring, ci-cd, android]
image: /blog/monitoring-staged-rollouts-from-the-terminal.webp
ogImage: /blog/monitoring-staged-rollouts-from-the-terminal.jpg
---

<BlogPost />

# Monitoring Android Staged Rollouts from the Terminal

::: info Updated October 2026
This article first appeared on Dev.to on April 25, 2026, as ["Monitoring Android Staged Rollouts from the Terminal"](https://dev.to/yasserstudio/monitoring-android-staged-rollouts-from-the-terminal-24d8). It has been rewritten for GPC 1.0.0-rc.2, which changed how vitals gates work. Three things in the original are no longer true: thresholds are fractions and a percentage is now refused outright, `gpc watch` reports an unreadable metric instead of treating it as healthy, and the rollout examples used a `--fraction` flag that does not exist. Vitals lag is also stated correctly here as 2 to 4 days, not 24 to 48 hours.
:::

A staged rollout on Google Play exposes a new release to a slice of users, and `gpc watch` monitors that slice from your terminal. It polls rollout status and Android Vitals on an interval, compares crash and ANR rates against thresholds you set, and can halt the rollout itself when one breaches. Exit code 6 means a breach, exit 4 means a metric could not be read.

**Key Takeaways**

- Rate thresholds are fractions, the way Google reports them: `--crash-threshold 0.02` is 2%. A value of 1 or more is refused with `THRESHOLD_INVALID` (exit 2), because a rate can never reach it.
- `gpc watch --on-breach halt` halts the rollout through the Google Play API without a human in the loop.
- A gate never passes blind: an unreadable metric exits 4, and no data under `--threshold` exits 6 with `THRESHOLD_NO_DATA`.
- Vitals data lags 2 to 4 days. Rollout status is near real-time.
- `gpc watch` judges the worst value of the most recent day, not a multi-day average, so a spike in a fresh rollout is visible.
- Upgrade to 1.0.0-rc.2 before you rely on `--on-breach halt`. Earlier builds never received a value from Google, so the halt could not fire.

## Why is rollout monitoring still manual for most teams?

Because the data lives in a dashboard. The usual loop is: open the Play Console, find the vitals page, read the crash rate, compare it to last week from memory, decide whether to ramp. Then repeat it every few hours for three or four days, which is how long a careful staged rollout takes.

Nothing in that loop needs a browser. The numbers come from the Play Developer Reporting API, the rollout percentage comes from the Publishing API, and the decision is a comparison against a threshold.

## What do you need to start?

GPC 1.0.0-rc.2 or newer, and a Google Play service account that can read this app's vitals.

```bash
# npm
npm install -g @gpc-cli/cli

# Homebrew
brew install yasserstudio/tap/gpc

# standalone binary, no Node.js
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

```bash
gpc auth login --service-account path/to/key.json
gpc doctor
```

`gpc doctor` checks credentials, config, and API access before you depend on any of it. The Play Developer Reporting API has to be enabled for the project, and the service account needs access to the app. If it is not, vitals commands exit 4 and print the enable URL rather than reporting zero problems.

## How do you watch a rollout?

```bash
gpc watch
```

With no flags it watches the production track, polls every 15 minutes, and tracks crashes and ANR. Each round prints the rollout state next to the metrics:

```
[14:30:02] Round 1
  Rollout: v142 at 10% (inProgress)
  crashes: 1.2% (threshold: 2.0%) OK
  anr: 0.3% (threshold: 1.0%) OK
```

The loop stops when the rollout reaches 100%, when a breach triggers `halt`, when `--rounds` is exhausted, or when you press Ctrl+C.

| Flag                      | Default       | What it does                                  |
| ------------------------- | ------------- | --------------------------------------------- |
| `--track <name>`          | `production`  | Track to monitor                              |
| `--metrics <csv>`         | `crashes,anr` | Metrics to watch                              |
| `--interval <seconds>`    | `900`         | Poll interval, minimum 60                     |
| `--rounds <n>`            | unlimited     | Stop after N rounds                           |
| `--crash-threshold <pct>` | `0.02`        | Crash rate threshold, as a fraction           |
| `--anr-threshold <pct>`   | `0.01`        | ANR rate threshold, as a fraction             |
| `--on-breach <actions>`   | `notify`      | `notify`, `halt`, `webhook` (comma-separated) |
| `--webhook-url <url>`     |               | Where to POST the breach event                |

There is no `--duration` flag. Bound a session with `--rounds` and `--interval` instead: `--rounds 3 --interval 300` is three checks over ten minutes.

## Why are thresholds fractions and not percentages?

Because Google reports rates as fractions, and GPC passes them through untouched. 2% is `0.02`, Google's bad-behavior threshold for user-perceived crash rate, 1.09%, is `0.0109`, and its ANR threshold of 0.47% is `0.0047`.

A rate can never reach 1, so a threshold of 1 or more is refused with `THRESHOLD_INVALID` (exit 2) instead of sitting there as a gate that can never fire. This matters: GPC's own documentation used to show `--threshold 2.0`, and anyone who copied that line had a CI gate which passed every single time.

```bash
gpc watch --crash-threshold 0.015 --anr-threshold 0.005
```

Set them once in `.gpcrc.json` instead, and `gpc watch`, `gpc status`, and the rollout vitals gate all read the same numbers:

```json
{
  "vitals": {
    "thresholds": {
      "crashRate": 0.015,
      "anrRate": 0.005,
      "lmkRate": 0.03
    }
  }
}
```

Resolution order is CLI flags, then config, then defaults (crash 2%, ANR 1%, LMK 3%, slow start 5%, slow render 10%).

## Which metrics can you watch?

Six, passed to `--metrics` as a comma-separated list:

| Metric       | Tracks                                     |
| ------------ | ------------------------------------------ |
| `crashes`    | Crash rate                                 |
| `anr`        | Application Not Responding rate            |
| `lmk`        | Low Memory Killer rate                     |
| `slowStarts` | Slow cold, warm, and hot starts            |
| `slowRender` | Slow frame rendering, games only           |
| `errorCount` | Error report count, a count and not a rate |

```bash
gpc watch --metrics crashes,anr,lmk,slowStarts
```

Two of these have sharp edges worth knowing. `slowRender` only has data for games: Google serves the slow-rendering metric set to games only, and asking for it on any other app returns `API_METRIC_GAMES_ONLY` (exit 4). And `slowStarts` is reported per start type, so GPC takes the worst of cold, warm, and hot rather than averaging them, which is how a bad cold-start rate used to hide behind healthy warm starts.

## What happens when a threshold breaches?

You pick, with `--on-breach`, and the actions combine.

| Action    | Effect                                               |
| --------- | ---------------------------------------------------- |
| `notify`  | OS notification (macOS, Linux, Windows)              |
| `halt`    | Halts the active rollout through the Google Play API |
| `webhook` | POSTs the breach event as JSON to `--webhook-url`    |

```bash
gpc watch --on-breach notify,halt
```

That is the one worth setting up. If the crash rate crosses your threshold at 03:00, the rollout stops at 03:00, and you find out about it rather than discovering it over coffee.

For Slack, PagerDuty, or anything else that takes a POST:

```bash
gpc watch --on-breach notify,halt,webhook \
  --webhook-url https://hooks.slack.com/services/XXX
```

The payload names the metric, the value, the threshold, and whether the rollout was halted:

```json
{
  "type": "breach",
  "round": 3,
  "timestamp": "2026-10-09T14:45:00.000Z",
  "rollout": {
    "track": "production",
    "versionCode": "142",
    "userFraction": 0.1,
    "status": "inProgress"
  },
  "vitals": {
    "crashes": { "value": 0.025, "threshold": 0.02, "breached": true },
    "anr": { "value": 0.005, "threshold": 0.01, "breached": false }
  },
  "breaches": ["crashes"],
  "halted": true
}
```

The URL can live in config so you do not pass it on every run:

```json
{
  "webhooks": {
    "watch": "https://hooks.slack.com/services/XXX"
  }
}
```

## What does a clean exit mean?

| Exit code | Meaning                                                   |
| --------- | --------------------------------------------------------- |
| `0`       | Every watched metric was read and stayed within threshold |
| `4`       | A watched metric with a threshold could not be read       |
| `6`       | At least one threshold breached                           |

The 4 is the important one. A monitor that cannot see a metric is not a monitor that found good news, so `gpc watch` prints the metric as unreadable with the reason and exits 4. Before 1.0.0-rc.2 it misread Google's response, never received a value at all, and exited 0 looking perfectly healthy, which also meant `--on-breach halt` could not halt anything.

## How do you run this in CI?

Give it a round count and let the exit code decide:

```bash
gpc watch --rounds 3 --interval 300 --on-breach halt --json
```

With `--json` each round prints one JSON object (NDJSON), which pipes straight into `jq`.

```yaml
- name: Monitor rollout vitals
  run: gpc watch --rounds 3 --interval 300 --on-breach halt --json
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.app
```

If you would rather gate a single step than watch a loop, `gpc releases rollout increase --vitals-gate` checks the crash rate before it touches the rollout, and leaves the rollout alone when the gate fails:

```bash
gpc releases rollout increase --track production --to 25 --vitals-gate
```

It reads its limit from `vitals.thresholds.crashRate` in `.gpcrc.json`, as a fraction like everywhere else, and it fails closed. A missing threshold, a read error, or no data blocks the increase rather than waving it through. See [vitals quality gates](/ci-cd/vitals-gates) for the multi-metric version.

## Why does the vitals data lag 2 to 4 days?

Because Google aggregates it. Rollout status (track, version code, user fraction) is near real-time, but crash and ANR rates for a cohort are published days later, and asking for a day Google has not published yet simply fails.

That shapes how you use the tool. For the first hours after a release, rollout progress is the only live signal. For the decision that actually matters, whether to ramp from 1% to 10%, the vitals arrive right about when you need them.

It also explains two behaviors that look pedantic until they save you. `gpc watch` clamps its request to the days Google has actually published, and a `--threshold` run that gets no value back exits 6 with `THRESHOLD_NO_DATA` instead of 0. The usual causes are a wrong `--app`, the data lag, and an app with too little traffic to report on.

## A full staged rollout, end to end

```bash
# Upload and release to 1% of production
gpc releases upload app.aab --track production --rollout 1 --status inProgress

# Watch it, halt on a breach, tell Slack either way
gpc watch --on-breach notify,halt,webhook \
  --webhook-url https://hooks.slack.com/services/XXX

# Vitals look good a few days later: ramp, gated on the crash rate
gpc releases rollout increase --track production --to 10 --vitals-gate
gpc watch --on-breach notify,halt

# Finish the rollout
gpc releases rollout complete --track production
```

Or hand the whole sequence to [`gpc train`](/commands/train), which drives the stages from a config file with time delays and vitals gates:

```json
{
  "stages": [
    { "track": "internal", "rollout": 100 },
    { "track": "production", "rollout": 10, "after": "7d" },
    { "track": "production", "rollout": 100, "after": "14d" }
  ],
  "gates": {
    "crashes": { "max": 1.5 },
    "anr": { "max": 0.5 }
  }
}
```

Two things to know about the train. Its gates are percentages (`1.5` is 1.5%), unlike every threshold elsewhere in GPC, which takes fractions. And nothing advances by itself: `gpc train advance` has to run on a schedule, such as a CI cron job. If a gate has no data yet, the train stays where it is and exits 6 with `TRAIN_GATE_NO_DATA`, so you run `advance` again later rather than ramping on a guess.

## Related

- [`gpc watch`](/commands/watch), the full command reference
- [`gpc vitals`](/commands/vitals), per-metric queries and thresholds
- [Vitals quality gates](/ci-cd/vitals-gates), CI patterns and exit-code handling
- [`gpc train`](/commands/train), config-driven staged rollouts
- [Install GPC](/guide/installation)

Free to use, MIT-licensed, and the code is on [GitHub](https://github.com/yasserstudio/gpc).
