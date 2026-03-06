# Repository Structure (GitHub-Ready)

The root is what people see first on GitHub. It should be clean, professional, and signal "enterprise-grade open source" immediately.

---

## Root Layout

```
gpc/
│
│── Root Files (what GitHub visitors see first)
│
├── README.md                  # Hero doc — what, why, install, quick start
├── LICENSE                    # MIT
├── CONTRIBUTING.md            # How to contribute
├── CODE_OF_CONDUCT.md         # Community standards
├── SECURITY.md                # Vulnerability reporting policy
├── CHANGELOG.md               # Auto-generated from changesets
├── CLAUDE.md                  # Claude Code project instructions
├── AGENTS.md                  # Agent skills documentation
├── Makefile                   # Common dev commands (build, test, lint)
│
│── Configuration (dotfiles — collapsed on GitHub by default)
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml             # PR checks: lint, typecheck, test
│   │   ├── release.yml        # Changesets publish to npm
│   │   ├── e2e.yml            # E2E tests (schedule + manual)
│   │   └── docs.yml           # Deploy docs to GitHub Pages
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml     # Structured bug report
│   │   ├── feature_request.yml
│   │   └── config.yml         # Issue template chooser
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS             # Review assignments
│   ├── FUNDING.yml            # Sponsorship links
│   └── dependabot.yml         # Automated dependency updates
├── .changeset/
│   └── config.json            # Changesets versioning config
├── .vscode/
│   ├── settings.json          # Workspace settings
│   ├── extensions.json        # Recommended extensions
│   └── launch.json            # Debug configurations
├── .gitignore
├── .npmrc                     # pnpm settings
├── .node-version              # Pin Node.js version (20.x)
├── .prettierrc                # Prettier config
├── .prettierignore
├── eslint.config.js           # ESLint flat config
│
│── Monorepo Configuration
│
├── package.json               # Root package.json (workspaces, scripts)
├── pnpm-workspace.yaml        # Workspace package globs
├── pnpm-lock.yaml             # Lockfile
├── turbo.json                 # Turborepo task pipeline
├── tsconfig.base.json         # Shared TypeScript base config
│
│── Source Packages
│
├── packages/
│   ├── cli/                   # @gpc/cli — entry point, bin: gpc
│   ├── core/                  # @gpc/core — business logic
│   ├── api/                   # @gpc/api — Google Play API client
│   ├── auth/                  # @gpc/auth — authentication strategies
│   ├── config/                # @gpc/config — configuration loading
│   └── plugin-sdk/            # @gpc/plugin-sdk — plugin interface
│
│── Plugins
│
├── plugins/
│   └── plugin-ci/             # @gpc/plugin-ci — CI/CD helpers
│
│── Documentation
│
├── docs/                      # VitePress documentation site
│   ├── .vitepress/
│   │   └── config.ts
│   ├── index.md               # Landing page
│   ├── guide/                 # Getting started, auth, config, CI/CD
│   ├── commands/              # One page per command group
│   ├── plugins/               # Plugin authoring guide
│   ├── migration/             # Fastlane migration, etc.
│   ├── api/                   # Auto-generated API reference
│   └── package.json
│
│── Planning (design docs — the Docs/ folder we built)
│
├── design/                    # Renamed from Docs/ for GitHub convention
│   ├── README.md              # Index
│   ├── PROJECT_OVERVIEW.md
│   ├── architecture/
│   ├── engineering/
│   └── marketing/
│
│── Testing
│
├── e2e/                       # End-to-end integration tests
│   ├── tests/
│   ├── fixtures/
│   ├── package.json
│   └── tsconfig.json
│
│── Tooling
│
├── scripts/                   # Build/dev scripts
│   ├── codegen.ts             # Generate types from API discovery
│   ├── validate-packages.ts   # Package.json consistency checks
│   └── postinstall.ts         # Workspace setup
│
│── Assets
│
├── assets/                    # Images, logos, banners
│   ├── logo.svg
│   ├── logo-dark.svg
│   ├── banner.png             # GitHub social preview
│   ├── demo.gif               # Terminal recording for README
│   └── screenshots/
│       ├── releases.png
│       ├── vitals.png
│       └── reviews.png
│
│── Agent Skills (auto-installed, gitignored)
│
├── .agents/                   # Installed agent skills (gitignored)
├── .claude/                   # Claude Code symlinks (gitignored)
└── .windsurf/                 # Windsurf symlinks (gitignored)
```

---

## What GitHub Visitors See (Root File Order)

GitHub sorts directories first (alphabetically), then files. Here's the actual view:

```
📁 .github/
📁 assets/
📁 design/
📁 docs/
📁 e2e/
📁 packages/
📁 plugins/
📁 scripts/
📄 .gitignore
📄 .node-version
📄 .npmrc
📄 .prettierrc
📄 AGENTS.md
📄 CHANGELOG.md
📄 CLAUDE.md
📄 CODE_OF_CONDUCT.md
📄 CONTRIBUTING.md
📄 LICENSE
📄 Makefile
📄 README.md              ← This is what renders below the file list
📄 SECURITY.md
📄 eslint.config.js
📄 package.json
📄 pnpm-lock.yaml
📄 pnpm-workspace.yaml
📄 tsconfig.base.json
📄 turbo.json
```

**Key principle:** The visible folders tell the story at a glance — `packages/`, `docs/`, `design/`, `e2e/`, `scripts/`. A visitor immediately understands the project scope.

---

## Package Internal Structure (consistent across all packages)

Every package under `packages/` follows the same layout:

```
packages/<name>/
├── src/
│   ├── index.ts              # Barrel export (public API)
│   ├── ...                   # Implementation files
│   └── types.ts              # Shared types for this package
├── tests/
│   ├── *.test.ts             # Test files
│   └── fixtures/             # Test fixtures (if needed)
├── package.json              # Package manifest
├── tsconfig.json             # Extends tsconfig.base.json
├── tsup.config.ts            # Bundle config
└── README.md                 # Package-level README (for npm)
```

---

## .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/
*.tsbuildinfo

# Agent skills (installed per-machine)
.agents/
.claude/skills
.windsurf/skills
skills-lock.json

# Environment
.env
.env.*
!.env.example

# IDE
.idea/
*.swp
*.swo
.DS_Store

# Test
coverage/

# Turbo
.turbo/

# Changesets
.changeset/*.md
!.changeset/config.json

# OS
Thumbs.db
```

---

## Root package.json

```json
{
  "name": "gpc-monorepo",
  "private": true,
  "packageManager": "pnpm@9.x",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "test:e2e": "turbo run test --filter=e2e",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "clean": "turbo run clean && rm -rf node_modules",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo run build && changeset publish",
    "postinstall": "tsx scripts/postinstall.ts"
  }
}
```

---

## Makefile (convenience commands)

```makefile
.PHONY: build dev test lint clean install

install:
	pnpm install

build:
	pnpm build

dev:
	pnpm dev

test:
	pnpm test

lint:
	pnpm lint && pnpm format:check

typecheck:
	pnpm typecheck

clean:
	pnpm clean

release:
	pnpm release

# Quick smoke test
smoke:
	cd packages/cli && node dist/bin.js --version
	cd packages/cli && node dist/bin.js doctor
```

---

## Naming Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Planning docs folder | `design/` not `Docs/` | Lowercase, conventional, distinct from `docs/` (VitePress) |
| VitePress site | `docs/` | GitHub Pages convention, standard for OSS |
| Scripts folder | `scripts/` not `tools/scripts/` | Flatter, simpler — no need for `tools/` wrapper |
| Assets folder | `assets/` at root | Visible on GitHub, easy to reference in README |
| E2E tests | `e2e/` at root | Separate workspace, own dependencies |
| CI config | `.github/workflows/` | GitHub standard |
| Plugins | `plugins/` at root | Parallel to `packages/`, clear separation |

---

## Differences from App-Store-Connect-CLI

| Aspect | App-Store-Connect-CLI | GPC | Why |
| --- | --- | --- | --- |
| Language | Go (single binary) | TypeScript (monorepo) | npm distribution, ecosystem |
| Structure | Flat (`cmd/`, `internal/`) | Monorepo (`packages/`) | Multiple publishable packages |
| Package manager | Go Modules | pnpm workspaces | TypeScript standard |
| Build | `go build` / Makefile | Turborepo + tsup | Monorepo caching |
| Docs | `docs/` (markdown) | `docs/` (VitePress site) | Richer docs experience |
| Design docs | — | `design/` | Planning artifacts preserved |
| Entry point | `main.go` | `packages/cli/src/bin.ts` | Monorepo package |
| Similarities | README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CLAUDE.md, AGENTS.md, Makefile, .github/ | Same | OSS best practices |
