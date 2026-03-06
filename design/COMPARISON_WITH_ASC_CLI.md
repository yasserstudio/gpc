# GPC vs App-Store-Connect-CLI — Detailed Comparison

A side-by-side analysis of our plan against the most successful reference project.

---

## Project Maturity

| Metric | ASC CLI (shipped) | GPC (planned) |
| --- | --- | --- |
| GitHub stars | 2,600 | 0 (pre-launch) |
| Contributors | 69 | 1 |
| Releases | 102 (v0.37.1) | 0 |
| Commits | 1,921 | 0 |
| Language | Go | TypeScript |
| License | MIT | MIT |
| Age | ~2 years of active development | Planning phase |

---

## Architecture Comparison

| Aspect | ASC CLI | GPC |
| --- | --- | --- |
| **Language** | Go 1.26+ | TypeScript 5.x |
| **Structure** | Flat (`cmd/`, `internal/`) | Monorepo (`packages/*`) |
| **Distribution** | Single binary (Homebrew, curl) | npm (`npm install -g gpc`, `npx gpc`) |
| **Binary size** | Single compiled Go binary | Node.js + bundled JS |
| **Cold start** | Near-instant (compiled) | <500ms target (Node.js boot) |
| **Dependencies** | Minimal (Go stdlib heavy) | More deps (googleapis, commander, etc.) |
| **Package manager** | Go Modules | pnpm workspaces |
| **Build system** | Makefile + `go build` | Turborepo + tsup |
| **API spec** | Offline OpenAPI snapshot (`docs/openapi/latest.json`) | Google API discovery docs |
| **Plugin system** | No (agent skills separate) | Yes (planned Phase 7) |
| **Publishable packages** | 1 binary | 6 npm packages (@gpc/*) |

### Verdict

ASC CLI's Go approach gives it **faster startup, simpler distribution, and zero runtime dependency**. GPC's TypeScript monorepo trades that for **npm ecosystem reach, publishable sub-packages for programmatic use, and a plugin system**. Both are valid — different ecosystems, different conventions. Android/Node teams expect npm; iOS/macOS teams expect Homebrew.

---

## Command Structure

| Aspect | ASC CLI | GPC |
| --- | --- | --- |
| **Pattern** | `asc <group> <action> [flags]` | `gpc <group> <action> [flags]` |
| **Command groups** | 81+ | 10 planned (expandable) |
| **Total commands** | 200+ (estimated) | ~60 planned for v1.0 |
| **Discovery** | `asc --help`, `asc <group> --help` | Same pattern |
| **Completions** | `asc completion` | `gpc completion` (bash, zsh, fish) |

### ASC CLI Command Groups (81+)

```
analytics, insights, finance, performance, feedback, crashes,
apps, app-setup, app-tags, app-info, versions, localizations,
screenshots, video-previews, background-assets, product-pages,
pricing, pre-orders, categories, age-rating, accessibility,
encryption, eula, agreements, app-clips, game-center,
testflight, builds, build-bundles, pre-release-versions,
review, reviews, submit, validate, publish, release,
iap, subscriptions, offer-codes, win-back-offers,
signing, bundle-ids, certificates, profiles,
account, users, actors, devices, webhooks, xcode-cloud,
notify, migrate, diff, status, workflow, metadata, ...
```

### GPC Command Groups (planned)

```
apps, releases, tracks, listings, reviews,
subscriptions, iap, vitals, reports, testers,
users, auth, config, doctor, completion
```

### Verdict

ASC CLI has **far more command groups** because the App Store Connect API is much larger (~1,210 endpoints vs ~162). GPC's 10 groups are appropriate for the Google Play API surface. Both follow the same `tool group action` pattern — good.

**Gap identified:** ASC CLI has these useful meta-commands we should adopt:
- `asc doctor` — we have this planned
- `asc init` — interactive project setup (we have `gpc config init`)
- `asc diff` — diff between versions/releases (we don't have this)
- `asc status` — cross-track release overview (we have `gpc releases status`)
- `asc workflow` — JSON-based automation workflows (we have plugin system instead)
- `asc publish` — end-to-end publish flow (we should add this)
- `asc validate` — pre-submission checks (we should add this)
- `asc docs` — open docs in browser (nice DX touch)
- `asc web` — experimental web UI (future consideration)

---

## Output Handling

| Aspect | ASC CLI | GPC |
| --- | --- | --- |
| **Default (TTY)** | `table` | Human-readable (table/list) |
| **Default (pipe/CI)** | `json` (auto-detected) | Human (must use `--json`) |
| **Formats** | table, json, markdown | human, json, yaml |
| **TTY detection** | Yes — auto-switches | Not planned yet |
| **Pagination flags** | `--paginate`, `--limit`, `--next` | Not planned yet |
| **Flag** | `--output table/json/markdown` | `--json`, `--yaml`, `--quiet` |

### Verdict

ASC CLI's **TTY auto-detection is superior**. When piped to `jq` or another tool, it automatically outputs JSON. When in a terminal, it shows formatted tables. We should adopt this.

**Action items for GPC:**
1. Add TTY detection — auto-switch to JSON when stdout is not a terminal
2. Add `--output` flag with `table`, `json`, `yaml` options (instead of separate `--json`/`--yaml`)
3. Add pagination flags (`--limit`, `--next-page`)
4. Add `markdown` output format (useful for GitHub Actions summaries)

---

## Authentication

| Aspect | ASC CLI | GPC |
| --- | --- | --- |
| **Primary method** | API Key (key ID + issuer ID + private key) | Service Account JSON |
| **Interactive** | `asc auth login` (stores in keychain) | `gpc auth login` (OAuth device flow) |
| **Env vars** | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY` | `GPC_SERVICE_ACCOUNT` |
| **Token type** | JWT (self-signed, 10 min TTL) | OAuth2 (1h access, refreshable) |
| **Keychain** | macOS Keychain (with bypass flag) | OS keychain (keytar) with file fallback |
| **Multiple accounts** | `--profile` flag | `--profile` flag + `gpc auth switch` |
| **Bypass for CI** | `ASC_BYPASS_KEYCHAIN=1` | Env var auth skips keychain automatically |

### Verdict

Similar approach, different auth mechanisms (Apple uses API keys with JWTs, Google uses service accounts with OAuth2). Both support env vars for CI and keychain for local. ASC CLI's `ASC_BYPASS_KEYCHAIN=1` is a nice CI pattern.

**Action item:** Add `GPC_SKIP_KEYCHAIN=1` env var for CI environments where keychain isn't available.

---

## Documentation

| Aspect | ASC CLI | GPC |
| --- | --- | --- |
| **Docs location** | `docs/` folder in repo | `docs/` (VitePress site) + `design/` (planning) |
| **COMMANDS.md** | Yes — full reference | Yes |
| **API_NOTES.md** | Yes — quirks and workarounds | Yes (API_REFERENCE.md) |
| **CI_CD.md** | Yes — multi-platform recipes | Yes (CI_CD_RECIPES.md) |
| **TESTING.md** | Yes — testing conventions | Part of CONVENTIONS.md |
| **CONTRIBUTING.md** | Yes | Yes |
| **OpenAPI spec** | Offline snapshot in `docs/openapi/` | No equivalent (Google uses discovery docs) |
| **Landing page** | asccli.sh (full site) | Planned for later |
| **Agent skills** | Separate repo + `asc install-skills` | In-repo + `npx skills add` |

### Verdict

ASC CLI has **leaner, more focused docs** in the repo (COMMANDS, API_NOTES, CI_CD, TESTING). Our `design/` folder is **much more extensive** (19 docs) but that's because we're in planning phase — most of it won't ship in the repo's `docs/` folder.

**Action items:**
1. Keep `design/` as internal planning docs
2. Ship `docs/` as the public VitePress site with user-facing content only
3. Add a `TESTING.md` separate from CONVENTIONS.md
4. Consider offline Google API spec caching like ASC CLI's OpenAPI approach

---

## CI/CD Integration

| Aspect | ASC CLI | GPC |
| --- | --- | --- |
| **Platforms** | GitHub Actions, GitLab, Bitrise, CircleCI | Same (planned) |
| **Output for CI** | Auto-JSON when piped | `--json` flag |
| **Exit codes** | Standard | Detailed (0-5, 10) |
| **TTY detection** | Yes | Should add |
| **CI env detection** | Via env vars | `GPC_NO_INTERACTIVE` + CI env detection |
| **Retry config** | `ASC_MAX_RETRIES`, `ASC_BASE_DELAY`, `ASC_MAX_DELAY` | Not planned yet |
| **Retry logging** | `--retry-log` flag | Not planned yet |

### Verdict

ASC CLI has **better CI ergonomics**: auto-JSON, configurable retries with logging, timeout configuration. We should add these.

**Action items:**
1. Add `GPC_MAX_RETRIES`, `GPC_BASE_DELAY`, `GPC_MAX_DELAY` env vars
2. Add `GPC_TIMEOUT` env var
3. Add `--retry-log` flag for debugging transient failures
4. TTY detection for auto-format switching

---

## Testing Approach

| Aspect | ASC CLI | GPC |
| --- | --- | --- |
| **Philosophy** | TDD — write failing test first | Vitest, test after |
| **Test pattern** | Realistic CLI invocation patterns | Unit + integration |
| **Output validation** | Parse JSON/XML, not string matching | Same approach (planned) |
| **CI testing** | `ASC_BYPASS_KEYCHAIN=1 make test` | `pnpm test` |
| **Design-first** | Brief design notes before implementing | Full design docs (19 files) |

### Verdict

ASC CLI's **design-first approach per command** is excellent — a brief design note covering taxonomy, UX shape, backward compatibility, and test plan before implementing. We should adopt this as a lightweight process for each new command.

**Action item:** Add a command design template to CONVENTIONS.md.

---

## What ASC CLI Has That We're Missing

| Feature | ASC CLI | GPC Status | Should Add? |
| --- | --- | --- | --- |
| TTY auto-detection for output format | Yes | No | **Yes — P0** |
| `--output table/json/markdown` unified flag | Yes | Separate flags | **Yes — P0** |
| Pagination flags (`--limit`, `--next`) | Yes | No | **Yes — P1** |
| `asc publish` (end-to-end flow) | Yes | No | **Yes — P2** |
| `asc validate` (pre-submission) | Yes | No | **Yes — P2** |
| `asc diff` (version comparison) | Yes | No | Nice to have |
| `asc docs` (open docs in browser) | Yes | No | **Yes — easy** |
| `asc web` (experimental web UI) | Yes | No | Future |
| Retry config env vars | Yes | No | **Yes — P1** |
| `--retry-log` flag | Yes | No | **Yes — P1** |
| `--report` / `--report-file` flags | Yes | No | Nice to have |
| Offline API spec caching | Yes (OpenAPI) | No | Consider |
| Wall of Apps (community showcase) | Yes (68 apps) | No | **Yes — post-launch** |
| `asc install-skills` built-in | Yes | Separate `npx skills add` | Consider |
| `asc notify` (webhooks) | Yes | No | Phase 7 (plugins) |
| `--strict-auth` flag | Yes | No | Consider |
| Design notes per command | Yes | Full design docs | Add lightweight template |
| Markdown output format | Yes | No | **Yes — for GH Actions summaries** |

---

## What GPC Has That ASC CLI Doesn't

| Feature | GPC | ASC CLI |
| --- | --- | --- |
| **Monorepo with publishable packages** | 6 npm packages for programmatic use | Single binary only |
| **Plugin system** | Full SDK with lifecycle hooks | No |
| **Vitals monitoring** | Crash rate, ANR, startup, rendering, battery, memory | N/A (different API) |
| **Comprehensive design docs** | 19 planning documents | Lean docs (4-5 files) |
| **Multi-format config** | `.gpcrc.json`, `gpc.config.ts`, env vars, flags | Env vars + keychain |
| **Detailed exit codes** | 0-5 + 10 (typed error categories) | Standard 0/1 |
| **YAML output** | Yes | No |
| **Marketing/launch plan** | Full strategy documented | Organic growth |
| **VitePress docs site** | Planned | Plain markdown |

---

## Overall Assessment

### Where ASC CLI is ahead

1. **Shipped and battle-tested** — 102 releases, 69 contributors, 2.6k stars
2. **Go binary** — zero runtime deps, instant startup, Homebrew distribution
3. **TTY-aware output** — auto-switches format based on terminal detection
4. **Lean and focused** — less planning, more shipping
5. **CI ergonomics** — retry config, timeout config, report flags
6. **Community** — Wall of Apps, 69 contributors, active ecosystem

### Where GPC plan is ahead

1. **Design thoroughness** — 19 docs covering architecture, marketing, branding, and API deep dive
2. **Plugin architecture** — extensible from day one (designed, built later)
3. **Monorepo with sub-packages** — `@gpc/api` usable independently in any Node.js project
4. **Marketing strategy** — full go-to-market plan, content strategy, launch phases
5. **API reference depth** — every gotcha, quota, and edge case documented before writing code

### Key Takeaway

> **ASC CLI succeeded by shipping fast and iterating.** 102 releases in ~2 years. They didn't plan 19 docs before writing code — they built, shipped, learned, and iterated.
>
> **Our planning is thorough but we need to start building.** The plan is solid. The risk now is over-planning. Every additional planning doc has diminishing returns compared to writing actual code.

---

## Action Items from This Comparison

### Must-adopt (before Phase 1)

- [ ] TTY auto-detection — JSON when piped, table when terminal
- [ ] Unified `--output` flag (`table`, `json`, `yaml`, `markdown`)
- [ ] `gpc docs` command — open docs in browser
- [ ] Retry configuration env vars (`GPC_MAX_RETRIES`, `GPC_TIMEOUT`)
- [ ] Markdown output format (for GitHub Actions step summaries)
- [ ] Lightweight command design template in CONVENTIONS.md

### Should-adopt (Phase 2-3)

- [ ] Pagination flags (`--limit`, `--next-page`)
- [ ] `gpc publish` — end-to-end upload + release flow
- [ ] `gpc validate` — pre-submission checks
- [ ] `--retry-log` flag
- [ ] `GPC_SKIP_KEYCHAIN=1` env var

### Consider (later)

- [ ] `gpc diff` — compare releases/versions
- [ ] Wall of Apps community showcase
- [ ] `gpc install-skills` built-in command
- [ ] Offline API spec caching
- [ ] `gpc web` — experimental web UI
