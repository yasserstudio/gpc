# Architecture

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | TypeScript 5.x | Type safety, ecosystem, npm distribution |
| **Runtime** | Node.js 20+ LTS / Bun (binary) | Stability, `npx` support, broad adoption |
| **Distribution** | npm, Homebrew, standalone binary | Multiple install paths, no lock-in |
| **Monorepo** | Turborepo | Fast builds, caching, task orchestration |
| **Package Manager** | pnpm | Strict dependency resolution, disk efficiency |
| **CLI Framework** | Commander.js | Mature, composable, low overhead |
| **API Client** | Native fetch + typed wrappers | Zero-dependency HTTP client with retry + rate limiting |
| **Auth** | google-auth-library | Service accounts, OAuth 2.0, ADC |
| **Output** | Built-in formatters | Human-friendly tables with `--json` machine output |
| **Config** | Custom loader | `.gpcrc.json` discovery, env vars, profiles |
| **Testing** | Vitest | Fast, TypeScript-native, ESM-first |
| **Linting** | ESLint 9 (flat config) + Prettier | Consistent code style |
| **Bundling** | tsup | Fast, zero-config TypeScript bundling |
| **Docs** | VitePress | Lightweight, markdown-driven |
| **CI/CD** | GitHub Actions | Standard, free for open source |
| **Releases** | Changesets | Monorepo-aware versioning and changelogs |

## Monorepo Package Architecture

```
gpc/
├── packages/
│   ├── core/           # Business logic, orchestration, shared types
│   ├── api/            # Google Play Developer API v3 typed client
│   ├── auth/           # Authentication strategies (SA, OAuth, ADC)
│   ├── cli/            # CLI entry point, commands, output formatting
│   ├── config/         # Configuration loading, validation, profiles
│   └── plugin-sdk/     # Plugin interface and lifecycle hooks
├── plugins/
│   └── plugin-ci/      # CI/CD-specific helpers (GitHub Actions, etc.)
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
                    │     cli      │  ← Entry point (bin: gpc)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │     core     │  ← Orchestration & business logic
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
            │ google-auth  │  ← External dependency
            │  -library    │
            └──────────────┘
```

### Package Responsibilities

#### `@gpc-cli/api`
- Typed wrappers around Google Play Developer API v3
- Request/response models auto-generated from API discovery docs
- Rate limiting, retry logic, pagination helpers
- Zero business logic — pure API surface

#### `@gpc-cli/auth`
- Service account JSON key file authentication
- OAuth 2.0 device flow for interactive login
- Application Default Credentials (ADC) support
- Token caching, refresh, and revocation
- Multi-account profile management

#### `@gpc-cli/config`
- Config file discovery (`.gpcrc.json`, user config dir)
- Profile-based configuration (dev, staging, production)
- Environment variable overrides (`GPC_*` prefix)
- Schema validation with clear error messages

#### `@gpc-cli/core`
- Business logic and command orchestration
- Combines auth + api + config into cohesive workflows
- Release pipelines, rollout strategies, metadata sync
- Plugin manager — loads, validates, and runs plugin lifecycle hooks

#### `@gpc-cli/cli`
- Command registration and argument parsing
- Interactive prompts (node:readline)
- Output formatting: human (table/list), JSON, YAML
- Progress indicators, spinners, color output
- Shell completion generation (bash, zsh, fish)

#### `@gpc-cli/plugin-sdk`
- Plugin interface definition (`GpcPlugin`, `PluginHooks`)
- Lifecycle hook types (`BeforeCommandHandler`, `AfterCommandHandler`, `ErrorHandler`)
- Command registry for plugin-added commands
- Permission model (`PluginManifest`, `PluginPermission`)
- `definePlugin()` helper for type-safe plugin authoring

## Design Principles

### 1. Layered Architecture
Each package has a single responsibility. No circular dependencies. The CLI layer never touches the API directly — it always goes through core.

### 2. Output-First Design
Every command supports `--json` for machine-readable output. Human output is the formatted view of the same data. Internal commands return typed result objects, never print directly.

### 3. Fail Fast, Fail Clearly
Validate inputs before making API calls. Surface auth issues immediately. Provide actionable error messages with suggested fixes.

### 4. Idempotent Operations
Commands that modify state (uploads, releases) should be safe to retry. Use checksums and version checks to prevent duplicate operations.

### 5. Progressive Disclosure
Simple commands have simple interfaces. Advanced options exist but don't clutter the default experience. Interactive mode guides users; flags enable automation.

## Error Handling Strategy

```
┌─────────────────────────────────────────────────┐
│                   CLI Layer                      │
│  Catches all errors → formats for human/JSON    │
│  Sets exit codes → 0 success, 1 error, 2 usage │
├─────────────────────────────────────────────────┤
│                  Core Layer                      │
│  Throws typed errors (AuthError, ApiError, etc.)│
│  Wraps API errors with context and suggestions  │
├─────────────────────────────────────────────────┤
│                  API Layer                       │
│  Throws raw API errors with status codes        │
│  Handles retries for transient failures (5xx)   │
└─────────────────────────────────────────────────┘
```

## Authentication Flow

```
User runs command
       │
       ▼
  Config loaded ──► Check for --service-account flag
       │                    │
       │               Found? ──► Use service account auth
       │
       ▼
  Check GPC_SERVICE_ACCOUNT env var
       │
  Found? ──► Use service account auth
       │
       ▼
  Check config file for auth profile
       │
  Found? ──► Load cached credentials
       │           │
       │      Expired? ──► Refresh token
       │
       ▼
  Check Application Default Credentials
       │
  Found? ──► Use ADC
       │
       ▼
  Interactive? ──► OAuth device flow
       │
       ▼
  Error: No credentials found
  Suggest: gpc auth login
```

## Plugin System

The plugin system (`@gpc-cli/plugin-sdk` + `PluginManager` in `@gpc-cli/core`) provides extensibility without forking.

### Architecture

```
┌──────────────────┐     ┌──────────────────┐
│  @gpc-cli/plugin-sdk │     │  @gpc-cli/plugin-ci  │
│  (interfaces)    │◄────│  (first-party)   │
└────────┬─────────┘     └──────────────────┘
         │
┌────────▼─────────┐
│  PluginManager   │  ← @gpc-cli/core — orchestrates lifecycle
│  (core/plugins)  │
└──────────────────┘
```

### Plugin Interface

```typescript
interface GpcPlugin {
  name: string;
  version: string;
  register(hooks: PluginHooks): void | Promise<void>;
}

interface PluginHooks {
  beforeCommand(handler: BeforeCommandHandler): void;
  afterCommand(handler: AfterCommandHandler): void;
  onError(handler: ErrorHandler): void;
  registerCommands(handler: CommandRegistrar): void;
}
```

### Trust Model

- **First-party** (`@gpc-cli/*`): Auto-trusted, no permission checks
- **Third-party**: Permissions validated against declared `PluginManifest`
- 11 permission types: `read:config`, `write:config`, `read:auth`, `api:read`, `api:write`, `commands:register`, `hooks:beforeCommand`, `hooks:afterCommand`, `hooks:onError`, `hooks:beforeRequest`, `hooks:afterResponse`

### Discovery

Plugins are discovered via:
1. Config file: `plugins: ["@gpc-cli/plugin-ci", "gpc-plugin-slack"]`
2. Convention: `node_modules/@gpc-cli/plugin-*` (first-party, trusted)
3. Convention: `node_modules/gpc-plugin-*` (third-party)

### First-Party Plugin: `@gpc-cli/plugin-ci`

CI/CD environment detection and GitHub Actions step summary output. Detects GitHub Actions, GitLab CI, Jenkins, CircleCI, and Bitrise. When running in GitHub Actions with `$GITHUB_STEP_SUMMARY` available, writes markdown summaries for command results and errors.

## API Clients

### Publisher API (`androidpublisher.googleapis.com`)

The main API client (`@gpc-cli/api`) handles all publisher endpoints — apps, edits, releases, tracks, listings, reviews, monetization, purchases, and testers.

### Reporting API (`playdeveloperreporting.googleapis.com`)

Separate client for Play Vitals data — crash rates, ANR rates, startup times, rendering metrics, battery usage, and error reports.

### Users API (`/developers/{developerId}`)

Separate client (`UsersApiClient`) for developer account user management. Uses a different base path than other publisher endpoints because user operations are scoped to the developer account, not individual apps.
