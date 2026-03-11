# @gpc-cli/api

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
