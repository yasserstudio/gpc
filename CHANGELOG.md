# Changelog

All notable changes to GPC are documented here.

Format: [Conventional Commits](https://www.conventionalcommits.org/) with user-facing language.
Versioning: `0.9.x` pre-release series → `1.0.0` public launch.

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

Five bugs found during live testing against `tv.visioo.app`.

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
