---
outline: deep
---

# Roadmap

GPC v0.9.x is a pre-release series working toward a stable **1.0.0** public launch. This page covers what's shipping next, what's planned for post-1.0, and the longer-term direction for the project.

## Current Status

**v0.9.31** is the latest release. GPC currently covers:

- **187 API endpoints** across the Android Publisher API v3 and Play Developer Reporting API
- **32 command groups**, 100+ subcommands
- **1,453 tests**, 90%+ line coverage across all core packages
- **7 published packages** under the `@gpc-cli` scope
- Complete coverage of releases, listings, vitals, reviews, subscriptions, IAP, purchases, users, reports, and more

## Road to 1.0

The following must be complete before the `1.0.0` tag ships:

- [x] API coverage audit — 187 endpoints verified
- [x] Performance benchmarks — cold start < 300ms
- [x] Security audit and credential hardening
- [x] Documentation completeness review
- [x] End-to-end validation against production apps
- [x] `gpc status` — unified app health snapshot with trend arrows, --format summary, --sections, --watch, --since-last, --all-apps, --notify (shipped v0.9.24–v0.9.26)
- [ ] Community showcase — real apps using GPC in production
- [ ] Stability soak — 2+ weeks without critical bugs (clock reset 2026-03-14, target 2026-03-28)
- [ ] Public launch (blog posts, Android Weekly, community announcements)

---

## gpc status — Shipped in v0.9.24–v0.9.26

One command that replaces opening 4–6 Play Console screens. See the full reference at [commands/status](/commands/status).

```
$ gpc status

App: com.example.app  (fetched 10:42:01 AM)

RELEASES
  production   v142   completed    —
  beta         v143   inProgress  10%
  internal     v144   draft        —

VITALS  (last 7 days)
  crashes     0.80% ↓  ✓    anr         0.20% ↓  ✓
  slow starts 2.10%    ✓    slow render 4.30%    ⚠

REVIEWS  (last 30 days)
  ★ 4.6   142 new   89% positive   ↑ from 4.4
```

Up to 10 parallel API calls (current + prior period for trend data), results in under 3 seconds. Results cached in `~/.cache/gpc/` with a 1-hour TTL. Exit code 6 if any vitals threshold is breached.

---

## Post-1.0 Roadmap

### Intelligence Layer

The biggest gap in today's Android tooling is **analysis on top of the API** — not just wrapping endpoints, but answering the question: _should I do this thing?_

#### Vitals-Gated Rollouts

Combine rollout management with vitals monitoring into a safety primitive:

```bash
gpc releases rollout increase --to 25 --vitals-gate
```

Before increasing rollout percentage, GPC checks the crash and ANR rates for the current version. If they exceed configured thresholds, the command refuses to proceed and tells you why. A `--auto-halt-rollout` flag lets you run continuous monitoring that pauses a live rollout if vitals degrade.

#### Release Regression Analysis

Compare vitals between consecutive versions:

```bash
gpc vitals compare v1.2.3 v1.2.4
```

Side-by-side crash rate, ANR, startup time, and rendering quality. Regressions highlighted in red. Exportable as a markdown table for PR descriptions or release notes.

#### Review Sentiment Analysis

Go beyond raw reviews data to understand trends:

```bash
gpc reviews analyze --days 30
```

Local analysis (no external service) covering sentiment trend over time, topic clustering (crashes, performance, UI, pricing), rating distribution by version code, and keyword frequency in 1★ vs 5★ reviews. Alerts when negative sentiment spikes.

---

### Release Automation

#### Automated Release Trains

Config-driven staged rollout pipeline with time delays and quality gates:

```jsonc
// .gpcrc.json
"release-train": {
  "stages": [
    { "track": "internal",   "rollout": 100 },
    { "track": "alpha",      "rollout": 100, "after": "2d" },
    { "track": "beta",       "rollout": 100, "after": "5d" },
    { "track": "production", "rollout": 10,  "after": "7d" },
    { "track": "production", "rollout": 100, "after": "14d" }
  ],
  "gates": {
    "crashes": { "max": 1.5 },
    "anr":     { "max": 0.5 }
  }
}
```

```bash
gpc train start   # kick off the pipeline
gpc train status  # where are we right now
gpc train pause   # hold at current stage
gpc train abort   # halt everything
```

If a quality gate fails at any stage, the train stops automatically and notifies you.

---

### App Quality

#### Bundle Size Analysis :white_check_mark: Shipped (v0.9.23)

`gpc bundle analyze` and `gpc bundle compare` are available now. Zero-dependency ZIP parsing gives you per-module and per-category size breakdowns, cross-build comparison with delta reporting, and `--threshold` for CI size gates. See [bundle commands](/commands/bundle).

Remaining enhancements for post-1.0: top-N largest files, per-module thresholds via `.bundlesize.json`, estimated APK size per device config.

#### Rich Listings Diff

See exactly what changes before pushing metadata:

```bash
gpc listings push --dry-run --diff
```

Word-level diff per language, character counts against Play Store limits, completeness check across all active languages.

---

### Ecosystem

#### GitHub Actions Marketplace Action

A first-class GitHub Action that wraps GPC — install from the Marketplace, no manual shell setup:

```yaml
- uses: yasserstudio/gpc-action@v1
  with:
    service-account: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    command: publish
    aab: app/build/outputs/bundle/release/app-release.aab
    track: internal
```

#### Plugin Registry

Community plugin discovery and installation:

```bash
gpc plugins search firebase
gpc plugins install @gpc-cli/plugin-firebase
```

Planned official plugins:
- `@gpc-cli/plugin-firebase` — link releases to Firebase App Distribution and Remote Config
- `@gpc-cli/plugin-sentry` — correlate releases with Sentry deploys and version mappings
- `@gpc-cli/plugin-jira` — auto-close issues and link fix versions on release
- `@gpc-cli/plugin-slack` — rich Slack notifications with inline approve/hold buttons

#### Multi-App Parallel Operations

First-class support for app families (phone + tablet + TV + Wear):

```bash
gpc --apps com.example.phone,com.example.tv releases upload *.aab
```

Fans out to parallel API calls, unified status report, partial success handling.

---

### New Google Play APIs

GPC currently covers the Android Publisher API v3 and Play Developer Reporting API. Post-1.0, we'll expand to additional Google Play APIs:

#### Play Integrity API

Verify device and app integrity tokens from the command line — useful for backend teams debugging attestation issues:

```bash
gpc integrity verify --token <jwt> --package com.example.app
```

Returns the `appRecognitionVerdict`, `deviceIntegrity`, and `accountDetails` fields from the decoded verdict.

#### Play Games Services v2

A full `gpc games` command group for game developers:

```bash
gpc games leaderboards list
gpc games achievements create --file achievement.json
gpc games events get <event-id>
```

Covers leaderboards, achievements, events, and cloud save configuration.

#### Play Custom App API

For enterprise teams distributing internal apps through Managed Google Play without a public Play Store listing:

```bash
gpc enterprise apps create --title "Internal Tool" --org <developer-id>
gpc enterprise apps list --org <developer-id>
```

---

### Longer-Term Directions

- **Dashboard web UI** — visual release pipeline, vitals charts, review trends, one-click promote/halt actions
- **Webhook-driven approvals** — post to Slack when a release train reaches production stage, approve or hold from Slack
- **AI-assisted release notes** — generate user-facing "What's new" text from git log, with optional translation

---

## Changelog

For a history of what shipped in each version, see the [Changelog](/reference/changelog).

## Feedback

Have a feature request or want to vote on priorities? Open an issue on [GitHub](https://github.com/yasserstudio/gpc/issues).
