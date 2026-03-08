# Roadmap

> Each phase maps to a version (0.X.0). Sub-updates (0.X.y) ship between phases.
> Sub-updates (0.X.y) ship between phases for features, fixes, and improvements.

---

## Phase 0 — Foundation ✓
> Monorepo scaffold, tooling, CI. No features. No release.

- [x] Initialize monorepo (Turborepo + pnpm)
- [x] Set up TypeScript, ESLint 9 (flat config), Prettier, Vitest
- [x] Create package scaffolds (api, auth, config, core, cli, plugin-sdk)
- [x] Configure GitHub Actions (ci.yml, release.yml)
- [x] Set up Changesets for versioning
- [x] Write CLAUDE.md project instructions
- [x] Verify: `pnpm install && pnpm build && pnpm test` all pass

---

## Phase 1 — Auth & Config → v0.1.x ✓
> Users can authenticate and configure the CLI.

- [x] Service account JSON file authentication
- [x] OAuth2 token generation from service account
- [ ] Token caching (file-based, keychain later)
- [x] `GPC_SERVICE_ACCOUNT` env var support
- [x] Config file discovery (`.gpcrc.json`)
- [x] Environment variable overrides (`GPC_*` prefix)
- [x] Config schema validation
- [x] `gpc auth login` (service account)
- [x] `gpc auth logout`, `gpc auth status`, `gpc auth whoami`
- [x] `gpc config init`, `gpc config show`, `gpc config set`
- [x] `gpc doctor` (connectivity + auth validation)
- [x] `gpc docs` (open docs in browser)
- [x] TTY detection — auto-switch output format (table/json)
- [x] `--output` flag (table, json, yaml, markdown)
- [x] Global flags: `--verbose`, `--quiet`, `--app`, `--profile`, `--no-color`
- [x] Shell completions (bash, zsh, fish)
- [x] Error types: AuthError, ConfigError with codes + suggestions

**Sub-updates (v0.1.y):**
- [ ] OAuth 2.0 device flow for interactive login
- [ ] Application Default Credentials support
- [ ] Multi-profile support (`gpc auth switch`)
- [ ] `GPC_SKIP_KEYCHAIN` env var
- [ ] OS keychain storage (macOS Keychain, libsecret)

---

## Phase 2 — API Client & Apps → v0.2.x ✓
> First real data from Google Play. API foundation for all future phases.

- [x] Base API client (native fetch with bearer auth)
- [x] Rate limiter (per-bucket token bucket, respecting quota buckets)
- [x] Retry logic (exponential backoff with jitter on 429/5xx)
- [x] Pagination helper (auto-follow nextPageToken)
- [x] Edit lifecycle manager (insert → modify → validate → commit/delete)
- [x] `gpc apps list`
- [x] `gpc apps info <package>`
- [x] `--limit`, `--next-page` pagination flags
- [x] Retry env vars: `GPC_MAX_RETRIES`, `GPC_TIMEOUT`, `GPC_BASE_DELAY`, `GPC_MAX_DELAY`
- [x] `--retry-log` flag

**Sub-updates (v0.2.y):**
- [ ] Retry log file output
- [ ] Pagination edge case fixes
- [ ] Rate limiter per-bucket improvements

---

## Phase 3 — Releases & Tracks → v0.3.x ✓
> Core value proposition. Upload, release, rollout, promote.

- [x] `gpc releases upload <file>` (AAB/APK with progress bar)
- [x] File validation (magic bytes, size check)
- [ ] Resumable upload for large files
- [x] Deobfuscation/mapping file upload (`--mapping`)
- [x] `gpc releases status` (current release across tracks)
- [x] `gpc releases promote --from <track> --to <track>`
- [x] `gpc releases rollout increase/halt/resume/complete`
- [x] `gpc releases notes set` (inline + from file)
- [x] `gpc tracks list`, `gpc tracks get`
- [ ] `gpc publish <file>` (end-to-end shortcut: upload + track + notes + commit)
- [ ] `gpc validate` (pre-submission checks)
- [x] `gpc status` (cross-track release overview)
- [ ] Form factor tracks (wear, automotive, tv, android_xr)
- [ ] Internal app sharing upload (`--internal-sharing`)
- [ ] Generated APKs download

**Sub-updates (v0.3.y):**
- [ ] `--dry-run` for releases upload
- [ ] `gpc diff --from <version> --to <version>`
- [ ] Release notes from directory (per-language files)
- [ ] Custom closed testing track support
- [ ] Upload progress improvements

---

## Phase 4 — Listings & Metadata → v0.4.x ✓
> Full store listing management and Fastlane compatibility.

- [x] `gpc listings get` (single language + all languages)
- [x] `gpc listings update --lang <lang>`
- [x] `gpc listings pull --dir metadata/` (download all to local)
- [x] `gpc listings push --dir metadata/` (upload local to Play Console)
- [x] `gpc listings push --dry-run` (diff preview)
- [x] `gpc listings delete --lang <lang>`
- [x] `gpc listings images list/upload/delete`
- [x] `gpc listings availability` (country availability)
- [x] `gpc apps update` (app details: contact email, default language)
- [x] Fastlane metadata directory format compatibility
- [x] Multi-language support (BCP 47 validation)

**Sub-updates (v0.4.y):**
- [ ] Fastlane format auto-detection on push
- [ ] Image optimization warnings (size/format)
- [ ] Bulk image upload with progress

---

## Phase 5 — Reviews & Vitals → v0.5.x ✓
> Monitoring, engagement, and CI alerting.

- [x] `gpc reviews list` (with filters: stars, language, since)
- [x] `gpc reviews get <review-id>`
- [x] `gpc reviews reply <review-id>` (350 char validation, notification warning)
- [x] `gpc reviews export --format csv/json`
- [ ] Review translation support (`--translate-to <lang>`)
- [x] Separate rate limiting for Reviews API (200 GET/hour, 2,000 POST/day)
- [x] Reporting API client (separate base URL: `playdeveloperreporting.googleapis.com`)
- [x] `gpc vitals overview` (dashboard summary)
- [x] `gpc vitals crashes` (crash rate + clusters)
- [x] `gpc vitals anr` (ANR rate)
- [x] `gpc vitals startup` (cold/warm start times)
- [x] `gpc vitals rendering` (slow frames)
- [x] `gpc vitals battery` (wakeups + wakelocks)
- [x] `gpc vitals memory` (LMK rate)
- [x] `gpc vitals anomalies` (detected anomalies)
- [x] `gpc vitals errors search` (error issues + reports)
- [x] Dimension filtering (version, OS, device)
- [x] Threshold-based exit codes for CI alerting

**Sub-updates (v0.5.y):**
- [ ] Vitals trend comparison (this week vs last week)
- [ ] Reviews digest command (summary of recent low-rated reviews)
- [ ] Custom threshold configuration

---

## Phase 6 — Monetization → v0.6.x ✓
> Subscriptions, IAP, purchases, and pricing.

- [x] `gpc subscriptions list/get/create/update/delete`
- [x] `gpc subscriptions base-plans activate/deactivate/delete`
- [x] `gpc subscriptions base-plans migrate-prices`
- [x] `gpc subscriptions offers list/get/create/update/delete`
- [x] `gpc subscriptions offers activate/deactivate`
- [ ] Batch operations for subscriptions, base plans, offers
- [x] `gpc iap list/get/create/update/delete` (legacy in-app products)
- [x] `gpc iap sync --dir products/` (bulk sync from local files)
- [ ] One-time products support (newer `monetization.onetimeproducts` API)
- [x] `gpc purchases get <token>` (v1 + v2)
- [x] `gpc purchases acknowledge/consume`
- [x] `gpc purchases subscription get/cancel/defer/revoke` (v2 API)
- [x] `gpc purchases voided list`
- [x] `gpc orders refund`
- [x] `gpc pricing convert --from USD --amount 9.99` (regional price conversion)
- [x] Voided purchases rate limiting (6,000/day, 30/30s)

**Sub-updates (v0.6.y):**
- [ ] Subscription listing localization helpers
- [ ] Pricing template support
- [ ] Offer targeting validation

---

## Phase 7 — Reports & Users → v0.7.x ✓
> Financial reporting, team management, and tester operations.

- [x] `gpc reports list`
- [x] `gpc reports download financial --month YYYY-MM`
- [x] `gpc reports download stats --month YYYY-MM --dimension <dim>`
- [x] `gpc users list/get`
- [x] `gpc users invite <email> --role <role>`
- [x] `gpc users update <email>`
- [x] `gpc users remove <email>`
- [x] Permission propagation delay warning (48h)
- [x] `gpc testers list --track <track>`
- [x] `gpc testers add/remove`
- [x] `gpc testers groups list/create` (via Google Group emails)
- [x] Grant management (per-app permissions)

**Sub-updates (v0.7.y):**
- [x] Bulk tester import from CSV
- [ ] User permission audit command

---

## Phase 8 — Plugin System → v0.8.x ✓
> Extensibility for third-party integrations.

- [x] `@gpc/plugin-sdk` — full plugin interface and types
- [x] Plugin discovery (config, node_modules, local file)
- [x] Lifecycle hooks (beforeCommand, afterCommand, onError)
- [x] Permission model for third-party plugins
- [x] Command registration from plugins
- [x] `@gpc/plugin-ci` — GitHub Actions summary, CI environment detection
- [ ] Plugin authoring guide and template
- [ ] First-run permission approval for third-party plugins

**Sub-updates (v0.8.y):**
- [ ] Plugin template generator
- [ ] Additional lifecycle hooks (beforeRequest, afterResponse)

---

## Phase 9 — Polish & v1.0.0
> Production hardening and stable release.

- [ ] Interactive mode (guided workflows for complex operations)
- [x] `--dry-run` support for all write operations
- [ ] Audit logging
- [x] Proxy and custom CA support (`GPC_CA_CERT`, `HTTPS_PROXY`)
- [x] Performance optimization (lazy command loading)
- [x] Unified error hierarchy (exitCode + toJSON on all error types)
- [x] 90%+ test coverage on core packages
- [ ] VitePress documentation site complete
- [ ] Standalone binary investigation
- [ ] Security audit
- [ ] README and docs final polish
- [ ] CHANGELOG complete
- [ ] Wall of Apps community showcase

---

## Version Map

| Version | Phase | Focus | Key Moment |
| --- | --- | --- | --- |
| `0.1.0` | 1 | Auth, config, CLI shell | First npm publish |
| `0.2.0` | 2 | API client, apps | First real API data |
| `0.3.0` | 3 | Releases, tracks, rollouts | **Start marketing** |
| `0.4.0` | 4 | Listings, metadata ✓ | Fastlane migration path |
| `0.5.0` | 5 | Reviews, vitals | Monitoring unlocked |
| `0.6.0` | 6 | Monetization | Subscriptions + IAP |
| `0.7.0` | 7 | Reports, users, testers ✓ | Full API coverage |
| `0.8.0` | 8 | Plugin system ✓ | Ecosystem extensibility |
| `1.0.0` | 9 | Polish, stability | **Product Hunt launch** |

Sub-updates (0.X.y) ship between phases for features, fixes, and improvements.
