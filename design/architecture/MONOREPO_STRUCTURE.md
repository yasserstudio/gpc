# Monorepo Structure

## Complete Directory Tree

```
gpc/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, typecheck, test on PR
│   │   ├── release.yml               # Changesets release pipeline
│   │   ├── e2e.yml                   # E2E tests (on schedule + manual)
│   │   └── docs.yml                  # Deploy docs to GitHub Pages
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   └── config.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── dependabot.yml
│
├── packages/
│   │
│   ├── api/                          # @gpc/api
│   │   ├── src/
│   │   │   ├── client.ts             # Base API client with retry/rate-limit
│   │   │   ├── endpoints/
│   │   │   │   ├── edits.ts          # App edits (create, commit, validate)
│   │   │   │   ├── tracks.ts         # Track management
│   │   │   │   ├── bundles.ts        # AAB/APK upload
│   │   │   │   ├── listings.ts       # Store listings / metadata
│   │   │   │   ├── images.ts         # Screenshots and feature graphics
│   │   │   │   ├── reviews.ts        # Reviews and replies
│   │   │   │   ├── inapp-products.ts # In-app purchases
│   │   │   │   ├── subscriptions.ts  # Subscriptions and base plans
│   │   │   │   ├── orders.ts         # Order management
│   │   │   │   ├── vitals.ts         # ANR, crash rates, metrics
│   │   │   │   ├── reports.ts        # Financial and stats reports
│   │   │   │   ├── grants.ts         # User permissions
│   │   │   │   ├── users.ts          # Developer account users
│   │   │   │   └── index.ts
│   │   │   ├── models/
│   │   │   │   ├── common.ts         # Shared types (PageInfo, etc.)
│   │   │   │   ├── edits.ts
│   │   │   │   ├── tracks.ts
│   │   │   │   ├── bundles.ts
│   │   │   │   ├── listings.ts
│   │   │   │   ├── reviews.ts
│   │   │   │   ├── subscriptions.ts
│   │   │   │   ├── vitals.ts
│   │   │   │   └── index.ts
│   │   │   ├── pagination.ts         # Auto-pagination utilities
│   │   │   ├── rate-limiter.ts       # Token bucket rate limiter
│   │   │   ├── errors.ts             # API-specific error types
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── client.test.ts
│   │   │   ├── endpoints/
│   │   │   └── fixtures/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── auth/                         # @gpc/auth
│   │   ├── src/
│   │   │   ├── strategies/
│   │   │   │   ├── service-account.ts
│   │   │   │   ├── oauth.ts
│   │   │   │   ├── adc.ts            # Application Default Credentials
│   │   │   │   └── index.ts
│   │   │   ├── token-cache.ts        # Persistent token storage
│   │   │   ├── profiles.ts           # Multi-account profile manager
│   │   │   ├── types.ts
│   │   │   ├── errors.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── config/                       # @gpc/config
│   │   ├── src/
│   │   │   ├── loader.ts             # Config file discovery
│   │   │   ├── schema.ts             # Config schema + validation
│   │   │   ├── env.ts                # Environment variable mapping
│   │   │   ├── profiles.ts           # Profile resolution
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── core/                         # @gpc/core
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── apps/
│   │   │   │   │   ├── list.ts
│   │   │   │   │   └── info.ts
│   │   │   │   ├── releases/
│   │   │   │   │   ├── upload.ts
│   │   │   │   │   ├── promote.ts
│   │   │   │   │   ├── rollout.ts
│   │   │   │   │   ├── halt.ts
│   │   │   │   │   └── status.ts
│   │   │   │   ├── tracks/
│   │   │   │   │   ├── list.ts
│   │   │   │   │   ├── get.ts
│   │   │   │   │   └── update.ts
│   │   │   │   ├── listings/
│   │   │   │   │   ├── get.ts
│   │   │   │   │   ├── update.ts
│   │   │   │   │   └── sync.ts
│   │   │   │   ├── reviews/
│   │   │   │   │   ├── list.ts
│   │   │   │   │   └── reply.ts
│   │   │   │   ├── subscriptions/
│   │   │   │   │   ├── list.ts
│   │   │   │   │   ├── create.ts
│   │   │   │   │   └── update.ts
│   │   │   │   ├── vitals/
│   │   │   │   │   ├── overview.ts
│   │   │   │   │   ├── crashes.ts
│   │   │   │   │   └── anr.ts
│   │   │   │   ├── reports/
│   │   │   │   │   ├── financial.ts
│   │   │   │   │   └── stats.ts
│   │   │   │   └── auth/
│   │   │   │       ├── login.ts
│   │   │   │       ├── logout.ts
│   │   │   │       ├── status.ts
│   │   │   │       └── switch.ts
│   │   │   ├── context.ts            # Command execution context
│   │   │   ├── events.ts             # Event emitter for plugins
│   │   │   ├── errors.ts             # Domain error types
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── cli/                          # @gpc/cli (bin: gpc)
│   │   ├── src/
│   │   │   ├── bin.ts                # Entry point (#!/usr/bin/env node)
│   │   │   ├── program.ts            # Commander setup
│   │   │   ├── commands/             # CLI command registration
│   │   │   │   ├── apps.ts
│   │   │   │   ├── releases.ts
│   │   │   │   ├── tracks.ts
│   │   │   │   ├── listings.ts
│   │   │   │   ├── reviews.ts
│   │   │   │   ├── subscriptions.ts
│   │   │   │   ├── vitals.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── config.ts
│   │   │   ├── output/
│   │   │   │   ├── formatter.ts      # Output strategy (human/json/yaml)
│   │   │   │   ├── table.ts          # Table rendering
│   │   │   │   ├── spinner.ts        # Progress indicators
│   │   │   │   └── colors.ts         # Theme and color utilities
│   │   │   ├── prompts/
│   │   │   │   ├── interactive.ts    # Interactive mode prompts
│   │   │   │   └── confirm.ts        # Confirmation helpers
│   │   │   ├── completions/
│   │   │   │   ├── bash.ts
│   │   │   │   ├── zsh.ts
│   │   │   │   └── fish.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # Pre-command auth check
│   │   │   │   ├── telemetry.ts      # Anonymous usage (opt-in)
│   │   │   │   └── update-check.ts   # Version update notifier
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   └── plugin-sdk/                   # @gpc/plugin-sdk
│       ├── src/
│       │   ├── types.ts              # Plugin interface definitions
│       │   ├── hooks.ts              # Lifecycle hook system
│       │   ├── loader.ts             # Plugin discovery and loading
│       │   └── index.ts
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
│
├── plugins/
│   └── plugin-ci/                    # @gpc/plugin-ci
│       ├── src/
│       │   ├── github-actions.ts     # GitHub Actions helpers
│       │   ├── summary.ts            # CI summary output
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
│
├── apps/
│   └── docs/                         # Documentation site
│       ├── .vitepress/
│       │   └── config.ts
│       ├── guide/
│       │   ├── getting-started.md
│       │   ├── authentication.md
│       │   ├── configuration.md
│       │   └── ci-cd.md
│       ├── commands/
│       │   ├── apps.md
│       │   ├── releases.md
│       │   ├── tracks.md
│       │   ├── listings.md
│       │   ├── reviews.md
│       │   ├── subscriptions.md
│       │   ├── vitals.md
│       │   └── reports.md
│       ├── plugins/
│       │   ├── overview.md
│       │   └── creating-plugins.md
│       ├── api/                      # Auto-generated API reference
│       ├── index.md
│       └── package.json
│
├── tools/
│   └── scripts/
│       ├── codegen.ts                # Generate types from API discovery
│       ├── validate-packages.ts      # Verify package.json consistency
│       └── link-local.ts             # Local development linking
│
├── e2e/
│   ├── tests/
│   │   ├── auth.test.ts
│   │   ├── releases.test.ts
│   │   ├── tracks.test.ts
│   │   └── helpers/
│   │       ├── setup.ts
│   │       └── fixtures.ts
│   ├── package.json
│   └── tsconfig.json
│
├── .changeset/
│   └── config.json                   # Changesets configuration
│
├── .vscode/
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
│
├── turbo.json                        # Turborepo pipeline config
├── pnpm-workspace.yaml               # Workspace package globs
├── package.json                      # Root package.json
├── tsconfig.base.json                # Shared TypeScript config
├── .eslintrc.js                      # Root ESLint config
├── .prettierrc                       # Prettier config
├── .gitignore
├── .npmrc                            # pnpm settings
├── .node-version                     # Node.js version pinning
├── LICENSE                           # Apache 2.0 or MIT
├── README.md
├── CONTRIBUTING.md
├── CLAUDE.md                         # Claude Code project instructions
└── Docs/                             # Design documents (this folder)
    ├── PROJECT_OVERVIEW.md
    ├── ARCHITECTURE.md
    ├── MONOREPO_STRUCTURE.md
    ├── COMMANDS.md
    ├── ROADMAP.md
    └── CONVENTIONS.md
```

## Package Naming Convention

| Package | npm Name | Directory |
|---------|----------|-----------|
| API Client | `@gpc/api` | `packages/api` |
| Auth | `@gpc/auth` | `packages/auth` |
| Config | `@gpc/config` | `packages/config` |
| Core | `@gpc/core` | `packages/core` |
| CLI | `gpc` (bin) / `@gpc/cli` | `packages/cli` |
| Plugin SDK | `@gpc/plugin-sdk` | `packages/plugin-sdk` |
| CI Plugin | `@gpc/plugin-ci` | `plugins/plugin-ci` |

## Workspace Configuration

### `pnpm-workspace.yaml`
```yaml
packages:
  - "packages/*"
  - "plugins/*"
  - "apps/*"
  - "e2e"
  - "tools/scripts"
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

## Dependency Rules

### Allowed Dependencies

```
cli → core, config
core → api, auth, config, plugin-sdk
api → auth (peer)
auth → (none internal)
config → (none internal)
plugin-sdk → (none internal)
```

### Enforced Constraints

1. **No circular dependencies** between packages
2. **api** must not depend on **core** or **cli**
3. **auth** and **config** are leaf packages (no internal deps)
4. **plugin-sdk** defines interfaces only; no concrete implementations
5. External dependencies are hoisted where possible, pinned in packages where critical
