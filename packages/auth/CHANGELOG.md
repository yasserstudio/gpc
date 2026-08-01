# @gpc-cli/auth

## 0.9.17

### Patch Changes

- Live Google Cloud Storage report download. `gpc reports list`, `gpc reports download stats`, and `gpc reports download financial` now fetch Play bulk-report CSVs directly from the account's GCS bucket (`pubsite_prod_<developerId>`) instead of erroring as unavailable. Discovery-first design: list a prefix, filter by month with digit-boundary matching, download, then gunzip and decode UTF-16 to clean UTF-8 CSV. Financial ZIP archives are unwrapped automatically (single CSV) or saved whole / inlined via `--json`. New flags: `--bucket`, `--dimension`, plus `reports.bucket` config and `GPC_REPORTS_BUCKET` env. `gpc doctor` gains a reports-bucket access probe and `gpc auth clear-cache` clears cached tokens without touching credentials.

  Least-privilege auth: the `devstorage.read_only` scope is requested only by the reports path (and the doctor probe), never by other commands; the token cache now keys tokens by scope so differently-scoped tokens cannot serve each other.

  Breaking (SDK surface only, CLI unaffected): `@gpc-cli/api` removes the non-functional `client.reports.list` endpoint and the `ReportBucket`/`ReportsListResponse` types (the Publisher API never served bulk reports); `@gpc-cli/core` replaces `downloadReport` with `downloadStatsReport`/`downloadFinancialReport` and changes the `listReports` signature to the GCS-backed form.

  Setup note: Play does not grant a service account access to the reports bucket automatically. Enable "View app information and download bulk reports (read-only)" for the service account in Play Console -> Users and permissions, and set `developerId` (or `reports.bucket`) so the bucket can be derived.

## 0.9.14

### Patch Changes

- Smarter changelog generation. `gpc changelog generate` reads your local git log, clusters related commits, lints subjects against project voice, and emits canonical GitHub Release markdown, JSON, or a paste-ready LLM prompt. Pipe `gpc changelog generate | gh release create vX -F -` to ship a release end-to-end. The existing `gpc changelog` (read-only viewer) is unchanged — `generate` is a new subcommand.

## 0.9.13

### Patch Changes

- Smarter tab-completion. Bash, zsh, and fish scripts now fill in live values for --profile, --app, and --track at TAB time by consulting your config and the gpc status cache (no API calls, under 150ms cold). Homebrew installs completion files automatically, so brew install yasserstudio/tap/gpc means TAB completion works in a fresh shell with zero setup. Zsh completion upgraded to real \_arguments integration.

## 0.9.12

### Patch Changes

- 0a728e4: API freshness audit (synced with Jan 2026 Google Play API release notes) and a multi-profile CLI fix.
  - fix(api): correct `offerPhase` shape — union object on `SubscriptionPurchaseLineItem`, not a string, and not on the V2 root
  - feat(api): type `revokeSubscriptionV2` request body with `revocationContext` union (`fullRefund`, `proratedRefund`, `itemBasedRefund`)
  - feat(api): type `acknowledgeSubscription` body with optional `externalAccountId`
  - docs(api): clarify `subscriptionsv2.defer` add-ons behavior
  - fix(cli): `--profile` / `-p` global flag now actually switches profiles. Previously silently ignored — all commands used the default profile

## 0.9.11

### Patch Changes

- Deep code review, error handling overhaul, doctor enhancements, 7 new API endpoints

## 0.9.10

### Patch Changes

- Bug fixes and branding update: fix gpc version --json, fix GPC_DEBUG argv mutation, warn on --vitals-gate with --dry-run, update product name to GPC — Google Play Console CLI

## 0.9.9

### Patch Changes

- fix: resolve 5 bugs found during live testing
  - Fix --output flag ignored (table/yaml/markdown/junit formats now work)
  - Fix recovery list using POST instead of GET, add --version-code filter
  - Fix iap list/get using deprecated inappproducts API (now uses oneTimeProducts)
  - Fix vitals errors/anomalies missing OAuth scope (playdeveloperreporting)
  - Fix data-safety get/update incorrectly using edits workflow
  - Add missing query params for subscriptions and inappproducts create/update

## 0.9.8

### Patch Changes

- fda9c08: Pre-1.0 hardening: input validation, security review, expanded test coverage, performance benchmarks, license compliance, docs polish

## 0.9.7

### Patch Changes

- c27752c: New API coverage (recovery, data safety, external transactions), DX improvements (--sort, --notify, git-based release notes, fish/PowerShell completions), typed error audit, and SDK READMEs.

## 0.9.6

### Patch Changes

- Enhanced dry-run for releases, auto-update checker, and 88 new edge case tests

## 0.9.5

### Patch Changes

- Security hardening, input validation, and bug fixes across all packages

## 0.9.4

### Minor Changes

- Align package version with umbrella release v0.9.4

## 0.1.3

### Patch Changes

- 71d71ef: Add in-memory token cache with mutex to prevent concurrent refresh races. Move token fetch outside the HTTP retry loop so transient failures no longer trigger redundant token generations.

## 0.1.2

### Patch Changes

- 0a55387: Add README files for all npm packages

## 0.1.1

### Patch Changes

- 5504b8e: Add publishConfig with public access for npm publishing

## 0.1.0

### Minor Changes

- 8e5c6be: Phase 9 — Production hardening
  - Lazy command loading via dynamic import (faster cold start)
  - Global `--dry-run` flag on all 30+ write operations
  - Unified error hierarchy: ApiError and AuthError now have exitCode and toJSON()
  - Proxy support via `HTTPS_PROXY` / `HTTP_PROXY` with undici ProxyAgent
  - Custom CA certificate support via `GPC_CA_CERT`
  - 368 total tests across 7 packages
