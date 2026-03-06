# Architecture

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | TypeScript 5.x | Type safety, ecosystem, npm distribution |
| **Runtime** | Node.js 20+ LTS | Stability, `npx` support, broad adoption |
| **Monorepo** | Turborepo | Fast builds, caching, task orchestration |
| **Package Manager** | pnpm | Strict dependency resolution, disk efficiency |
| **CLI Framework** | Commander.js | Mature, composable, low overhead |
| **API Client** | googleapis / custom | Official Google client + typed wrappers |
| **Auth** | google-auth-library | Service accounts, OAuth 2.0, ADC |
| **Output** | chalk + ora + cli-table3 | Human-friendly with `--json` machine output |
| **Config** | cosmiconfig | Standard config file discovery |
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
            │  googleapis  │
            └──────────────┘
```

### Package Responsibilities

#### `@gpc/api`
- Typed wrappers around Google Play Developer API v3
- Request/response models auto-generated from API discovery docs
- Rate limiting, retry logic, pagination helpers
- Zero business logic — pure API surface

#### `@gpc/auth`
- Service account JSON key file authentication
- OAuth 2.0 device flow for interactive login
- Application Default Credentials (ADC) support
- Token caching, refresh, and revocation
- Multi-account profile management

#### `@gpc/config`
- Config file discovery (`.gpcrc`, `gpc.config.ts`, `package.json#gpc`)
- Profile-based configuration (dev, staging, production)
- Environment variable overrides (`GPC_*` prefix)
- Schema validation with clear error messages

#### `@gpc/core`
- Business logic and command orchestration
- Combines auth + api + config into cohesive workflows
- Release pipelines, rollout strategies, metadata sync
- Event emitter for plugin hooks

#### `@gpc/cli`
- Command registration and argument parsing
- Interactive prompts (inquirer/prompts)
- Output formatting: human (table/list), JSON, YAML
- Progress indicators, spinners, color output
- Shell completion generation (bash, zsh, fish)

#### `@gpc/plugin-sdk`
- Plugin interface definition
- Lifecycle hooks (pre/post command, auth, output)
- Plugin discovery and loading
- SDK for third-party plugin authors

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

## Plugin System (v2+)

```typescript
interface GpcPlugin {
  name: string;
  version: string;
  register(hooks: PluginHooks): void;
}

interface PluginHooks {
  beforeCommand(ctx: CommandContext): Promise<void>;
  afterCommand(ctx: CommandContext, result: CommandResult): Promise<void>;
  onError(ctx: CommandContext, error: GpcError): Promise<void>;
  registerCommands(registry: CommandRegistry): void;
}
```

Plugins are discovered via:
1. `gpc.config.ts` → `plugins: [...]`
2. `node_modules/@gpc/plugin-*`
3. `node_modules/gpc-plugin-*`
