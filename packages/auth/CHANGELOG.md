# @gpc-cli/auth

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
