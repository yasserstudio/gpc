# @gpc-cli/config

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

- Code review fixes, API catch-up (5 new endpoints → 192 total), deprecation roadmap doc.

## 0.9.9

### Patch Changes

- Bug fixes and branding update: fix gpc version --json, fix GPC_DEBUG argv mutation, warn on --vitals-gate with --dry-run, update product name to GPC — Google Play Console CLI

## 0.9.8

### Patch Changes

- fda9c08: Pre-1.0 hardening: input validation, security review, expanded test coverage, performance benchmarks, license compliance, docs polish

## 0.9.7

### Patch Changes

- a87f244: v0.9.9 — Final pre-launch release with full API coverage, CLI polish, and migration tooling.

  New: track CRUD, externally hosted APKs, purchase options, IAP batch sync,
  JUnit XML output, progress spinners, bulk image export, Fastlane migration wizard,
  full shell completion, --ci mode, --json shorthand, typo suggestions.
  932 tests passing.

## 0.9.6

### Patch Changes

- c27752c: New API coverage (recovery, data safety, external transactions), DX improvements (--sort, --notify, git-based release notes, fish/PowerShell completions), typed error audit, and SDK READMEs.

## 0.9.5

### Patch Changes

- Security hardening, input validation, and bug fixes across all packages

## 0.9.4

### Minor Changes

- Align package version with umbrella release v0.9.4

## 0.1.3

### Patch Changes

- b46f1d1: Replace synchronous config discovery with async, cache homedir(), and exclude web-streams-polyfill from binary bundle (~207 KB savings).

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
