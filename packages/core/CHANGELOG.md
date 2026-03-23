# @gpc-cli/core

## 0.9.34

### Patch Changes

- Bug fixes and code quality improvements.
  - fix: `gpc vitals lmk` and `gpc vitals memory` — 400 INVALID_ARGUMENT (wrong metric field names)
  - fix: `gpc releases notes get` — fallback for completed releases that don't return notes
  - fix: `gpc subscriptions list` — show "No subscriptions found." when empty
  - fix: `console.warn` in core replaced with `process.emitWarning`
  - refactor: extracted `resolvePackageName` and `getClient` to shared utility (-183 lines)

## 0.9.33

### Patch Changes

- Preflight compliance scanner, new commands, status improvements, and bug fixes.
  - `gpc preflight` — scan your AAB against Google Play policies before uploading (9 scanners, offline)
  - `gpc init` — scaffold project config, metadata directory, and CI templates
  - `gpc diff` — read-only preview of release state and pending changes
  - `gpc releases count` — aggregate release stats per track
  - `--copy-notes-from` on `gpc releases upload` and `gpc releases promote`
  - `gpc status --review-days` — configurable reviews window
  - `gpc status --threshold` — one-off threshold overrides from CLI
  - `gpc status --watch` elapsed time footer with live countdown
  - `gpc feedback` enhanced with audit log context and `--print` flag
  - `gpc releases promote` auto-retries on 409 Conflict
  - fix: `gpc diff --from/--to` type mismatch
  - fix: `--review-days` validation

## 0.9.32

### Patch Changes

- Resumable uploads, Google best practices compliance, bug fixes
- Updated dependencies
  - @gpc-cli/api@1.0.21

## 0.9.31

### Patch Changes

- fix: security and code quality improvements
  - fix(cli): replace execSync shell interpolation with spawnSync array args in `gpc plugins install/uninstall` — eliminates command injection risk when plugin names contain shell metacharacters
  - fix(api): rename internal `ApiError` class to `PlayApiError` to eliminate naming collision with `@gpc-cli/core`'s `ApiError` — no behavioral change, single import site updated
  - fix(core): replace `process.exit(2)` with a thrown error in `runWatchLoop()` validation — core packages should not call `process.exit` directly
  - fix(cli): change `workspace:^` to `workspace:*` for `@gpc-cli/auth` dependency — consistent with all other workspace packages

- Updated dependencies
  - @gpc-cli/api@1.0.20

## 0.9.30

### Patch Changes

- eb379cf: fix: v0.9.36 — bug fixes, security hardening, and regression tests
  - fix(core): `gpc vitals lmk` — correct metric names to `stuckBackgroundWakelockRate7dUserWeighted` and `stuckBackgroundWakelockRate28dUserWeighted`; base metric rejected by API with 400 INVALID_ARGUMENT (Bug H)
  - fix(cli): `gpc quickstart` — remove `--quiet` from doctor subprocess args; Commander treated it as unknown subcommand option causing exit 1 even when all checks passed (Bug M)
  - fix(cli): `gpc quota usage` — use same human-friendly table format as `quota status`; `topCommands` no longer shows `[object Object]` (Bug O)
  - fix(core): `sendNotification` — replace `execSync` shell string with `execFile` array args on all platforms; eliminates shell injection via notification title/body (Bug N)
  - refactor(cli): extract shared `printQuotaTable()` helper in quota.ts — eliminates duplicate implementation between `quota status` and `quota usage`
  - test: add regression tests for bugs H (vitals lmk metrics), M (quickstart spawn args), N (sendNotification execFile), O (quota usage format) — 13 new tests

## 0.9.29

### Patch Changes

- v0.9.35 — The Big One: Full Pre-1.0 Feature Release

  Bug fixes: version reporting (Bug J), stale edit session auto-retry (Bug I), vitals lmk metrics (Bug H), Windows installer (Bug K), docs flags (Bug L), validate color output.

  Terminal UX: dynamic table width, numeric right-alignment, bold headers, spinner on status.

  Onboarding: gpc auth login interactive wizard, gpc quickstart guided setup, gpc auth setup-gcp, destructive command confirmations, pager for long lists.

  Listing text: gpc listings lint/analyze (local lint + remote analysis), push preflight gate, enhanced diff with word-level inline changes.

  New commands: gpc grants, gpc reviews analyze (local NLP sentiment), gpc vitals compare-versions, gpc vitals watch --auto-halt-rollout, gpc train (staged rollout pipeline), gpc quota, gpc subscriptions analytics, gpc games (Play Games Services), gpc enterprise (Managed Google Play).

  API additions: orders.get/batchGet, grants CRUD, refundSubscriptionV2, batchMigratePrices, GamesApiClient, EnterpriseApiClient.

- Updated dependencies
  - @gpc-cli/api@1.0.19

## 0.9.28

### Patch Changes

- Bug fixes and branding update: fix gpc version --json, fix GPC_DEBUG argv mutation, warn on --vitals-gate with --dry-run, update product name to GPC — Google Play Console CLI
- Updated dependencies
  - @gpc-cli/api@1.0.18
  - @gpc-cli/auth@0.9.10
  - @gpc-cli/config@0.9.9
  - @gpc-cli/plugin-sdk@0.9.7

## 0.9.27

### Patch Changes

- fix(update): Homebrew install correctly detected when running as compiled binary
  fix(releases): gpc releases notes set immediately shows redirect regardless of args
  feat(releases): live upload progress bar during AAB upload
  feat(releases): gpc releases notes get reads notes per track and language
  feat(releases): --vitals-gate on rollout increase halts if crash rate exceeds threshold
  feat(cli): Did you mean? suggestions for mistyped commands
  feat(cli): gpc version --json outputs structured version and install info
  feat(cli): gpc cache manages status, token, and update-check cache
  feat(cli): gpc auth token prints current access token
  feat(cli): gpc feedback opens pre-filled GitHub issue with diagnostics
  feat(config): GPC_DEBUG and GPC_NO_COLOR environment variables
  feat(validate): release notes exceeding 500 chars trigger a warning
  fix(status): --format summary shows no vitals / no reviews when data absent
  fix(update): --check always shows detected install method
  fix(releases): upload rejects non-.aab/.apk files before any API call

## 0.9.26

### Patch Changes

- fix(releases): validate --rollout on promote and rollout increase; guard same-track promote
  fix(releases): notes set now exits with helpful error instead of silently succeeding
  fix(releases): upload and publish check file exists before resolving auth
  fix(releases): status shows rollout as "10%" not "0.1"
  fix(releases): status sorts production before internal by default
  fix(releases): rollout increase dry-run shows "25%" not "25" in details
  fix(releases): upload spinner shows filename and file size
  fix(status): --sections filter now applies to cached data (closes bug #9b)
  fix(status): --days validates positive integer before API calls
  fix(status): --watch warns when combined with --since-last (ignored in watch mode)
  fix(status): --since-last diff header uses relative time ("5h ago") not locale clock string
  fix(status): header timestamps use relative time ("5 min ago", "2h ago")
  fix(audit): list and search show human-readable timestamps in table output
  feat(docs): gpc docs [topic] routes to specific page; --list shows available topics

## 0.9.25

### Patch Changes

- fix(status): --sections filter now hides excluded sections from table and JSON output

  Previously, --sections vitals validated and skipped the API calls for excluded sections but still rendered all three sections (RELEASES, VITALS, REVIEWS) in the output. The AppStatus object now carries the active sections list, and both formatStatusTable and the JSON renderer respect it.

  JSON output for --sections vitals omits the releases and reviews keys entirely.

## 0.9.24

### Patch Changes

- feat: `gpc status` v0.9.26 improvements — 8 quality-of-life enhancements
  - fix: unknown vitals/reviews show `—` instead of `?`/`n/a`; render "No vitals data available" / "No reviews in this period" when all values are absent
  - feat: trend arrows ↑↓ on vitals — two-period comparison shows whether crash/ANR rates are improving or worsening vs the prior window
  - feat: `--watch [N]` — proper polling loop with ANSI terminal clear, SIGINT/SIGTERM cleanup, 1s sleep ticks, min 10s interval, default 30s
  - feat: `--format summary` — one-liner output (`tv.visioo.app · v142 internal · crashes 1.20% ↓ ✓ · avg 4.1★`) for shell prompts and post-deploy hooks
  - feat: `--sections <list>` — skip API calls for excluded sections (e.g. `--sections vitals` skips releases and reviews fetches)
  - feat: `--since-last` — diff mode: compares current fetch against last cached status, shows version/crash/ANR/rating deltas
  - feat: `--all-apps` — run status for all configured app profiles sequentially (max 5 apps)
  - feat: `--notify` — desktop notification on threshold breach/clear (macOS, Linux, Windows); skipped in CI; only fires on state change

## 0.9.23

### Patch Changes

- fix: JUnit `buildTestCase` skips `""` and `"-"` sentinel values, falls through to `track`, `versionCode`, etc.
- fix: `vitals compare` date-window calculation — `(v) => parseInt(v, 10)` prevents radix corruption from Commander option defaults
- Updated dependencies
  - @gpc-cli/api@1.0.17

## 0.9.22

### Patch Changes

- feat: `gpc status` core logic — parallel API calls for releases, vitals, and reviews; 1-hour cache; threshold-based exit code 6
- fix: `compareVitalsTrend` timezone off-by-one with UTC timestamps
- fix: JUnit testcase name fallback expanded to include `reviewId`, `track`, `versionCode`

## 0.9.21

### Patch Changes

- Add bundle analysis commands, fix vitals compare date overlap, add --dry-run to 4 write commands, fix exit code consistency

## 0.9.20

### Patch Changes

- feat: table flattening audit, audit log querying, persistent vitals thresholds, batch IAP CLI, vitals end-date fix

## 0.9.19

### Patch Changes

- fix: vitals query errors, reports GCS limitation, table formatting, JUnit names

## 0.9.18

### Patch Changes

- fix: vitals API endpoints, upload timeout auto-scaling, empty output messages, table formatting, HTML error sanitization
- Updated dependencies
  - @gpc-cli/api@1.0.16

## 0.9.17

### Patch Changes

- fix: OTP update regionsVersion + updateMask, table cell truncation, flatten list output, readJsonFile helper, releases diff, subscriptions diff, otp diff
- Updated dependencies
  - @gpc-cli/api@1.0.15

## 0.9.16

### Patch Changes

- Fix regionsVersion query param on subscription update, fix table [object Object] display
- Updated dependencies
  - @gpc-cli/api@1.0.14

## 0.9.15

### Patch Changes

- 577b462: Fix subscriptions create/update validation, add regionsVersion query param, and improve empty output messages
- Updated dependencies [577b462]
  - @gpc-cli/api@1.0.13

## 0.9.13

### Patch Changes

- fix: resolve 5 bugs found during live testing
  - Fix --output flag ignored (table/yaml/markdown/junit formats now work)
  - Fix recovery list using POST instead of GET, add --version-code filter
  - Fix iap list/get using deprecated inappproducts API (now uses oneTimeProducts)
  - Fix vitals errors/anomalies missing OAuth scope (playdeveloperreporting)
  - Fix data-safety get/update incorrectly using edits workflow
  - Add missing query params for subscriptions and inappproducts create/update

- Updated dependencies
  - @gpc-cli/api@1.0.12
  - @gpc-cli/auth@0.9.9

## 0.9.12

### Patch Changes

- fix: correct API endpoint paths for subscriptions and convertRegionPrices
  - Remove incorrect `/monetization/` segment from all subscription API paths (list, get, create, update, delete, basePlans, offers)
  - Fix convertRegionPrices path from `/monetization/convertRegionPrices` to `/pricing:convertRegionPrices`
  - Add troubleshooting docs for enabling the Play Developer Reporting API for vitals commands

- Updated dependencies
  - @gpc-cli/api@1.0.11

## 0.9.11

### Patch Changes

- fda9c08: Pre-1.0 hardening: input validation, security review, expanded test coverage, performance benchmarks, license compliance, docs polish
- Updated dependencies [fda9c08]
  - @gpc-cli/api@1.0.10
  - @gpc-cli/auth@0.9.8
  - @gpc-cli/config@0.9.8
  - @gpc-cli/plugin-sdk@0.9.6

## 0.9.10

### Patch Changes

- Updated dependencies
  - @gpc-cli/api@1.0.9

## 0.9.9

### Patch Changes

- a87f244: v0.9.9 — Final pre-launch release with full API coverage, CLI polish, and migration tooling.

  New: track CRUD, externally hosted APKs, purchase options, IAP batch sync,
  JUnit XML output, progress spinners, bulk image export, Fastlane migration wizard,
  full shell completion, --ci mode, --json shorthand, typo suggestions.
  932 tests passing.

- Updated dependencies [a87f244]
  - @gpc-cli/api@1.0.8
  - @gpc-cli/config@0.9.7

## 0.9.8

### Patch Changes

- be026d0: Complete API coverage: device tiers, internal app sharing, generated APKs, one-time products, app recovery create + targeting. Pagination on all list commands, dry-run on apps update, requireConfirm bug fix.
- Updated dependencies [be026d0]
  - @gpc-cli/api@1.0.7

## 0.9.7

### Patch Changes

- c27752c: New API coverage (recovery, data safety, external transactions), DX improvements (--sort, --notify, git-based release notes, fish/PowerShell completions), typed error audit, and SDK READMEs.
- Updated dependencies [c27752c]
  - @gpc-cli/api@1.0.6
  - @gpc-cli/auth@0.9.7
  - @gpc-cli/config@0.9.6

## 0.9.6

### Patch Changes

- Enhanced dry-run for releases, auto-update checker, and 88 new edge case tests
- Updated dependencies
  - @gpc-cli/api@1.0.5
  - @gpc-cli/auth@0.9.6

## 0.9.5

### Patch Changes

- Security hardening, input validation, and bug fixes across all packages
- Updated dependencies
  - @gpc-cli/config@0.9.5
  - @gpc-cli/auth@0.9.5
  - @gpc-cli/api@1.0.4
  - @gpc-cli/plugin-sdk@0.9.5

## 0.9.4

### Minor Changes

- Align package version with umbrella release v0.9.4

## 0.1.3

### Patch Changes

- Updated dependencies [b46f1d1]
- Updated dependencies [74636b6]
- Updated dependencies [71d71ef]
  - @gpc-cli/config@0.1.3
  - @gpc-cli/api@1.0.3
  - @gpc-cli/auth@0.1.3

## 0.1.2

### Patch Changes

- 0a55387: Add README files for all npm packages
- Updated dependencies [0a55387]
  - @gpc-cli/api@1.0.2
  - @gpc-cli/auth@0.1.2
  - @gpc-cli/config@0.1.2
  - @gpc-cli/plugin-sdk@0.1.2

## 0.1.1

### Patch Changes

- 5504b8e: Add publishConfig with public access for npm publishing
- Updated dependencies [5504b8e]
  - @gpc-cli/api@1.0.1
  - @gpc-cli/auth@0.1.1
  - @gpc-cli/config@0.1.1
  - @gpc-cli/plugin-sdk@0.1.1

## 0.1.0

### Minor Changes

- 8e5c6be: Phase 9 — Production hardening
  - Lazy command loading via dynamic import (faster cold start)
  - Global `--dry-run` flag on all 30+ write operations
  - Unified error hierarchy: ApiError and AuthError now have exitCode and toJSON()
  - Proxy support via `HTTPS_PROXY` / `HTTP_PROXY` with undici ProxyAgent
  - Custom CA certificate support via `GPC_CA_CERT`
  - 368 total tests across 7 packages

### Patch Changes

- Updated dependencies [8e5c6be]
  - @gpc-cli/api@1.0.0
  - @gpc-cli/auth@0.1.0
  - @gpc-cli/config@0.1.0
  - @gpc-cli/plugin-sdk@0.1.0
