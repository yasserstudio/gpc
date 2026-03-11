# Conventions & Standards

## Code Style

### TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig)
- **ESM-first** — all packages use ES modules
- **Explicit return types** on exported functions
- **No `any`** — use `unknown` and narrow with type guards
- **Barrel exports** via `index.ts` in each package

### Naming

| Entity       | Convention                          | Example               |
| ------------ | ----------------------------------- | --------------------- |
| Files        | kebab-case                          | `rate-limiter.ts`     |
| Classes      | PascalCase                          | `ApiClient`           |
| Interfaces   | PascalCase (no `I` prefix)          | `AuthStrategy`        |
| Types        | PascalCase                          | `TrackRelease`        |
| Functions    | camelCase                           | `uploadBundle()`      |
| Constants    | UPPER_SNAKE_CASE                    | `MAX_RETRY_COUNT`     |
| Env vars     | UPPER*SNAKE_CASE with `GPC*` prefix | `GPC_SERVICE_ACCOUNT` |
| CLI flags    | kebab-case                          | `--service-account`   |
| npm packages | `@gpc-cli/<name>`                   | `@gpc-cli/core`       |

### Imports

- Use path aliases within packages: `@gpc-cli/api`, `@gpc-cli/core`, etc.
- Relative imports within a package: `./errors`, `../models/tracks`
- No default exports — use named exports exclusively
- Sort imports: external deps → internal packages → relative

## Git

### Branch Strategy

Trunk-based development on `main`. Short-lived branches only for risky experiments.

```
main                          # Primary branch (direct commits)
feat/<scope>/<short-desc>     # Feature branches (when needed)
fix/<scope>/<short-desc>      # Bug fixes (when needed)
chore/<scope>/<short-desc>    # Maintenance
docs/<short-desc>             # Documentation
```

Scopes: `api`, `auth`, `config`, `core`, `cli`, `plugin-sdk`, `ci`, `docs`

> See `docs/GITHUB.md` for full repository management guide.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`, `build`

**Examples:**

```
feat(cli): add gpc releases upload command
fix(auth): handle expired refresh tokens gracefully
docs(api): add rate limiting section to API reference
chore(deps): update googleapis to v130
refactor(core): extract rollout logic into dedicated module
test(auth): add service account auth integration tests
```

### Pull Requests

- One feature/fix per PR
- Require at least 1 review
- Must pass CI (lint, typecheck, test)
- Squash merge to `main`
- PR title follows commit convention

## Testing

### Strategy

| Layer    | Type               | Tool   | Coverage Target |
| -------- | ------------------ | ------ | --------------- |
| `api`    | Unit + Integration | Vitest | 90%             |
| `auth`   | Unit + Integration | Vitest | 90%             |
| `config` | Unit               | Vitest | 95%             |
| `core`   | Unit               | Vitest | 85%             |
| `cli`    | Unit + Snapshot    | Vitest | 80%             |
| `e2e`    | Integration        | Vitest | Key workflows   |

### Conventions

- Test files colocated: `tests/` directory in each package
- Test file naming: `<module>.test.ts`
- Fixtures in `tests/fixtures/`
- Mock external APIs — never call real Google APIs in unit tests
- E2E tests use a dedicated test app in Google Play Console

### Test Commands

```bash
pnpm test                    # Run all tests
pnpm test --filter @gpc-cli/api  # Run tests for specific package
pnpm test:watch              # Watch mode
pnpm test:coverage           # With coverage report
pnpm test:e2e                # End-to-end tests
```

## Versioning & Releases

- **Changesets** for version management
- **Semantic versioning** (semver)
- All packages versioned independently
- `@gpc-cli/cli` version displayed as the "GPC version" to users
- Current series: `0.9.x` pre-release → `1.0.0` public launch
- Pre-1.0: breaking changes bump minor, features/fixes bump patch
- Post-1.0: standard semver rules

### Release Process

1. Create changeset: `pnpm changeset`
2. PR merges to `main`
3. Changesets bot creates "Version Packages" PR
4. Merge version PR → publishes to npm
5. Create umbrella GitHub Release with user-facing notes (see template below)

### GitHub Release Notes Template

One release per version. Per-package changesets releases are **not** created — only umbrella `v*` releases.

Titles use version number only (e.g., `v0.9.5`). No subtitles.

```markdown
## What's Changed

- feat: user-facing description of feature
- fix: user-facing description of fix
- perf: user-facing description of improvement
- breaking: description of breaking change
- docs: description of docs change

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.4...v0.9.5
```

**Rules:**
- Use `feat:`, `fix:`, `perf:`, `breaking:`, `docs:`, `ci:` prefixes
- Write for users, not contributors ("faster CLI startup", not "cached homedir at module level")
- No package scopes in prefixes (`feat:` not `feat(core):`)
- No internal jargon (no "mutex", "token bucket", "barrel exports")
- No test counts or LOC stats
- Always include Full Changelog link
- Attach binaries when applicable

## Error Handling

### Error Classes

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

### Rules

1. Every error has a unique `code` string (e.g., `AUTH_TOKEN_EXPIRED`)
2. Every error includes a human-readable `message`
3. Actionable errors include a `suggestion` field
4. API errors preserve the original HTTP status and response body
5. Errors are thrown, never returned — use try/catch or Result types only at boundaries

## Configuration

### File Priority (highest to lowest)

1. CLI flags (`--app`, `--profile`)
2. Environment variables (`GPC_APP`, `GPC_PROFILE`)
3. Project config (`.gpcrc.json`, `gpc.config.ts`, `package.json#gpc`)
4. User config (`~/.config/gpc/config.json`)
5. Defaults

### Config Schema

```typescript
interface GpcConfig {
  app?: string; // Default package name
  profile?: string; // Default auth profile
  output?: "human" | "json" | "yaml";
  color?: boolean;
  developerId?: string; // Developer account ID (for user management)
  auth?: {
    serviceAccount?: string; // Path to service account key
  };
  plugins?: string[]; // Plugin package names or paths
}
```

## Documentation

- All public APIs documented with TSDoc
- CLI commands have `--help` with examples
- VitePress site for guides and reference
- Changelog auto-generated from changesets
- README in every package with quick-start
