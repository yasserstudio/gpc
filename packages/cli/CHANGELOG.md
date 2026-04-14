# @gpc-cli/cli

## 0.9.59

### Patch Changes

- Hotfix: `gpc vitals lmk` was 404'ing in v0.9.58 because the metric set name shipped with the wrong identifier (`lowMemoryKillerRateMetricSet`). Google's Play Developer Reporting API actually exposes the resource as `lmkRateMetricSet`, with metrics `userPerceivedLmkRate`, `userPerceivedLmkRate7dUserWeighted`, `userPerceivedLmkRate28dUserWeighted`, `distinctUsers`. The corrected name is now in the type union and the query path. Verified live against `com.sfnemploiappli`.
- Updated dependencies
  - @gpc-cli/core@0.9.49
  - @gpc-cli/api@1.0.34

## 0.9.58

### Patch Changes

- QoL & Discoverability release.

  **Breaking**: `gpc vitals lmk` now returns correct LMK rate metrics (`lmkRate`, `userPerceivedLmkRate`, weighted variants). Before v0.9.58 it returned stuck-background-wakelock data due to a misconfiguration. Expect different values; the old output was mislabeled.

  **New**: shell completion now introspects the live Commander tree — new commands and plugin-registered commands complete automatically. Constrained flag values (options with `.choices()`) now surface via TAB in bash/zsh/fish/powershell.

  **Fixed**: `gpc vitals compare <metric>` and `gpc vitals watch --metric <name>` now accept `wakeup`, `lmk`, `error-count`. `THRESHOLD_CONFIG_KEYS.lmk` corrected from `stuckWakelockRate` to `lmkRate`.

- Updated dependencies
  - @gpc-cli/core@0.9.48
  - @gpc-cli/api@1.0.33

## 0.9.57

### Patch Changes

- API fixes, new endpoints, type completeness
- Updated dependencies
  - @gpc-cli/core@0.9.47
  - @gpc-cli/api@1.0.32

## 0.9.56

### Patch Changes

- 41b9d15: feat(enterprise): publish private apps to Managed Google Play via the Play Custom App Publishing API

  GPC is now the first Android publishing CLI with Managed Google Play support. The previous `gpc enterprise` commands were fiction — they called nonexistent URLs, wrapped a nonexistent list method, and missed the multipart binary upload entirely. This release rewrites the enterprise surface end-to-end.

  **New:**
  - `gpc enterprise publish <bundle> --account <id> --title "<title>"` — one-shot private app publishing in a single CLI call
  - `gpc enterprise create --account <id> --bundle <path> --title "<title>"` — explicit-arg version of publish
  - Repeatable `--org-id` / `--org-name` flags for target enterprise organizations
  - Permanent-private confirmation prompt before create/publish (skip with `--yes`)
  - `gpc doctor` now probes the Play Custom App Publishing API and flags missing permissions or unconfigured APIs
  - New docs guide at `apps/docs/guide/enterprise-publishing.md` — full walkthrough from account setup to CI/CD
  - `HttpClient.uploadCustomApp<T>` — new multipart resumable upload method for the Custom App API (reusable infrastructure)
  - `ResumableUploadOptions.initialMetadata` — new option on the resumable upload helper for APIs that accept metadata in the session-initiation POST

  **Fixed:**
  - `gpc enterprise` entirely rewritten to call the correct Google API URL (`/accounts/{id}/customApps` via the upload endpoint, was `/organizations/{id}/apps` against a non-upload URL)
  - `gpc enterprise create` now actually uploads the bundle binary (the previous implementation just posted JSON metadata with no file, which would have failed against the real API)
  - `gpc enterprise` docs corrected: `--account` is the developer account ID from your Play Console URL, not a Google Workspace or Cloud Identity organization ID

  **Removed:**
  - `gpc enterprise list` — Google's Play Custom App Publishing API has no list method. Use `gpc apps list` instead; private apps appear in your regular developer account.
  - `listEnterpriseApps` export from `@gpc-cli/core`
  - `CustomAppsListResponse` export from `@gpc-cli/api`

  **Deprecated:**
  - `gpc enterprise --org` — renamed to `--account`. `--org` still works in v0.9.56 with a deprecation warning, will be removed in a future version.

- Updated dependencies [41b9d15]
  - @gpc-cli/api@1.0.31
  - @gpc-cli/core@0.9.46

## 0.9.55

### Patch Changes

- 0a728e4: API freshness audit (synced with Jan 2026 Google Play API release notes) and a multi-profile CLI fix.
  - fix(api): correct `offerPhase` shape — union object on `SubscriptionPurchaseLineItem`, not a string, and not on the V2 root
  - feat(api): type `revokeSubscriptionV2` request body with `revocationContext` union (`fullRefund`, `proratedRefund`, `itemBasedRefund`)
  - feat(api): type `acknowledgeSubscription` body with optional `externalAccountId`
  - docs(api): clarify `subscriptionsv2.defer` add-ons behavior
  - fix(cli): `--profile` / `-p` global flag now actually switches profiles. Previously silently ignored — all commands used the default profile

- Updated dependencies [0a728e4]
  - @gpc-cli/api@1.0.30
  - @gpc-cli/core@0.9.45
  - @gpc-cli/auth@0.9.12
  - @gpc-cli/config@0.9.12
  - @gpc-cli/plugin-sdk@0.9.8

## 0.9.54

### Patch Changes

- 015ae92: API audit fixes, 16KB preflight scanner, OTP batch operations, system APKs resource.

  **Bug fixes:**
  - OTP offer URLs now use correct `/purchaseOptions/{id}/offers/` path
  - `onetimeproducts.create` uses PATCH + `allowMissing` (official API has no POST create)
  - Removed phantom endpoints (`refundSubscriptionV2`, `users.get`, standalone `purchaseOptions`)
  - `getUser` now paginates all pages instead of only checking first page
  - Manifest parser extracts compiled primitive values for robustness
  - AAB reader .so header extraction destroys stream early instead of decompressing full files

  **New preflight rules:**
  - 16KB page size alignment scanner (ELF LOAD segment check, `pageSizeCompat` severity adjustment)
  - Exported-without-permission scanner for components with `exported=true` but no `android:permission`

  **New API methods:**
  - OTP offer batch operations: `cancelOffer`, `batchGetOffers`, `batchUpdateOffers`, `batchUpdateOfferStates`, `batchDeleteOffers`
  - OTP purchase option batch operations: `batchDeletePurchaseOptions`, `batchUpdatePurchaseOptionStates`
  - Subscription offers `batch-get` and `batch-update-states` CLI commands
  - `edits.testers.patch` and `inappproducts.patch` for partial updates
  - `systemApks` resource: `create`, `list`, `get`, `download`

- Updated dependencies [015ae92]
  - @gpc-cli/api@1.0.29
  - @gpc-cli/core@0.9.44

## 0.9.52

### Patch Changes

- fix: skip edits.validate for rejected apps, publish dry-run params, importTestersFromCsv commitOptions, expansion upload validation
- Updated dependencies
  - @gpc-cli/api@1.0.28
  - @gpc-cli/core@0.9.43

## 0.9.51

### Patch Changes

- API completeness: missing Google Play API parameters, new CLI flags, expansion files resource
- Updated dependencies
  - @gpc-cli/api@1.0.27
  - @gpc-cli/core@0.9.42

## 0.9.50

### Patch Changes

- Security hardening, supply chain protection, gpc docs expanded to 58 topics
- Updated dependencies
  - @gpc-cli/core@0.9.41

## 0.9.49

### Patch Changes

- Developer verification awareness — gpc verify command, doctor deadline check, status note, preflight reminder

## 0.9.48

### Patch Changes

- Onboarding polish, safety confirmations, pager for long lists

## 0.9.47

### Patch Changes

- API completeness, RTDN, rate limiter rewrite, bug fixes
- Updated dependencies
  - @gpc-cli/api@1.0.26
  - @gpc-cli/core@0.9.40

## 0.9.46

### Patch Changes

- Deep code review, error handling overhaul, doctor enhancements, 7 new API endpoints
- Updated dependencies
  - @gpc-cli/api@1.0.25
  - @gpc-cli/core@0.9.39
  - @gpc-cli/config@0.9.11
  - @gpc-cli/auth@0.9.11

## 0.9.45

### Patch Changes

- Code review fixes, API catch-up (5 new endpoints → 192 total), deprecation roadmap doc.
- Updated dependencies
  - @gpc-cli/api@1.0.24
  - @gpc-cli/config@0.9.10
  - @gpc-cli/core@0.9.38

## 0.9.44

### Patch Changes

- feat: gpc changelog command + fix: preflight graceful fallback on large AABs
- Updated dependencies
  - @gpc-cli/core@0.9.37

## 0.9.43

### Patch Changes

- Updated dependencies
  - @gpc-cli/api@1.0.23
  - @gpc-cli/core@0.9.36

## 0.9.42

### Patch Changes

- Updated dependencies
  - @gpc-cli/api@1.0.22
  - @gpc-cli/core@0.9.35

## 0.9.41

### Patch Changes

- Bug fixes and code quality improvements.
  - fix: `gpc vitals lmk` and `gpc vitals memory` — 400 INVALID_ARGUMENT (wrong metric field names)
  - fix: `gpc releases notes get` — fallback for completed releases that don't return notes
  - fix: `gpc subscriptions list` — show "No subscriptions found." when empty
  - fix: `console.warn` in core replaced with `process.emitWarning`
  - refactor: extracted `resolvePackageName` and `getClient` to shared utility (-183 lines)

- Updated dependencies
  - @gpc-cli/core@0.9.34

## 0.9.40

### Patch Changes

- Bug fixes from v0.9.39 live testing.
  - fix: `gpc init --ci-template` renamed from `--ci` to avoid collision with global `--ci` flag
  - fix: `gpc feedback --print` showed `[object Object]` for audit log args
  - fix: `gpc releases promote --notes` + `--copy-notes-from` accepted silently instead of exiting 2

## 0.9.39

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

- Updated dependencies
  - @gpc-cli/core@0.9.33

## 0.9.38

### Patch Changes

- Resumable uploads, Google best practices compliance, bug fixes
- Updated dependencies
  - @gpc-cli/core@0.9.32
  - @gpc-cli/api@1.0.21

## 0.9.37

### Patch Changes

- fix: security and code quality improvements
  - fix(cli): replace execSync shell interpolation with spawnSync array args in `gpc plugins install/uninstall` — eliminates command injection risk when plugin names contain shell metacharacters
  - fix(api): rename internal `ApiError` class to `PlayApiError` to eliminate naming collision with `@gpc-cli/core`'s `ApiError` — no behavioral change, single import site updated
  - fix(core): replace `process.exit(2)` with a thrown error in `runWatchLoop()` validation — core packages should not call `process.exit` directly
  - fix(cli): change `workspace:^` to `workspace:*` for `@gpc-cli/auth` dependency — consistent with all other workspace packages

- Updated dependencies
  - @gpc-cli/core@0.9.31
  - @gpc-cli/api@1.0.20

## 0.9.36

### Patch Changes

- eb379cf: fix: v0.9.36 — bug fixes, security hardening, and regression tests
  - fix(core): `gpc vitals lmk` — correct metric names to `stuckBackgroundWakelockRate7dUserWeighted` and `stuckBackgroundWakelockRate28dUserWeighted`; base metric rejected by API with 400 INVALID_ARGUMENT (Bug H)
  - fix(cli): `gpc quickstart` — remove `--quiet` from doctor subprocess args; Commander treated it as unknown subcommand option causing exit 1 even when all checks passed (Bug M)
  - fix(cli): `gpc quota usage` — use same human-friendly table format as `quota status`; `topCommands` no longer shows `[object Object]` (Bug O)
  - fix(core): `sendNotification` — replace `execSync` shell string with `execFile` array args on all platforms; eliminates shell injection via notification title/body (Bug N)
  - refactor(cli): extract shared `printQuotaTable()` helper in quota.ts — eliminates duplicate implementation between `quota status` and `quota usage`
  - test: add regression tests for bugs H (vitals lmk metrics), M (quickstart spawn args), N (sendNotification execFile), O (quota usage format) — 13 new tests

- Updated dependencies [eb379cf]
  - @gpc-cli/core@0.9.30

## 0.9.35

### Patch Changes

- v0.9.35 — The Big One: Full Pre-1.0 Feature Release

  Bug fixes: version reporting (Bug J), stale edit session auto-retry (Bug I), vitals lmk metrics (Bug H), Windows installer (Bug K), docs flags (Bug L), validate color output.

  Terminal UX: dynamic table width, numeric right-alignment, bold headers, spinner on status.

  Onboarding: gpc auth login interactive wizard, gpc quickstart guided setup, gpc auth setup-gcp, destructive command confirmations, pager for long lists.

  Listing text: gpc listings lint/analyze (local lint + remote analysis), push preflight gate, enhanced diff with word-level inline changes.

  New commands: gpc grants, gpc reviews analyze (local NLP sentiment), gpc vitals compare-versions, gpc vitals watch --auto-halt-rollout, gpc train (staged rollout pipeline), gpc quota, gpc subscriptions analytics, gpc games (Play Games Services), gpc enterprise (Managed Google Play).

  API additions: orders.get/batchGet, grants CRUD, refundSubscriptionV2, batchMigratePrices, GamesApiClient, EnterpriseApiClient.

- Updated dependencies
  - @gpc-cli/core@0.9.29
  - @gpc-cli/api@1.0.19

## 0.9.34

### Patch Changes

- Color output, onboarding foundations, bug fixes, and four new commands.

  **Bug Fixes**
  - `gpc iap batch-get` — replaced 403 crash with a deprecation notice; Google permanently blocked this endpoint. Use `gpc iap get <sku>` or `gpc iap list` instead
  - `gpc migrate fastlane` — warns and aborts when `.gpcrc.json` already exists; pass `--yes` to overwrite

  **Color Output**
  - `✓` green, `✗` red, `⚠` yellow across doctor, vitals, status, and validate
  - Track status colors: `inProgress` green, `halted` red, `draft` dim
  - Diff coloring: additions green, removals red in listings diff and releases diff
  - `NO_COLOR` / `FORCE_COLOR` environment variable support; `--no-color` now also sets `NO_COLOR=1`

  **Onboarding**
  - First-run banner: any command prints `✦ First time? Run gpc config init to get set up.` when no config is found
  - Auth errors (403/401) now append `→ Run gpc doctor to diagnose your credentials.`
  - `gpc config init` automatically runs `gpc doctor` inline on completion
  - `gpc doctor` success now prints `✓ Ready. Try: gpc status`

  **New Commands**
  - `gpc reviews reply <review-id> --text "..."` — reply to a user review from the terminal; shows character count on success
  - `gpc anomalies list` — surface automatic quality spikes from the Play Developer Reporting API
  - `gpc vitals wakeup` — query excessive wake-up rate (battery drain signal)
  - `gpc vitals lmk` — query Low Memory Killer events (memory pressure signal)

## 0.9.33

### Patch Changes

- Bug fixes and branding update: fix gpc version --json, fix GPC_DEBUG argv mutation, warn on --vitals-gate with --dry-run, update product name to GPC — Google Play Console CLI
- Updated dependencies
  - @gpc-cli/core@0.9.28
  - @gpc-cli/api@1.0.18
  - @gpc-cli/auth@0.9.10
  - @gpc-cli/config@0.9.9
  - @gpc-cli/plugin-sdk@0.9.7

## 0.9.32

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
- Updated dependencies
  - @gpc-cli/core@0.9.27

## 0.9.31

### Patch Changes

- feat(update): live download progress for binary installs — shows MB downloaded and percentage
  fix(update): silence npm/brew stdout in JSON mode so --output json stays parseable
  fix(update): skip passive update check when running gpc update (avoids redundant network request)

## 0.9.30

### Patch Changes

- feat(update): gpc update self-updates via npm, Homebrew, or in-place binary replace
  feat(update): --check flag checks for updates without installing (exits 0 always)
  feat(update): detects install method automatically (npm / Homebrew / binary)
  feat(update): verifies SHA-256 checksum for binary downloads
  fix(update-check): notification now shows "Run: gpc update" for all install methods

## 0.9.29

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
- Updated dependencies
  - @gpc-cli/core@0.9.26

## 0.9.28

### Patch Changes

- fix(audit): gpc audit clear --dry-run now correctly previews without deleting

  The global --dry-run option on the root program was consumed before the audit clear subcommand action ran, making options.dryRun undefined in the action. Entries were deleted even when --dry-run was passed. Now uses isDryRun(cmd) to read from the root program opts, consistent with how other commands handle global flags.

## 0.9.27

### Patch Changes

- fix(status): --sections filter now hides excluded sections from table and JSON output

  Previously, --sections vitals validated and skipped the API calls for excluded sections but still rendered all three sections (RELEASES, VITALS, REVIEWS) in the output. The AppStatus object now carries the active sections list, and both formatStatusTable and the JSON renderer respect it.

  JSON output for --sections vitals omits the releases and reviews keys entirely.

- Updated dependencies
  - @gpc-cli/core@0.9.25

## 0.9.26

### Patch Changes

- feat: `gpc status` v0.9.26 improvements — 8 quality-of-life enhancements
  - fix: unknown vitals/reviews show `—` instead of `?`/`n/a`; render "No vitals data available" / "No reviews in this period" when all values are absent
  - feat: trend arrows ↑↓ on vitals — two-period comparison shows whether crash/ANR rates are improving or worsening vs the prior window
  - feat: `--watch [N]` — proper polling loop with ANSI terminal clear, SIGINT/SIGTERM cleanup, 1s sleep ticks, min 10s interval, default 30s
  - feat: `--format summary` — one-liner output (`com.example.app · v142 internal · crashes 1.20% ↓ ✓ · avg 4.1★`) for shell prompts and post-deploy hooks
  - feat: `--sections <list>` — skip API calls for excluded sections (e.g. `--sections vitals` skips releases and reviews fetches)
  - feat: `--since-last` — diff mode: compares current fetch against last cached status, shows version/crash/ANR/rating deltas
  - feat: `--all-apps` — run status for all configured app profiles sequentially (max 5 apps)
  - feat: `--notify` — desktop notification on threshold breach/clear (macOS, Linux, Windows); skipped in CI; only fires on state change

- Updated dependencies
  - @gpc-cli/core@0.9.24

## 0.9.25

### Patch Changes

- fix: `gpc publish` / `gpc releases upload` always failed — Google Play API returns `Bundle` directly, not `{ bundle: Bundle }`; client was reading `data.bundle` (always `undefined`)
- fix: `gpc doctor --json` always output human-readable text — global `-j, --json` consumed at root program level before subcommand action ran; now reads `cmd.parent?.opts()`
- fix: `gpc status --days N` / `gpc vitals compare --days N` wrong date window — Commander passes option default as radix to `parseInt`; fixed with `(v) => parseInt(v, 10)`
- fix: `gpc validate` table output showed raw JSON for checks — flatten `checks[]` to rows with check/passed/message columns
- fix: `--output junit` testcase name used `-` sentinel — loop now skips `""` and `"-"`, falls through to `track`, `versionCode`, etc.
- Updated dependencies
  - @gpc-cli/core@0.9.23
  - @gpc-cli/api@1.0.17

## 0.9.24

### Patch Changes

- feat: `gpc status` — unified health snapshot (releases + vitals + reviews), 1-hour cache, `--cached` / `--refresh` / `--days`, exit code 6 on threshold breach
- feat: `gpc config init` wizard — auth method selection, SA file validation, post-init summary
- feat: `gpc migrate fastlane --dry-run` — preview without writing files; conflict detection before overwriting `.gpcrc.json`
- fix: migrate rollout mapping — `supply(rollout: "0.1")` → `gpc releases upload --rollout 10`
- fix: `gpc publish` rollout guard — rejects values outside 1–100 with exit code 2
- fix: `gpc doctor` package name format validation
- Updated dependencies
  - @gpc-cli/core@0.9.22

## 0.9.23

### Patch Changes

- feat: `gpc bundle analyze` and `gpc bundle compare` — AAB/APK size breakdown with `--threshold` CI gate
- fix: `gpc vitals compare` date overlap — non-overlapping ranges prevent 400 API errors
- feat: `--dry-run` on `tracks create`, `tracks update`, `device-tiers create`, `internal-sharing upload`
- fix: exit code consistency — data-safety and reports unsupported ops now exit 2
- Updated dependencies
  - @gpc-cli/core@0.9.21

## 0.9.22

### Patch Changes

- feat: table flattening audit, audit log querying, persistent vitals thresholds, batch IAP CLI, vitals end-date fix
- Updated dependencies
  - @gpc-cli/core@0.9.20

## 0.9.21

### Patch Changes

- fix: vitals query errors, reports GCS limitation, table formatting, JUnit names
- Updated dependencies
  - @gpc-cli/core@0.9.19

## 0.9.20

### Patch Changes

- fix: vitals API endpoints, upload timeout auto-scaling, empty output messages, table formatting, HTML error sanitization
- Updated dependencies
  - @gpc-cli/api@1.0.16
  - @gpc-cli/core@0.9.18

## 0.9.19

### Patch Changes

- fix: OTP update regionsVersion + updateMask, table cell truncation, flatten list output, readJsonFile helper, releases diff, subscriptions diff, otp diff
- Updated dependencies
  - @gpc-cli/api@1.0.15
  - @gpc-cli/core@0.9.17

## 0.9.18

### Patch Changes

- Fix regionsVersion query param on subscription update, fix table [object Object] display
- Updated dependencies
  - @gpc-cli/api@1.0.14
  - @gpc-cli/core@0.9.16

## 0.9.17

### Patch Changes

- 577b462: Fix subscriptions create/update validation, add regionsVersion query param, and improve empty output messages
- Updated dependencies [577b462]
  - @gpc-cli/api@1.0.13
  - @gpc-cli/core@0.9.15

## 0.9.15

### Patch Changes

- fix: resolve 5 bugs found during live testing
  - Fix --output flag ignored (table/yaml/markdown/junit formats now work)
  - Fix recovery list using POST instead of GET, add --version-code filter
  - Fix iap list/get using deprecated inappproducts API (now uses oneTimeProducts)
  - Fix vitals errors/anomalies missing OAuth scope (playdeveloperreporting)
  - Fix data-safety get/update incorrectly using edits workflow
  - Add missing query params for subscriptions and inappproducts create/update

- Updated dependencies
  - @gpc-cli/core@0.9.13
  - @gpc-cli/api@1.0.12
  - @gpc-cli/auth@0.9.9

## 0.9.14

### Patch Changes

- fix: correct API endpoint paths for subscriptions and convertRegionPrices
  - Remove incorrect `/monetization/` segment from all subscription API paths (list, get, create, update, delete, basePlans, offers)
  - Fix convertRegionPrices path from `/monetization/convertRegionPrices` to `/pricing:convertRegionPrices`
  - Add troubleshooting docs for enabling the Play Developer Reporting API for vitals commands

- Updated dependencies
  - @gpc-cli/api@1.0.11
  - @gpc-cli/core@0.9.12

## 0.9.13

### Patch Changes

- 9f65b88: Add gpc install-skills command — interactive wizard for installing agent skills

## 0.9.12

### Patch Changes

- fda9c08: Pre-1.0 hardening: input validation, security review, expanded test coverage, performance benchmarks, license compliance, docs polish
- Updated dependencies [fda9c08]
  - @gpc-cli/core@0.9.11
  - @gpc-cli/api@1.0.10
  - @gpc-cli/auth@0.9.8
  - @gpc-cli/config@0.9.8
  - @gpc-cli/plugin-sdk@0.9.6

## 0.9.11

### Patch Changes

- 191c439: Hide internal pagination options from help output, add service account file, key permissions, and profile validation checks to `gpc doctor`

## 0.9.10

### Patch Changes

- fix: add missing error suggestions and enhance gpc doctor
  - Added suggestions to 3 API error fallbacks (null-byte path, network retry, upload retry)
  - Clarified help text for internal-sharing, generated-apks, external-transactions
  - Enhanced gpc doctor from 4 to 8 checks: config/cache dir permissions, proxy validation, CA cert, DNS resolution
  - Added --json output mode and severity levels (pass/fail/warn/info) to gpc doctor

- Updated dependencies
  - @gpc-cli/api@1.0.9
  - @gpc-cli/core@0.9.10

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
  - @gpc-cli/core@0.9.9

## 0.9.8

### Patch Changes

- be026d0: Complete API coverage: device tiers, internal app sharing, generated APKs, one-time products, app recovery create + targeting. Pagination on all list commands, dry-run on apps update, requireConfirm bug fix.
- Updated dependencies [be026d0]
  - @gpc-cli/core@0.9.8
  - @gpc-cli/api@1.0.7

## 0.9.7

### Patch Changes

- c27752c: New API coverage (recovery, data safety, external transactions), DX improvements (--sort, --notify, git-based release notes, fish/PowerShell completions), typed error audit, and SDK READMEs.
- Updated dependencies [c27752c]
  - @gpc-cli/core@0.9.7
  - @gpc-cli/api@1.0.6
  - @gpc-cli/auth@0.9.7
  - @gpc-cli/config@0.9.6

## 0.9.6

### Patch Changes

- Enhanced dry-run for releases, auto-update checker, and 88 new edge case tests
- Updated dependencies
  - @gpc-cli/core@0.9.6
  - @gpc-cli/api@1.0.5
  - @gpc-cli/auth@0.9.6

## 0.9.5

### Patch Changes

- Security hardening, input validation, and bug fixes across all packages
- Updated dependencies
  - @gpc-cli/config@0.9.5
  - @gpc-cli/core@0.9.5
  - @gpc-cli/auth@0.9.5
  - @gpc-cli/api@1.0.4
  - @gpc-cli/plugin-sdk@0.9.5

## 0.9.4

### Minor Changes

- Align package version with umbrella release v0.9.4
- All packages (except @gpc-cli/api) now share the 0.9.x version series

## 0.1.4

### Patch Changes

- Updated dependencies [b46f1d1]
- Updated dependencies [74636b6]
- Updated dependencies [71d71ef]
  - @gpc-cli/config@0.1.3
  - @gpc-cli/api@1.0.3
  - @gpc-cli/auth@0.1.3
  - @gpc-cli/core@0.1.3

## 0.1.3

### Patch Changes

- 0a55387: Add README files for all npm packages
- Updated dependencies [0a55387]
  - @gpc-cli/core@0.1.2
  - @gpc-cli/api@1.0.2
  - @gpc-cli/auth@0.1.2
  - @gpc-cli/config@0.1.2
  - @gpc-cli/plugin-sdk@0.1.2

## 0.1.2

### Patch Changes

- 5504b8e: Add publishConfig with public access for npm publishing
- Updated dependencies [5504b8e]
  - @gpc-cli/core@0.1.1
  - @gpc-cli/api@1.0.1
  - @gpc-cli/auth@0.1.1
  - @gpc-cli/config@0.1.1
  - @gpc-cli/plugin-sdk@0.1.1

## 0.1.1

### Patch Changes

- aaf72e7: First npm publish under @gpc-cli scope

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
  - @gpc-cli/core@0.1.0
  - @gpc-cli/config@0.1.0
  - @gpc-cli/plugin-sdk@0.1.0
