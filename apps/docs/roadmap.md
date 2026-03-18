---
outline: deep
---

# Roadmap

GPC v0.9.x is a pre-release series working toward a stable **1.0.0** public launch. Every feature on this page ships before 1.0 — nothing is deferred post-launch.

## Current Status

**v0.9.34** is the latest release. GPC currently covers:

- **187 API endpoints** across the Android Publisher API v3 and Play Developer Reporting API
- **33 command groups**, 100+ subcommands
- **1,504 tests**, 90%+ line coverage across all core packages
- **7 published packages** under the `@gpc-cli` scope
- Complete coverage of releases, listings, vitals, reviews, subscriptions, IAP, purchases, users, reports, and more

---

## v0.9.34 — Bug fixes, color output, onboarding foundations (shipped)

**Bug fixes**

- `gpc iap batch-get` — replace 403 error with a proper deprecation notice (the underlying Google endpoint is blocked; `iap list` already handles this gracefully)
- `gpc migrate fastlane` — warn before overwriting an existing `.gpcrc.json` instead of silently replacing it

**Color output**

- `✓` green, `✗` red, `⚠` yellow across `vitals`, `doctor`, `status`, and `validate`
- Track status colors: `inProgress` green, `halted` red, `draft` dim, `completed` gray
- Diff coloring: additions green, removals red in `listings diff`, `releases diff`, `subscriptions diff`
- `NO_COLOR` / `FORCE_COLOR` env var support + `--no-color` global flag

**Onboarding**

- First-run banner: if no config exists, any command prints `✦ First time? Run gpc config init to get set up.`
- Auth errors (403/401) append `→ Run gpc doctor to diagnose your credentials.`
- `gpc config init` automatically runs `gpc doctor` inline when it completes
- `gpc doctor` success prints `✓ Ready. Try: gpc status`

**New commands**

- `gpc reviews reply <review-id> --text "..."` — reply to a user review directly from the terminal
- `gpc anomalies list` — surface automatic quality spikes from the Reporting API without configuring thresholds
- `gpc vitals wakeup` — excessive wake-up rate (battery drain signal)
- `gpc vitals lmk` — Low Memory Killer events (memory pressure signal)

---

## v0.9.35 — Terminal UX + onboarding commands

**Terminal UX**

- Upload progress bar for `releases upload` and `internal-sharing upload` — bytes transferred, speed, ETA during 30–90s uploads
- Spinner during multi-API waits — `gpc status` currently freezes 2–3s while fetching; a live indicator replaces it
- Terminal-width-aware table truncation — adapts to actual terminal width instead of a hardcoded 60-char limit
- Number right-alignment in tables — rollout percentages, crash rates, version codes
- Bold/dim column headers

**Onboarding commands**

- `gpc auth login` with no flags → interactive prompts (profile name → credentials path → package name)
- `gpc quickstart` — single guided flow: detects config state → verifies credentials → checks package name → runs doctor → shows next steps. Idempotent, safe to run again at any time.

```
$ gpc quickstart

Welcome to GPC — Google Play Console CLI
─────────────────────────────────────────
Step 1/4  Checking for existing config...     ✓ Found profile "myapp"
Step 2/4  Verifying credentials...            ✓ Service account valid
Step 3/4  Checking package name...            ✓ com.example.app
Step 4/4  Running doctor...                   ✓ All checks passed

Ready. Here's what you can do next:
  gpc status              → app health snapshot
  gpc releases list       → current tracks and versions
  gpc reviews list        → recent user reviews
  gpc vitals overview     → crash and ANR rates
```

---

## v0.9.36 — Listing text optimization

Validate and analyze store listing text without leaving the terminal. GPC currently has no character limit enforcement — the API silently rejects over-limit text.

**`gpc listings lint`** (local, no API call)

```bash
gpc listings lint [--dir metadata] [--strict]
```

Field-by-field table with character counts, usage percentages, and status indicators. Exit code 2 if any field is over the limit or missing. `--strict` treats >80% usage as an error.

**`gpc listings analyze`** (live, fetches remote listings)

```bash
gpc listings analyze [--expected en-US,de-DE,fr-FR]
```

Same analysis for what's currently live on Play Store. `--expected` flags missing translations.

**`gpc listings push` preflight gate** — runs lint before committing. Aborts if any field exceeds its limit (unless `--force`).

**Enhanced `gpc listings diff`** — `--lang` filter, character count header per field, word-level inline diff for `fullDescription` changes.

---

## v0.9.37 — Missing API coverage

Complete the command groups that exist in the API but are unimplemented in GPC:

**App Recovery** — halt distribution of broken versions and deploy fixes without a full release cycle:

```bash
gpc recovery create --version-code 35 --percentage 100
gpc recovery deploy <action-id>
gpc recovery add-targeting <action-id> --regions US,GB
gpc recovery cancel <action-id>
```

**Orders** — support and refund workflows:

```bash
gpc orders get <order-id>
gpc orders batch-get --file order-ids.json
gpc orders refund <order-id> [--revoke]
```

**Grants** — per-package team access control, finer-grained than `gpc users`:

```bash
gpc grants list --user user@example.com
gpc grants create --user user@example.com --permission VIEW_APP_INFORMATION,REPLY_TO_REVIEWS
gpc grants delete <grant-name>
gpc grants patch <grant-name> --permission VIEW_APP_INFORMATION
```

**Subscription lifecycle** — cancel, defer, refund, or revoke any subscription from the terminal:

```bash
gpc purchases subscription cancel <token>
gpc purchases subscription defer <token> --until 2027-01-01
gpc purchases subscription refund <token>
gpc purchases subscription revoke <token>   # refund + revoke entitlement
```

---

## v0.9.38 — RTDN + subscription price migration

**Real-Time Developer Notifications** — no other CLI wraps this. Every subscription event fires as a Pub/Sub message; GPC makes it inspectable from the terminal:

```bash
gpc rtdn status
gpc rtdn setup --topic projects/P/topics/T
gpc rtdn events [--limit 50] [--type SUBSCRIPTION_CANCELED]
gpc rtdn validate --endpoint https://api.example.com/webhook
```

**Subscription price migration** — bulk-update prices across all regions without breaking existing subscriptions:

```bash
gpc subscriptions base-plans migrate-prices <product-id> <base-plan-id> --dry-run
```

---

## v0.9.39 — Intelligence layer

**Release regression analysis**

```bash
gpc vitals compare v1.2.3 v1.2.4
```

Side-by-side crash rate, ANR, startup time, and rendering quality. Regressions highlighted in red. Exportable as a markdown table for PR descriptions or release notes.

**Review sentiment analysis** (local, no external service)

```bash
gpc reviews analyze --days 30
```

Sentiment trend over time, topic clustering (crashes, performance, UI, pricing), rating distribution by version code, keyword frequency in 1★ vs 5★ reviews. Alerts when negative sentiment spikes.

**Vitals-gated auto-halt** — `gpc vitals watch --auto-halt-rollout` monitors a live rollout and pauses it automatically if crash or ANR rates breach configured thresholds. Completes the `--vitals-gate` story shipped in v0.9.32.

---

## v0.9.40 — Release automation + data access

**Automated release trains** — config-driven staged rollout pipeline with time delays and quality gates:

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
  "gates": { "crashes": { "max": 1.5 }, "anr": { "max": 0.5 } }
}
```

```bash
gpc train start   # kick off the pipeline
gpc train status  # where are we right now
gpc train pause   # hold at current stage
gpc train abort   # halt everything
```

**GCS reports download** — financial and stats reports are auto-delivered by Google to a private Cloud Storage bucket. GPC bridges the gap:

```bash
gpc reports gcs-bucket
gpc reports download financial --month 2026-02
gpc reports download stats --type crashes --since 2026-01-01
```

**Quota monitoring** — visibility into 200k daily / 3,000 per-minute API limits before CI pipelines hit walls:

```bash
gpc quota status
gpc quota usage --bucket subscriptions
```

**Subscription analytics** — active/in-trial/cancelled counts, trial→paid conversion per offer, regional revenue breakdown, churn cohort analysis.

---

## v0.9.41 — Ecosystem

**GitHub Actions Marketplace Action** — first-class Action wrapping GPC, no manual shell setup:

```yaml
- uses: yasserstudio/gpc-action@v1
  with:
    service-account: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    command: publish
    aab: app/build/outputs/bundle/release/app-release.aab
    track: internal
```

**Multi-app parallel operations** — first-class support for app families (phone + tablet + TV + Wear):

```bash
gpc --apps com.example.phone,com.example.tv releases upload *.aab
```

Fans out to parallel API calls, unified status report, partial success handling.

**Plugin registry** — community plugin discovery and installation:

```bash
gpc plugins search firebase
gpc plugins install @gpc-cli/plugin-firebase
```

Planned official plugins: `plugin-firebase`, `plugin-sentry`, `plugin-jira`, `plugin-slack`

**Bundle analysis enhancements** (`gpc bundle` shipped in v0.9.23 — remaining): top-N largest files, per-module thresholds via `.bundlesize.json`, estimated APK size per device config.

---

## v0.9.42 — Extended APIs + AI release notes

**Play Games Services v2** (`gpc games`) — leaderboards, achievements, events, and cloud save config for game developers.

**Play Custom App API** (`gpc enterprise`) — private app distribution for enterprises through Managed Google Play, without a public Play Store listing:

```bash
gpc enterprise apps create --title "Internal Tool" --org <developer-id>
gpc enterprise apps list --org <developer-id>
```

**AI-assisted release notes** — generate user-facing "What's new" text from git history, with optional translation to all active listing languages:

```bash
gpc releases upload app.aab --notes-from-git --ai-enhance
```

---

## v1.0.0 — Stable release

**Onboarding completion**

- `gpc doctor --fix` — inline remediation for each failing check: moves keys, updates config paths, opens the relevant GCP or Play Console URL when a manual step is required
- `gpc auth setup-gcp` — step-by-step interactive guidance for creating a GCP service account, replacing 6+ manual console screens
- Destructive command confirmations — `releases rollout halt`, `iap delete`, and similar irreversible commands prompt `[y/N]`. Skip with `--yes` for scripting.
- Pager for long lists — auto-pipe to `$PAGER` when output exceeds terminal height (TTY only)

**1.0 gate**

- [ ] Community showcase — real apps using GPC in production
- [ ] Stability soak — 2+ weeks without critical bugs
- [ ] Public launch: blog post, Android Weekly, community announcements

---

## Changelog

For a history of what shipped in each version, see the [Changelog](/reference/changelog).

## Feedback

Have a feature request or want to vote on priorities? Open an issue on [GitHub](https://github.com/yasserstudio/gpc/issues).
