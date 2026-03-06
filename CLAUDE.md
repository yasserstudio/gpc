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
docs/              → VitePress documentation site
design/            → Planning and design documents
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

## Testing

- Vitest for all tests
- Tests in `tests/` directory per package
- Mock external APIs — never call real Google APIs in tests
- Run: `pnpm test` or `pnpm test --filter @gpc/<package>`

## Building

- tsup for bundling each package
- Turborepo for task orchestration
- Run: `pnpm build` (builds all with dependency order)

## Design Docs

Read `design/` before making architectural changes:
- `design/architecture/` — system design, API coverage, security
- `design/engineering/` — conventions, CI/CD, roadmap
- `design/marketing/` — branding, launch strategy, content

## Important Rules

- Never commit credentials or service account keys
- Redact secrets in all output (verbose, JSON, debug)
- Validate inputs before API calls
- Every error needs a code, message, and suggestion
- --json flag on every command
- Exit codes: 0 success, 1 error, 2 usage, 3 auth, 4 API, 5 network
