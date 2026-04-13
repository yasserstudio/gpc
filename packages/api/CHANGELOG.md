# @gpc-cli/api

## 1.0.32

### Patch Changes

- API fixes, new endpoints, type completeness

## 1.0.31

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

## 1.0.30

### Patch Changes

- 0a728e4: API freshness audit (synced with Jan 2026 Google Play API release notes) and a multi-profile CLI fix.
  - fix(api): correct `offerPhase` shape — union object on `SubscriptionPurchaseLineItem`, not a string, and not on the V2 root
  - feat(api): type `revokeSubscriptionV2` request body with `revocationContext` union (`fullRefund`, `proratedRefund`, `itemBasedRefund`)
  - feat(api): type `acknowledgeSubscription` body with optional `externalAccountId`
  - docs(api): clarify `subscriptionsv2.defer` add-ons behavior
  - fix(cli): `--profile` / `-p` global flag now actually switches profiles. Previously silently ignored — all commands used the default profile

- Updated dependencies [0a728e4]
  - @gpc-cli/auth@0.9.12

## 1.0.29

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

## 1.0.28

### Patch Changes

- fix: skip edits.validate for rejected apps, publish dry-run params, importTestersFromCsv commitOptions, expansion upload validation

## 1.0.27

### Patch Changes

- API completeness: missing Google Play API parameters, new CLI flags, expansion files resource

## 1.0.26

### Patch Changes

- API completeness, RTDN, rate limiter rewrite, bug fixes

## 1.0.25

### Patch Changes

- Deep code review, error handling overhaul, doctor enhancements, 7 new API endpoints
- Updated dependencies
  - @gpc-cli/auth@0.9.11

## 1.0.24

### Patch Changes

- Code review fixes, API catch-up (5 new endpoints → 192 total), deprecation roadmap doc.

## 1.0.23

### Patch Changes

- fix: X-GUploader-No-308 header for resumable uploads + 12 enhanced error messages

## 1.0.22

### Patch Changes

- fix: resumable upload final chunk completion detection and hardening

## 1.0.21

### Patch Changes

- Resumable uploads, Google best practices compliance, bug fixes

## 1.0.20

### Patch Changes

- fix: security and code quality improvements
  - fix(cli): replace execSync shell interpolation with spawnSync array args in `gpc plugins install/uninstall` — eliminates command injection risk when plugin names contain shell metacharacters
  - fix(api): rename internal `ApiError` class to `PlayApiError` to eliminate naming collision with `@gpc-cli/core`'s `ApiError` — no behavioral change, single import site updated
  - fix(core): replace `process.exit(2)` with a thrown error in `runWatchLoop()` validation — core packages should not call `process.exit` directly
  - fix(cli): change `workspace:^` to `workspace:*` for `@gpc-cli/auth` dependency — consistent with all other workspace packages

## 1.0.19

### Patch Changes

- v0.9.35 — The Big One: Full Pre-1.0 Feature Release

  Bug fixes: version reporting (Bug J), stale edit session auto-retry (Bug I), vitals lmk metrics (Bug H), Windows installer (Bug K), docs flags (Bug L), validate color output.

  Terminal UX: dynamic table width, numeric right-alignment, bold headers, spinner on status.

  Onboarding: gpc auth login interactive wizard, gpc quickstart guided setup, gpc auth setup-gcp, destructive command confirmations, pager for long lists.

  Listing text: gpc listings lint/analyze (local lint + remote analysis), push preflight gate, enhanced diff with word-level inline changes.

  New commands: gpc grants, gpc reviews analyze (local NLP sentiment), gpc vitals compare-versions, gpc vitals watch --auto-halt-rollout, gpc train (staged rollout pipeline), gpc quota, gpc subscriptions analytics, gpc games (Play Games Services), gpc enterprise (Managed Google Play).

  API additions: orders.get/batchGet, grants CRUD, refundSubscriptionV2, batchMigratePrices, GamesApiClient, EnterpriseApiClient.

## 1.0.18

### Patch Changes

- Bug fixes and branding update: fix gpc version --json, fix GPC_DEBUG argv mutation, warn on --vitals-gate with --dry-run, update product name to GPC — Google Play Console CLI
- Updated dependencies
  - @gpc-cli/auth@0.9.10

## 1.0.17

### Patch Changes

- fix: `bundles.upload` always threw "Upload succeeded but no bundle data returned" — Google Play API returns `Bundle` directly (not `{ bundle: Bundle }`); changed to `http.upload<Bundle>` and return `data` directly

## 1.0.16

### Patch Changes

- fix: vitals API endpoints, upload timeout auto-scaling, empty output messages, table formatting, HTML error sanitization

## 1.0.15

### Patch Changes

- fix: OTP update regionsVersion + updateMask, table cell truncation, flatten list output, readJsonFile helper, releases diff, subscriptions diff, otp diff

## 1.0.14

### Patch Changes

- Fix regionsVersion query param on subscription update, fix table [object Object] display

## 1.0.13

### Patch Changes

- 577b462: Fix subscriptions create/update validation, add regionsVersion query param, and improve empty output messages

## 1.0.12

### Patch Changes

- fix: resolve 5 bugs found during live testing
  - Fix --output flag ignored (table/yaml/markdown/junit formats now work)
  - Fix recovery list using POST instead of GET, add --version-code filter
  - Fix iap list/get using deprecated inappproducts API (now uses oneTimeProducts)
  - Fix vitals errors/anomalies missing OAuth scope (playdeveloperreporting)
  - Fix data-safety get/update incorrectly using edits workflow
  - Add missing query params for subscriptions and inappproducts create/update

- Updated dependencies
  - @gpc-cli/auth@0.9.9

## 1.0.11

### Patch Changes

- fix: correct API endpoint paths for subscriptions and convertRegionPrices
  - Remove incorrect `/monetization/` segment from all subscription API paths (list, get, create, update, delete, basePlans, offers)
  - Fix convertRegionPrices path from `/monetization/convertRegionPrices` to `/pricing:convertRegionPrices`
  - Add troubleshooting docs for enabling the Play Developer Reporting API for vitals commands

## 1.0.10

### Patch Changes

- fda9c08: Pre-1.0 hardening: input validation, security review, expanded test coverage, performance benchmarks, license compliance, docs polish
- Updated dependencies [fda9c08]
  - @gpc-cli/auth@0.9.8

## 1.0.9

### Patch Changes

- fix: add missing error suggestions and enhance gpc doctor
  - Added suggestions to 3 API error fallbacks (null-byte path, network retry, upload retry)
  - Clarified help text for internal-sharing, generated-apks, external-transactions
  - Enhanced gpc doctor from 4 to 8 checks: config/cache dir permissions, proxy validation, CA cert, DNS resolution
  - Added --json output mode and severity levels (pass/fail/warn/info) to gpc doctor

## 1.0.8

### Patch Changes

- a87f244: v0.9.9 — Final pre-launch release with full API coverage, CLI polish, and migration tooling.

  New: track CRUD, externally hosted APKs, purchase options, IAP batch sync,
  JUnit XML output, progress spinners, bulk image export, Fastlane migration wizard,
  full shell completion, --ci mode, --json shorthand, typo suggestions.
  932 tests passing.

## 1.0.7

### Patch Changes

- be026d0: Complete API coverage: device tiers, internal app sharing, generated APKs, one-time products, app recovery create + targeting. Pagination on all list commands, dry-run on apps update, requireConfirm bug fix.

## 1.0.6

### Patch Changes

- c27752c: New API coverage (recovery, data safety, external transactions), DX improvements (--sort, --notify, git-based release notes, fish/PowerShell completions), typed error audit, and SDK READMEs.
- Updated dependencies [c27752c]
  - @gpc-cli/auth@0.9.7

## 1.0.5

### Patch Changes

- Enhanced dry-run for releases, auto-update checker, and 88 new edge case tests
- Updated dependencies
  - @gpc-cli/auth@0.9.6

## 1.0.4

### Patch Changes

- Security hardening, input validation, and bug fixes across all packages
- Updated dependencies
  - @gpc-cli/auth@0.9.5

## 1.0.3

### Patch Changes

- 74636b6: Add HTTP compression (Accept-Encoding: gzip), connection keep-alive, and parallel pagination support for improved network performance.
- 71d71ef: Add in-memory token cache with mutex to prevent concurrent refresh races. Move token fetch outside the HTTP retry loop so transient failures no longer trigger redundant token generations.
- Updated dependencies [71d71ef]
  - @gpc-cli/auth@0.1.3

## 1.0.2

### Patch Changes

- 0a55387: Add README files for all npm packages
- Updated dependencies [0a55387]
  - @gpc-cli/auth@0.1.2

## 1.0.1

### Patch Changes

- 5504b8e: Add publishConfig with public access for npm publishing
- Updated dependencies [5504b8e]
  - @gpc-cli/auth@0.1.1

## 1.0.0

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
  - @gpc-cli/auth@0.1.0
