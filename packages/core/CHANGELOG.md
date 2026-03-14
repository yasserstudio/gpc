# @gpc-cli/core

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
