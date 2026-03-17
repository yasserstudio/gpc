# @gpc-cli/cli

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
  - feat: `--format summary` — one-liner output (`tv.visioo.app · v142 internal · crashes 1.20% ↓ ✓ · avg 4.1★`) for shell prompts and post-deploy hooks
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
