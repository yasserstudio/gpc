# @gpc-cli/plugin-ci

## 0.9.10

### Patch Changes

- Smarter changelog generation. `gpc changelog generate` reads your local git log, clusters related commits, lints subjects against project voice, and emits canonical GitHub Release markdown, JSON, or a paste-ready LLM prompt. Pipe `gpc changelog generate | gh release create vX -F -` to ship a release end-to-end. The existing `gpc changelog` (read-only viewer) is unchanged — `generate` is a new subcommand.
- Updated dependencies
  - @gpc-cli/plugin-sdk@0.9.10

## 0.9.9

### Patch Changes

- Smarter tab-completion. Bash, zsh, and fish scripts now fill in live values for --profile, --app, and --track at TAB time by consulting your config and the gpc status cache (no API calls, under 150ms cold). Homebrew installs completion files automatically, so brew install yasserstudio/tap/gpc means TAB completion works in a fresh shell with zero setup. Zsh completion upgraded to real \_arguments integration.
- Updated dependencies
  - @gpc-cli/plugin-sdk@0.9.9

## 0.9.8

### Patch Changes

- 0a728e4: API freshness audit (synced with Jan 2026 Google Play API release notes) and a multi-profile CLI fix.
  - fix(api): correct `offerPhase` shape — union object on `SubscriptionPurchaseLineItem`, not a string, and not on the V2 root
  - feat(api): type `revokeSubscriptionV2` request body with `revocationContext` union (`fullRefund`, `proratedRefund`, `itemBasedRefund`)
  - feat(api): type `acknowledgeSubscription` body with optional `externalAccountId`
  - docs(api): clarify `subscriptionsv2.defer` add-ons behavior
  - fix(cli): `--profile` / `-p` global flag now actually switches profiles. Previously silently ignored — all commands used the default profile

- Updated dependencies [0a728e4]
  - @gpc-cli/plugin-sdk@0.9.8

## 0.9.7

### Patch Changes

- Bug fixes and branding update: fix gpc version --json, fix GPC_DEBUG argv mutation, warn on --vitals-gate with --dry-run, update product name to GPC — Google Play Console CLI
- Updated dependencies
  - @gpc-cli/plugin-sdk@0.9.7

## 0.9.6

### Patch Changes

- fda9c08: Pre-1.0 hardening: input validation, security review, expanded test coverage, performance benchmarks, license compliance, docs polish
- Updated dependencies [fda9c08]
  - @gpc-cli/plugin-sdk@0.9.6

## 0.9.5

### Patch Changes

- Security hardening, input validation, and bug fixes across all packages
- Updated dependencies
  - @gpc-cli/plugin-sdk@0.9.5

## 0.9.4

### Minor Changes

- Align package version with umbrella release v0.9.4

## 0.1.2

### Patch Changes

- 0a55387: Add README files for all npm packages
- Updated dependencies [0a55387]
  - @gpc-cli/plugin-sdk@0.1.2

## 0.1.1

### Patch Changes

- 5504b8e: Add publishConfig with public access for npm publishing
- Updated dependencies [5504b8e]
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
  - @gpc-cli/plugin-sdk@0.1.0
