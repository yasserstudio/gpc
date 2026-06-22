# GPC - Project Instructions

## What is this?

GPC is a TypeScript CLI for the Google Play Developer API v3. Monorepo with Turborepo + pnpm.

## Project Structure

```
packages/cli       → @gpc-cli/cli (bin: gpc) — CLI entry point, Commander.js
packages/core      → @gpc-cli/core — business logic, command orchestration
packages/api       → @gpc-cli/api — typed Google Play API client
packages/auth      → @gpc-cli/auth — service account, OAuth, ADC
packages/config    → @gpc-cli/config — config loading, env vars, profiles
packages/plugin-sdk → @gpc-cli/plugin-sdk — plugin interface
plugins/plugin-ci  → @gpc-cli/plugin-ci — CI/CD helpers
apps/docs/         → VitePress docs site (single source of truth for all documentation)
.dev/              → Private docs (marketing, strategy, engineering, competitive) — gitignored
e2e/               → End-to-end tests
```

## Key Conventions

- TypeScript strict mode, ESM-first
- Named exports only (no default exports)
- Barrel exports via index.ts per package
- File naming: kebab-case (e.g., rate-limiter.ts)
- Conventional commits: feat(scope), fix(scope), docs(scope)
- Scopes: cli, core, api, auth, config, plugin-sdk, ci, docs
- No circular dependencies between packages
- Dependency flow: cli → core → api, auth, config

## Current Status

- Phase 0 ✓ — Monorepo scaffold
- Phase 1 ✓ — Auth, config, CLI shell
- Phase 2 ✓ — API client, edits lifecycle, apps commands
- Phase 3 ✓ — Releases, tracks, rollouts, upload, promote
- Phase 4 ✓ — Listings, metadata, images, Fastlane compat
- Phase 5 ✓ — Reviews, vitals, reporting API, CI threshold alerting
- Phase 6 ✓ — Subscriptions, IAP, purchases, pricing, regional conversion
- Phase 7 ✓ — Reports, users, testers, grants, CSV import
- Phase 8 ✓ — Plugin SDK, plugin manager, lifecycle hooks, plugin-ci
- Phase 9 ✓ — Security audit, interactive mode, VitePress docs, standalone binary, Homebrew tap, npm publish, README/CHANGELOG
- Phase 10 ✓ — `gpc preflight` pre-submission compliance scanner (9 scanners, offline AAB policy checks)
- Published to npm: `npm install -g @gpc-cli/cli`
- Current version: v0.9.86 — pre-release series (`0.9.x` → `1.0.0` public launch)
- v0.9.86: complete Google Play Games API (GH #80). Full CRUD for achievement and leaderboard configurations via the Games Configuration API (gamesconfiguration v1configuration). 10 new endpoints (list/get/create/update/delete for both). Diff command for sync workflows. `--game-id` flag + `GPC_GAME_ID` env + `games.applicationId` config. Breaking: `gpc games events` removed, runtime commands moved to `gpc games runtime`. 2,408 tests.
- v0.9.85: completes the install fix. v0.9.84 fixed cli+core but `@gpc-cli/api` was unchanged, so its already-published manifest still leaked `workspace:*` in `peerDependencies` (`@gpc-cli/auth`) and a fresh `npm install -g @gpc-cli/cli` still failed. api/core/cli republished with the specifier resolved; `stage-publish.js` now also warns when an unchanged-but-already-published package still leaks the protocol. 2,380 tests.
- v0.9.84: install fix (completed in v0.9.85) + regional pricing flag. Resolves pnpm `workspace:` specifiers in published manifests (leaked from v0.9.77–v0.9.83; staged-publish now resolves them before publishing). `--regions-version` is now sent to the Google Play API on `subscriptions`/`one-time-products` create, update, and their offer commands (was an accepted-but-ignored facade; defaults to 2022/02). GH #61, #78. 2,380 tests.
- v0.9.83: response & usage quality. `paginateAll` now returns a real continuation token (`--limit` + `--next-page` resumes correctly across reviews/users/purchases/iap/subscriptions; voided-purchases default-path token loss fixed). Consistent `list --json` envelope `{ <key>, nextPageToken, meta.count, message? }` + human resume footer (BREAKING: reviews/iap no longer return a bare array). Google's "package not found" 404 maps to API_APP_NOT_FOUND; unmapped statuses carry message+suggestion. `formatMoney` honors ISO 4217 minor units. `reviews list` gains hasReply/lang/[truncated]/`--full-text`. CSV/TSV formula-injection guard. 2,372 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.83
- v0.9.82: dependency health + docs alignment + lint cleanup. AI SDK 5.x to 6.0 migration, google-auth-library bump (clears last production audit finding), turbo security fix, 30 lint warnings resolved in CLI (type-safe casts replacing `any`). Routine patch bumps (eslint, vitest, protobufjs, yauzl, prettier, typescript-eslint).
- v0.9.81: GPC GitHub Action launched on the GitHub Marketplace (`yasserstudio/gpc-action`) -- one-step Play publishing from GitHub Actions with a built-in preflight compliance gate, full r0adkll-compatible inputs for one-line migration. fix(config): `GPC_SERVICE_ACCOUNT`/`GPC_APP` env vars and `--service-account`/`--app` flags now override an active profile (documented precedence; the profile previously won silently). Docs: CI/CD page features the action.
- v0.9.80: full-codebase security audit (15 fixes), Google API discovery doc alignment (13 type/param fixes), code quality pass (20 fixes). Plugin trust gate, webhook redaction, preflight false-negative fixes, download retry, null-safety, permission enforcement. Deepsec re-scan: 0 new findings.
- v0.9.79: developer clarity release -- structured reviewPending result + nextStep hint on commit rejection, bundle processing progress logs, improved API_EDIT_EXPIRED message, reviewSkipped on internal track, API_ROLLOUT_DECREASE_FORBIDDEN error, dry-run executed/skipped arrays, OfferPhaseDetails type, preflight targetSdkMinimum bumped to 36, Node 24 in CI matrix.
- v0.9.78: fix `tracks update` versionCode coercion + nested JSON support, fix `validateAndCommit` auto-rescue for changesNotSentForReview on validate (15+ commands), new `gpc releases assign` command.
- v0.9.77: fix large AAB upload timeout -- extended bundle processing poll from ~31s to ~86s (Fibonacci backoff), multi-retry guard on validate/commit (15s, 30s, 45s). Supply chain hardening -- Trusted Publisher (OIDC, no long-lived NPM_TOKEN), staged publishing (human 2FA approval before packages go live).
- v0.9.76: Google I/O 2026 response -- full API contract audit (50+ fixes against official reference docs), SubscriptionPurchaseV2 new fields, blog launch, docs alignment.
- v0.9.75: data safety API fix (CSV format, input validation), docs rewrite.
- v0.9.74: security hardening release -- deepsec audit, 16 fixes (plugin RCE, SSRF, path traversal, token redaction, API path encoding, CSV injection, prompt injection, rate limiter race, vitals gate ordering, env scrubbing, dry-run enforcement). CI hardened with deepsec scanning and supply chain protections. Run `pnpm security:deep` for full deepsec pipeline.
- v0.9.73: `gpc skills check`, `gpc doctor` Android CLI detection, `--changelog-ai` on upload, SEO/docs overhaul (JSON-LD, recipes, staged rollout guide, rate limits reference).
- v0.9.72: API compliance patch (error reports endpoint, input validation).
- v0.9.71: `gpc doctor` quota proximity check (warns at >80% daily/per-minute API usage) and plugin health check (discovers, loads, reports each plugin).
- v0.9.70: `--in-app-update-priority <0-5>` and `--retain-version-codes <csv>` flags on upload, `default.txt` Fastlane-style changelog fallback via `--notes-dir`, promote preserves `inAppUpdatePriority` + `name`, GitHub Actions Node.js 22.
- 2,408 total tests, 7 packages building, 90%+ line coverage on all core packages
- Changelog-generation series (v0.9.61 → v0.9.64): complete. `gpc changelog generate --target play-store --locales auto --ai --apply` does commit → translated Play Store notes → written into draft release, one command.
- v0.9.63 highlight: AI-assisted Play Store translation. `gpc changelog generate --target play-store --locales auto --ai` translates non-source locales via the user's own LLM key. Auto-detects env priority `AI_GATEWAY_API_KEY` → `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → `GOOGLE_GENERATIVE_AI_API_KEY`. Non-reasoning model defaults. Gateway path unlocks cost-per-run in USD. All 4 AI SDK deps lazy-loaded (cold-start preserved).
- v0.9.62 highlight: multilingual Play Store release notes. `gpc changelog generate --target play-store --locales <csv|auto>` emits per-locale "What's new" text with 500-char budget enforcement.
- v0.9.61 highlight: smarter changelog generation. `gpc changelog generate` clusters git commits via Union-Find on file-path overlap + Jaccard keyword similarity + time proximity, lints subjects against project voice, emits canonical GitHub Release markdown / JSON / LLM prompt.
- v0.9.56 highlight: first Android publishing CLI with Managed Google Play support (`gpc enterprise publish` via Play Custom App Publishing API).
- GitHub Releases: umbrella `v*` tags only, user-facing notes (see `apps/docs/advanced/conventions.md` for template)

## Testing

- Vitest for all tests (2,408 total across 7 packages + e2e)
- Tests in `tests/` directory per package
- Mock external APIs — never call real Google APIs in tests
- Mock fetch with `vi.stubGlobal("fetch", mockFn)` for API tests
- Run: `pnpm test` or `pnpm test --filter @gpc-cli/<package>`

## Building

- tsup for bundling each package
- Turborepo for task orchestration
- Run: `pnpm build` (builds all with dependency order)

## Documentation

VitePress docs site: https://yasserstudio.github.io/gpc/
Source: `apps/docs/` — single source of truth for all documentation (guide, commands, CI/CD, advanced, migration, reference)

Key pages for contributors:

- `apps/docs/advanced/architecture.md` — system design, package graph
- `apps/docs/advanced/conventions.md` — code style, git, testing
- `apps/docs/advanced/security.md` — credential handling, threat model
- `apps/docs/guide/developer-verification.md` — Google's 2026 verification rollout and GPC support plan

Private docs in `.dev/` (gitignored) — internal use only.

## GPC Skills

Agent skills for GPC workflows are in `.agents/skills/gpc-*`.

Install: `gpc install-skills` (interactive wizard) or `npx skills add yasserstudio/gpc-skills`

| Skill                    | When to Use                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `gpc-setup`              | Auth (service account, OAuth, ADC), config, profiles, `gpc doctor`                            |
| `gpc-onboarding`         | First-run setup, `gpc quickstart`, `gpc auth login` wizard, `gpc doctor --fix`                |
| `gpc-release-flow`       | Upload AAB/APK, draft releases, rollouts, promote, `gpc publish`, `gpc diff`, `gpc changelog` |
| `gpc-train`              | Automated staged rollout pipeline, time gates, crash/ANR gates                                |
| `gpc-preflight`          | Offline AAB/APK compliance scanner (9 scanners), `.preflightrc.json` config                   |
| `gpc-metadata-sync`      | Store listings, images, Fastlane metadata compat, pull/push                                   |
| `gpc-vitals-monitoring`  | Crashes, ANR, LMK, vitals thresholds, reviews (auto-paginate), reports                        |
| `gpc-ci-integration`     | GitHub Actions, GitLab CI, env vars, JSON output, exit codes                                  |
| `gpc-monetization`       | Subscriptions, IAP, RTDN notifications, voided purchases, pricing, analytics                  |
| `gpc-user-management`    | Developer account users, permissions, grants, testers, CSV import                             |
| `gpc-migrate-fastlane`   | Fastlane-to-GPC migration, command mapping, CI migration                                      |
| `gpc-plugin-development` | Plugin SDK, lifecycle hooks, permissions, custom commands                                     |
| `gpc-troubleshooting`    | Exit codes, error catalog (40+ codes), debug mode, common fixes                               |
| `gpc-sdk-usage`          | @gpc-cli/api and @gpc-cli/auth as standalone TypeScript SDK, 6-bucket rate limiter            |
| `gpc-multi-app`          | Multiple apps, profiles, batch operations, monorepo patterns                                  |
| `gpc-security`           | Credential storage, key rotation, audit logging, incident response                            |

Read the relevant `SKILL.md` and its `references/` when working on these workflows.

## Important Rules

- Never commit credentials or service account keys
- Redact secrets in all output (verbose, JSON, debug)
- Validate inputs before API calls
- Every error needs a code, message, and suggestion
- --json flag on every command
- Exit codes: 0 success, 1 error, 2 usage, 3 auth, 4 API, 5 network, 6 threshold breach
