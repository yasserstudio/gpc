# Changelog

All notable changes to GPC are documented here.

---

## v0.9.6 — Phase 9 Complete

- **feat(cli):** Interactive mode — guided prompts for all commands with missing required options
- **feat(cli):** `--yes` / `-y` flag to skip confirmation prompts (CI-safe)
- **feat(cli):** Confirmation prompts on destructive operations (delete, remove, refund)
- **feat(cli):** `requireOption` / `requireConfirm` shared helpers
- **fix(core,api,auth,config):** Security audit — 12 findings fixed (credentials, paths, output)
- **feat(cli):** Standalone binary: linux-arm64 target (5 platforms total)
- **feat(cli):** Binary version injection from package.json
- **fix(cli):** Binary-mode networking (Bun handles proxy natively)
- **feat(cli):** Binary build metafile output for bundle analysis
- **docs:** VitePress documentation site (37+ pages, AI-optimized with llms.txt)
- **docs:** GitHub Actions deployment workflow for docs
- **docs:** Expanded migration guides (from Fastlane, from Console UI)
- 597 total tests

## v0.9.3 — Standalone Binary & Dependency Optimization

- **refactor(auth):** Replace `googleapis` (194MB) with `google-auth-library` (776KB) — 250x size reduction
- **feat(cli):** Standalone binary build via esbuild bundle + Bun compile
- **feat(cli):** Cross-platform targets: macOS (arm64/x64), Linux (x64), Windows (x64)
- **feat(ci):** GitHub Actions workflow to build and attach binaries to releases
- **feat(cli):** Install script (`curl | sh`) with SHA256 checksum verification
- **feat(cli):** Binary mode disables plugin loading (plugins require npm install)
- **test(e2e):** 8 smoke tests for bundled CLI (version, help, commands, flags)
- 584 total tests

## v0.9.2 — Interactive Mode & Audit Logging

- **feat(cli):** Interactive prompts for `releases upload`, `publish`, and `config init` when flags are missing
- **feat(cli):** Prompt utilities (select, input, confirm) with TTY/CI detection
- **feat(cli):** `--no-interactive` flag and `GPC_NO_INTERACTIVE` env var respected
- **feat(core):** Audit logging — all write operations logged to `~/.config/gpc/audit.log` (JSONL)
- **feat(core):** `initAudit`, `writeAuditLog`, `createAuditEntry` utilities
- 576 total tests

## v0.9.0 — Security Audit & Hardening

- **fix(cli):** Replace `exec()` with `execFile()` in `gpc docs` to prevent command injection
- **fix(config):** Add prototype pollution protection to config file parsing
- **feat(core):** Add output redaction for sensitive fields (tokens, keys, secrets)
- **fix(auth):** Set cache directory permissions to `0o700` (owner-only)
- **feat(core):** Add `safePath`/`safePathWithin` utilities for path validation
- 564 total tests

## v0.8.7 — Plugin Scaffold & Permission Approval

- **feat(cli):** `gpc plugins init <name>` scaffolds a new plugin project
- **feat(cli):** `gpc plugins approve/revoke <name>` for third-party plugin trust
- **feat(cli):** Unapproved third-party plugins blocked from loading
- **feat(config):** Plugin approval persisted in config (`approvedPlugins` array)
- Phase 8 complete

## v0.8.6 — Plugin Integration & Lifecycle Hooks

- **feat(cli):** Wire `PluginManager` into CLI execution (beforeCommand/afterCommand hooks)
- **feat(plugin-sdk):** Add `beforeRequest`/`afterResponse` hooks
- **feat(cli):** Register plugin-defined commands with Commander
- **feat(cli):** `gpc plugins list` command (table + JSON output)

## v0.8.5 — Advanced Features

- **feat(core):** Image validation with per-type size limits and optimization warnings
- **feat(core):** Vitals trend comparison (`gpc vitals compare`)
- **feat(core):** Form factor tracks (wear, automotive, tv, android_xr)
- **feat(core):** Custom closed testing track support

## v0.8.4 — Convenience Commands

- **feat(core):** `gpc publish` — end-to-end upload + track + notes + commit
- **feat(core):** `gpc validate` — pre-submission validation checks
- **feat(core):** Release notes from directory (`--notes-dir`)

## v0.8.3 — Auth Hardening

- **feat(auth):** File-based JWT token caching (atomic writes, 0o600 permissions, 5-min safety margin)
- **feat(auth):** `GOOGLE_APPLICATION_CREDENTIALS` env var support
- **feat(config):** Multi-profile support (`profiles` map in config)
- **feat(cli):** `gpc auth switch`, `gpc auth profiles` commands

## v0.8.2 — Upload Hardening

- **feat(core):** File validation (ZIP magic bytes, extension check, size limits)
- **feat(api):** Deobfuscation/mapping file upload
- **feat(api):** `onRetry` callback for retry logging

## v0.8.1 — Pagination & Rate Limiting

- **fix(api):** Pagination edge case fixes
- **fix(api):** Rate limiter per-bucket improvements

## v0.8.0 — Plugin System

- **feat(plugin-sdk):** Full plugin interface with lifecycle hooks
- **feat(core):** Plugin manager with discovery, loading, and trust model
- **feat(plugin-ci):** CI/CD plugin with GitHub Actions step summaries
- Phase 8 started

## v0.7.0 — Reports & Users

- **feat(core):** `gpc reports list/download` (financial + stats reports)
- **feat(core):** `gpc users list/get/invite/update/remove`
- **feat(core):** `gpc testers list/add/remove/import`
- **feat(core):** Grant management (per-app permissions)
- **feat(core):** Bulk tester import from CSV

## v0.6.0 — Monetization

- **feat(core):** Subscriptions CRUD (list, get, create, update, delete)
- **feat(core):** Base plans (activate, deactivate, delete, migrate prices)
- **feat(core):** Subscription offers CRUD
- **feat(core):** In-app products CRUD + bulk sync from directory
- **feat(core):** Purchase verification (product + subscription, v1 + v2)
- **feat(core):** Voided purchases listing
- **feat(core):** Order refunds
- **feat(core):** Regional price conversion

## v0.5.0 — Reviews & Vitals

- **feat(core):** `gpc reviews list/get/reply/export`
- **feat(core):** Review filtering (stars, language, time)
- **feat(core):** Reporting API client (vitals)
- **feat(core):** `gpc vitals overview/crashes/anr/startup/rendering/battery/memory`
- **feat(core):** Anomaly detection and error search
- **feat(core):** Threshold-based exit codes for CI alerting
- **feat(api):** Separate rate limiting for Reviews API

## v0.4.0 — Listings & Metadata

- **feat(core):** `gpc listings get/update/delete`
- **feat(core):** `gpc listings pull/push` (bidirectional sync)
- **feat(core):** `gpc listings push --dry-run` (diff preview)
- **feat(core):** `gpc listings images list/upload/delete`
- **feat(core):** Country availability
- **feat(core):** `gpc apps update` (contact email, default language)
- **feat(core):** Fastlane metadata format compatibility

## v0.3.0 — Releases & Tracks

- **feat(core):** `gpc releases upload` (AAB/APK with progress)
- **feat(core):** `gpc releases status/promote`
- **feat(core):** `gpc releases rollout increase/halt/resume/complete`
- **feat(core):** `gpc releases notes set`
- **feat(core):** `gpc tracks list/get`
- **feat(core):** `gpc status` (cross-track overview)

## v0.2.0 — API Client & Apps

- **feat(api):** Base API client (native fetch with bearer auth)
- **feat(api):** Rate limiter (per-bucket token bucket)
- **feat(api):** Retry logic (exponential backoff with jitter)
- **feat(api):** Pagination helper (auto-follow nextPageToken)
- **feat(api):** Edit lifecycle manager
- **feat(cli):** `gpc apps list/info`

## v0.1.0 — Auth & Config

- **feat(auth):** Service account authentication + OAuth2 token generation
- **feat(config):** Config file discovery (`.gpcrc.json`)
- **feat(config):** Environment variable overrides
- **feat(cli):** `gpc auth login/logout/status/whoami`
- **feat(cli):** `gpc config init/show/set/path`
- **feat(cli):** `gpc doctor`, `gpc docs`
- **feat(cli):** Shell completions (bash, zsh, fish)
- **feat(cli):** TTY detection, output formats, global flags
