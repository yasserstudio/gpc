# @gpc-cli/cli

## 0.9.25

### Patch Changes

- fix: resolve upload, output, and date-window bugs (v0.9.25)

  **`gpc publish` / `gpc releases upload` — upload always failed**
  The Google Play API returns a `Bundle` object directly from the upload endpoint, not
  wrapped in `{ bundle: Bundle }`. The client was accessing `data.bundle` (always
  `undefined`), causing every upload to throw "Upload succeeded but no bundle data
  returned" even though the file transferred successfully.
  Fix: `http.upload<Bundle>`, validate with `data.versionCode`, return `data` directly.

  **`gpc doctor --json` — always printed human-readable text**
  The global `-j, --json` option on the root Commander program was consumed before
  the `doctor` subcommand action ran, making `opts.json` always `undefined` in the
  subcommand. Fix: removed local `--json` option from doctor and reads
  `cmd.parent?.opts()` in the action.

  **`gpc status --days N` / `gpc vitals compare --days N` — wrong date window**
  Commander calls `parseInt(valueString, previousValue)` when a coerce function and
  default are both provided. Using `parseInt` directly meant the default (e.g. `7`) was
  passed as the radix — `parseInt("7", 7)` = NaN, `parseInt("14", 7)` = 11.
  Fix: use `(v) => parseInt(v, 10)` lambda for all `--days` and `--ttl` options.

  **`gpc validate` table output — checks rendered as raw JSON**
  `ValidateResult.checks[]` was passed directly to `formatOutput`, producing
  `JSON.stringify(...)` in table/markdown cells. Fix: flatten checks to rows in the CLI
  command, with a separate warnings section and `Valid`/`Invalid` footer.

  **JUnit `name` attribute — showed `-` placeholder for releases status**
  Commands that set `name: s["name"] || "-"` produced non-null `"-"` strings that stopped
  the `??` fallback chain. Fix: replaced with a loop over candidate keys that skips `""` and
  `"-"` sentinel values, falling through to `track`, `versionCode`, etc.

- Updated dependencies
  - @gpc-cli/core@0.9.23
  - @gpc-cli/api@1.0.17

## 0.9.24

### Patch Changes

- v0.9.24: gpc status, publish polish, migrate polish, doctor/init polish

  **New: `gpc status`** — unified app health snapshot: releases, vitals, and reviews in one command. Six parallel API calls, 1-hour cache, threshold exit codes, full JSON output.

  **`gpc publish` polish** — clean validated→uploaded→released output for table mode; rollout range guard (1–100); file-size warnings now surface; git notes truncation warning; validation failures go to stdout respecting `--output`.

  **`gpc migrate fastlane` polish** — `--dry-run` flag to preview without writing files; fixed rollout mapping (`supply(rollout: "0.1")` now correctly maps to `gpc releases upload --rollout 10`); parse warnings for complex Ruby constructs; conflict warning before clobbering existing `.gpcrc.json`; plugin suggestion on unmapped lanes.

  **`gpc doctor` polish** — package name format validation; both API endpoints DNS-checked; counts summary (`✓ N passed · ⚠ N warnings · ✗ N failed`); config-missing error now suggests `gpc config init`.

  **`gpc config init` polish** — proper wizard: auth method selection (service account / ADC / skip), SA path existence validation, post-init summary, `gpc doctor` hint.

  **Bug fixes** — `compareVitalsTrend` timezone off-by-one (UTC timestamps); JUnit testcase name fallback includes `reviewId`/`track`/`versionCode`; `gpc bundle` markdown mode now renders proper GFM tables.

  **CI/CD** — CodeQL security scanning workflow, dependency review on PRs, bundle size reporter, branch protection on main.

- Updated dependencies
  - @gpc-cli/core@0.9.22

## 0.9.23

### Patch Changes

- Add bundle analysis commands, fix vitals compare date overlap, add --dry-run to 4 write commands, fix exit code consistency
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
