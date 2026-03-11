---
outline: deep
---

# Code Conventions

Standards and patterns used throughout the GPC codebase. Follow these when contributing or building plugins.

## TypeScript

### Strict Mode

All packages use TypeScript strict mode (`"strict": true` in tsconfig). This enables `strictNullChecks`, `noImplicitAny`, and all other strict checks.

### ESM-First

All packages use ES modules. No CommonJS `require()` calls.

```typescript
// Correct
import { PlayApiClient } from "@gpc-cli/api";

// Wrong
const { PlayApiClient } = require("@gpc-cli/api");
```

### Named Exports Only

No default exports anywhere in the codebase. Every module uses named exports.

```typescript
// Correct
export { PlayApiClient };
export { ServiceAccountAuth };

// Wrong
export default PlayApiClient;
```

### Explicit Return Types

All exported functions have explicit return type annotations.

```typescript
// Correct
export function createClient(options: ClientOptions): PlayApiClient {
  // ...
}

// Wrong — missing return type
export function createClient(options: ClientOptions) {
  // ...
}
```

### No `any`

Use `unknown` and narrow with type guards instead of `any`.

```typescript
// Correct
function parseResponse(data: unknown): AppInfo {
  if (typeof data !== "object" || data === null) {
    throw new ApiError("Invalid response");
  }
  // narrow and validate
}

// Wrong
function parseResponse(data: any): AppInfo {
  return data as AppInfo;
}
```

### Barrel Exports

Each package has an `index.ts` that re-exports the public API.

```typescript
// packages/api/src/index.ts
export { PlayApiClient } from "./client.js";
export { ReportingApiClient } from "./reporting-client.js";
export type { ClientOptions, ApiResponse } from "./types.js";
```

## Naming Conventions

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

## Import Order

Sort imports in this order, with a blank line between groups:

1. Node.js built-ins
2. External dependencies
3. Internal packages (`@gpc-cli/*`)
4. Relative imports

```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Command } from "commander";

import { PlayApiClient } from "@gpc-cli/api";
import { ServiceAccountAuth } from "@gpc-cli/auth";

import { formatOutput } from "./formatters.js";
import type { UploadOptions } from "./types.js";
```

## Git Conventions

### Branch Strategy

Trunk-based development on `main`. Short-lived branches only for risky experiments.

```
main                          # Primary branch (direct commits)
feat/<scope>/<short-desc>     # Feature branches (when needed)
fix/<scope>/<short-desc>      # Bug fixes (when needed)
chore/<scope>/<short-desc>    # Maintenance
docs/<short-desc>             # Documentation
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`, `build`

**Scopes:** `api`, `auth`, `config`, `core`, `cli`, `plugin-sdk`, `ci`, `docs`

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

## Testing Conventions

### Framework

All tests use [Vitest](https://vitest.dev/). Tests are TypeScript-native and ESM-first.

### File Structure

Tests live in a `tests/` directory inside each package:

```
packages/api/
├── src/
│   ├── client.ts
│   └── rate-limiter.ts
└── tests/
    ├── client.test.ts
    ├── rate-limiter.test.ts
    └── fixtures/
        └── mock-responses.json
```

### Coverage Targets

| Package           | Target |
| ----------------- | ------ |
| `@gpc-cli/api`    | 90%    |
| `@gpc-cli/auth`   | 90%    |
| `@gpc-cli/config` | 95%    |
| `@gpc-cli/core`   | 85%    |
| `@gpc-cli/cli`    | 80%    |

### Mock External APIs

Never call real Google APIs in tests. Mock fetch with `vi.stubGlobal`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("PlayApiClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ apps: [] }),
      }),
    );
  });

  it("lists apps", async () => {
    const client = new PlayApiClient({ auth, packageName: "com.example" });
    const result = await client.apps.list();
    expect(result.apps).toEqual([]);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
```

### Test Commands

```bash
pnpm test                       # Run all tests
pnpm test --filter @gpc-cli/api     # Run tests for specific package
pnpm test:watch                 # Watch mode
pnpm test:coverage              # With coverage report
pnpm test:e2e                   # End-to-end tests
```

## Dependency Rules

### Between Packages

Dependencies flow in one direction. No circular dependencies.

```
cli -> core -> api
               auth
               config
plugin-sdk (zero deps)
```

**Enforced rules:**

- `cli` imports from `core` only -- never directly from `api`, `auth`, or `config`
- `core` imports from `api`, `auth`, and `config`
- `api`, `auth`, and `config` do not import from each other
- `plugin-sdk` has zero internal dependencies

### External Dependencies

- Prefer Node.js built-ins over external packages
- Pin major versions in `package.json`
- `pnpm audit` runs in CI on every PR
- No `postinstall` scripts in production dependencies
- New dependencies must be reviewed for maintenance status, download count, and license

## Error Handling Rules

1. Every error has a unique `code` string (e.g., `AUTH_TOKEN_EXPIRED`)
2. Every error includes a human-readable `message`
3. Actionable errors include a `suggestion` field
4. API errors preserve the original HTTP status and response body
5. Errors are thrown, never returned -- use try/catch at boundaries

## Configuration Priority

Settings are resolved in this order (highest priority first):

1. CLI flags (`--app`, `--profile`)
2. Environment variables (`GPC_APP`, `GPC_PROFILE`)
3. Project config (`.gpcrc.json`, `gpc.config.ts`, `package.json#gpc`)
4. User config (`~/.config/gpc/config.json`)
5. Defaults

## Versioning

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

```markdown
## What's Changed

- feat: user-facing description of feature
- fix: user-facing description of fix
- perf: user-facing description of improvement
- breaking: description of breaking change

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/vPREVIOUS...vCURRENT
```

**Rules:**
- Use `feat:`, `fix:`, `perf:`, `breaking:`, `docs:`, `ci:` prefixes
- Write for users, not contributors ("faster CLI startup", not "cached homedir at module level")
- No package scopes in prefixes (`feat:` not `feat(core):`)
- No internal jargon (no "mutex", "token bucket", "barrel exports")
- Always include Full Changelog link
- Attach binaries when applicable
