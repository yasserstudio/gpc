# Changelog

All notable changes to GPC are documented here.

Format: [Conventional Commits](https://www.conventionalcommits.org/) with user-facing language.
Versioning: `0.9.x` pre-release series → `1.0.0` public launch.

---

## v0.9.5

Security hardening, input validation, and bug fixes across all packages.

- fix: prevent prototype pollution in config writer — validates keys against `__proto__`, `constructor`, `prototype`
- fix: path traversal protection for Fastlane directory reads
- fix: rate limiter token count recalculates based on actual elapsed time after wait
- fix: image and deobfuscation uploads now verify API returned valid data
- fix: `updateMask` URL encoding uses `URLSearchParams` for spec compliance
- fix: user cancellation exits with code 1 instead of 0
- fix: removed duplicate `--dry-run` options shadowing global flag in `listings push` and `iap sync`
- fix: IAP sync produces clear error on invalid JSON files
- fix: ADC tokens now cached via `acquireToken` for consistency with service accounts
- fix: rollout percentage validation in `promote` and `rollout update` (must be 0–1)
- fix: config loader properly deletes unsafe keys instead of setting to `undefined`

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.4...v0.9.5

## v0.9.4

First release published to npm. Install with `npm install -g @gpc-cli/cli`.

- perf: in-memory token caching with mutex — eliminates redundant JWT signing on concurrent requests
- perf: smart 401-specific token refresh — only re-fetches on auth failures, not on retries
- perf: HTTP compression (`gzip`) and connection keep-alive for faster API calls
- perf: parallel pagination — fetch multiple pages concurrently
- perf: async config discovery and cached `homedir()` — faster CLI startup
- fix: resolved all lint and typecheck errors across all packages
- docs: README files for all 7 npm packages
- ci: changesets-based release workflow for automated npm publishing

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.3...v0.9.4

## v0.9.3

- perf: replaced `googleapis` (194 MB) with `google-auth-library` (776 KB) — **250x smaller install**
- feat: standalone binaries — no Node.js required (macOS, Linux, Windows)
- feat: install script with SHA256 checksum verification
- feat: GitHub Actions workflow builds and attaches binaries to every release

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.2...v0.9.3

## v0.9.2

- feat: **interactive mode** — `gpc publish`, `gpc releases upload`, and `gpc config init` now prompt for missing options in a terminal
- feat: respects `--no-interactive`, `GPC_NO_INTERACTIVE`, and CI environment detection
- feat: **audit logging** — all write operations logged to `~/.config/gpc/audit.log` (JSONL)

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.1...v0.9.2

## v0.9.1

- docs: expanded README with plugin system, vitals thresholds, purchases, pricing, and dry-run sections
- docs: complete CHANGELOG covering all versions from v0.1.0 through v0.9.0

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.0...v0.9.1

## v0.9.0

Full security audit across all packages.

- fix: **command injection** — replaced `exec()` with `execFile()` in `gpc docs`
- fix: **prototype pollution** — config parser now strips `__proto__`, `constructor`, `prototype` keys
- feat: **output redaction** — sensitive fields (`private_key`, `accessToken`, `password`, etc.) automatically redacted
- fix: **cache permissions** — token cache directory set to `0o700` (owner-only)
- feat: **path validation** — `safePath()` and `safePathWithin()` prevent directory traversal

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.7...v0.9.0

## v0.8.7

- feat: `gpc plugins init <name>` — scaffold a new plugin project with tests
- feat: `gpc plugins approve/revoke <name>` — control which third-party plugins can load
- feat: first-party plugins (`@gpc-cli/*`) auto-trusted, third-party require explicit approval

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.6...v0.8.7

## v0.8.6

- feat: plugins can now register custom CLI commands — they show up in `gpc --help`
- feat: `beforeRequest` / `afterResponse` hooks — observe or modify every HTTP call
- feat: `gpc plugins list` — shows loaded plugins with name, version, and trust status
- fix: hook failures never block API calls or crash the CLI

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.5...v0.8.6

## v0.8.5

- feat: image validation on upload — checks format (PNG/JPEG), dimensions, and size limits per type
- feat: `gpc vitals compare <metric>` — compare current vs previous period, with trend detection
- feat: track validation now supports wear, automotive, tv, and android_xr form factors

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.4...v0.8.5

## v0.8.4

- feat: `gpc publish <file>` — one command to validate, upload, set track, add notes, and commit
- feat: `gpc validate <file>` — pre-flight checks without uploading
- feat: `--notes-dir <dir>` — read multi-language release notes from a directory of `<lang>.txt` files

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.3...v0.8.4

## v0.8.3

- feat: token caching — avoids re-signing JWTs on every command
- feat: `GOOGLE_APPLICATION_CREDENTIALS` support — works with gcloud's default credentials
- feat: named auth profiles — store multiple service accounts and switch between them
- feat: `gpc auth login --profile <name>`, `gpc auth switch <name>`, `gpc auth profiles`

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.2...v0.8.3

## v0.8.2

- feat: file validation before upload — checks magic bytes, extension, and size limits
- feat: `--mapping <file>` on `gpc releases upload` — upload ProGuard/R8 deobfuscation files
- feat: `--retry-log <path>` — write retry attempts to a JSONL file for debugging

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.1...v0.8.2

## v0.8.1

- feat: pagination helpers for all list endpoints — no more manual page handling
- feat: rate limiting — automatic request throttling based on Google Play API quotas
- feat: `--limit` and `--next-page` flags on reviews, subscriptions, IAP, purchases, and users

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.8.0...v0.8.1

## v0.8.0

GPC now covers the **entire Google Play Developer API v3** — 162 endpoints, 50+ commands.

- feat: plugin system — extend GPC with custom commands and lifecycle hooks
- feat: `gpc plugins list` — see loaded plugins and their trust status
- feat: `@gpc-cli/plugin-ci` — built-in CI plugin (GitHub Actions, GitLab CI, Jenkins, CircleCI, Bitrise)

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.7.0...v0.8.0

## v0.7.0

- feat: `gpc reports list/download` — financial and stats reports
- feat: `gpc users list/get/invite/update/remove` — manage developer account users
- feat: `gpc testers list/add/remove` — manage testers on testing tracks
- feat: grant management — assign per-app permissions to users
- feat: bulk tester import from CSV

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.6.0...v0.7.0

## v0.6.0

- feat: `gpc subscriptions list/get/create/update/delete` — full subscription management
- feat: `gpc subscriptions base-plans` — activate, deactivate, delete, and migrate prices
- feat: `gpc subscriptions offers` — create and manage subscription offers
- feat: `gpc iap list/get/create/update/delete` — in-app product management
- feat: `gpc iap sync --dir products/` — bulk sync products from local files
- feat: `gpc purchases get <token>` — look up a purchase (v1 + v2 API)
- feat: `gpc purchases acknowledge/consume` and `gpc purchases subscription get/cancel/defer/revoke`
- feat: `gpc orders refund` and `gpc purchases voided list`
- feat: `gpc pricing convert` — convert prices across regions

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.5.0...v0.6.0

## v0.5.0

- feat: `gpc reviews list` — filter by star rating, language, or date
- feat: `gpc reviews get` and `gpc reviews reply` — read and respond to user reviews
- feat: `gpc vitals overview` — crash rate, ANR rate, and startup time at a glance
- feat: `gpc vitals crashes/anr/startup/rendering/battery/memory` — deep dive into each metric
- feat: `gpc vitals anomalies` — surface detected anomalies
- feat: dimension filtering — slice vitals by app version, OS level, or device
- feat: threshold-based exit codes for CI — fail your pipeline if crash rate exceeds a limit

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.4.0...v0.5.0

## v0.4.0

- feat: `gpc listings get` — fetch store listings for one or all languages
- feat: `gpc listings update` — update title, description, and other listing fields
- feat: `gpc listings pull/push` — sync store listings between local files and Play Console
- feat: `gpc listings push --dry-run` — preview what would change before pushing
- feat: `gpc listings images list/upload/delete` — manage screenshots, icons, and feature graphics
- feat: `gpc listings availability` — check country availability
- feat: Fastlane metadata directory format compatibility — drop-in replacement for `fastlane supply`

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.3.0...v0.4.0

## v0.3.0

- feat: `gpc releases upload <file>` — upload AAB or APK with a progress bar
- feat: `gpc releases status` — see the current release on every track
- feat: `gpc releases promote` — move a release from one track to another
- feat: `gpc releases rollout increase/halt/resume/complete` — control staged rollouts
- feat: `gpc releases notes set` — set release notes inline or from a file
- feat: `gpc tracks list` and `gpc tracks get` — inspect available tracks
- feat: `gpc status` — one-line overview of releases across all tracks

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.2.0...v0.3.0

## v0.2.0

- feat: typed API client for Google Play Developer API v3
- feat: automatic retry with exponential backoff on 429 and 5xx errors
- feat: edit lifecycle management — insert, modify, validate, commit (with auto-cleanup on failure)
- feat: `gpc apps list` — see all apps on your developer account
- feat: `gpc apps info <package>` — app details at a glance

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.1.0...v0.2.0

## v0.1.0

- feat: service account authentication with JSON key files
- feat: OAuth2 token generation for local development
- feat: config file discovery — searches for `.gpcrc.json` up the directory tree
- feat: environment variable overrides (`GPC_APP`, `GPC_PROFILE`, `GPC_OUTPUT`, etc.)
- feat: `gpc auth login/logout/status/whoami` commands
- feat: `gpc config init/show/set` commands
- feat: `gpc doctor` — validates connectivity and auth in one check
- feat: shell completions for bash, zsh, and fish
- feat: output formats — table, JSON, YAML, markdown

**Full Changelog**: https://github.com/yasserstudio/gpc/commits/v0.1.0
