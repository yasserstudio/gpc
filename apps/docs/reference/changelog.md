---
outline: deep
pageClass: wide-page
head:
  - - meta
    - name: robots
      content: noindex, follow
---

# Changelog

All notable user-facing changes to GPC are documented here. For full release details, see the [GitHub Releases](https://github.com/yasserstudio/gpc/releases) page.

## v0.9.52 <Badge type="tip" text="latest" />

Fix for rejected app workflow discovered during live testing.

- `--changes-not-sent-for-review` now works correctly (was blocked by `edits.validate` failing before `edits.commit`)
- `gpc publish --dry-run` now passes `--mapping-type`, `--device-tier-config`, and commit flags through
- `gpc testers import` now accepts `--changes-not-sent-for-review` and `--error-if-in-review`
- Expansion file upload validates API response instead of silently returning undefined

**208 API endpoints · 1,863 tests**

---

## v0.9.51

API completeness pass: missing Google Play API parameters and new resources.

### New API Parameters
- `--changes-not-sent-for-review` flag on all edit-committing commands (required for rejected apps)
- `--error-if-in-review` flag to fail fast instead of silently cancelling in-progress reviews
- `--mapping-type` flag: upload native debug symbols (`nativeCode`) in addition to ProGuard maps
- `--device-tier-config` flag: target a device tier config at bundle upload time
- `allowMissing` and `latencyTolerance` on subscription, offer, and one-time product patch endpoints
- `pageSize` / `pageToken` pagination on `oneTimeProducts.list`
- `startIndex` on `reviews.list`
- Configurable `regionsVersion` on all monetization create endpoints (was hardcoded)
- `regionsVersion` + `latencyTolerance` on `basePlans.migratePrices` request body
- `countryTargeting` added to `Release` type

### New Resources
- `edits.expansionfiles` resource: `get`, `update`, `patch`, `upload` for legacy OBB files

### Type Safety
- `ProductUpdateLatencyTolerance` union type (was bare `string`)
- `MutationOptions` shared type for `allowMissing` + `latencyTolerance`
- `DeobfuscationFileType` used throughout (removes unsafe cast)
- `DEFAULT_REGIONS_VERSION` constant (was hardcoded 8 times)

**208 API endpoints · 1,860 tests** (as of v0.9.51)

---

## v0.9.50

Security hardening, supply chain protection.

### Supply Chain
- Socket.dev CI scan blocks PRs with critical supply chain alerts
- Socket.dev GitHub App provides inline PR comments for risky dependencies
- `socket.yml` config for malware, typosquat, and install script detection
- `min-release-age=7` in `.npmrc` blocks packages published less than 7 days ago
- SBOM (CycloneDX) generated and archived on every npm release
- Production dependency audit (`pnpm audit`) runs on every pull request

### CI Hardening
- All GitHub Actions pinned to commit SHAs across 6 workflows
- `Socket Security` added as required status check on `main`
- Dependabot restricted to direct dependencies only
- Explicit least-privilege permissions on all CI jobs

### Fix
- `gpc docs` now covers all 70 documentation topics (was 12)

### Docs
- 12-layer supply chain protection table in [security docs](/advanced/security)
- CODEOWNERS expanded for security-sensitive paths
- Referrer-Policy header on documentation site
- `pnpm audit` and `pnpm security:check` scripts for local security review

---

## v0.9.49

Developer verification awareness, copy alignment.

### New Command
- `gpc verify` — Android developer verification status, enforcement deadlines, and resources. Supports `--open` and `--json`.

### Developer Verification
- `gpc doctor` warns about September 2026 verification enforcement deadline (BR, ID, SG, TH)
- `gpc status` shows verification reminder footer in table output
- `gpc preflight` shows post-scan reminder about app registration requirements
- New [Developer Verification guide](/guide/developer-verification) — Google's 2026 rollout, timeline, requirements

### Docs
- Consistent "free to use" copy across all public pages (README, docs index, FAQ, installation)
- FAQ structured data schema corrected
- New [`gpc verify` command reference](/commands/verify)

### Housekeeping
- pnpm 9.15.9 → 10.33.0

---

## v0.9.48

Onboarding polish, safety confirmations, pager for long lists.

### Safety
- Confirmation prompts added to subscription cancel, revoke, and cancel-v2 — all destructive purchase commands now require `[y/N]` before executing (skip with `--yes`)

### Doctor
- `gpc doctor --fix` expanded with 3 new handlers — version check suggests update, auth check guides to login, config-keys fix removes unrecognized keys

### Auth Setup
- `gpc auth setup-gcp --key <path>` validates service account JSON, auto-authenticates, and saves to config
- Auto-detects common key file paths when no `--key` flag provided

### Pager
- `tracks list`, `releases status`, `subscriptions list`, and `audit list` now auto-pipe to `$PAGER` when output exceeds terminal height

### Fix
- `--status draft` correctly reflected in dry-run preview output

---

## v0.9.47

API completeness, bug fixes, RTDN, rate limiter rewrite.

### Bug Fixes
- **Bug AC**: `gpc changelog --version` renamed to `--tag` — Commander.js global `--version` flag was intercepting the subcommand option
- **Bug AD**: `gpc releases upload app.apk` now uses the correct `edits.apks.upload` endpoint instead of sending APKs to the bundles endpoint
- **Bug AD**: `gpc preflight app.apk` now supports APK files (reads manifest from root instead of `base/manifest/`)
- **Bug Q**: `gpc vitals crashes/anr/wakeup/lmk` and `gpc anomalies list` now degrade gracefully when the Reporting API is disabled (403), instead of throwing a raw error
- `gpc status --watch 5` now exits with code 2 (usage error), consistent with other validation errors
- `gpc bundle analyze app.apk --output json` type field no longer null

### New Commands
- `gpc rtdn status` — check Real-Time Developer Notification topic configuration
- `gpc rtdn decode <payload>` — decode base64 Pub/Sub notification payloads
- `gpc rtdn test` — guidance for testing RTDN setup

### New Features
- **APK upload**: `gpc releases upload app.apk` auto-detects format and uses the correct API endpoint
- **Draft releases**: `--status draft` flag on `gpc releases upload` and `gpc releases promote`
- **Reviews `--all`**: auto-pagination fetches all pages instead of just the first 10
- **Reply validation**: `gpc reviews reply` validates 350-character limit before sending
- **Voided purchases**: `--type` flag (include subscription voids), `--include-partial-refunds` flag
- **Doctor**: developer ID format validation check
- **Concurrent edit warning**: warns when CLI operations may conflict with Play Console edits

### API Client
- 10 new batch monetization endpoints: OTP batch-get/update/delete, subscription base-plan batch states, offer batch-get/update/update-states
- `edits.apks.upload` and `edits.apks.list` wired
- `?uploadType=media` added to simple uploads (spec compliance)

### Rate Limiter Rewrite
- Replaced ad-hoc rate limiter (5 endpoints covered) with Google's actual 6-bucket model at 3,000 queries/min each
- All API calls automatically rate-limited based on resource type (edits, purchases, reviews, reporting, monetization, default)

### Spec Alignment
- `qa` added to standard track validation
- `google_play_games_pc:` form factor tracks added
- `VoidedPurchase` type: added `kind` and `voidedQuantity` fields
- `ApksListResponse` type added

---

## v0.9.46

Deep code review, error handling overhaul, doctor enhancements, API catch-up.

### Error Handling
- Removed 210 `process.exit()` calls across 39 command files — all errors now propagate to the global error handler for consistent formatting, JSON mode support, and plugin hook compatibility
- Shared helpers (`resolvePackageName`, `readJsonFile`, `requireOption`) throw typed errors instead of exiting directly

### `gpc doctor` — 10 New Checks
- GPC version check (npm registry)
- HTTPS connectivity probe with latency
- App access verification (tests edit create/delete on configured app)
- Service account key age warning (>90 days)
- Conflicting credential sources detection
- Config unknown keys validation
- Token cache health check (fixable via `--fix`)
- Disk space check
- CI environment detection
- DNS latency measurement

### `gpc update` Fixes
- GitHub 403 rate limit properly detected (checks `x-ratelimit-remaining` header)
- `GITHUB_TOKEN` env var supported as fallback for CI
- Binary download auth headers, stale file cleanup

### Auth & Onboarding
- `auth login` verifies token works before confirming, supports `--json` output
- `auth logout --profile <name>` clears specific profile
- SA paths saved as absolute (no CWD-dependent resolution)
- First-run banner suppressed on setup commands

### API Client — 7 New Endpoints (204 total)
- `releases.list` — release lifecycle states (DRAFT, IN_REVIEW, PUBLISHED)
- `tracks.patch` — partial track updates
- `subscriptions.batchGet` / `batchUpdate` — batch operations
- `purchases.acknowledgeSubscription` — v1 subscription acknowledge
- `inappproducts.batchDelete` — batch IAP deletion

### Status Improvements
- `--since-last` diff embedded in JSON output
- Version diff uses production track
- Watch loop SIGINT cleanup

**204 API endpoints · 1,845 tests** (as of v0.9.47)

---

## v0.9.45

_March 2026_

- fix: `gpc changelog` no longer crashes on invocation (was missing config initialization)
- fix: `gpc changelog` now exits with code 4 on API errors (was 1) and validates `--limit` input
- fix: `gpc preflight` AAB manifest parsing — changed protobufjs import for correct ESM/CJS interop; broadened manifest parse fallback to catch all errors gracefully
- fix: image export now validates HTTP response before writing files
- fix: sensitive data redaction now covers non-string values (objects, numbers, arrays)
- fix: train gate failures now use proper error codes and exit code 6 (was plain Error)
- fix: profile resolution now errors when profiles are defined but requested profile is missing
- fix: TypeScript errors in `config init` and `train` commands (missing `GpcConfig` type import)
- fix: URL parameters in Games API client now properly encoded
- fix: train state file path handling uses `path.dirname()` instead of string manipulation
- fix: `getProductV2` now hits correct v2 API path (`purchases/productsv2/tokens/{token}`) — was incorrectly using v1 path
- fix: `orders:batchGet` URL casing corrected to match Google API convention
- fix: `Order.orderHistory` type restructured to match Google API (individual event fields, not generic array)
- security: plugin trust check uses explicit first-party allowlist instead of `@gpc-cli/` prefix match (module-level constant)
- feat: `gpc orders get <order-id>` — retrieve order details (new Orders API, May 2025)
- feat: `gpc orders batch-get --ids <csv>` — batch retrieve up to 1000 orders (with client-side validation)
- feat: `gpc purchases product get-v2 <token>` — v2 product purchases with multi-offer OTP support (Jun 2025)
- feat: `gpc purchases subscription cancel-v2` — v2 cancel with cancellation type parameter (Sep 2025)
- feat: `gpc purchases subscription defer-v2` — v2 defer supporting add-on subscriptions (Jan 2026)
- feat: expanded `SubscriptionPurchaseV2` type with 13 new fields (offerPhase, canceledStateContext, priceStepUpConsentDetails, latestSuccessfulOrderId, and more)
- fix: removed incorrect deprecation warnings from `cancelSubscription` and `deferSubscription` (v1) — these are NOT deprecated per Google's May 2025 deprecation notice; only `subscriptions.get`, `subscriptions.refund`, and `subscriptions.revoke` are deprecated

---

## v0.9.44

_March 2026_

- feat: `gpc changelog` — view release history from the terminal. Table view, detail view, JSON output. No auth required.
- fix: `gpc preflight` no longer crashes on large/complex AABs — manifest parse errors emit a warning and skip manifest-dependent scanners. Other scanners still run.

---

## v0.9.43

_March 2026_

- fix: **resumable uploads now work** — Node.js `fetch` was following HTTP 308 as a redirect (RFC 7238), breaking Google's "Resume Incomplete" protocol on every chunked upload. Added `X-GUploader-No-308` header (same fix as Google's official Go client library).
- fix: upload completion detection — when the final chunk response is lost to a timeout, GPC queries the server to confirm and recover the bundle resource.
- fix: upload progress queries now have a 30-second timeout (were unbounded)
- fix: malformed server responses during upload no longer crash with a raw `SyntaxError`
- feat: 12 smart error messages for common API failures — duplicate version code, version code too low, package mismatch, app not found, insufficient permissions, edit conflict, bundle too large, invalid bundle, track not found, release notes too long, rollout already completed, edit expired. Each with actionable fix commands.

---

## v0.9.42

_March 2026_

- fix: upload completion detection (partial fix — root cause found in v0.9.43)
- feat: smart error messages (shipped in v0.9.42, documented in v0.9.43 release)

---

## v0.9.41

_March 2026_

- fix: `gpc vitals lmk` and `gpc vitals memory` — 400 INVALID_ARGUMENT (wrong metric field names since v0.9.36)
- fix: `gpc releases notes get` — now shows notes for completed releases
- fix: `gpc subscriptions list` — shows "No subscriptions found." when empty
- refactor: extracted duplicate `resolvePackageName` and `getClient` across 21 CLI files (-183 lines)

---

## v0.9.40

_March 2026_

- fix: `gpc init --ci-template` renamed from `--ci` to avoid collision with global `--ci` flag
- fix: `gpc feedback --print` showed `[object Object]` for audit log command args
- fix: `gpc releases promote --notes` + `--copy-notes-from` now exits 2 as mutually exclusive

---

## v0.9.39

_March 2026_

### Preflight Compliance Scanner

Scan your AAB against Google Play policies before uploading — entirely offline, no API calls, no bundletool, no Java.

- feat: `gpc preflight app.aab` — run all 9 scanners in parallel
- feat: `gpc preflight manifest app.aab` — target SDK, debuggable, testOnly, cleartext traffic, missing `exported`, foreground service types
- feat: `gpc preflight permissions app.aab` — 18 restricted permissions (SMS, call log, background location, photo/video, and more)
- feat: `gpc preflight metadata <dir>` — store listing character limits, missing title, screenshots, privacy policy URL
- feat: `gpc preflight codescan <dir>` — hardcoded secrets (AWS, Google, Stripe), non-Play billing SDKs, tracking SDKs
- feat: 64-bit native library compliance (arm64-v8a required if armeabi-v7a present)
- feat: Policy heuristics — Families/COPPA, financial apps, health apps, UGC, overlay permissions
- feat: App size analysis with download size warnings and per-category breakdown
- feat: `.preflightrc.json` for custom thresholds, allowed permissions, disabled rules, severity overrides
- feat: `--fail-on <severity>` for CI gating (exit code 6 on threshold breach)

### New Commands

- feat: `gpc init` — scaffold `.gpcrc.json`, `.preflightrc.json`, metadata directory, and CI templates (GitHub Actions, GitLab CI) in one command
- feat: `gpc diff` — read-only preview of release state across all tracks, track-to-track comparison (`--from`/`--to`), and local vs remote metadata diff (`--metadata`)
- feat: `gpc releases count` — aggregate release stats per track with status breakdown

### Release Notes

- feat: `--copy-notes-from <track>` on `gpc releases upload` and `gpc releases promote` — copy release notes from another track's latest release

### Status Improvements

- feat: `--review-days <n>` — configurable reviews window (was hardcoded to 30 days)
- feat: `--threshold crashes=1.5,anr=0.5` — one-off threshold overrides from CLI (percent values)
- feat: Watch mode footer now shows elapsed time and live countdown: `Fetched 45s ago · refreshing in 15s`

### Other Improvements

- feat: `gpc feedback` now includes last 3 commands from audit log, shell info, CI detection, and a `--print` flag for CI environments
- feat: `gpc releases promote` auto-retries once on 409 Conflict (stale edit) — reduces failed CI runs

### Bug Fixes

- fix: `gpc diff --from/--to` would crash on track-to-track comparison (type mismatch in return value)
- fix: `--review-days` accepted invalid values (now validates like `--days`)

---

## v0.9.38

_March 2026_

**Resumable Uploads**

- feat: Google-recommended resumable upload protocol for AAB/APK uploads — files are streamed in 8 MB chunks instead of buffering the entire file in memory
- feat: Automatic resume on failure — interrupted uploads resume from the last successful byte using the session URI (valid for 1 week)
- feat: Real-time upload progress bar with byte-level tracking, throughput, and ETA: `████████░░░░ 58% 120/207 MB 2.4 MB/s ETA 36s`
- feat: Files under 5 MB automatically use simple upload (less overhead); files >= 5 MB use resumable upload
- feat: New env vars: `GPC_UPLOAD_CHUNK_SIZE` (chunk size in bytes, must be multiple of 256 KB) and `GPC_UPLOAD_RESUMABLE_THRESHOLD` (file size threshold for resumable upload)

**Google Best Practices Compliance**

- fix: Upload file size limits corrected to match Google's API limits — AAB max raised from 500 MB to **2 GB**, APK max raised from 150 MB to **1 GB**
- fix: File validation now reads only 4 bytes for magic number check instead of loading the entire file into memory
- fix: HTTP 408 (Request Timeout) is now retried — previously only 429 and 5xx were retried
- fix: Default max retries raised from 3 to **5** (Google recommends 5–10)
- feat: Reporting API rate limiting — new `reporting` bucket enforces Google's 10 queries/sec limit on all vitals/metrics endpoints
- feat: Edit session expiry warning — warns when an edit is within 5 minutes of expiring before starting long operations
- feat: `getSubscriptionV1()` now emits a `DeprecationWarning` — Google deprecated `purchases.subscriptions.get` (shutdown August 2027), recommending `getSubscriptionV2()` instead
- fix: `inappproducts.list` no longer sends deprecated `maxResults` parameter — Google ignores it; only `token` (pageToken) is used for pagination

**Bug Fixes**

- fix: `gpc quickstart` exits 1 even when `gpc doctor` passes — was spawning `node <bun-binary> doctor` which fails on Homebrew/binary installs; now spawns `gpc doctor` directly **(Bug M)**
- fix: `gpc vitals lmk` and `gpc vitals memory` — 400 INVALID_ARGUMENT from API; added base `stuckBackgroundWakelockRate` metric alongside the weighted variants **(Bug H)**
- fix: `gpc vitals crashes/anr/wakeup/battery` table headers showed array indices (`0`, `1`, `2`) instead of metric names — added defensive handling for array-format API responses **(Bug T)**
- fix: `gpc vitals startup` — 400 INVALID_ARGUMENT because `startType` was rejected as invalid dimension; added `startType` to valid dimensions and auto-includes it for startup queries **(Bug U)**
- fix: `gpc pricing convert` — raw 400 FAILED_PRECONDITION on apps with no monetization; now shows friendly error message **(Bug R)**
- fix: `gpc releases notes get` — improved empty-notes message for completed releases with hint to use `gpc releases diff` **(Improvement S)**

---

## v0.9.37

_March 2026_

**Security**

- fix: `gpc plugins install/uninstall` — replaced `execSync` with shell string interpolation with `spawnSync` using array arguments, eliminating command injection risk when plugin names contain shell metacharacters

**Code Quality**

- fix: Renamed internal `PlayApiError` class in `@gpc-cli/api` (was `ApiError`) to eliminate naming collision with `@gpc-cli/core`'s `ApiError` — no user-facing behavioral change
- fix: `runWatchLoop()` validation now throws instead of calling `process.exit(2)` — core packages should not exit the process directly
- fix: `@gpc-cli/auth` workspace dependency specifier changed from `workspace:^` to `workspace:*` — consistent with all other internal workspace packages

---

## v0.9.36

_March 2026_

**Bug Fixes**

- fix: `gpc vitals lmk` — correct metric names to `stuckBackgroundWakelockRate7dUserWeighted` / `28dUserWeighted`; base metric name was rejected by the API with 400 INVALID_ARGUMENT
- fix: `gpc quickstart` — removed `--quiet` flag from internal `doctor` subprocess; Commander treated it as an unknown subcommand option causing exit 1 even when all checks passed
- fix: `gpc quota usage` — output now matches `quota status` format; `topCommands` no longer renders as `[object Object]`

**Security**

- fix: Desktop notification command injection — `sendNotification` now uses `execFile` with array arguments instead of `execSync` with a shell string; eliminates shell injection via notification title/body on all platforms

---

## v0.9.35

_March 2026_

**Bug Fixes**

- fix: `gpc version` reports `0.0.0` on npm install — `__GPC_VERSION` is now injected at build time via tsup `define`
- fix: Stale edit session after crash — detects `FAILED_PRECONDITION: edit has expired` and auto-retries with a fresh edit
- fix: `gpc vitals lmk` — dedicated function with correct metric set and DAILY aggregation (was using wrong metrics from `memory`)
- fix: Windows install gap — `scripts/install.sh` now detects MINGW/MSYS/CYGWIN; new PowerShell installer `scripts/install.ps1` with SHA-256 verification

**Terminal UX**

- feat: Terminal-width-aware table columns — widths scale with `process.stdout.columns` instead of a fixed 60-char cap
- feat: Numeric cells (counts, percentages, version codes) right-aligned in all tables
- feat: Bold headers and `─` separator line in table output
- feat: Spinner on `gpc status` while parallel API calls run

**Onboarding**

- feat: `gpc auth login` interactive wizard — prompts for auth method, credentials path, profile name, and package when no flags given
- feat: `gpc quickstart` — 4-step guided setup: check config, verify credentials, confirm package, run doctor; shows next steps
- feat: `gpc auth setup-gcp` — step-by-step service account creation guidance

**Listing Text Optimization**

- feat: `gpc listings lint` — local lint against Play Store character limits (title 30, shortDesc 80, fullDesc 4000)
- feat: `gpc listings analyze` — live analysis of remote listings with locale coverage check
- feat: `gpc listings push` preflight gate — aborts if any field exceeds limit (override with `--force`)
- feat: Enhanced `gpc listings diff` — word-level inline diff for fullDescription, `--lang` filter

**New Commands**

- feat: `gpc grants` — standalone per-app grant management: `list`, `create`, `update`, `delete`
- feat: `gpc reviews analyze` — local sentiment analysis: topic clustering, keyword frequency, rating distribution
- feat: `gpc vitals compare-versions <v1> <v2>` — side-by-side crash/ANR/startup/rendering comparison
- feat: `gpc vitals watch --auto-halt-rollout` — continuous monitor that halts rollout on threshold breach
- feat: `gpc train` — config-driven staged rollout pipeline with vitals gates and delay scheduling
- feat: `gpc quota` — API quota usage tracking from audit log
- feat: `gpc subscriptions analytics` — active/draft/inactive plan counts, offer totals
- feat: `gpc games` — Play Games Services: leaderboards, achievements, events
- feat: `gpc enterprise` — Managed Google Play: create and list private enterprise apps
- feat: `gpc doctor --fix` — auto-fix failing checks (permissions, missing directories, config init)

**Ecosystem**

- feat: `gpc --apps <csv>` global flag for multi-app operations
- feat: `gpc plugins search` — search the GPC plugin registry
- feat: `gpc plugins install <name>` — install and approve a plugin from npm
- feat: `gpc plugins uninstall <name>` — uninstall and revoke a plugin
- feat: `gpc bundle analyze --top <n>` — show top N largest files
- feat: `gpc bundle analyze --config .bundlesize.json` — check against per-module size thresholds
- feat: Pager support — long lists auto-pipe to `$PAGER` when output exceeds terminal height

**Other**

- feat: `gpc purchases subscription refund <token>` — refund a subscription using v2 API
- feat: Color output on `gpc validate` — pass shows `✓` in green, fail `✗` in red

**Stats:** 1,536 tests · 7 packages · 187+ API endpoints

---

## v0.9.34

**Bug Fixes**

- fix: `gpc iap batch-get` — replaced 403 crash with a proper deprecation notice; the underlying Google endpoint is permanently blocked. Use `gpc iap get <sku>` or `gpc iap list` instead
- fix: `gpc migrate fastlane` — warns before overwriting an existing `.gpcrc.json`; aborts unless `--yes` is passed

**Color Output**

- feat: `✓` green, `✗` red, `⚠` yellow indicators across `vitals`, `doctor`, `status`, and `validate`
- feat: Track status colors — `inProgress` green, `halted` red, `draft` dim
- feat: Diff coloring — additions green, removals red in `listings diff` and `releases diff`
- feat: `NO_COLOR` / `FORCE_COLOR` environment variable support; `--no-color` now also sets `NO_COLOR=1`

**Onboarding**

- feat: First-run banner — any command shows `✦ First time? Run gpc config init to get set up.` when no config is found
- feat: Auth errors (403/401) now append `→ Run gpc doctor to diagnose your credentials.`
- feat: `gpc config init` automatically runs `gpc doctor` inline on completion
- feat: `gpc doctor` success now prints `✓ Ready. Try: gpc status`

**New Commands**

- feat: `gpc reviews reply <review-id> --text "..."` — reply to a user review directly from the terminal; shows character count on success
- feat: `gpc anomalies list` — surface automatic quality spikes from the Play Developer Reporting API
- feat: `gpc vitals wakeup` — query excessive wake-up rate (battery drain signal)
- feat: `gpc vitals lmk` — query Low Memory Killer events (memory pressure signal)

**Stats:** 1,504 tests · 7 packages · 187 API endpoints

## v0.9.33

_March 2026_

- **fix: `gpc version --json` outputs structured JSON** — was printing plain version text regardless of the flag; now returns `{ version, node, platform, installMethod }` as JSON
- **fix: `GPC_DEBUG=1` no longer causes intermittent "too many arguments" errors** — debug mode was injecting `--verbose` into `process.argv` before command parsing, which could corrupt subcommand routing
- **fix: `--vitals-gate` with `--dry-run` now warns instead of silently skipping** — combining the two flags previously gave no indication the gate wasn't running; now prints a warning to stderr
- **docs: product name updated to "GPC — Google Play Console CLI"** — README, docs site, npm package descriptions, `gpc --help`, and GitHub repo metadata
- 1,467 tests

## v0.9.32

_March 2026_

- **feat: live upload progress bar** — `gpc releases upload` now shows a live progress line during AAB uploads: `Uploading my-app.aab  22.1 / 58.7 MB  (38%)`
- **feat: `gpc releases notes get`** — reads release notes per track and language directly from the Play Console
- **feat: `--vitals-gate` on rollout increase** — `gpc releases rollout increase --vitals-gate` halts the rollout if the crash rate exceeds your configured threshold, preventing a bad build from reaching more users
- **feat: "Did you mean?" suggestions** — mistyped commands now show the closest match: `Unknown command "releses". Did you mean "releases"?`
- **feat: `gpc version --json`** — outputs structured version and install info (version, installMethod, platform, node) as JSON
- **feat: `gpc cache`** — manage status, token, and update-check cache: `gpc cache list`, `gpc cache clear`, `gpc cache clear --type token`
- **feat: `gpc auth token`** — prints the current access token to stdout (useful for scripting and debugging)
- **feat: `gpc feedback`** — opens a pre-filled GitHub issue in your browser with system diagnostics attached
- **feat: `GPC_DEBUG` and `GPC_NO_COLOR` environment variables** — `GPC_DEBUG=1` enables verbose debug output; `GPC_NO_COLOR=1` disables ANSI color
- **feat: release notes length warning** — `gpc validate` now warns when any release notes entry exceeds the Play Store's 500-character limit
- **fix: Homebrew install correctly detected when running as a compiled binary** — `gpc update` now identifies Homebrew installs even inside a compiled binary context
- **fix: `gpc releases notes set` shows redirect immediately** — the command now prints the redirect message regardless of arguments instead of silently doing nothing in some cases
- **fix: `gpc status --format summary` shows "no vitals" / "no reviews" when data is absent** — was previously blank or crashed on empty data
- **fix: `gpc update --check` always shows detected install method** — install method is now reported even when no update is available
- **fix: `gpc releases upload` rejects non-.aab / .apk files before any API call** — invalid file extensions exit 2 immediately with a clear error message
- 1,461 tests

## v0.9.31

_March 2026_

- **feat: `gpc update` shows download progress** — binary installs now display a live progress line: `Downloading gpc-darwin-arm64 (58.7 MB)  14.2 / 58.7 MB  (24%)`
- **fix: `gpc update --output json` no longer polluted by npm/brew output** — npm and Homebrew stdout is redirected to stderr in JSON mode so the machine-readable output stays parseable
- **fix: running `gpc update` no longer triggers a redundant background update check** — the passive npm registry check is now skipped entirely when the command is `update`

## v0.9.30

_March 2026_ · _Superseded by v0.9.31 — use v0.9.31 or later_

- **feat: `gpc update`** — self-update command that detects your install method (npm, Homebrew, or standalone binary) and delegates to the right mechanism automatically
- **feat: `gpc update --check`** — checks for a newer version without installing; always exits 0 (use `--output json` to parse `updateAvailable` in CI)
- **feat: `gpc update --force`** — reinstalls even when already on the latest version
- **feat: binary update checksum verification** — SHA-256 of the downloaded binary is verified against `checksums.txt` from the release before swapping the binary in place
- **fix: update notification says "Run: gpc update"** — the passive update hint shown after other commands now gives the correct command for all install methods instead of showing the npm command to Homebrew and binary users
- 1,453 tests

## v0.9.29

_March 2026_

- **fix: `gpc releases upload` / `gpc publish` abort early when file is missing** — stat preflight runs before auth is resolved, so a typo in the file path gives instant feedback (exit 2) rather than waiting for credential loading
- **fix: `gpc releases upload` spinner shows filename and size** — was always "Uploading bundle…"; now shows "Uploading my-app.aab (12.3 MB)…"
- **fix: `gpc releases status` rollout shows as percentage** — was "0.1", now "10%"
- **fix: `gpc releases status` sorts tracks by priority** — production → beta → alpha → internal by default when `--sort` is not specified
- **fix: `gpc releases promote` rejects same-track promote** — `--from internal --to internal` now exits 2 with a clear error
- **fix: `gpc releases promote --rollout` validates range** — exits 2 for values outside 1–100, same as `releases upload`
- **fix: `gpc releases rollout increase --to` validates range** — exits 2 for values outside 1–100; dry-run now shows "25%" not "25"
- **fix: `gpc releases notes set` honest error** — was silently printing "Release notes set" without calling any API; now exits 1 with a message directing you to `--notes` on `releases upload` or `publish`
- **fix: `gpc status --sections` filter applies to cached data** — sections requested at display time now filter the cached snapshot correctly (closes bug #9b introduced in v0.9.26)
- **fix: `gpc status --days` validates positive integer** — `--days 0` or `--days -1` now exits 2 before any API calls
- **fix: `gpc status --watch` warns when combined with `--since-last`** — `--since-last` is incompatible with watch mode; now prints a warning to stderr instead of silently ignoring it
- **fix: `gpc status --since-last` diff header uses relative time** — "Changes since 5h ago:" instead of "Changes since 3/17/2026, 10:42:01 AM:"
- **fix: `gpc status` header timestamps use relative time** — "fetched 5 min ago" / "cached 2h ago" instead of a full locale date string
- **fix: `gpc audit list/search` show human-readable timestamps** — table output shows "5 min ago", "14:23:45", "Mon 14:23", or "Mar 14, 2026" depending on age; JSON output preserves raw ISO strings
- **feat: `gpc docs [topic]`** — opens a specific docs page directly; `gpc docs releases` opens the releases reference, `gpc docs --list` shows all available topics
- 1,420 tests (→ 1,453 after v0.9.30–v0.9.31)

## v0.9.28

_March 2026_

- **fix: `gpc audit clear --dry-run` no longer deletes entries** — the global `--dry-run` flag was consumed by the root program before the `audit clear` subcommand action ran, making `options.dryRun` always `undefined`. Entries were deleted. Now uses `isDryRun(cmd)` to read from root opts — same fix pattern as `gpc doctor --json` in v0.9.25.
- 1,392 tests

## v0.9.27

_March 2026_

- **fix: `gpc status --sections` now filters output** — `--sections vitals` previously skipped the API calls correctly but still rendered all three sections (RELEASES, VITALS, REVIEWS). Now only the requested sections appear in both table and JSON output.
- 1,391 tests

## v0.9.26

_March 2026_

- **feat: trend arrows on vitals** — `gpc status` now shows ↑↓ next to crash rate and ANR rate, comparing the current window against the prior period so you can see at a glance if things are improving or worsening
- **feat: `--format summary`** — one-liner output for shell prompts and post-deploy hooks: `com.example.app · v142 internal · crashes 1.20% ↓ ✓ · avg 4.1★`
- **feat: `--sections <list>`** — fetch only what you need; `--sections vitals` skips the releases and reviews API calls entirely
- **feat: `--watch [N]`** — real polling loop with terminal clear, Ctrl+C to stop, min 10s interval, default 30s
- **feat: `--since-last`** — diff mode: shows version, crash rate, ANR rate, and rating deltas vs the last cached run
- **feat: `--all-apps`** — run status for all configured app profiles in one command (max 5 apps)
- **feat: `--notify`** — desktop notification on threshold breach or clear (macOS, Linux, Windows); skipped in CI; only fires on state change
- **fix: unknown vitals/reviews display** — shows `—` instead of `?`/`n/a`; renders "No vitals data available for this period" or "No reviews in this period" when there is nothing to show
- 1,388 tests

## v0.9.25

_March 2026_

- **fix: gpc publish / gpc releases upload always failed** — Google Play API returns `Bundle` directly from the upload endpoint, not wrapped in `{ bundle: Bundle }`. The client was accessing `data.bundle` (always `undefined`), throwing "Upload succeeded but no bundle data returned" on every upload even though the file transferred successfully.
- **fix: gpc doctor --json always output human-readable text** — the global `-j, --json` option on the root Commander program was consumed before the `doctor` subcommand action ran. Now reads `cmd.parent?.opts()`.
- **fix: gpc status --days N / gpc vitals compare --days N wrong date window** — Commander calls `parseInt(value, previousValue)` when a coerce function and default are both given. Using `parseInt` directly meant the default (e.g. `7`) was passed as the radix — `parseInt("7", 7)` = NaN, `parseInt("14", 7)` = 11. Now uses `(v) => parseInt(v, 10)`.
- **fix: gpc validate table output showed raw JSON** — `ValidateResult.checks[]` was passed directly to `formatOutput`, producing `JSON.stringify(...)` in table/markdown cells. Now flattens checks to rows with a separate warnings list and `Valid`/`Invalid` footer.
- **fix: JUnit name attribute showed `-` for releases status** — commands that set `name: s["name"] || "-"` produced sentinel `"-"` strings that stopped the `??` fallback chain. Now uses a loop that skips `""` and `"-"`, falling through to `track`, `versionCode`, etc.
- 1,358 tests

## v0.9.24

_March 2026_

- **Feat: gpc status** — unified app health snapshot: releases, vitals, and reviews in one command. 6 parallel API calls, results in under 3 seconds. Cached 1 hour. `--cached`, `--refresh`, `--watch <seconds>`, `--days`. Exit code 6 if any vitals threshold is breached. See [status command](/commands/status).
- **Fix: migrate rollout mapping** — `supply(rollout: "0.1")` now correctly maps to `gpc releases upload --rollout 10` (was `releases promote`)
- **Feat: migrate --dry-run** — `gpc migrate fastlane --dry-run` previews the migration plan and `.gpcrc.json` without writing any files
- **Feat: migrate conflict detection** — warns before overwriting an existing `.gpcrc.json`
- **Feat: parse warnings** — Fastlane complex Ruby constructs (begin/rescue/if/unless) now surface a warning in migration output instead of silently producing incomplete lane detection
- **Fix: validate warnings surfaced** — file validation warnings (e.g., "Large file") are now included in `ValidateResult.warnings` and shown to the user
- **Feat: git notes truncation flag** — `generateNotesFromGit` now returns `truncated: boolean`; CLI warns to stderr when release notes were trimmed
- **Fix: doctor package name check** — added Android package name format validation to `gpc doctor`
- **Feat: config init wizard** — `gpc config init` now runs a guided setup wizard with auth method selection, file existence validation, and post-init summary
- **Fix: publish rollout guard** — `gpc publish` rejects non-finite and out-of-range rollout values (< 1 or > 100) with exit code 2
- 1,355 tests

## v0.9.23

_March 2026_

- **Feat: bundle analysis** — new `gpc bundle analyze` and `gpc bundle compare` commands for zero-dependency AAB/APK size breakdown by module and category, with `--threshold` CI gate (exit code 6 on breach)
- **Fix: vitals compare 400 error** — `gpc vitals compare` now uses non-overlapping date ranges, preventing `start_time must be earlier than end_time` API errors
- **Feat: --dry-run for 4 more commands** — `tracks create`, `tracks update`, `device-tiers create`, and `internal-sharing upload` now support `--dry-run`
- **Fix: exit code consistency** — `data-safety get/export` and `reports download financial/stats` now exit 2 (usage error) instead of 1 for unsupported operations
- 1,299 tests

## v0.9.22

_March 2026_

- **Feat: table flattening audit** — `releases status`, `reviews list`, `vitals crashes/anr/overview`, `purchases get/voided`, `testers list`, `users list`, `device-tiers list` now show flat, readable columns instead of nested JSON objects
- **Feat: audit log querying** — new `gpc audit list`, `gpc audit search`, and `gpc audit clear` commands to query, filter, and manage the JSONL audit log
- **Feat: persistent vitals thresholds** — set thresholds once via `gpc config set vitals.thresholds.crashRate 2.0` — automatically checked on every `gpc vitals crashes` run (exit code 6 on breach)
- **Feat: batch IAP commands** — `gpc iap batch-get --skus sku1,sku2` and `gpc iap batch-update --file products.json` for bulk in-app product operations
- **Fix: vitals end-date freshness** — capped timeline end date to yesterday since the Reporting API data has ~1 day lag, fixing 400 errors on `vitals crashes`, `vitals anr`, and other metric queries
- 1,286 tests

## v0.9.21

_March 2026_

- **Fix: vitals crashes/anr 400 errors** — `timelineSpec` is now always included (defaults to 30 days), and each metric set uses its own valid metrics instead of hardcoded `errorReportCount`
- **Fix: reports GCS limitation** — `reports list` and `reports download` now show clear messages explaining that financial and stats reports are delivered via Google Cloud Storage, not the REST API
- **Fix: purchase-options redirect** — standalone `purchase-options` commands now redirect to `otp offers` (the correct sub-resource path)
- **Fix: pricing convert table** — correctly extracts `units`/`nanos`/`currencyCode` from the Money object instead of showing empty cells
- **Fix: subscriptions get listings** — handles array-format listings, showing language codes (`en-US, fr-FR`) instead of array indices (`0, 1, 2`)
- **Fix: generated-apks table** — flattens nested objects into readable columns (id, variantId, moduleName, sha256)
- **Fix: JUnit testcase names** — expanded fallback chain (`productId`, `packageName`, `trackId`, `region`, `languageCode`, `item-N`) instead of raw JSON dumps
- 1,276 tests

## v0.9.20

_March 2026_

- **Fix: vitals API endpoints** — corrected metric set names (`crashRateMetricSet` instead of `vitals.crashrate`) — vitals commands now work against the real Google Play Reporting API
- **Fix: upload timeout** — auto-scales based on file size (30s + 1s/MB), no more 30s hard limit; supports `--timeout` flag and `GPC_UPLOAD_TIMEOUT` env var
- **Fix: HTML error messages** — API errors returning HTML (e.g., 404 pages) are now stripped to plain text
- **Fix: data-safety get** — shows clear message that the Google Play API has no GET endpoint for data safety
- **Fix: listings push --dry-run** — no longer says "Listings pushed" in dry-run mode
- **Fix: recovery list** — requires `--version-code` (validated locally instead of sending invalid request)
- **Fix: empty output** — `otp list`, `testers list`, `device-tiers list`, `listings availability`, `vitals errors search`, and all vitals metric commands now show human-readable messages when no data
- **Fix: table formatting** — `subscriptions get`, `subscriptions offers list`, and `pricing convert` flatten nested objects for readable table output
- 1,273 tests

## v0.9.19

_March 2026_

- **Fix: OTP update regionsVersion + updateMask** — `otp update` and `otp offers update` now include `regionsVersion.version=2022/02` and auto-derived `updateMask`, matching the subscription fix from v0.9.18
- **Fix: table cell truncation** — cells wider than 60 characters are truncated with `...` in table and markdown output
- **Fix: flatten subscriptions/OTP list** — `subscriptions list` and `otp list` show readable summaries (productId, counts, state) in table/markdown output instead of nested JSON blobs
- **Fix: better JSON parse errors** — file read errors now include the filename in the error message
- **`gpc releases diff`** — compare releases between two tracks (`--from internal --to production`), showing version codes, status, rollout, and release notes differences
- **`gpc subscriptions diff`** — compare a local JSON file against the remote subscription state
- **`gpc otp diff`** — compare a local JSON file against the remote one-time product state
- 1,271 tests

## v0.9.18

_March 2026_

- **Fix: regionsVersion on subscription update** — `subscriptions update` and `offers update` now always include the `regionsVersion.version=2022/02` query param, matching the existing create behavior
- **Fix: table/markdown [object Object]** — table and markdown output formatters now render nested objects as JSON instead of displaying `[object Object]`

## v0.9.17

_March 2026_

- **Fix: subscriptions create validation** — auto-add `regionsVersion.version` query param, strip output-only fields (`state`, `archived`), auto-prefix `prorationMode` enum values
- **Fix: one-time products create** — add missing `regionsVersion.version` query param
- **Client-side validation** — benefits max 4, description max 80 chars, `gracePeriodDuration` + `accountHoldDuration` must sum to P30D–P60D, `Money.units` coerced to string
- **`subscriptions create --activate`** — auto-activate DRAFT base plans after creation
- **Empty result messages** — `reviews list` and `vitals overview` now show helpful messages when no data is available
- 1,262 tests

## v0.9.16

_March 2026_

- **Fix: `subscriptions create` missing productId** — `productId` and `offerId` are now correctly passed as query parameters when creating subscriptions and offers

## v0.9.15

_March 2026_

- **Fix: `--output` flag ignored** — table, yaml, markdown, and junit output formats now work correctly via `--output` flag and config
- **Fix: `recovery list` used POST instead of GET** — corrected HTTP method, added `--version-code` filter
- **Fix: `iap list/get` used deprecated API** — migrated to oneTimeProducts API (inappproducts endpoint deprecated, shutdown Aug 2027)
- **Fix: vitals errors/anomalies missing OAuth scope** — auth now requests `playdeveloperreporting` scope alongside `androidpublisher`
- **Fix: `data-safety get/update` used edits workflow** — data safety API calls no longer require edit insert/commit
- **Fix: missing query params** — added `productId` for subscriptions.create, `offerId` for createOffer, `regionsVersion` for update/updateOffer, `autoConvertMissingPrices`/`allowMissing` for inappproducts
- 1,262 tests (up from 1,255)

## v0.9.14

_March 2026_

- **Fix: subscriptions API paths** — removed incorrect `/monetization/` segment from all 17 subscription endpoint paths (list, get, create, update, delete, basePlans, offers)
- **Fix: convertRegionPrices path** — corrected from `/monetization/convertRegionPrices` to `/pricing:convertRegionPrices`
- Added troubleshooting docs for enabling the Play Developer Reporting API (required for vitals commands)

## v0.9.13

_March 2026_

- **`gpc install-skills`** — interactive wizard for installing agent skills (pick skills, target agents, review security, install)
- Updated Homebrew formula to v0.9.13 with standalone binaries for all 5 platforms
- Docs consistency pass — all version, endpoint, and test count references aligned

## v0.9.12

_March 2026_

- **Input validation** at core layer for package names, SKUs, version codes, language codes, and track names
- **Security hardening** — aligned sensitive key redaction (23 field patterns), error message truncation to prevent key leakage
- **1,255 tests** (up from 932) — added API coverage, credential security, redaction, error codes, help consistency, e2e tests
- Performance benchmarks: CLI cold start under 300ms, command latency sub-millisecond
- License compliance checker for all production dependencies
- New docs: tracks command page, interactive mode and dry-run guides
- Release workflow: pre-publish dry-run, npm provenance, post-publish verification
- `engines.node >= 20` declared on all packages

## v0.9.11

_March 2026_

- New documentation pages: agent skills, troubleshooting, FAQ, changelog
- Enhanced `gpc doctor` with additional environment checks
- CLI help text improvements across all commands

## v0.9.10

_March 2026_

- Improved error messages with actionable suggestions for common failures
- Polished help text and command descriptions
- Enhanced `gpc doctor` output with more diagnostic checks

## v0.9.9

_March 2026_

- Final pre-launch polish with full API coverage and CLI refinements
- Updated test suite to 932 tests across all packages
- Bug fixes and stability improvements

## v0.9.8

_March 2026_

- Published all 7 packages to npm under the `@gpc-cli` scope
- Added Homebrew tap: `brew install yasserstudio/tap/gpc`
- Standalone binary builds for macOS, Linux, and Windows (5 platform targets)
- Complete API coverage reaching ~187 endpoints

## v0.9.7

_March 2026_

- Launched VitePress documentation site at [yasserstudio.github.io/gpc](https://yasserstudio.github.io/gpc/)
- Security audit and hardening across all packages
- New command pages for recovery, data safety, and external transactions
- DX improvements and SDK polish

## v0.9.6

_March 2026_

- Plugin SDK with lifecycle hooks and custom command registration
- Plugin CI package for CI/CD integration helpers
- Auto-update checker with 24-hour cache
- Enhanced `--dry-run` for releases, upload, and publish commands
- Consolidated all documentation into VitePress (`apps/docs/`)

## v0.9.5

_March 2026_

- Security hardening and input validation across all packages
- Added 88 edge case tests (597 to 685 total)
- Reports, users, testers, and grants commands
- CSV import for tester management
- Bug fixes for auth token refresh

---

For the complete release history and migration guides, visit the [GitHub Releases](https://github.com/yasserstudio/gpc/releases) page.

---

## Road to 1.0

GPC is in the **0.9.x pre-release series**. The goal for 1.0 is a stable, polished tool that earns a permanent place in every Android team's CI pipeline.

What 1.0 means in practice:

- **`gpc quickstart`** — a single guided flow that takes a new user from zero to a working setup: detects config state, verifies credentials, runs doctor, shows next steps
- **`gpc doctor --fix`** — inline remediation for each failing check, instead of just diagnosing
- **Terminal UX polish** — spinners during multi-API waits, terminal-width-aware tables, number alignment
- **GitHub Actions marketplace action** — `uses: yasserstudio/gpc-action@v1` with no shell setup required
- **Stability soak** — 2+ weeks in production across real apps with no critical bugs
- **Public launch** — blog post, Android Weekly, community announcements

No ETAs. Shipping speaks louder.
