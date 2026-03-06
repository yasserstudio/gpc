# Implementation & Versioning Strategy

---

## Core Principle: Ship Early, Ship Often

> ASC CLI shipped 102 releases in ~2 years. We aim for **weekly releases** once v0.1.0 is out.
> Every merged PR that touches a package triggers a changeset. No big-bang releases.

---

## Versioning Scheme

### Pre-1.0 (Three-Level Versioning)

```
0.PHASE.UPDATE

0.1.0  → Phase 1 complete (auth + config + CLI shell)
0.1.1  → Sub-update: new feature within Phase 1
0.1.2  → Sub-update: bug fix or minor addition
0.1.3  → Sub-update: another iteration
0.2.0  → Phase 2 complete (API client + apps)
0.2.1  → Sub-update within Phase 2
0.3.0  → Phase 3 complete (uploads + releases + tracks)
...
```

**Pre-1.0 rules:**
- **PHASE** (middle digit) bumps when a roadmap phase is complete (0.1 → 0.2 → 0.3)
- **UPDATE** (last digit) bumps for sub-updates: new features, bug fixes, improvements within a phase
- Breaking changes can happen in any PHASE bump (0.x.0)
- Sub-updates (0.x.Y) should be backward-compatible within their phase
- No stability guarantees — CLI flags, output format, and config schema may change between phases
- README and npm page clearly state "pre-1.0, expect changes"

**Example release timeline:**
```
0.1.0  Auth + config + doctor
0.1.1  Add OAuth device flow
0.1.2  Fix token refresh bug
0.1.3  Add GPC_SKIP_KEYCHAIN env var
0.2.0  API client + apps list/info
0.2.1  Add retry configuration env vars
0.2.2  Fix pagination edge case
0.3.0  Upload + releases + tracks + rollouts
0.3.1  Add --dry-run to releases upload
0.3.2  Fix staged rollout resume bug
0.3.3  Add release notes from file
...
```

### Post-1.0 (Strict Semver)

```
MAJOR.MINOR.PATCH

1.0.0  → Stable release, public API locked
1.1.0  → New features (backward-compatible)
1.1.1  → Bug fixes
2.0.0  → Breaking changes (flag removals, output format changes)
```

### Package Versioning

All packages versioned **independently** via Changesets:

```
@gpc/cli     0.3.0   ← User-facing version ("GPC version")
@gpc/core    0.2.1
@gpc/api     0.2.0
@gpc/auth    0.1.3
@gpc/config  0.1.2
@gpc/plugin-sdk  0.1.0
```

The `gpc --version` command shows the **@gpc/cli version** — that's the "GPC version" to users.

---

## Implementation Order

### Sprint 0: Foundation (Week 1)
> Goal: Buildable, testable, lintable monorepo. Zero features.

```
Day 1:
  git init
  Root config: package.json, pnpm-workspace.yaml, turbo.json
  tsconfig.base.json, eslint.config.js, .prettierrc
  .changeset/config.json

Day 2:
  Package scaffolds (all 6):
    package.json + tsconfig.json + tsup.config.ts + src/index.ts
  Verify: pnpm install && pnpm build && pnpm test (empty but passing)

Day 3:
  GitHub Actions: ci.yml (lint, typecheck, test on PR)
  GitHub Actions: release.yml (changesets publish)
  First commit, push to GitHub
```

**Exit criteria:** `pnpm build` succeeds, `pnpm test` passes, CI green.

**No release.** This is scaffolding only.

---

### Sprint 1: Auth + Config + CLI Shell (Weeks 2-3) → v0.1.0
> Goal: `gpc auth login` and `gpc doctor` work against real Google Play API.

```
@gpc/auth:
  Service account JSON file loading
  OAuth2 token generation from service account
  Token caching (file-based initially, keychain later)
  GPC_SERVICE_ACCOUNT env var support
  Exported: createAuthClient(options) → authenticated googleapis client

@gpc/config:
  Config file discovery (.gpcrc.json, gpc.config.ts)
  Env var loading (GPC_* prefix)
  Schema validation
  Exported: loadConfig() → ResolvedConfig

@gpc/core:
  Context object (auth + config + api client)
  Error types (AuthError, ConfigError, ApiError)
  commands/auth/login.ts, logout.ts, status.ts

@gpc/cli:
  bin.ts entry point
  Commander.js program setup
  TTY detection + output formatter (table/json/yaml/markdown)
  Commands: auth login, auth logout, auth status, auth whoami
  Commands: config init, config show, config set
  Commands: doctor
  Commands: docs (open browser)
  Global flags: --output, --verbose, --quiet, --app, --profile
  Shell completions: bash, zsh, fish
```

**Tests:**
- Auth: service account loading, token generation (mocked), env var precedence
- Config: file discovery, schema validation, env var override, merge logic
- CLI: command parsing, flag handling, output formatting, TTY detection

**Release: v0.1.0** — first npm publish. Users can authenticate and verify setup.

---

### Sprint 2: API Client + Apps (Week 4) → v0.2.0
> Goal: `gpc apps list` returns real data from Google Play.

```
@gpc/api:
  Base client (authenticated HTTP, retry, rate limiting)
  Rate limiter (per-bucket token bucket)
  Retry logic (exponential backoff with jitter)
  Pagination helper (auto-follow nextPageToken)
  Edit lifecycle manager (insert → modify → validate → commit/delete)
  endpoints/edits.ts (insert, get, validate, commit, delete)
  endpoints/details.ts (get app details)

@gpc/core:
  commands/apps/list.ts
  commands/apps/info.ts

@gpc/cli:
  Commands: apps list, apps info
  Pagination flags: --limit, --next-page
  Retry env vars: GPC_MAX_RETRIES, GPC_TIMEOUT
```

**Tests:**
- API client: retry on 429/5xx, rate limiting, pagination
- Edit lifecycle: create → commit, create → delete on failure
- Apps: list parsing, info formatting

**Release: v0.2.0**

---

### Sprint 3: Upload + Track Management (Weeks 5-7) → v0.3.0
> Goal: `gpc releases upload app.aab --track beta` works end-to-end.

```
@gpc/api:
  endpoints/bundles.ts (list, upload with progress)
  endpoints/apks.ts (list, upload)
  endpoints/tracks.ts (list, get, update, create)
  endpoints/deobfuscation.ts (upload mapping file)
  Resumable upload support for large files

@gpc/core:
  commands/releases/upload.ts (orchestrates: edit → upload → track → commit)
  commands/releases/status.ts
  commands/releases/promote.ts
  commands/releases/rollout.ts (increase, halt, resume, complete)
  commands/releases/notes.ts (set release notes)
  commands/tracks/list.ts
  commands/tracks/get.ts

@gpc/cli:
  Commands: releases upload, releases status, releases promote
  Commands: releases rollout (increase/halt/resume/complete)
  Commands: releases notes set
  Commands: tracks list, tracks get
  Commands: publish (end-to-end shortcut)
  Commands: validate (pre-commit checks)
  Commands: status (cross-track overview)
  Progress bar for uploads
```

**This is the most critical sprint.** Upload + release is the core value proposition.

**Tests:**
- Upload: file validation, progress tracking, edit lifecycle
- Tracks: list/get/update, release status transitions
- Rollout: increase/halt/resume/complete state machine
- Promote: cross-track promotion logic
- Integration: full upload → release flow (mocked API)

**Release: v0.3.0** — GPC is now genuinely useful. This is the "tell people about it" release.

---

### Sprint 4: Listings + Metadata (Weeks 8-9) → v0.4.0
> Goal: `gpc listings pull` / `gpc listings push` work.

```
@gpc/api:
  endpoints/listings.ts (CRUD + deleteall)
  endpoints/images.ts (list, upload, delete, deleteall)
  endpoints/countryavailability.ts

@gpc/core:
  commands/listings/get.ts, update.ts
  commands/listings/pull.ts (download to local directory)
  commands/listings/push.ts (upload from local directory)
  commands/listings/images.ts (list, upload, delete)
  Fastlane metadata format compatibility (read/write)
  Diff preview before push (--dry-run)
```

**Release: v0.4.0**

---

### Sprint 5: Reviews + Vitals (Weeks 10-12) → v0.5.0
> Goal: `gpc reviews list` and `gpc vitals overview` work.

```
@gpc/api:
  endpoints/reviews.ts (list, get, reply)
  Reporting API client (separate base URL)
  endpoints/vitals.ts (all 8 metric sets + anomalies)
  endpoints/errors.ts (error issues, error reports)

@gpc/core:
  commands/reviews/list.ts (filter: stars, language, since)
  commands/reviews/reply.ts (with 350 char validation)
  commands/reviews/export.ts (CSV/JSON)
  commands/vitals/overview.ts (dashboard summary)
  commands/vitals/crashes.ts, anr.ts, startup.ts, rendering.ts
  commands/vitals/battery.ts, memory.ts
  commands/vitals/anomalies.ts
  Threshold-based exit codes (for CI alerting)
```

**Separate rate limiting for Reviews API** (200 GET/hour, 2,000 POST/day).

**Release: v0.5.0**

---

### Sprint 6: Monetization (Weeks 13-15) → v0.6.0
> Goal: Subscription and IAP management.

```
@gpc/api:
  endpoints/subscriptions.ts (CRUD + batch)
  endpoints/baseplans.ts (activate, deactivate, migrate prices)
  endpoints/offers.ts (CRUD + batch + activate/deactivate)
  endpoints/inappproducts.ts (CRUD + batch)
  endpoints/onetimeproducts.ts (CRUD + batch)
  endpoints/purchases.ts (get, acknowledge, consume, v2)
  endpoints/orders.ts (get, refund, batch)
  endpoints/voidedpurchases.ts (list)
  endpoints/monetization.ts (convertRegionPrices)

@gpc/core:
  commands/subscriptions/* (list, get, create, update, delete)
  commands/subscriptions/base-plans/*
  commands/subscriptions/offers/*
  commands/iap/* (list, get, create, update, delete, sync)
  commands/purchases/* (get, acknowledge, verify)
  commands/orders/* (get, refund)
```

**Release: v0.6.0**

---

### Sprint 7: Reports + Users + Testers (Weeks 16-17) → v0.7.0

```
@gpc/core:
  commands/reports/* (list, download)
  commands/users/* (list, get, invite, update, remove)
  commands/testers/* (list, add, remove, groups)
```

**Release: v0.7.0**

---

### Sprint 8: Plugin System (Weeks 18-20) → v0.8.0

```
@gpc/plugin-sdk:
  Full plugin interface
  Lifecycle hooks
  Permission checking
  Plugin discovery and loading

@gpc/plugin-ci:
  GitHub Actions summary output
  CI environment detection
```

**Release: v0.8.0**

---

### Sprint 9: Polish → v1.0.0 (Weeks 21-24)

```
- Interactive mode (guided workflows for complex operations)
- --dry-run support for all write operations
- Audit logging
- Proxy and custom CA support
- Performance optimization (<500ms cold start verification)
- 90%+ test coverage
- VitePress docs site complete
- Standalone binary investigation (pkg or similar)
- Security audit
- README and docs polish
```

**Release: v1.0.0** — stable, production-ready.

---

## Release Process

### Per-PR Flow

```
Developer creates PR
    │
    ├── CI runs (lint, typecheck, test)
    │
    ├── Developer runs: pnpm changeset
    │   └── Selects affected packages + change type (major/minor/patch)
    │   └── Writes human-readable change description
    │
    └── PR merged to main
         │
         ├── Changesets bot creates "Version Packages" PR
         │   └── Bumps versions in package.json files
         │   └── Updates CHANGELOG.md
         │
         └── Maintainer merges "Version Packages" PR
              │
              └── release.yml publishes to npm
                   ├── npm publish @gpc/api
                   ├── npm publish @gpc/auth
                   ├── npm publish @gpc/config
                   ├── npm publish @gpc/core
                   ├── npm publish @gpc/cli (gpc)
                   └── Creates GitHub Release with changelog
```

### Release Cadence

| Phase | Cadence | Why |
| --- | --- | --- |
| Pre v0.3.0 | As needed (weekly-ish) | Rapid iteration, few users |
| v0.3.0 - v0.9.0 | Weekly | Active development, growing users |
| v1.0.0+ | Bi-weekly | Stability expectations |
| Patch/security | Immediately | Never delay security fixes |

---

## Version Milestones Summary

### Phase Releases (0.X.0)

| Version | Sprint | What Ships | Key Moment |
| --- | --- | --- | --- |
| **v0.1.0** | 1 | Auth, config, doctor, CLI shell | First npm publish |
| **v0.2.0** | 2 | API client, apps list/info | First real API data |
| **v0.3.0** | 3 | Upload, releases, tracks, rollouts | **Core value unlocked** — start marketing |
| **v0.4.0** | 4 | Listings, metadata, images | Fastlane migration possible |
| **v0.5.0** | 5 | Reviews, vitals, error tracking | Monitoring use case unlocked |
| **v0.6.0** | 6 | Subscriptions, IAP, purchases | Monetization management |
| **v0.7.0** | 7 | Reports, users, testers | Full API coverage |
| **v0.8.0** | 8 | Plugin system | Ecosystem extensibility |
| **v1.0.0** | 9 | Polish, stability, docs | **Stable release** — Product Hunt launch |

### Sub-Updates (0.X.y) — Expected Between Phases

| Version | Example Content |
| --- | --- |
| v0.1.1 | Add OAuth device flow for interactive login |
| v0.1.2 | Fix token refresh edge case |
| v0.1.3 | Add GPC_SKIP_KEYCHAIN, improve error messages |
| v0.2.1 | Add retry config env vars (GPC_MAX_RETRIES, etc.) |
| v0.2.2 | Fix pagination for large app lists |
| v0.3.1 | Add --dry-run to releases upload |
| v0.3.2 | Fix staged rollout resume, add release notes from file |
| v0.3.3 | Improve upload progress bar, add --mapping flag |
| v0.4.1 | Add Fastlane metadata format auto-detection |
| v0.5.1 | Add vitals threshold exit codes for CI alerting |
| ... | Each sub-update ships independently via Changesets |

Sub-updates keep momentum between phases and let us respond to user feedback quickly.

---

## Marketing Alignment

| Version | Marketing Action |
| --- | --- |
| v0.1.0 | "Why I'm building GPC" Twitter thread |
| v0.3.0 | Reddit r/androiddev post, Android Weekly submission, Show HN |
| v0.4.0 | "Migrating from Fastlane to GPC" blog post |
| v0.5.0 | "Monitor Android vitals from your terminal" demo video |
| v0.7.0 | "GPC covers 162 Google Play API endpoints" comparison content |
| v1.0.0 | Product Hunt launch, conference talks, full press push |

---

## Dependency Between Packages (Build Order)

```
Layer 0 (no internal deps):  @gpc/auth, @gpc/config, @gpc/plugin-sdk
Layer 1 (depends on L0):     @gpc/api (peer: @gpc/auth)
Layer 2 (depends on L0+L1):  @gpc/core (depends: @gpc/api, @gpc/auth, @gpc/config)
Layer 3 (depends on all):    @gpc/cli (depends: @gpc/core, @gpc/config)
```

Turborepo handles this automatically via `dependsOn: ["^build"]`.

### Implementation order follows dependency layers:

1. **Sprint 0:** All scaffolds (empty packages)
2. **Sprint 1:** auth → config → core (basic context) → cli (shell)
3. **Sprint 2:** api (client + edits) → core (apps commands) → cli (apps commands)
4. **Sprint 3+:** api (endpoints) → core (commands) → cli (command registration)

Each sprint adds endpoints to `@gpc/api`, commands to `@gpc/core`, and CLI wiring to `@gpc/cli`. The pattern is always **api → core → cli**, bottom-up.

---

## Risk Mitigation

| Risk | Mitigation |
| --- | --- |
| Google API changes break us | Pin googleapis version, test against real API in e2e |
| Over-engineering packages | Start with minimal API, expand based on real usage |
| Scope creep per sprint | Each sprint has explicit exit criteria — ship and move on |
| Low adoption | Start marketing at v0.3.0, not v1.0.0 |
| Contributor burnout | Weekly releases keep momentum, small PRs, celebrate progress |
| Breaking change fatigue | Pre-1.0 warning in README, migration guides for breaking changes |

---

## Decision Log

| Decision | Choice | Rationale |
| --- | --- | --- |
| Independent package versions | Yes (Changesets) | Packages evolve at different speeds |
| Pre-1.0 breaking changes in minor | Yes | Standard pre-1.0 semver practice |
| Weekly release cadence | Yes | Matches ASC CLI's success pattern |
| Marketing starts at v0.3.0, not v1.0.0 | Yes | Core value (upload/release) is enough to show |
| Sprint 3 is the longest sprint | Yes | Upload + release is the hardest and most important feature |
| No alpha/beta npm tags | Correct — use 0.x semver instead | Simpler for users than `npm install gpc@beta` |
