# GPC - Project Instructions

## What is this?

GPC is a TypeScript CLI for the Google Play Developer API v3. Monorepo with Turborepo + pnpm.

## Project Structure

```
packages/cli       → @gpc/cli (bin: gpc) — CLI entry point, Commander.js
packages/core      → @gpc/core — business logic, command orchestration
packages/api       → @gpc/api — typed Google Play API client
packages/auth      → @gpc/auth — service account, OAuth, ADC
packages/config    → @gpc/config — config loading, env vars, profiles
packages/plugin-sdk → @gpc/plugin-sdk — plugin interface
plugins/plugin-ci  → @gpc/plugin-ci — CI/CD helpers
docs/              → Public documentation (architecture, commands, CI/CD, etc.)
.dev/              → Private docs (marketing, strategy, competitive analysis) — gitignored
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
- Phase 9 (in progress) — Lazy loading, --dry-run, unified errors, proxy/CA, 90%+ coverage
- 532 total tests, 7 packages building, 90%+ line coverage on all core packages

## Testing

- Vitest for all tests (532 total across 7 packages)
- Tests in `tests/` directory per package
- Mock external APIs — never call real Google APIs in tests
- Mock fetch with `vi.stubGlobal("fetch", mockFn)` for API tests
- Run: `pnpm test` or `pnpm test --filter @gpc/<package>`

## Building

- tsup for bundling each package
- Turborepo for task orchestration
- Run: `pnpm build` (builds all with dependency order)

## Documentation

Public docs in `docs/` — read before making architectural changes:
- `docs/ARCHITECTURE.md` — system design, package graph
- `docs/COMMANDS.md` — CLI command reference
- `docs/API_REFERENCE.md` — Google Play API deep dive
- `docs/CONVENTIONS.md` — code style, git, testing
- `docs/ROADMAP.md` — phased implementation plan

Private strategy docs in `.dev/` (gitignored):
- `.dev/marketing/` — branding, launch, content, pricing
- `.dev/engineering/` — implementation strategy
- `.dev/HONEST_ASSESSMENT.md`, `.dev/COMPARISON_WITH_ASC_CLI.md`

## Important Rules

- Never commit credentials or service account keys
- Redact secrets in all output (verbose, JSON, debug)
- Validate inputs before API calls
- Every error needs a code, message, and suggestion
- --json flag on every command
- Exit codes: 0 success, 1 error, 2 usage, 3 auth, 4 API, 5 network, 6 threshold breach
