---
outline: deep
---

# Changelog

All notable user-facing changes to GPC are documented here. For full release details, see the [GitHub Releases](https://github.com/yasserstudio/gpc/releases) page.

## v0.9.21 <Badge type="tip" text="latest" />

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
