# @gpc-cli/plugin-sdk

## 0.9.8

### Patch Changes

- 0a728e4: API freshness audit (synced with Jan 2026 Google Play API release notes) and a multi-profile CLI fix.
  - fix(api): correct `offerPhase` shape — union object on `SubscriptionPurchaseLineItem`, not a string, and not on the V2 root
  - feat(api): type `revokeSubscriptionV2` request body with `revocationContext` union (`fullRefund`, `proratedRefund`, `itemBasedRefund`)
  - feat(api): type `acknowledgeSubscription` body with optional `externalAccountId`
  - docs(api): clarify `subscriptionsv2.defer` add-ons behavior
  - fix(cli): `--profile` / `-p` global flag now actually switches profiles. Previously silently ignored — all commands used the default profile

## 0.9.7

### Patch Changes

- Bug fixes and branding update: fix gpc version --json, fix GPC_DEBUG argv mutation, warn on --vitals-gate with --dry-run, update product name to GPC — Google Play Console CLI

## 0.9.6

### Patch Changes

- fda9c08: Pre-1.0 hardening: input validation, security review, expanded test coverage, performance benchmarks, license compliance, docs polish

## 0.9.5

### Patch Changes

- Security hardening, input validation, and bug fixes across all packages

## 0.9.4

### Minor Changes

- Align package version with umbrella release v0.9.4

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
