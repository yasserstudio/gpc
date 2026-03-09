---
outline: deep
---

# Architecture

GPC is a TypeScript monorepo with a layered architecture. Each package has a single responsibility, and dependencies flow in one direction: CLI -> Core -> API/Auth/Config.

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | TypeScript 5.x | Type safety, ecosystem, npm distribution |
| Runtime | Node.js 20+ LTS / Bun (binary) | Stability, `npx` support, broad adoption |
| Distribution | npm, Homebrew, standalone binary | Multiple install paths, no lock-in |
| Monorepo | Turborepo | Fast builds, caching, task orchestration |
| Package Manager | pnpm | Strict dependency resolution, disk efficiency |
| CLI Framework | Commander.js | Mature, composable, low overhead |
| API Client | Native fetch + typed wrappers | Zero-dependency HTTP client with retry + rate limiting |
| Auth | google-auth-library | Service accounts, OAuth 2.0, ADC |
| Output | Built-in formatters | Human-friendly tables with `--json` machine output |
| Config | Custom loader | `.gpcrc.json` discovery, env vars, profiles |
| Testing | Vitest | Fast, TypeScript-native, ESM-first |
| Linting | ESLint 9 (flat config) + Prettier | Consistent code style |
| Bundling | tsup | Fast, zero-config TypeScript bundling |
| Docs | VitePress | Lightweight, markdown-driven |
| CI/CD | GitHub Actions | Standard, free for open source |
| Releases | Changesets | Monorepo-aware versioning and changelogs |

## Monorepo Structure

```
gpc/
├── packages/
│   ├── cli/            # CLI entry point (bin: gpc), Commander.js commands
│   ├── core/           # Business logic, orchestration, plugin manager
│   ├── api/            # Google Play Developer API v3 typed client
│   ├── auth/           # Authentication strategies (SA, OAuth, ADC)
│   ├── config/         # Configuration loading, validation, profiles
│   └── plugin-sdk/     # Plugin interface and lifecycle hooks
├── plugins/
│   └── plugin-ci/      # CI/CD helpers (GitHub Actions summary, CI detection)
├── apps/
│   └── docs/           # VitePress documentation site
├── tools/
│   └── scripts/        # Build scripts, codegen, release helpers
└── e2e/
    └── tests/          # End-to-end integration tests
```

## Package Dependency Graph

```
                    ┌──────────────┐
                    │     cli      │  <- Entry point (bin: gpc)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │     core     │  <- Orchestration & business logic
                    └──┬───┬───┬───┘
                       │   │   │
              ┌────────┘   │   └────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   api    │ │   auth   │ │  config   │
        └──────────┘ └──────────┘ └──────────┘
              │            │
              └─────┬──────┘
                    ▼
            ┌──────────────┐
            │ google-auth  │  <- External dependency
            │  -library    │
            └──────────────┘
```

**Dependency rules:**
- `cli` depends on `core` only. Never imports `api`, `auth`, or `config` directly.
- `core` depends on `api`, `auth`, and `config`. Contains all orchestration logic.
- `api`, `auth`, and `config` are leaf packages. They do not depend on each other.
- `plugin-sdk` has zero dependencies. It defines interfaces only.
- No circular dependencies between any packages.

## Package Responsibilities

### @gpc/cli

- Command registration and argument parsing (Commander.js)
- Interactive prompts (`node:readline`)
- Output formatting: table, JSON, YAML, markdown
- Progress indicators, spinners, color output
- Shell completion generation (bash, zsh, fish)
- Lazy command loading for fast startup

### @gpc/core

- Business logic and command orchestration
- Combines auth + api + config into cohesive workflows
- Release pipelines, rollout strategies, metadata sync
- Plugin manager -- loads, validates, and runs plugin lifecycle hooks
- Dry-run support for all write operations

### @gpc/api

- Typed wrappers around Google Play Developer API v3
- Request/response models matching the API specification
- Rate limiting (token bucket per quota bucket)
- Retry logic (exponential backoff with jitter on 429/5xx)
- Pagination helpers (auto-follow `nextPageToken`)
- Zero business logic -- pure API surface

### @gpc/auth

- Service account JSON key file authentication
- OAuth 2.0 device flow for interactive login
- Application Default Credentials (ADC) support
- Token caching, refresh, and revocation
- Multi-account profile management

### @gpc/config

- Config file discovery (`.gpcrc.json`, user config dir)
- Profile-based configuration (dev, staging, production)
- Environment variable overrides (`GPC_*` prefix)
- Schema validation with clear error messages

### @gpc/plugin-sdk

- Plugin interface definition (`GpcPlugin`, `PluginHooks`)
- Lifecycle hook types (`BeforeCommandHandler`, `AfterCommandHandler`, `ErrorHandler`)
- Command registry for plugin-added commands
- Permission model (`PluginManifest`, `PluginPermission`)
- `definePlugin()` helper for type-safe plugin authoring
- Zero dependencies

## Design Principles

### 1. Layered Architecture

Each package has a single responsibility. No circular dependencies. The CLI layer never touches the API directly -- it always goes through core.

### 2. Output-First Design

Every command supports `--json` for machine-readable output. Human output is the formatted view of the same data. Internal commands return typed result objects, never print directly.

### 3. Fail Fast, Fail Clearly

Validate inputs before making API calls. Surface auth issues immediately. Provide actionable error messages with suggested fixes.

### 4. Idempotent Operations

Commands that modify state (uploads, releases) are safe to retry. Checksums and version checks prevent duplicate operations.

### 5. Progressive Disclosure

Simple commands have simple interfaces. Advanced options exist but don't clutter the default experience. Interactive mode guides users; flags enable automation.

## Error Handling Strategy

Errors flow upward through three layers, each adding context:

```
┌─────────────────────────────────────────────────┐
│                   CLI Layer                      │
│  Catches all errors -> formats for human/JSON   │
│  Sets exit codes: 0 success, 1-6 specific       │
├─────────────────────────────────────────────────┤
│                  Core Layer                      │
│  Throws typed errors (AuthError, ApiError, etc.)│
│  Wraps API errors with context and suggestions  │
├─────────────────────────────────────────────────┤
│                  API Layer                       │
│  Throws raw API errors with HTTP status codes   │
│  Handles retries for transient failures (5xx)   │
└─────────────────────────────────────────────────┘
```

### Error Class Hierarchy

```
GpcError (base)
├── AuthError
│   ├── TokenExpiredError
│   ├── InvalidCredentialsError
│   └── MissingCredentialsError
├── ApiError
│   ├── RateLimitError
│   ├── NotFoundError
│   ├── PermissionDeniedError
│   └── ValidationError
├── ConfigError
│   ├── ConfigNotFoundError
│   └── ConfigValidationError
└── PluginError
```

Every error includes:

| Field | Description |
|-------|-------------|
| `code` | Unique string identifier (e.g., `AUTH_TOKEN_EXPIRED`) |
| `message` | Human-readable description |
| `suggestion` | Actionable fix (e.g., "Run `gpc auth login` to re-authenticate") |
| `exitCode` | Process exit code (1-6, 10) |

## Authentication Flow

```
User runs command
       │
       ▼
  Config loaded ──> Check for --service-account flag
       │                    │
       │               Found? ──> Use service account auth
       │
       ▼
  Check GPC_SERVICE_ACCOUNT env var
       │
  Found? ──> Use service account auth
       │
       ▼
  Check config file for auth profile
       │
  Found? ──> Load cached credentials
       │           │
       │      Expired? ──> Refresh token
       │
       ▼
  Check Application Default Credentials
       │
  Found? ──> Use ADC
       │
       ▼
  Interactive? ──> OAuth device flow
       │
       ▼
  Error: No credentials found
  Suggest: gpc auth login
```

## Plugin System Architecture

```
┌──────────────────┐     ┌──────────────────┐
│  @gpc/plugin-sdk │     │  @gpc/plugin-ci  │
│  (interfaces)    │<────│  (first-party)   │
└────────┬─────────┘     └──────────────────┘
         │
┌────────▼─────────┐
│  PluginManager   │  <- @gpc/core — orchestrates lifecycle
│  (core/plugins)  │
└──────────────────┘
```

**Plugin lifecycle:**
1. Plugins discovered via config, `node_modules`, or local file path
2. `PluginManager.load()` validates permissions and calls `plugin.register(hooks)`
3. Before each command: `runBeforeCommand(event)` fires all registered hooks
4. After each command: `runAfterCommand(event, result)` fires all registered hooks
5. On error: `runOnError(event, error)` fires all registered hooks (errors in handlers are swallowed)

**Trust model:**
- First-party plugins (`@gpc/plugin-*`): auto-trusted, no permission checks
- Third-party plugins (`gpc-plugin-*`): permissions validated against declared manifest
- Unknown permissions throw `PLUGIN_INVALID_PERMISSION` (exit code 10)

## Two API Clients

GPC communicates with two separate Google APIs:

| API | Base URL | Purpose |
|-----|----------|---------|
| Android Publisher API v3 | `androidpublisher.googleapis.com` | Publishing, monetization, reviews, purchases, users |
| Play Developer Reporting API v1beta1 | `playdeveloperreporting.googleapis.com` | Vitals, crash rates, ANR, performance metrics |

Both APIs require separate enablement in Google Cloud Console but share the same service account credentials. Internally, `@gpc/api` maintains two separate client instances with independent rate limiters and retry configurations.
