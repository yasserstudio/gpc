# Changelog

All notable changes to GPC are documented here.

Format: [Conventional Commits](https://www.conventionalcommits.org/) with user-facing language.
Versioning: `0.9.x` pre-release series → `1.0.0` public launch.

---

## v0.9.53

Preflight scanner reliability on Flutter and large AABs, plus batch price migration API.

- fix(core): preflight manifest parser no longer overflows on large AABs (aligned protobuf schema with official AAPT2 Resources.proto, omitted SourcePosition to avoid wire type mismatch)
- fix(core): preflight attribute lookup is now name-based instead of resource ID-based (resource IDs vary across AAPT2/AGP versions, eliminating false positives for `exported`, `versionCode`, `usesCleartextTraffic`, `debuggable`, `foregroundServiceType`)
- feat(api): `subscriptions.batchMigratePrices` for batch base plan price migration (up to 100 per request)

**Actual new tests:** 6 -> total 1,869

---

## v0.9.52

Fix for rejected app workflow discovered during live testing.

- fix(core): skip `edits.validate` when `--changes-not-sent-for-review` is set (validate endpoint rejects the flag)
- fix(cli): `gpc publish --dry-run` now passes `--mapping-type`, `--device-tier-config`, and commit flags
- fix(core): `importTestersFromCsv` now accepts and passes `commitOptions` through
- fix(api): `expansionFiles.upload` validates API response

**Actual new tests:** 3 -> total 1,863

---

## v0.9.51

API completeness: missing Google Play API parameters and new resources.

- feat(api): `changesNotSentForReview` + `changesInReviewBehavior` on `edits.commit` (fixes rejected app uploads)
- feat(api): `deobfuscationFileType` param on deobfuscation upload (proguard or nativeCode)
- feat(api): `deviceTierConfigId` on bundle upload
- feat(api): `allowMissing` + `latencyTolerance` on subscription/OTP/offer patch endpoints
- feat(api): `pageSize` / `pageToken` on `oneTimeProducts.list`
- feat(api): `startIndex` on `reviews.list`
- feat(api): `edits.expansionfiles` resource (get, update, patch, upload) for legacy OBB files
- feat(api): configurable `regionsVersion` on all monetization create endpoints
- feat(api): `regionsVersion` + `latencyTolerance` on `basePlans.migratePrices` body
- feat(api): `countryTargeting` on `Release` type
- feat(cli): `--changes-not-sent-for-review` and `--error-if-in-review` flags on all edit-committing commands
- feat(cli): `--mapping-type` and `--device-tier-config` flags on upload/publish
- fix(api): `ProductUpdateLatencyTolerance` union type replaces bare string
- fix(api): `MutationOptions` type + `applyMutationOptions` helper (deduplicated)
- fix(api): `DEFAULT_REGIONS_VERSION` constant (was hardcoded 8x)
- fix(cli): `buildCommitOptions` extracted to shared module (was duplicated 6x)

**Actual new tests:** 15 -> total 1,860

---

## v0.9.50

Security hardening, supply chain protection.

- ci: Socket.dev supply chain scanning blocks PRs with critical alerts
- ci: all GitHub Actions pinned to commit SHAs across 6 workflows
- ci: production dependency audit runs on every pull request
- ci: SBOM (CycloneDX) generated and archived on every npm release
- ci: Socket Security added as required status check
- feat: `socket.yml` config for malware, typosquat, and install script detection
- feat: `pnpm audit` and `pnpm security:check` scripts for local security review
- feat: `min-release-age=7` blocks packages published less than 7 days ago
- fix(cli): `gpc docs` now covers all 70 documentation topics (was 12)
- docs: 12-layer supply chain protection table in security docs
- docs: CODEOWNERS expanded for security-sensitive paths

---

## v0.9.49

Developer verification awareness, copy alignment.

- feat(cli): `gpc verify` — Android developer verification status, enforcement deadlines, resources
- feat(doctor): verification enforcement deadline warning (BR, ID, SG, TH)
- feat(status): verification reminder footer in table output
- feat(preflight): post-scan reminder about app registration requirements
- docs: developer verification guide, consistent "free to use" copy
- chore: pnpm 9.15.9 → 10.33.0

---

## v0.9.48

Onboarding polish, safety confirmations, pager for long lists.

- fix(cli): `--status draft` now reflected in dry-run preview (Bug AE)
- feat(cli): confirmation prompts on subscription cancel, revoke, cancel-v2
- feat(doctor): `--fix` expanded — version suggests update, auth guides to login, config-keys auto-removes unknown keys
- feat(auth): `setup-gcp --key` validates SA JSON, auto-authenticates, saves to config
- feat(cli): pager for tracks list, releases status, subscriptions list, audit list

---

## v0.9.47

API completeness, bug fixes, RTDN, rate limiter rewrite.

### Bug Fixes
- fix(cli): `gpc changelog --version` renamed to `--tag` — Commander.js global `--version` flag conflict (Bug AC)
- fix(api): `gpc releases upload app.apk` now uses `edits.apks.upload` endpoint — was sending APKs to bundles endpoint (Bug AD)
- fix(preflight): `gpc preflight app.apk` now supports APK files — reads manifest from root instead of `base/manifest/` (Bug AD)
- fix(cli): `gpc vitals crashes/anr/wakeup/lmk` and `gpc anomalies list` gracefully degrade on 403 when Reporting API disabled (Bug Q)
- fix(status): `--watch` interval validation now exits code 2 (usage error), consistent with `--days`

### New Commands
- feat(cli): `gpc rtdn status` — check Real-Time Developer Notification topic configuration
- feat(cli): `gpc rtdn decode <payload>` — decode base64 Pub/Sub notification payloads
- feat(cli): `gpc rtdn test` — guidance for testing RTDN setup

### New Features
- feat(api): `edits.apks.upload` and `edits.apks.list` — APK upload support alongside AAB
- feat(releases): `--status draft` flag on `gpc releases upload` and `gpc releases promote`
- feat(reviews): `--all` auto-pagination fetches all review pages
- feat(reviews): 350-character reply validation before API call
- feat(purchases): `--type` flag on `gpc purchases voided` — include subscription voids (type=1)
- feat(purchases): `--include-partial-refunds` flag for quantity-based partial refunds
- feat(doctor): developer ID format validation check
- feat(releases): concurrent Play Console edit warning on upload

### API Client — 10 New Batch Endpoints
- feat(api): `oneTimeProducts.batchGet`, `batchUpdate`, `batchDelete`
- feat(api): `subscriptions.batchUpdateBasePlanStates`
- feat(api): `subscriptions.offers.batchGet`, `batchUpdate`, `batchUpdateStates`

### Rate Limiter Rewrite
- refactor(api): 6-bucket rate limiter matching Google's actual quota model (3,000 queries/min each)
- refactor(api): all API calls automatically rate-limited by resource type (was 5 of 204 endpoints)

### Spec Alignment
- feat(validate): `qa` track added to standard tracks
- feat(validate): `google_play_games_pc:` form factor tracks added
- fix(api): `?uploadType=media` query param on simple uploads
- feat(api): `VoidedPurchase` type — added `kind` and `voidedQuantity` fields
- feat(api): `ApksListResponse` type added

**Actual new tests:** 11 → total 1,845

---

## v0.9.46

Deep code review, error handling overhaul, doctor enhancements, API catch-up.

### Error Handling Overhaul
- fix(cli): removed 210 `process.exit()` calls across 39 command files — all errors now propagate to global `handleCliError` for consistent formatting, JSON mode support, and plugin hook compatibility
- fix(cli): `resolvePackageName`, `readJsonFile`, `requireOption`, `requireConfirm` throw typed errors instead of calling `process.exit` directly
- feat(cli): error handler supports `silent` flag for user-aborted operations

### `gpc update` Fixes
- fix: GitHub API 403 rate limit distinguished from genuine forbidden (checks `x-ratelimit-remaining` header)
- fix: binary download sends auth headers via `githubDownloadHeaders()`
- feat: `GITHUB_TOKEN` fallback (standard CI env var) in addition to `GPC_GITHUB_TOKEN`
- fix: download URLs no longer receive API-specific `Accept` header
- fix: stale `.gpc-old-*` files cleaned up before binary update (Windows)
- fix: `process.exit(1)` in 3 places replaced with thrown typed errors

### `gpc doctor` Enhancements
- feat: GPC version check (npm registry, shows "up to date" or "update available")
- feat: HTTPS connectivity probe (TLS handshake to API endpoints, with latency)
- feat: app access verification (`edits.insert` + `edits.delete` on configured app)
- feat: service account key age warning (>90 days)
- feat: conflicting credential sources detection
- feat: config unknown keys validation (catches typos in `.gpcrc.json`)
- feat: token cache health check (fixable via `--fix`)
- feat: disk space check (warns below 100MB)
- feat: CI environment detection (GitHub Actions, GitLab CI, Bitbucket, CircleCI, Jenkins, Azure)
- feat: DNS results include latency, unique names for JSON output
- fix: API connectivity error message includes actual error details
- fix: `applyFix` uses structured `fixData` instead of parsing suggestion text
- fix: summary line symbols colored
- fix: `process.exit(1)` replaced with `process.exitCode`

### `gpc status` Fixes
- fix: deduplicated `relativeTime` (exported from core, imported in CLI)
- fix: `--since-last` diff embedded in JSON output (was appended as text)
- fix: version diff uses production track (was `releases[0]`)
- fix: watch loop SIGINT handler no longer calls `process.exit(0)`
- feat: validation errors throw typed errors for JSON mode

### Auth & First-Time Experience
- fix: `auth login` verifies token on save, outputs structured JSON in `--json` mode
- fix: `auth status/whoami/token/switch` errors propagate to global handler (were caught and discarded)
- fix: `auth logout` deletes config key (was setting empty string), supports `--profile`
- fix: SA paths resolved to absolute on save (prevents CWD-dependent config)
- fix: first-run banner suppressed on setup commands (config, auth, quickstart, doctor)
- feat: `deleteConfigValue` added to `@gpc-cli/config`

### API Client — New Endpoints
- feat: `releases.list` — release lifecycle states (DRAFT, IN_REVIEW, PUBLISHED)
- feat: `tracks.patch` — partial track updates
- feat: `subscriptions.batchGet` — batch subscription reads
- feat: `subscriptions.batchUpdate` — batch subscription updates
- feat: `purchases.acknowledgeSubscription` — v1 subscription acknowledge
- feat: `inappproducts.batchDelete` — batch IAP deletion
- feat: new types: `ReleaseSummary`, `ReleasesListResponse`, batch request/response types

### Other Fixes
- fix(auth): token cache only `chmod`s directory on creation (was every write)
- fix(core): `computeStatusDiff` uses production track for version comparison

**204 API endpoints · 1,834 tests**

---

## v0.9.45

Code review, API catch-up, and 3 pre-release bug fixes.

- fix: `gpc changelog` crash on invocation (missing config init), exit code 4 on API errors, `--limit` validation
- fix: `gpc preflight` AAB manifest parsing (ESM/CJS interop, broadened fallback)
- fix: image export HTTP response validation, redaction of non-string values, train exit code 6, profile resolution, `path.dirname()` for train state, Games API URL encoding
- fix: `getProductV2` corrected to v2 API path, `orders:batchGet` casing, `Order.orderHistory` type
- security: plugin trust explicit allowlist (module-level constant)
- feat: `gpc orders get`, `gpc orders batch-get` (Orders API, May 2025)
- feat: `gpc purchases product get-v2`, `subscription cancel-v2`, `subscription defer-v2`
- feat: expanded `SubscriptionPurchaseV2` (13 new fields), batch order validation
- fix: removed incorrect deprecation warnings from v1 cancel/defer (not deprecated per Google's May 2025 notice)

**192 API endpoints · 1,757 tests**

---

## v0.9.44

Changelog command and preflight fix.

- feat: `gpc changelog` — view release history from the terminal (table, detail, JSON). No auth required — uses public GitHub Releases API.
- fix: `gpc preflight` no longer crashes on large/complex AABs — graceful fallback when manifest cannot be parsed, skips manifest scanners, runs all others.

---

## v0.9.43

Upload fix and enhanced error messages.

- fix: **resumable uploads now work** — Node.js `fetch` was following HTTP 308 as a redirect (RFC 7238), breaking Google's "Resume Incomplete" protocol on every chunked upload. Added `X-GUploader-No-308` header (same fix as Google's official Go client library).
- fix: upload completion detection — when the final chunk response is lost to a timeout, GPC queries the server to confirm and recover the bundle resource
- fix: upload progress queries now have a 30-second timeout (were unbounded)
- fix: malformed server responses during upload no longer crash with a raw `SyntaxError`
- feat: 12 smart error messages for common API failures — duplicate version code, version code too low, package mismatch, app not found, insufficient permissions, edit conflict, bundle too large, invalid bundle, track not found, release notes too long, rollout already completed, edit expired. Each with a clear message and actionable fix commands.

---

## v0.9.42

Upload fix (partial — root cause found in v0.9.43).

- fix: upload completion detection recovery and post-loop server verification
- fix: 30-second timeouts on upload progress queries
- fix: safe JSON parsing for malformed server responses

---

## v0.9.41

Bug fixes, code quality, and zero open bugs.

- fix: `gpc vitals lmk` and `gpc vitals memory` — 400 INVALID_ARGUMENT (metric field names were wrong since v0.9.36)
- fix: `gpc releases notes get` — now shows notes for completed releases (fallback to raw track data)
- fix: `gpc subscriptions list` — shows "No subscriptions found." when empty instead of blank output
- fix: Image upload warnings use `process.emitWarning` instead of `console.warn` in library code
- refactor: extracted `resolvePackageName` and `getClient` to shared utility across 21 CLI command files (-183 lines)

---

## v0.9.40

Bug fixes from v0.9.39 live testing.

- fix: `gpc init --ci-template` renamed from `--ci` to avoid collision with global `--ci` flag
- fix: `gpc feedback --print` showed `[object Object]` for audit log command args
- fix: `gpc releases promote --notes` + `--copy-notes-from` now exits 2 as mutually exclusive

---

## v0.9.39

Preflight compliance scanner, new commands, status improvements, and bug fixes.

- feat: `gpc preflight` — scan your AAB against Google Play policies before uploading (9 scanners, offline, no external tools)
- feat: `gpc preflight manifest` — target SDK, debuggable, testOnly, cleartext, missing exported, foreground service types
- feat: `gpc preflight permissions` — 18 restricted permissions with policy URLs
- feat: `gpc preflight metadata` — store listing character limits, screenshots, privacy policy URL
- feat: `gpc preflight codescan` — hardcoded secrets, non-Play billing SDKs, tracking SDKs
- feat: 64-bit native library compliance, policy heuristics, app size analysis
- feat: `.preflightrc.json` for custom thresholds, allowed permissions, disabled rules, severity overrides
- feat: `--fail-on <severity>` for CI gating (exit code 6 on threshold breach)
- feat: `gpc init` — scaffold project config, metadata directory, and CI templates in one command
- feat: `gpc diff` — read-only preview of release state, track-to-track comparison, local vs remote metadata
- feat: `gpc releases count` — aggregate release stats per track with status breakdown
- feat: `--copy-notes-from <track>` on `gpc releases upload` and `gpc releases promote`
- feat: `gpc status --review-days` — configurable reviews window (was hardcoded to 30 days)
- feat: `gpc status --threshold crashes=1.5,anr=0.5` — one-off threshold overrides from CLI
- feat: `gpc status --watch` now shows elapsed time with live countdown
- feat: `gpc feedback` now includes recent commands, shell info, CI detection, and `--print` flag
- feat: `gpc releases promote` auto-retries on 409 Conflict (stale edit recovery)
- fix: `gpc diff --from/--to` would crash on track-to-track comparison
- fix: `--review-days` accepted invalid values

---

## v0.9.38

- feat: Google-recommended resumable upload protocol (8 MB chunks, auto-resume, real-time progress bar)
- fix: Upload file size limits corrected to Google's API limits (2 GB AAB, 1 GB APK)
- fix: HTTP 408 now retried; default max retries raised to 5
- feat: Reporting API rate limiting (10 queries/sec)
- feat: Edit session expiry warning
- fix: `gpc quickstart` exits 1 on Homebrew/binary installs (Bug M)
- fix: `gpc vitals lmk` / `memory` 400 INVALID_ARGUMENT (Bug H)
- fix: `gpc vitals crashes/anr` table headers showed indices instead of names (Bug T)
- fix: `gpc vitals startup` missing `startType` dimension (Bug U)
- fix: `gpc pricing convert` raw 400 on apps without monetization (Bug R)
- 1,566 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.37...v0.9.38)

---

## v0.9.37

- security: `gpc plugins install/uninstall` — execSync → spawnSync (no shell injection)
- fix: PlayApiError rename (was ApiError, naming collision)
- fix: runWatchLoop throws instead of process.exit(2)
- fix: workspace:* lockfile consistency
- 1,555 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.36...v0.9.37)

---

## v0.9.36

- fix: `gpc vitals lmk` 400 INVALID_ARGUMENT (Bug H)
- fix: `gpc quickstart` exit 1 from --quiet in doctor spawn (Bug M)
- security: `sendNotification` execSync → execFile (Bug N)
- fix: `gpc quota usage` [object Object] (Bug O)
- 1,551 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.35...v0.9.36)

---

## v0.9.35

- feat: Terminal UX (dynamic table width, bold headers, spinner)
- feat: Onboarding wizard, `gpc quickstart`, `gpc auth login` interactive
- feat: `gpc listings lint/analyze/push` preflight, `gpc grants`, `gpc train`, `gpc quota`
- feat: `gpc reviews analyze`, `gpc vitals compare-versions`, `gpc vitals watch --auto-halt-rollout`
- feat: `gpc subscriptions analytics`, `gpc games`, `gpc enterprise`
- fix: Bugs I/J/K/L
- 1,536 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.34...v0.9.35)

---

## v0.9.34

- feat: Color output (✓/✗/⚠), onboarding (first-run banner, auth error hints)
- feat: `gpc reviews reply`, `gpc anomalies list`, `gpc vitals wakeup`, `gpc vitals lmk`
- fix: Bug F (iap batch-get deprecation), Bug G (migrate fastlane overwrite guard)
- 1,504 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.33...v0.9.34)

---

## v0.9.33

- fix: `gpc version --json` (Bug D), `GPC_DEBUG=1` argv mutation (Bug E)
- docs: Product name "GPC — Google Play Console CLI" across all surfaces
- 1,467 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.32...v0.9.33)

---

## v0.9.32

- feat: Live upload progress bar, `gpc releases notes get`, `--vitals-gate`, "Did you mean?" suggestions
- feat: `gpc version --json`, `gpc cache`, `gpc auth token`, `gpc feedback`
- feat: `GPC_DEBUG`/`GPC_NO_COLOR` env vars, release notes 500-char warning
- fix: 5 bug fixes
- 1,461 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.31...v0.9.32)

---

## v0.9.31

- feat: Live binary download progress bar for `gpc update`
- fix: Silence npm/brew stdout in JSON mode, skip passive update check on `gpc update`
- 1,453 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.30...v0.9.31)

---

## v0.9.30

- feat: `gpc update` self-update command (npm/Homebrew/binary, SHA-256 checksums, `--check` for CI)
- 1,453 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.29...v0.9.30)

---

## v0.9.29

- fix(releases): --rollout validation, notes set error, file-exists guard, rollout % display
- fix(status): --sections cache filter, --days validation, --watch+--since-last warning, relative timestamps
- feat(docs): `gpc docs [topic]` routing
- 1,420 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.28...v0.9.29)

---

## v0.9.28

- fix: `gpc audit clear --dry-run` no longer deletes entries — global `--dry-run` was consumed at the root program level before the subcommand action ran, so `options.dryRun` was always `undefined`. Entries were deleted even when `--dry-run` was passed. Same root cause as the `gpc doctor --json` bug fixed in v0.9.25.
- 1,392 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.27...v0.9.28)

---

## v0.9.27

- fix: `gpc status --sections <list>` now filters output — previously the API calls were correctly skipped but all three sections (RELEASES, VITALS, REVIEWS) still rendered in the terminal and JSON output. Now only the requested sections appear.
- 1,391 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.26...v0.9.27)

---

## v0.9.26

Eight `gpc status` quality-of-life improvements.

- feat: trend arrows ↑↓ on vitals — compare current crash/ANR rate vs prior period at a glance
- feat: `--format summary` — one-liner output for shell prompts and post-deploy hooks
- feat: `--sections <list>` — skip API calls for excluded sections (releases/vitals/reviews)
- feat: `--watch [N]` — real polling loop with ANSI clear, Ctrl+C to stop, 10s minimum, 30s default
- feat: `--since-last` — diff mode showing version/crash/ANR/rating deltas vs last cached run
- feat: `--all-apps` — run status across all configured app profiles (max 5)
- feat: `--notify` — desktop notification on threshold breach/clear; CI-aware skip
- fix: unknown vitals/reviews show `—` instead of `?`/`n/a`; "No vitals data available" message when all absent
- 1,388 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.25...v0.9.26)

---

## v0.9.25

Five bugs fixed — including a critical one that prevented every upload from completing.

- fix: `gpc publish` / `gpc releases upload` always threw "Upload succeeded but no bundle data returned" — Google Play API returns `Bundle` directly, not `{ bundle: Bundle }`. The client was reading `data.bundle` (always `undefined`) even when the file uploaded successfully.
- fix: `gpc doctor --json` always output human-readable text — global `-j, --json` on the root program was consumed before the subcommand action ran
- fix: `gpc status --days N` and `gpc vitals compare --days N` used the wrong date window — Commander passes the option default as the radix to `parseInt`, causing `parseInt("7", 7)` = NaN and `parseInt("14", 7)` = 11
- fix: `gpc validate` table output showed raw JSON — `checks[]` was passed directly to `formatOutput`; now flattens to check/passed/message rows
- fix: `--output junit` testcase `name` attribute showed `-` placeholder for releases — loop now skips `""` and `"-"` sentinel values and falls through to `track`, `versionCode`, etc.
- 1,358 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.24...v0.9.25)

---

## v0.9.24

- feat: `gpc status` — unified app health snapshot: releases, vitals, and reviews in one command. Six parallel API calls, 1-hour cache, `--cached` / `--refresh` / `--days` flags, exit code 6 on vitals threshold breach
- feat: `gpc config init` — guided wizard with auth method selection, SA file validation with retry, package name format check, post-init summary
- feat: `gpc migrate fastlane --dry-run` — preview migration plan without writing any files
- feat: `gpc migrate fastlane` conflict detection — warns before overwriting an existing `.gpcrc.json`
- fix: `gpc migrate fastlane` rollout mapping — `supply(rollout: "0.1")` now correctly maps to `gpc releases upload --rollout 10` (was `releases promote`)
- fix: `gpc migrate fastlane` parse warnings — complex Ruby constructs (begin/rescue/if/unless) now surface a warning instead of producing silent incomplete lane detection
- fix: `gpc validate` warnings surfaced — file-size warnings now included in `ValidateResult.warnings` and shown to the user
- fix: `gpc publish` rollout guard — rejects non-finite and out-of-range rollout values (< 1 or > 100) with exit code 2
- fix: `gpc doctor` package name format — validates Android naming rules and reports as a check
- fix: git release notes truncation — `generateNotesFromGit` now returns `truncated: boolean`; CLI warns to stderr when notes were trimmed
- 1,355 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.23...v0.9.24)

---

## v0.9.23

- feat: `gpc bundle analyze` and `gpc bundle compare` — zero-dependency AAB/APK size breakdown by module and category, with `--threshold` CI gate (exit code 6 on breach)
- fix: `gpc vitals compare` date overlap — non-overlapping date ranges prevent `start_time must be earlier than end_time` API errors
- feat: `--dry-run` on 4 more commands — `tracks create`, `tracks update`, `device-tiers create`, and `internal-sharing upload`
- fix: exit code consistency — `data-safety get/export` and `reports download financial/stats` now exit 2 (usage error) instead of 1
- 1,299 tests

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.22...v0.9.23)

---

## v0.9.22

- feat: table flattening audit — flat readable columns for 7 more commands
- feat: audit log querying — `gpc audit list`, `search`, `clear` commands
- feat: persistent vitals thresholds — config-based threshold checks without CLI flags
- feat: batch IAP commands — `gpc iap batch-get` and `batch-update`
- fix: vitals end-date freshness — cap to yesterday (API data ~1 day lag)

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.21...v0.9.22)

---

## v0.9.21

Vitals query fix, reports GCS limitation, purchase-options redirect, table and JUnit fixes.

- fix: vitals crashes/anr always include `timelineSpec` (defaults to 30 days), use per-metric-set metrics
- fix: reports list/download show GCS limitation messages (financial/stats reports are delivered via Google Cloud Storage)
- fix: purchase-options commands redirect to `otp offers` (correct sub-resource path)
- fix: pricing convert extracts `units`/`nanos`/`currencyCode` from Money object
- fix: subscriptions get handles array-format listings for language codes
- fix: generated-apks flattens nested objects into readable table columns
- fix: JUnit testcase names use fallback chain (`productId`, `region`, `languageCode`, `item-N`) instead of raw JSON

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.20...v0.9.21)

---

## v0.9.20

Vitals API fix, upload timeout auto-scaling, empty output messages, table formatting, HTML error sanitization.

- fix: correct vitals metric set names (`crashRateMetricSet`, not `vitals.crashrate`) — fixes 404 against real API
- fix: auto-scale upload timeout based on file size (30s + 1s/MB), add `--timeout` flag and `GPC_UPLOAD_TIMEOUT` env var
- fix: strip HTML tags from API error responses
- fix: `data-safety get` shows clear error (no GET endpoint in Google Play API)
- fix: `listings push --dry-run` no longer says "Listings pushed"
- fix: `recovery list` requires `--version-code`
- fix: empty result messages for `otp list`, `testers list`, `device-tiers list`, `listings availability`, `vitals errors search`, vitals metrics
- fix: flatten table output for `subscriptions get`, `subscriptions offers list`, `pricing convert`

[Full Changelog](https://github.com/yasserstudio/gpc/compare/v0.9.19...v0.9.20)

---

## v0.9.19

OTP parity fixes, diff commands, and table UX improvements.

- fix: `otp update` and `otp offers update` now include `regionsVersion.version=2022/02` and auto-derived `updateMask`, matching the subscription fix from v0.9.18
- fix: table and markdown cells wider than 60 characters are truncated with `...`
- fix: `subscriptions list` and `otp list` show readable flat summaries (productId, counts, state) in table/markdown output instead of nested JSON blobs
- fix: JSON file read errors now include the filename in the error message
- feat: `gpc releases diff` — compare releases between two tracks (`--from internal --to production`)
- feat: `gpc subscriptions diff` — compare a local JSON file against the remote subscription state
- feat: `gpc otp diff` — compare a local JSON file against the remote one-time product state
- test: 1,271 tests

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.18...v0.9.19

## v0.9.18

- fix: `subscriptions update` and `offers update` now always include the `regionsVersion.version=2022/02` query param, matching the existing create behavior
- fix: auto-derive `updateMask` for subscription updates from provided fields
- fix: table and markdown output formatters now render nested objects as JSON instead of displaying `[object Object]`

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.17...v0.9.18

## v0.9.17

- fix: subscriptions create validation — auto-add `regionsVersion.version` query param, strip output-only fields (`state`, `archived`), auto-prefix `prorationMode` enum values
- fix: one-time products create — add missing `regionsVersion.version` query param
- feat: client-side validation — benefits max 4, description max 80 chars, `gracePeriodDuration` + `accountHoldDuration` sum P30D–P60D, `Money.units` coerced to string
- feat: `subscriptions create --activate` — auto-activate DRAFT base plans after creation
- feat: empty result messages for `reviews list` and `vitals overview`
- test: 1,262 tests

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.16...v0.9.17

## v0.9.16

- fix: `subscriptions create` — `productId` and `offerId` now correctly passed as query parameters when creating subscriptions and offers

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.15...v0.9.16

## v0.9.15

Five bugs found during live testing.

- fix: `--output` flag ignored — table, yaml, markdown, and junit output formats now work correctly
- fix: `recovery list` used POST instead of GET — corrected HTTP method, added `--version-code` filter
- fix: `iap list/get` used deprecated API — migrated to oneTimeProducts API (inappproducts endpoint deprecated, shutdown Aug 2027)
- fix: vitals errors/anomalies missing OAuth scope — auth now requests `playdeveloperreporting` scope alongside `androidpublisher`
- fix: `data-safety get/update` used edits workflow — data safety API calls no longer require edit insert/commit
- fix: missing query params — added `productId` for subscriptions.create, `offerId` for createOffer, `regionsVersion` for update/updateOffer, `autoConvertMissingPrices`/`allowMissing` for inappproducts
- test: 1,262 tests (up from 1,255)

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.14...v0.9.15

## v0.9.14

- fix: subscriptions API paths — removed incorrect `/monetization/` segment from all 17 subscription endpoint paths (list, get, create, update, delete, basePlans, offers)
- fix: convertRegionPrices path — corrected from `/monetization/convertRegionPrices` to `/pricing:convertRegionPrices`
- docs: troubleshooting for enabling the Play Developer Reporting API (required for vitals commands)

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.13...v0.9.14

## v0.9.13

- feat: `gpc install-skills` — interactive wizard for installing agent skills (pick skills, target agents, review security, install)
- ci: updated Homebrew formula to v0.9.13 with standalone binaries for all 5 platforms
- docs: consistency pass — all version, endpoint, and test count references aligned

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.12...v0.9.13

## v0.9.12

Pre-1.0 hardening release.

- feat: input validation at core layer for package names, SKUs, version codes, language codes, and track names
- fix: security hardening — aligned sensitive key redaction (23 field patterns), error message truncation to prevent key leakage
- test: 1,255 tests (up from 932) — added API coverage, credential security, redaction, error codes, help consistency, e2e tests
- perf: CLI cold start under 300ms, command latency sub-millisecond
- ci: license compliance checker for all production dependencies
- ci: release workflow with pre-publish dry-run, npm provenance, post-publish verification
- docs: tracks command page, interactive mode and dry-run guides

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.11...v0.9.12

## v0.9.11

- docs: new pages for agent skills, troubleshooting, FAQ, changelog
- feat: enhanced `gpc doctor` with additional environment checks
- fix: CLI help text improvements across all commands

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.10...v0.9.11

## v0.9.10

- fix: improved error messages with actionable suggestions for common failures
- fix: polished help text and command descriptions
- feat: enhanced `gpc doctor` output with more diagnostic checks

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.9...v0.9.10

## v0.9.9

The final pre-launch release — full API coverage, CLI polish, and migration tooling.

- feat: custom track management — create and update tracks with `gpc tracks create/update`
- feat: externally hosted APKs — `gpc releases upload-external` for self-hosted distribution
- feat: purchase options — list, create, activate, and deactivate purchase options
- feat: IAP batch sync — batch update in-app products with automatic chunking and serial fallback
- feat: JUnit XML output — `--output junit` for CI test result integration
- feat: progress spinners on uploads, sync, and push operations
- feat: bulk image export — `gpc listings images export` downloads all screenshots by language
- feat: Fastlane migration wizard — `gpc migrate fastlane` detects your setup and generates a migration plan
- feat: shell completion for all 30+ command groups including nested subcommands
- feat: `--ci` flag for CI mode (JSON output, no prompts, no color)
- feat: `--json` shorthand for `--output json`
- feat: "did you mean?" typo suggestions on unknown commands
- fix: typed errors with actionable suggestions across all commands
- test: 932 tests (up from 843)

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.8...v0.9.9

## v0.9.8

Complete API coverage and production readiness — the last feature release before 1.0.0.

- feat: device tier targeting — create, list, and inspect device capability configs
- feat: internal app sharing — upload builds for review-free QA distribution
- feat: download device-specific APKs from app bundles
- feat: one-time products API (alias `otp`) — the modern replacement for legacy in-app products, with offers support
- feat: create recovery actions and add targeting rules (completes the recovery module)
- feat: pagination (`--limit`, `--next-page`) on all list commands
- feat: `--dry-run` on `apps update`
- fix: `--yes` flag now works correctly on recovery cancel and deploy
- test: 843 tests (up from 778)

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.7...v0.9.8

## v0.9.7

New API coverage, webhooks, and developer experience improvements.

- feat: app recovery actions — list, cancel, and deploy recovery actions
- feat: data safety declarations — view, update, and export data safety info
- feat: external transactions for alternative billing — create, get, and refund
- feat: listings diff — compare local metadata against the Play Store
- feat: sort any list command with `--sort <field>`
- feat: generate release notes from git history with `--notes-from-git`
- feat: webhook notifications on command completion with `--notify` (Slack, Discord, custom)
- feat: fish and PowerShell shell completions
- feat: clearer error messages with actionable fix suggestions across all commands
- docs: standalone SDK usage guides for the API and auth packages

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.6...v0.9.7

## v0.9.6

Enhanced developer experience and testing stability.

- feat: enhanced `--dry-run` for `releases upload` and `publish` — validates file, queries current track state, shows planned changes
- feat: auto-update checker — non-blocking npm registry check on startup with 24h cache
- test: 88 new edge case tests (597 → 685) across core, api, and auth packages

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.5...v0.9.6

## v0.9.5

Security hardening, input validation, and bug fixes across all packages.

- fix: prevent prototype pollution in config writer — validates keys against `__proto__`, `constructor`, `prototype`
- fix: path traversal protection for Fastlane directory reads
- fix: rate limiter token count recalculates based on actual elapsed time after wait
- fix: image and deobfuscation uploads now verify API returned valid data
- fix: `updateMask` URL encoding uses `URLSearchParams` for spec compliance
- fix: user cancellation exits with code 1 instead of 0
- fix: removed duplicate `--dry-run` options shadowing global flag in `listings push` and `iap sync`
- fix: IAP sync produces clear error on invalid JSON files
- fix: ADC tokens now cached via `acquireToken` for consistency with service accounts
- fix: rollout percentage validation in `promote` and `rollout update` (must be 0–1)
- fix: config loader properly deletes unsafe keys instead of setting to `undefined`

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.4...v0.9.5

## v0.9.4

First release published to npm. Install with `npm install -g @gpc-cli/cli`.

- perf: in-memory token caching with mutex — eliminates redundant JWT signing on concurrent requests
- perf: smart 401-specific token refresh — only re-fetches on auth failures, not on retries
- perf: HTTP compression (`gzip`) and connection keep-alive for faster API calls
- perf: parallel pagination — fetch multiple pages concurrently
- perf: async config discovery and cached `homedir()` — faster CLI startup
- fix: resolved all lint and typecheck errors across all packages
- docs: README files for all 7 npm packages
- ci: changesets-based release workflow for automated npm publishing

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.3...v0.9.4

## v0.9.3

- perf: replaced `googleapis` (194 MB) with `google-auth-library` (776 KB) — **250x smaller install**
- feat: standalone binaries — no Node.js required (macOS, Linux, Windows)
- feat: install script with SHA256 checksum verification
- feat: GitHub Actions workflow builds and attaches binaries to every release

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.2...v0.9.3

## v0.9.2

- feat: **interactive mode** — `gpc publish`, `gpc releases upload`, and `gpc config init` now prompt for missing options in a terminal
- feat: respects `--no-interactive`, `GPC_NO_INTERACTIVE`, and CI environment detection
- feat: **audit logging** — all write operations logged to `~/.config/gpc/audit.log` (JSONL)

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.1...v0.9.2

## v0.9.1

- docs: expanded README with plugin system, vitals thresholds, purchases, pricing, and dry-run sections
- docs: complete CHANGELOG covering all versions from v0.1.0 through v0.9.0

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.0...v0.9.1

## v0.9.0

Full security audit across all packages.

- fix: **command injection** — replaced `exec()` with `execFile()` in `gpc docs`
- fix: **prototype pollution** — config parser now strips `__proto__`, `constructor`, `prototype` keys
- feat: **output redaction** — sensitive fields (`private_key`, `accessToken`, `password`, etc.) automatically redacted
- fix: **cache permissions** — token cache directory set to `0o700` (owner-only)
- feat: **path validation** — `safePath()` and `safePathWithin()` prevent directory traversal

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.7...v0.9.0

## v0.8.7

- feat: `gpc plugins init <name>` — scaffold a new plugin project with tests
- feat: `gpc plugins approve/revoke <name>` — control which third-party plugins can load
- feat: first-party plugins (`@gpc-cli/*`) auto-trusted, third-party require explicit approval

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.6...v0.8.7

## v0.8.6

- feat: plugins can now register custom CLI commands — they show up in `gpc --help`
- feat: `beforeRequest` / `afterResponse` hooks — observe or modify every HTTP call
- feat: `gpc plugins list` — shows loaded plugins with name, version, and trust status
- fix: hook failures never block API calls or crash the CLI

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.5...v0.8.6

## v0.8.5

- feat: image validation on upload — checks format (PNG/JPEG), dimensions, and size limits per type
- feat: `gpc vitals compare <metric>` — compare current vs previous period, with trend detection
- feat: track validation now supports wear, automotive, tv, and android_xr form factors

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.4...v0.8.5

## v0.8.4

- feat: `gpc publish <file>` — one command to validate, upload, set track, add notes, and commit
- feat: `gpc validate <file>` — pre-flight checks without uploading
- feat: `--notes-dir <dir>` — read multi-language release notes from a directory of `<lang>.txt` files

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.3...v0.8.4

## v0.8.3

- feat: token caching — avoids re-signing JWTs on every command
- feat: `GOOGLE_APPLICATION_CREDENTIALS` support — works with gcloud's default credentials
- feat: named auth profiles — store multiple service accounts and switch between them
- feat: `gpc auth login --profile <name>`, `gpc auth switch <name>`, `gpc auth profiles`

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.2...v0.8.3

## v0.8.2

- feat: file validation before upload — checks magic bytes, extension, and size limits
- feat: `--mapping <file>` on `gpc releases upload` — upload ProGuard/R8 deobfuscation files
- feat: `--retry-log <path>` — write retry attempts to a JSONL file for debugging

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.1...v0.8.2

## v0.8.1

- feat: pagination helpers for all list endpoints — no more manual page handling
- feat: rate limiting — automatic request throttling based on Google Play API quotas
- feat: `--limit` and `--next-page` flags on reviews, subscriptions, IAP, purchases, and users

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.0...v0.8.1

## v0.8.0

GPC now covers the **entire Google Play Developer API v3** — 162 endpoints, 50+ commands.

- feat: plugin system — extend GPC with custom commands and lifecycle hooks
- feat: `gpc plugins list` — see loaded plugins and their trust status
- feat: `@gpc-cli/plugin-ci` — built-in CI plugin (GitHub Actions, GitLab CI, Jenkins, CircleCI, Bitrise)

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.7.0...v0.8.0

## v0.7.0

- feat: `gpc reports list/download` — financial and stats reports
- feat: `gpc users list/get/invite/update/remove` — manage developer account users
- feat: `gpc testers list/add/remove` — manage testers on testing tracks
- feat: grant management — assign per-app permissions to users
- feat: bulk tester import from CSV

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.6.0...v0.7.0

## v0.6.0

- feat: `gpc subscriptions list/get/create/update/delete` — full subscription management
- feat: `gpc subscriptions base-plans` — activate, deactivate, delete, and migrate prices
- feat: `gpc subscriptions offers` — create and manage subscription offers
- feat: `gpc iap list/get/create/update/delete` — in-app product management
- feat: `gpc iap sync --dir products/` — bulk sync products from local files
- feat: `gpc purchases get <token>` — look up a purchase (v1 + v2 API)
- feat: `gpc purchases acknowledge/consume` and `gpc purchases subscription get/cancel/defer/revoke`
- feat: `gpc orders refund` and `gpc purchases voided list`
- feat: `gpc pricing convert` — convert prices across regions

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.5.0...v0.6.0

## v0.5.0

- feat: `gpc reviews list` — filter by star rating, language, or date
- feat: `gpc reviews get` and `gpc reviews reply` — read and respond to user reviews
- feat: `gpc vitals overview` — crash rate, ANR rate, and startup time at a glance
- feat: `gpc vitals crashes/anr/startup/rendering/battery/memory` — deep dive into each metric
- feat: `gpc vitals anomalies` — surface detected anomalies
- feat: dimension filtering — slice vitals by app version, OS level, or device
- feat: threshold-based exit codes for CI — fail your pipeline if crash rate exceeds a limit

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.4.0...v0.5.0

## v0.4.0

- feat: `gpc listings get` — fetch store listings for one or all languages
- feat: `gpc listings update` — update title, description, and other listing fields
- feat: `gpc listings pull/push` — sync store listings between local files and Play Console
- feat: `gpc listings push --dry-run` — preview what would change before pushing
- feat: `gpc listings images list/upload/delete` — manage screenshots, icons, and feature graphics
- feat: `gpc listings availability` — check country availability
- feat: Fastlane metadata directory format compatibility — drop-in replacement for `fastlane supply`

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.3.0...v0.4.0

## v0.3.0

- feat: `gpc releases upload <file>` — upload AAB or APK with a progress bar
- feat: `gpc releases status` — see the current release on every track
- feat: `gpc releases promote` — move a release from one track to another
- feat: `gpc releases rollout increase/halt/resume/complete` — control staged rollouts
- feat: `gpc releases notes set` — set release notes inline or from a file
- feat: `gpc tracks list` and `gpc tracks get` — inspect available tracks
- feat: `gpc status` — one-line overview of releases across all tracks

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.2.0...v0.3.0

## v0.2.0

- feat: typed API client for Google Play Developer API v3
- feat: automatic retry with exponential backoff on 429 and 5xx errors
- feat: edit lifecycle management — insert, modify, validate, commit (with auto-cleanup on failure)
- feat: `gpc apps list` — see all apps on your developer account
- feat: `gpc apps info <package>` — app details at a glance

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.1.0...v0.2.0

## v0.1.0

- feat: service account authentication with JSON key files
- feat: OAuth2 token generation for local development
- feat: config file discovery — searches for `.gpcrc.json` up the directory tree
- feat: environment variable overrides (`GPC_APP`, `GPC_PROFILE`, `GPC_OUTPUT`, etc.)
- feat: `gpc auth login/logout/status/whoami` commands
- feat: `gpc config init/show/set` commands
- feat: `gpc doctor` — validates connectivity and auth in one check
- feat: shell completions for bash, zsh, and fish
- feat: output formats — table, JSON, YAML, markdown

**Full Changelog**: https://github.com/yasserstudio/gpc/commits/v0.1.0
