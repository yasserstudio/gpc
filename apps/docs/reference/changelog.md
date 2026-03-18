---
outline: deep
pageClass: wide-page
---

# Changelog

All notable user-facing changes to GPC are documented here. For full release details, see the [GitHub Releases](https://github.com/yasserstudio/gpc/releases) page.

## v0.9.36 <Badge type="tip" text="latest" />

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
