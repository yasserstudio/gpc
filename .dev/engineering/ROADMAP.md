# GPC Roadmap

> Private roadmap. Not published to the public docs site.

---

## Completed Phases

| Phase | Focus | Status |
| ----- | --------------------------------------------- | ------ |
| 0 | Monorepo scaffold, tooling | Done |
| 1 | Auth, config, CLI shell | Done |
| 2 | API client, edits lifecycle, apps commands | Done |
| 3 | Releases, tracks, rollouts, upload, promote | Done |
| 4 | Listings, metadata, images, Fastlane compat | Done |
| 5 | Reviews, vitals, reporting API, CI alerting | Done |
| 6 | Subscriptions, IAP, purchases, pricing | Done |
| 7 | Reports, users, testers, grants, CSV import | Done |
| 8 | Plugin SDK, plugin manager, lifecycle hooks | Done |
| 9 | Polish, security audit, docs, binary, publish | Done |
| 10 | `gpc preflight` — 9 offline AAB compliance scanners | Done |

---

## Road to 1.0

The remaining items before the stable `1.0.0` release:

- [x] Final API coverage audit (215 endpoints verified)
- [x] Performance benchmarks (cold start < 300ms, sub-ms command latency)
- [x] Security review and credential hardening
- [x] npm publish automation refinement (provenance, dry-run, verification)
- [x] Documentation completeness review (99 pages, also embedded offline in CLI since v0.9.64)
- [x] End-to-end testing against live apps (v0.9.14-v0.9.26 validated against `tv.visioo.app`)
- [x] `gpc status` -- unified app health snapshot (shipped v0.9.24-v0.9.26)
- [x] Supply chain hardening: Socket.dev, SHA-pinned Actions, SBOM, pnpm audit gate (shipped v0.9.50)
- [x] API parameter completeness: rejected apps, native symbols, expansion files (shipped v0.9.51)
- [x] Agent skills v1.9.0: all 16 skills synced with v0.9.51
- [x] Preflight parser fix for large AABs + batchMigratePrices (shipped v0.9.53)
- [x] API audit fixes: OTP offer URL bug, phantom endpoints, missing batch ops, 16KB scanner, system APKs (shipped v0.9.54)
- [x] API freshness audit: offerPhase shape fix, typed revoke/acknowledge bodies, multi-profile `--profile` CLI fix (shipped v0.9.55)
- [x] Agent skills v1.9.2: gpc-sdk-usage/monetization/multi-app synced with v0.9.55
- [x] **v0.9.56 — Enterprise / Managed Google Play** (shipped 2026-04-11). First Android publishing CLI with Play Custom App Publishing API support. See Release Plan §v0.9.56, `ENTERPRISE_RESEARCH.md`, `v0.9.56-PLAN.md`. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.56
- [x] **v0.9.57 — API fixes + type completeness** (shipped 2026-04-13). apprecovery URL fix, dataSafety verb fix, OTP activate/deactivate, `gpc vitals error-count`, type completeness pass (AppLevelPermission/DeveloperLevelPermission/SubscriptionState/OTP enums). 217 endpoints. Tier B (`vitals lmk` rewire) deferred to v0.9.58.
- [x] **v0.9.58 — QoL & Discoverability** (shipped 2026-04-14). Shell completion walker (introspection-based, plugins auto-complete, `.choices()` values surface via TAB), `gpc vitals lmk` rewire to `lowMemoryKillerRateMetricSet`, METRIC_MAP extended with wakeup/lmk/error-count. 1,879 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.58
- [x] **v0.9.59 — LMK metric hotfix** (shipped 2026-04-14). v0.9.58's `lowMemoryKillerRateMetricSet` name isn't what Google exposes; real resource is `lmkRateMetricSet` with `userPerceivedLmkRate*` metrics. Verified live against `com.sfnemploiappli`. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.59
- [x] **v0.9.60 — Completion v2** (shipped 2026-04-15). Hidden `gpc __complete <ctx>` subcommand feeds live profiles/packages/tracks/releases into bash, zsh, and fish at TAB time (~150ms cold, no API calls). Homebrew formula bumped to install completion files on `brew install`. Zsh rewritten to real `_arguments` integration. +30 cli tests.
- [x] **v0.9.61 — Smarter Changelog Generation** (shipped 2026-04-16). `gpc changelog generate` reads local git log, clusters commits, lints subjects, emits md/json/prompt. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.61
- [x] **v0.9.62 — Multilingual Play Store target** (shipped 2026-04-17). `--target play-store --locales <csv|auto>` with 500-char budget. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.62
- [x] **v0.9.63 — AI-assisted Play Store translation** (shipped 2026-04-20). `--ai` flag translates non-source locales via BYO LLM key (Anthropic/OpenAI/Google/Gateway). 4 lazy-loaded deps. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.63
- [x] **v0.9.64 — --apply + bundle race fix + embedded docs** (shipped 2026-04-22). `--apply` writes translated notes into draft release. Bundle upload race fix (Fibonacci backoff poll). `gpc docs list/show/search/init/web` with 99 embedded pages. Completes the changelog-generation series. 2,076 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.64
- [x] **v0.9.65 — Preflight scanners for April 2026 policies** (shipped 2026-04-23). New preflight scanners targeting April 2026 Google Play policy enforcement dates. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.65
- [x] **v0.9.66 — Developer verification tooling** (shipped 2026-04-24). `gpc verify` enriched with account-aware data, `gpc verify checklist` interactive walkthrough, `gpc doctor --verify` signing key comparison, `gpc preflight signing` scanner. Pre-API tooling pulled forward from post-1.0 to address Sept 30 2026 enforcement. 2,143 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.66
- [x] **v0.9.67 — `gpc watch` real-time rollout monitoring** (shipped 2026-04-25). Unified watch command: dual-interval polling (rollout near-real-time, vitals every 15m), multi-metric thresholds (crashes + ANR default, LMK/slowStarts/errorCount opt-in), auto-actions on breach (notify, halt, webhook). Append-only log output, NDJSON for CI, auto-stop on rollout completion, exit code 6 on breach. Side feature: smarter `gpc doctor` (quota proximity, stale cache, shell completion, plugin health checks). Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.67
- [x] **v0.9.68 — `gpc setup` magic bootstrapper + output formats** (shipped 2026-04-26). Headline: `gpc setup --auto` one-command onboarding (installs gcloud if missing, creates service account, downloads creds, opens Console for manual grant step, configures CLI). Inspired by playconsole-cli's zero-friction setup. Minor: add csv, tsv output formats (--output csv/tsv) across all commands. Add `--validate-only` flag on `gpc releases commit` (dry-run edit validation without publishing, inspired by Fastlane supply). 2,196 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.68
- [x] **v0.9.69 — SHA-256 image sync + bundles + changesNotSentForReview auto-rescue** (shipped 2026-04-27). Headline: SHA-256 content-hash image sync for `gpc metadata push` (skip re-uploading identical screenshots/images, inspired by Fastlane supply). `gpc bundles list` and `gpc bundles find --version-code <N>` shortcut lookup. `gpc bundles wait --version-code <N>` polls until bundle processing completes. `changesNotSentForReview` auto-rescue on edit commit failures (retry with flag on 403/400, inspired by Fastlane). 2,237 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.69
- [x] **v0.9.70 — Release polish + changelog fallback + vitals freshness fix** (shipped 2026-04-29). `--in-app-update-priority <0-5>` and `--retain-version-codes <csv>` flags on upload (inspired by Fastlane). `default.txt` changelog fallback for Fastlane-style versioned release notes. Fix: preserve `inAppUpdatePriority` + `name` on promote. Fix: vitals freshness clamping (queries freshness endpoint, clamps date range to avoid 400 errors when Google's data lags). API: `getMetricSetFreshness()` reporting client method. Infra: GitHub Actions Node.js 22 migration. 2,260 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.70
- [x] **v0.9.71 — Smarter Doctor** (shipped 2026-04-30). `gpc doctor` quota proximity check (warns at >80% daily/per-minute API usage) and plugin health check (discovers, loads, reports each configured plugin). Two new check names: `quota` and `plugin-*`. 2,269 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.71
- [x] **v0.9.72 — API Compliance Patch** (shipped 2026-05-08). errorReports:search endpoint path fix, v1 subscription deprecation notices, missing RTDN notification types, API coverage map update, homepage redesign. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.72
- [x] **v0.9.73 — Skills check, Android CLI detection, upload --changelog-ai** (shipped 2026-05-11). `gpc skills check` scans installed agent skills and checks for updates. `gpc doctor` detects Google's Android CLI (check #24). `--changelog-ai --locales <csv|auto>` on `gpc releases upload` generates AI-translated release notes inline during upload. Docs: sidebar restructured (Guide 4 groups, Commands System 3 subgroups), 3 new pages (recipes, staged rollout strategy, rate limits reference), FAQPage schema on troubleshooting, clickable coverage grid, glossary cross-links. SEO: all 7 package.json files with homepage + keywords, WebSite JSON-LD, og/twitter meta. 2,281 tests.
- [x] **v0.9.74 — Security Hardening** (shipped 2026-05-15). Full deepsec (Vercel Labs AI security scanner) audit of 74 files. 54 findings triaged: 16 real issues fixed, remainder false positives or by-design behaviors. Fixes: plugin RCE (approve before import), resumable upload SSRF, symlink traversal via --notes-dir, config set secret echo, proxy credential leakage in doctor output, skills installer env scrubbing, vitals gate ordering (check before rollout increase), image upload/delete dry-run bypass, central API path encoding (encodeURIComponent on all path params), RTDN purchase token redaction, HTTP error path sanitization, webhook argv filtering, CSV formula injection in review export, AI changelog prompt injection hardening, rate limiter per-bucket mutex. CI: deepsec scanning added to ci.yml (PR-only), `pnpm.onlyBuiltDependencies: []` supply chain lockdown, `ignore-scripts=true` in .npmrc and all 6 CI workflows, Socket CLI pinned (was @latest), lockfile integrity hash in CI, provenance verification post-publish. CVEs patched: protobufjs HIGH (code injection), vite HIGH x2 (server.fs.deny bypass, WebSocket arbitrary file read). 2,309 tests. Audit document: `.dev/engineering/SECURITY_AUDIT_2026-05-15.md`.
- [x] **v0.9.75 — Data safety CSV fix + input validation + docs rewrite** (shipped 2026-05-19). fix(api): data safety update sends correct CSV format (was broken JSON), input validation (empty/oversized file guards), docs rewrite. 2,310 tests.
- [x] **v0.9.76 — Google I/O 2026 response** (shipped 2026-05-20). Play Developer API parity (new SubscriptionPurchaseV2 fields, May 2026 deprecation warnings), Android CLI interop docs refresh (Android CLI 1.0 stable + AI Studio internal-track publishing), monetization docs update (60-day account recovery), full API contract audit (50+ fixes). 2,313 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.76
- [x] **v0.9.77 — Fix large AAB upload timeout, supply chain hardening** (shipped 2026-05-22). Fibonacci backoff polling (~86s), multi-retry guard on validate/commit. Trusted Publisher (OIDC), Staged Publishing (2FA gate), NPM_TOKEN deleted. 2,319 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.77
- [x] **v0.9.78 -- Track management, edit commit, and version assignment fixes** (shipped 2026-05-24). fix: `tracks update` versionCode coercion + nested JSON support. fix: `validateAndCommit` auto-rescue for changesNotSentForReview on validate (15+ commands). feat: `gpc releases assign <versionCode> --track <track>`. 2,332 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.78
- [x] **v0.9.79 -- Developer clarity, API contract refresh, Android 16 preflight** (shipped 2026-05-25). Two tracks: (A) Developer/AI-agent clarity: visible auto-rescue output + JSON `reviewPending` flag after rejection commit, bundle processing progress logging, edit expiry error improvement, internal track "no review" note, staged rollout decrease actionable error, `--dry-run` boundary logging. (B) API contract: `offerPhaseDetails` on Orders (deprecates `offerPhase`), OTP purchase option offers audit (7 methods + batch), `edits.tracks.create` for custom closed testing, surface `onHoldStateContext`/`inGracePeriodStateContext` in subscription output. Plus: `target-sdk-version` preflight scanner (API 36, Aug 31 2026 deadline), Node.js 24 CI compat (June 16 default). 2,332 tests.
- [x] **v0.9.80 -- Security audit, API alignment, code quality** (shipped 2026-05-30). Full-codebase deepsec v2.0.9 audit: 15 security fixes (plugin trust gate, CI hardening, webhook redaction, preflight false negatives), 13 API alignment fixes (discovery doc rev 20260520), 20 code quality fixes (null safety, download retry, permission enforcement). Deepsec re-scan: 0 new findings, 24 marked Fixed. 2,343 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.80
- [x] **v0.9.81 -- GPC GitHub Action + config precedence fix** (shipped 2026-06-06). `yasserstudio/gpc-action` live on the GitHub Actions Marketplace. TypeScript action on Node 24, built-in preflight compliance gate, drop-in migration from `r0adkll/upload-google-play` (same inputs). fix(config): `GPC_SERVICE_ACCOUNT`/`GPC_APP` env vars and `--service-account`/`--app` flags now override an active profile. Docs: CI/CD page features the action as the quickest path. Supply chain article published. 2,345 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.81
- [x] **v0.9.82 -- Dependency health + docs alignment + lint cleanup** (shipped 2026-06-07). AI SDK v6/v3 upgrade (zero code changes). `google-auth-library` 10.7.0 clears the only production audit finding (`brace-expansion` transitive). `turbo` 2.9.16 (CSRF + Yarn Berry CVE, dev-only). 30 lint warnings fixed in CLI (proper API types replace `as any` casts, unnecessary `!` assertions removed). Routine patch bumps: eslint, vitest, typescript-eslint, prettier, protobufjs, yauzl. 2,345 tests.
- [x] **v0.9.83 -- Response & usage quality** (shipped 2026-06-11). Real bug fix: `paginateAll` always returned an empty continuation token, so `--limit` + `--next-page` could not page past the first batch (reviews/users/purchases/iap/subscriptions); voided-purchases default path also dropped its token. Consistent `list --json` envelope `{ <key>, nextPageToken, meta.count, message? }` + human resume footer (**breaking:** reviews/iap no longer return a bare array). Error fidelity: Google's `"package not found"` 404 now maps to `API_APP_NOT_FOUND`; unmapped statuses carry message+suggestion. `formatMoney` honors ISO 4217 minor units. `reviews list` gains `hasReply`/`lang`/`[truncated]`/`--full-text`. CSV/TSV formula-injection guard. 4-agent review; deferred grants/testers/tracks envelope to a follow-up. 2,372 tests. Plan: `V0983_RESPONSE_QUALITY_PLAN.md`. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.83
- [x] **v0.9.84 -- Install fix + regional pricing flag** (shipped 2026-06-20). P0 fix: `npm install -g @gpc-cli/cli` failed with `EUNSUPPORTEDPROTOCOL` because pnpm `workspace:` specifiers leaked into published manifests from v0.9.77-v0.9.83 (the staged-publish switch dropped the resolve step that `changeset publish` used to do). `scripts/stage-publish.js` now resolves `workspace:*` to concrete versions before publishing and refuses to publish if any remain. fix(#78): `--regions-version` is now sent to the Google Play API on all 8 subscriptions/one-time-products create/update/offer write commands (was an accepted-but-ignored facade; defaults to 2022/02). Extends GH PR #79 (softlion, credited). 2,380 tests. Plan: `V0984_PLAN.md`. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.84
- [x] **v0.9.85 -- Complete the install fix** (shipped 2026-06-20). v0.9.84 republished cli+core clean but `@gpc-cli/api` was unchanged, so it was skipped and its already-published manifest still leaked `workspace:*` in `peerDependencies` (`@gpc-cli/auth`) -- a fresh `npm install -g @gpc-cli/cli` still failed (caught by sandbox-verify post-approval). api/core/cli republished with the specifier resolved. `stage-publish.js` hardened to warn when an unchanged, already-published package still leaks the protocol (the gap that caused the miss). 2,380 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.85
- [x] **v0.9.86 -- Complete Google Play Games API** (shipped 2026-06-22). Full CRUD for achievement and leaderboard configurations via Games Configuration API (gamesconfiguration v1configuration). 10 new endpoints (list/get/create/update/delete for both). Diff command for sync workflows. `--game-id` flag + `GPC_GAME_ID` env + `games.applicationId` config. Breaking: `gpc games events` removed, runtime commands moved to `gpc games runtime`. Resolves #80 (softlion). 2,408 tests. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.86
- [ ] Wall of Apps community showcase
- [ ] Public marketing push (Dev.to retrospective, Android Weekly)
- [ ] Stability soak period -- no critical bugs for 2+ weeks in production usage (soak starts after v0.9.90, earliest 1.0: 2 weeks after v0.9.90 ships)
- [x] GitHub Actions Node.js 22 migration (done in v0.9.70)
- [ ] Dependency audit cleanup (see [Supply Chain Status](#supply-chain-status) below) -- production findings cleared in v0.9.82, dev-only remain

Once these items are addressed and the CLI has been validated in production workflows, the version will bump from `0.9.x` to `1.0.0`.

---

## Path to Soak — v0.9.87 → v0.9.90 (planned 2026-06-25)

**One release remains** before the stability soak opens: v0.9.90 (v0.9.87–v0.9.89 shipped). Research basis (refreshed 2026-07-15):

- The androidpublisher discovery doc advanced `20260520 → 20260706`, but with **no new resources or methods** — still **no new API surface to chase**. The May 19 2026 changes (`onHoldStateContext`, `inGracePeriodStateContext`, `OfferPhase`) already shipped (v0.9.76/v0.9.79). PBL v8 gate (Aug 31 2026) is client-side, out of GPC scope.
- **Submission History API** and **parallel-track publishing** are confirmed "later in 2026" but have **no endpoints yet** — they stay on the [Watch List](#watch-list-may-2026), triggered when Google ships them.
- **Developer-verification APIs** (ID Status API live July 2026; Console API GA Aug 2026) are a **separate surface with no public REST/discovery docs** — post-1.0; re-check at Console API GA.
- Deep API features (System APKs, Play Integrity) are deliberately **deferred post-1.0** — niche and they add soak risk.

The right move for the remaining release is **launch-grade polish, the two slipped flagships, and stabilization — not new API breadth.**

### v0.9.87 — Contract consistency + compliance docs ✅ SHIPPED 2026-06-26

Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.87. Plan: `V0987_PLAN.md`. 2,413 tests (+5).

- [x] **Finished the `list --json` envelope** (deferred from v0.9.83). `grants`, `testers`, and `tracks list` now emit `{ <key>, nextPageToken, meta.count, message? }` via `annotateListResult` at the CLI boundary (core signatures untouched). **Breaking** for those three; table output unchanged. `testers` uses `googleGroups` as the items key, defaulted to `[]` so the key is always present (consistency fix caught in live smoke).
- [x] **Compliance docs batch** (docs-only): third-party US app-store syndication opt-out (July 22 2026) added to FAQ + FAQPage JSON-LD; PBL v8 deadline (Aug 31 2026) on subscriptions page; Android 17 / API 37 preflight tip refreshed.
- Note: release commit hit the recurring prettier-after-release CI failure (pre-existing v0.9.86 `games*` drift + new stamps); fixed with a `style: format` follow-up commit. Run `pnpm format` before the release commit next time.

> **Plan drift note (2026-07-15):** v0.9.88 and v0.9.89 were both spent on **reactive** work, not the flagships originally slotted here. The two flagships (`gpc doctor --score`, review intelligence) slipped and are now **consolidated into a bigger v0.9.90** (maintainer decision 2026-07-15). Plan: `V0990_PLAN.md`.

### v0.9.88 — Preflight compliance refresh ✅ SHIPPED 2026-07-01

Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.88. 2,418 tests. Reactive (prompted by a Play newsletter), not the originally-planned `doctor --score`.

- [x] Preflight refresh for Google's **Oct 28 2026** sensitive-permission deadlines (Android 17/API 37+): contacts check cites Android Contact Picker, new `location-minimal-scope` rule, geofencing date corrected to Oct 28 2026, `gpc init` scaffolds `targetSdkMinimum: 36`.

### v0.9.89 — Preflight scanner crash/hang fix ✅ SHIPPED 2026-07-05

Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.89. 2,421 tests. Reactive (GH #89), not the originally-planned review intelligence.

- [x] `gpc preflight` crashed then hung on AAB/APK scan under the standalone (Homebrew) binary (yauzl fd-reader handed a null fd under Bun compile). Offline reader switched to `yauzl.fromBuffer` (no fd) + bounded timeout backstop.

### v0.9.90 — Launch flagship + review intel + soak-prep (last release before soak)

Consolidates both slipped flagships plus stabilization into the final pre-soak release (bigger than the original "minimal blast radius" scope, by decision). Mostly self-contained; the **one exception is the Games enhancements (Track E)**, folded in by decision, which add new Games Configuration/Management API surface and carry the most soak risk. No new *androidpublisher* surface (discovery `20260706`, no new methods). Plan: `V0990_PLAN.md`.

- [ ] **`gpc doctor --score`** (flagship) — A–F release-readiness grade from a curated check subset (auth, config valid, preflight, signing-key, vitals thresholds, CI); score + breakdown + suggestions; `--json`; shareable README **badge** (static shields.io URL, zero infra; optional local SVG). Pure `scoreReadiness()` grading engine in core. The 1.0 launch hook.
- [ ] **Review intelligence** — `reviews list --sort newest|rating|oldest` (named presets over the **existing client-side** `sortResults`; NOT a phantom `reviewsSortOrder` API param — the endpoint has no server sort). `gpc status --full` topic/sentiment breakdown (reuses the existing `sentiment.ts` util; no new NLP, no extra API call).
- [ ] **Developer-verification advisory** (no new API) — extend the v0.9.66 `gpc verify` / preflight surface with a market-aware **info** advisory for the Sept 30 2026 enforcement markets (Brazil, Indonesia, Singapore, Thailand): verified developer + registered package needed; Play App Signing auto-registers. Advisory-only, never moves the `doctor --score` grade or fails preflight.
- [ ] **Games API enhancements** (Track E, new API surface — highest soak risk) — E1 achievement/leaderboard **icon upload** (`imageConfigurations.upload`, reuses resumable media path; closes the create-config-but-not-icon gap); E2 **Games Management API** test-state reset (`achievements`/`scores` reset, `players` hide/unhide — destructive, `--yes` gate); E3 **bulk config sync** (`games ... push <dir>`/`pull`, reuses existing diff). Build/trim order E3 → E1 → E2; trim E2 first if the release runs hot. Deepsec gate (below) must cover this surface.
- [ ] **Soak-prep** — dep audit cleanup incl. the open Dependabot batch (#87 + #91 clean → merge; #90 TS 6 / Vite 8 majors **deferred to a post-1.0 tooling PR**, patch bumps only); Socket-on-Dependabot CI fix (dependabot-actor exclusion on the `socket-security` job); **pre-soak deepsec security gate** (`pnpm security:deep`, Codex only, 0 unaddressed high/critical before tagging — last full audit was v0.9.80); final bug-hunt + live smoke across all profiles; version/stat stamps aligned.
- [ ] **Launch-grade docs + SEO/AEO pass** (Track F, content-only, near-zero soak risk) — full command-reference accuracy audit + new-surface docs; README refresh (marketing skills, dogfood the readiness badge); stats/stamps/endpoint truth-up aligned everywhere; SEO (per-page title/meta, JSON-LD extend, sitemap/robots/canonical, keywords ×7); AEO/GEO (verify/create `llms.txt`+`llms-full.txt` — a likely gap; FAQ + `alternatives/` comparison expansion for AI-search queries); link/freshness audit. Indexed during the soak so 1.0 is a version flip.
- [ ] `gpc compete` easter egg (Tier 2) — optional, drop to protect the soak.
- **The soak window opens when this ships**; target 1.0.0 ≥ 2 weeks later, bug-free.

### Explicitly deferred to post-1.0 (soak risk / niche / no API yet)

- **System APKs** (`gpc system-apks`, 4 endpoints) and **Play Integrity** (`gpc integrity verify`) — real API but niche; defer.
- **Submission History API** + **parallel-track publishing** — no endpoints yet; trigger when Google ships them (Watch List).
- VS Code extension, terminal demo, newsletter, Discord bot — Post-1.0 Tier 1–2.

---

## Supply Chain Status

Last scanned: 2026-06-07 (deepsec v2.0.12 + pnpm audit). Hardened in v0.9.74, production finding cleared in v0.9.82.

### Socket.dev: Clean

- **Status:** `healthy: true`
- **Errors/blocks:** 0
- **Warnings:** 2 -- both `vite` (dev dependency) flagged for obfuscated dist bundles. Normal for bundled packages, not a security concern.
- **Dashboard:** https://socket.dev/dashboard/org/yasser-s-studio

### pnpm audit: 0 production findings, dev-only remain

The `brace-expansion` production finding was cleared in v0.9.82 by bumping `google-auth-library` to 10.7.0. The `eslint` dev-only `brace-expansion` finding was cleared by bumping `eslint` to 10.4.1.

| Package | Severity | Dependency chain | Production? | Exploitable? |
|---------|----------|-----------------|-------------|--------------|
| `flatted` | High (2x) | `eslint > file-entry-cache > flat-cache` | No (devDep) | N/A |
| `picomatch` | High + Moderate (4x) | `tsup > tinyglobby`, `@changesets/cli` | No (devDep) | N/A |
| `esbuild` | Moderate | `vitepress > vite` | No (devDep) | N/A |

### Action items for next version cut

| Priority | Action | Trigger | Impact |
|----------|--------|---------|--------|
| ~~Medium~~ | ~~Bump `google-auth-library`~~ | ~~Done in v0.9.82~~ | ~~Cleared production brace-expansion finding~~ |
| Low | Bump `eslint` to v9.x+ | When `flat-cache` drops `flatted` or `flatted` patches | Clears 2 high-severity dev-only findings |
| Low | Bump `tsup` | When `tinyglobby` updates `picomatch` to >= 4.0.4 | Clears 2 high + 2 moderate dev-only findings |
| Low | Bump `vitepress` | When Vite updates bundled `esbuild` | Clears 1 moderate dev-only finding |
| Info | Monitor `@changesets/cli` | When changesets bumps `picomatch` | Clears remaining picomatch finding |

**None of these are blocking v1.0.0.** Zero production findings remain. All dev-only tooling.

---

## gpc status — Engineering Spec

The launch anchor feature. One command that shows the full picture of an app's health: releases, vitals, and reviews in a single scannable output.

### What it shows

```
App: tv.visioo.app · Visioo TV  (updated 12s ago)

RELEASES
  production   v1.4.2   live       100%
  beta         v1.5.0   in review  —
  internal     v1.5.1   draft      —

VITALS  (last 7 days)
  crashes   0.8%  ✓    anr       0.2%  ✓
  startup   2.1s  ✓    rendering 4.3%  ✓

REVIEWS  (last 30 days)
  ★ 4.6   142 new   89% positive   ↑ from 4.4
```

### API calls

All fired in parallel, in a single `Promise.all`:

| Section | API | Method |
|---------|-----|--------|
| Releases | Publisher API | `tracks.list` |
| Crash rate | Reporting API | `crashRateMetricSet.query` |
| ANR rate | Reporting API | `anrRateMetricSet.query` |
| Startup | Reporting API | `slowStartRateMetricSet.query` |
| Rendering | Reporting API | `slowRenderingRateMetricSet.query` |
| Reviews | Publisher API | `reviews.list` (recent, limit 500) |

Total: 6 parallel API calls. Target: < 3s on a normal connection.

### Caching

Store last fetch in `.gpcrc-cache.json` (alongside `.gpcrc-audit.json`):

```json
{
  "status": {
    "fetchedAt": "2026-03-14T10:00:00Z",
    "ttl": 3600,
    "data": { ... }
  }
}
```

- Default TTL: 3600 seconds (1 hour), configurable in `.gpcrc.json`
- `--cached`: read from file, skip all API calls (< 100ms)
- `--refresh`: force live fetch, update cache regardless of TTL
- Cache is per-app (keyed by package name)

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--days <n>` | `7` | Vitals window |
| `--full` | off | Add reviews sentiment breakdown (top topics) |
| `--cached` | off | Use last fetched data, no API calls |
| `--refresh` | off | Force live fetch, ignore TTL |
| `--watch <seconds>` | off | Auto-refresh on interval |
| `--output <format>` | `table` | `table` / `json` / `yaml` |
| `--app <package>` | config | Override app package |

### Vitals indicators

Reuse `checkThreshold()` from `vitals.ts`. Each metric shows:
- `✓` — within threshold
- `⚠` — within 20% of threshold
- `✗` — threshold breached

If any metric is `✗`, exit code is `6` (consistent with `gpc vitals` behavior).

### Reviews sentiment (default path)

From the `reviews.list` response, compute locally:
- Average rating
- Count of new reviews in window
- Positive % = reviews with `starRating >= 4`
- Trend = compare current rating avg to previous period

No external NLP needed for the basic path. `--full` adds topic keywords (planned post-1.0 as part of review intelligence).

### Subscribers section (deferred)

No direct "active subscriber count" endpoint exists in Publisher API v3. The financial reports (GCS-delivered) have this data but with a significant delay and only for apps with revenue access. **Skip this section for 1.0**, add a note that it's coming when the API exposes it. Don't fake it with a calculation that would be misleading.

### JSON output shape

```json
{
  "app": {
    "packageName": "tv.visioo.app",
    "title": "Visioo TV"
  },
  "fetchedAt": "2026-03-14T10:00:00Z",
  "cached": false,
  "releases": [
    { "track": "production", "versionName": "1.4.2", "status": "completed", "userFraction": 1.0 },
    { "track": "beta", "versionName": "1.5.0", "status": "inProgress", "userFraction": null }
  ],
  "vitals": {
    "windowDays": 7,
    "crashes": { "value": 0.008, "threshold": 0.02, "status": "ok" },
    "anr":     { "value": 0.002, "threshold": 0.01, "status": "ok" },
    "startup":  { "value": 2100,  "threshold": 5000, "status": "ok" },
    "rendering":{ "value": 0.043, "threshold": 0.10, "status": "ok" }
  },
  "reviews": {
    "windowDays": 30,
    "averageRating": 4.6,
    "previousAverageRating": 4.4,
    "totalNew": 142,
    "positivePercent": 89
  }
}
```

### Implementation plan

1. New file: `packages/core/src/commands/status.ts`
   - `getAppStatus(options)` — orchestrates parallel API calls
   - `formatStatusTable(data)` — renders the table output
   - `loadStatusCache(packageName)` / `saveStatusCache(packageName, data)` — cache I/O

2. New file: `packages/cli/src/commands/status.ts`
   - Commander command definition
   - Wires flags to `getAppStatus()`

3. `packages/core/src/commands/vitals.ts`
   - Extract `queryVitalMetric(metricSet, options)` helper for reuse by status

4. Cache file: `.gpcrc-cache.json` — new alongside existing `.gpcrc-audit.json`

5. Tests: mock all 6 API calls, test cached path, test threshold exit code, test `--full` flag, test `--watch` refresh

### The launch demo

This command is the hero of the 1.0 launch. The README gif, the tweet, the "why GPC" page. Someone posts the output and Android developers immediately understand the value — everything they currently get from opening the Play Console in 5 tabs, in one terminal command.

---

## Recent Releases

### v0.9.18 (shipped)

- **regionsVersion on subscription update/updateOffer** — `subscriptions.update` and `updateOffer` now always include `regionsVersion.version=2022/02` query param
- **auto-derive updateMask for subscriptions** — update mask automatically derived from provided fields
- **Table [object Object] fix** — table and markdown output formatters now render nested objects as JSON

### v0.9.19 (shipped)

- **OTP regionsVersion + updateMask** — `oneTimeProducts.update` and `updateOffer` now include `regionsVersion` and auto-derived `updateMask`, matching the subscription fix from v0.9.18
- **Table cell truncation** — cells wider than 60 chars are truncated with `...` in table/markdown output
- **Flatten subscriptions + OTP list** — `subscriptions list` and `otp list` show readable summaries (productId, counts, state) instead of nested JSON blobs in table output
- **Better JSON parse errors** — shared `readJsonFile()` helper shows filename on parse failure
- **`gpc releases diff`** — compare releases between two tracks (version codes, status, rollout, notes)
- **`gpc subscriptions diff`** — compare local JSON file against remote subscription state
- **`gpc otp diff`** — compare local JSON file against remote one-time product state
- **Docs: migrate + purchase-options pages** — added missing command reference pages
- **Docs: sidebar reorg** — split "App Management" into "Distribution" + "Compliance & Recovery", moved `one-time-products` to "Monetization"
- **Docs: cross-references** — linked all monetization commands (iap ↔ otp ↔ purchase-options ↔ subscriptions ↔ purchases)
- **Docs: theme** — updated to `#1a73e8` primary / `#d3e3fd` accent
- **Root CHANGELOG** — backfilled v0.9.10–v0.9.19 entries

### v0.9.20 (shipped)

- **Vitals API endpoint fix** — corrected vitals API endpoint names (were using wrong method names, now working against real API)
- **Upload timeout auto-scaling** — upload timeouts now scale automatically based on file size
- **HTML error sanitization** — API error responses containing HTML are sanitized to extract meaningful error messages
- **Empty output messages** — commands that return no data now show helpful "No data found" messages instead of empty output
- **Table formatting fixes** — resolved remaining table rendering issues for edge cases
- **Data-safety API limitation** — documented that data-safety endpoints are not available in the v3 API
- **Recovery validation** — `recovery list` now validates `--version-code` is provided before making API calls

### v0.9.21 (shipped)

- **Vitals query fix** — `timelineSpec` always included (defaults to 30 days), per-metric-set metrics instead of hardcoded `errorReportCount`
- **Reports GCS limitation** — clear messages explaining financial/stats reports are delivered via Google Cloud Storage
- **Purchase-options redirect** — standalone commands redirect to `otp offers` (correct sub-resource path)
- **Pricing convert table** — correctly extracts `units`/`nanos`/`currencyCode` from Money object
- **Subscriptions listings** — handles array-format listings for language codes
- **Generated-apks table** — flattens nested objects into readable columns
- **JUnit testcase names** — expanded fallback chain with meaningful identifiers

### v0.9.22 (shipped)

- **Table flattening audit** — flat readable columns for 7 more commands
- **Audit log querying** — `gpc audit list`, `search`, `clear` commands
- **Persistent vitals thresholds** — config-based threshold checks without CLI flags
- **Batch IAP commands** — `gpc iap batch-get` and `batch-update`
- **Vitals end-date freshness** — cap to yesterday (API data ~1 day lag)

### v0.9.23 (shipped)

- **Bundle analysis** — `gpc bundle analyze` and `gpc bundle compare` for zero-dependency AAB/APK size breakdown (ZIP central directory parsing, per-module + per-category, `--threshold` CI gate)
- **Vitals compare fix** — non-overlapping date ranges prevent 400 API errors
- **--dry-run for 4 commands** — `tracks create/update`, `device-tiers create`, `internal-sharing upload`
- **Exit code consistency** — unsupported operations exit 2 instead of 1

### v0.9.24 (shipped)

- **Migrate polish** — rollout mapping bug fixed (`supply(rollout: "0.1")` → `gpc releases upload --rollout 10`), `--dry-run` preview, conflict detection before overwriting `.gpcrc.json`, parse warnings for complex Ruby
- **Validate warnings** — file validation warnings (large file, etc.) now surfaced in `ValidateResult.warnings`
- **Git notes truncation** — `generateNotesFromGit` returns `truncated: boolean`; CLI warns to stderr when trimmed
- **Doctor: package name check** — Android package name format validation added
- **Config init wizard** — guided setup with auth method selection, file validation, post-init summary
- **Publish rollout guard** — rejects non-finite / out-of-range values with exit 2

### v0.9.25 (shipped)

- **Critical fix: gpc publish / releases upload** — upload always threw "Upload succeeded but no bundle data returned" because API returns `Bundle` directly (not `{ bundle: Bundle }`). Fixed `bundles.upload` to use `Bundle` type directly.
- **Fix: gpc doctor --json** — global `-j, --json` option consumed at root program level; subcommand action received empty opts. Fixed by reading `cmd.parent?.opts()`.
- **Fix: gpc status --days N / gpc vitals compare --days N** — `parseInt` used as Commander coerce function with a default caused `parseInt(value, default)` using default as radix. Fixed with `(v) => parseInt(v, 10)`.
- **Fix: gpc validate table output** — `checks[]` rendered as raw JSON in table/markdown. Fixed by flattening to rows in CLI command.
- **Fix: JUnit name attribute** — sentinel `"-"` values stopped `??` fallback chain. Fixed by loop that skips `""` and `"-"`.

### v0.9.26 (shipped)

Scope: any bugs surfaced during v0.9.25 live testing + `gpc status` quality-of-life improvements.

Full spec: [STATUS_IMPROVEMENTS.md](STATUS_IMPROVEMENTS.md) — 8 items with interfaces, function signatures, test plan, edge cases.

**Bug fixes (if found during testing):**
- `gpc publish app.aab --track internal` — live upload test still pending; any failures take priority
- `gpc config init` wizard — not yet live-tested
- `gpc doctor` with invalid package name — not yet live-tested

**`gpc status` improvements (see spec for full details):**
1. **Fix `?`/`n/a` display** — use `"—"` em dash; render "No vitals data" / "No reviews" messages (XS)
2. **Trend arrows ↑↓** — `queryVitalWithTrend()` compares two periods; `previousValue?`/`trend?` on `StatusVitalMetric` (S)
3. **`--watch N` proper polling loop** — `runWatchLoop()`, ANSI clear, SIGINT handler, N≥10 validation (M)
4. **`--format summary`** — one-liner mode `tv.visioo.app: v142 internal · crashes 1.2% ↑ · 4.1★` (S)
5. **`--sections` filter** — skip API calls for excluded sections; reduce quota usage (S)
6. **`--since-last` diff** — `StatusDiff` type, compare current to cached; shows delta per metric (M)
7. **Multi-app `--all-apps`** — iterate all configured profiles sequentially, cap at 5 (M)
8. **`--notify`** — OS-native desktop notification on threshold breach/clear; CI-aware skip (L)

**Actual new tests:** 30 → total 1,388

**Implementation order:** 1 → 4 → 5 → 2 → 3 → 6 → 7 → 8 (all shipped)

### v0.9.27 (shipped)

- **fix(status): --sections output filtering** — `sections` field added to `AppStatus`; filtering works at fetch time (`--refresh`) and in JSON output; display-time filter from full cache still partial (see bug #9b, fixed in v0.9.29)

**Actual new tests:** 3 → total 1,391

### v0.9.28 (shipped)

- **fix(audit): `gpc audit clear --dry-run` not respected** — global `--dry-run` was consumed at root before subcommand action ran; `options.dryRun` was always `undefined`. Now uses `isDryRun(cmd)`. Same root cause as `gpc doctor --json` (v0.9.25).

**Actual new tests:** 1 → total 1,392

### v0.9.29 (shipped)

- **fix(releases): validate `--rollout` on promote and rollout increase; guard same-track promote**
- **fix(releases): `notes set` now exits with helpful error instead of silently succeeding**
- **fix(releases): `upload` and `publish` check file exists before resolving auth**
- **fix(releases): `status` shows rollout as `"10%"` not `"0.1"`**
- **fix(status): `--sections` filter now applies to cached data (closes bug #9b)**
- **fix(status): `--days` validates positive integer before API calls**
- **fix(status): `--watch` warns when combined with `--since-last`**
- **fix(status): `--since-last` diff header uses relative time**
- **fix(status): header timestamps use relative time**
- **feat(docs): `gpc docs [topic]` routes to specific page; `--list` shows available topics**

**Actual new tests:** 28 → total 1,420

### v0.9.30 (shipped — superseded by v0.9.31)

- **feat(update): `gpc update`** — self-update command, auto-detects npm/Homebrew/binary install, verifies SHA-256 checksums, `--check` flag for CI
- **fix(update-check):** passive notification now says "Run: gpc update" for all install methods
- _Note: `@gpc-cli/cli@0.9.30` was unpublished; GitHub Release exists for history. Use v0.9.31._

**Actual new tests:** 26 → total 1,453

### v0.9.31 (shipped)

- **feat(update):** live download progress bar for binary installs
- **fix(update):** silence npm/brew stdout in JSON mode; skip passive update check on `gpc update`

**Actual new tests:** 0 → total 1,453

---

### v0.9.32 (shipped — Smarter CLI: Progress, Suggestions & Utility Commands)

**Theme:** Close the obvious gaps before public launch — live-testing bug fixes, UX polish, missing subcommands, env var completeness.

#### Bugs fixed (from v0.9.31 live testing)

- **fix(update): BUG B** ✅ — Homebrew install now correctly detected when running as a compiled binary; path-based detection checks for `/Cellar/` via `realpathSync`
- **fix(releases): BUG C** ✅ — `gpc releases notes set` redirect fires immediately regardless of arguments (moved to top of action handler before Commander arg reads)
- **fix(update): BUG A** ✅ — fixed in v0.9.31 (GitHub Latest pointer issue)

#### Features shipped

- **feat(releases):** live upload progress bar — `Uploading my-app.aab  22.1 / 58.7 MB  (38%)`
- **feat(releases):** `gpc releases notes get --track <track>` — read release notes per track/language
- **feat(cli):** "Did you mean?" typo suggestions for mistyped commands
- **feat(releases):** `--vitals-gate` on `gpc releases rollout increase` — auto-halt if crash threshold exceeded
- **feat(cli):** `gpc version --json` — structured output: `{ version, node, platform, installMethod }`
- **feat(config):** `GPC_DEBUG=1` and `GPC_NO_COLOR=1` env var support
- **feat(cli):** `gpc cache` — `list`, `clear`, `clear --type <status|token|update-check>`
- **feat(auth):** `gpc auth token` — print current access token to stdout
- **feat(cli):** `gpc feedback` — open pre-filled GitHub issue with diagnostics
- **feat(validate):** release notes 500-char limit warning in `gpc validate` and `gpc publish`
- **fix(releases):** `gpc releases upload` rejects non-.aab/.apk files before any API call (exits 2)
- **fix(releases):** `gpc releases status --track` filter works correctly
- **fix(status):** `gpc status --format summary` shows `no vitals` / `no reviews` when data absent
- **fix(update):** `gpc update --check` always shows detected install method

**Actual new tests:** 8 → total 1,461

---

### v0.9.33 (shipped — Bug Fixes & Branding)

**Theme:** Fix the two bugs surfaced in v0.9.32 live testing + branding update.

- **fix(cli): `gpc version --json` outputs structured JSON** — was printing plain version text regardless of the flag; now returns `{ version, node, platform, installMethod }` as JSON (Bug D)
- **fix(cli): `GPC_DEBUG=1` no longer causes intermittent "too many arguments" errors** — debug mode was injecting `--verbose` into `process.argv` before command parsing, which could corrupt subcommand routing (Bug E)
- **fix(releases): `--vitals-gate` with `--dry-run` now warns instead of silently skipping** — combining the two flags previously gave no indication the gate wasn't running; now prints a warning to stderr
- **docs: product name updated to "GPC — Google Play Console CLI"** — README, docs site, npm package descriptions, `gpc --help`, and GitHub repo metadata

**Actual new tests:** 6 → total 1,467

## Stability Soak

- **Bug-free since:** 2026-04-09 _(clock reset after v0.9.55 shipped -- API type corrections + --profile CLI fix)_
- **Target:** 2+ weeks clean before 1.0 release (>= 2026-04-23)
- **v0.9.55 status:** shipped 2026-04-09. npm + GitHub Release + binaries + docs deployed. Skills synced (gpc-skills v1.9.2).

---

## Release Plan

v0.9.56 shipped 2026-04-11 (enterprise / Managed Google Play, first publishing CLI to support the Play Custom App Publishing API). Published to npm, binaries live on GitHub Releases, Homebrew tap updated. Release URL: https://github.com/yasserstudio/gpc/releases/tag/v0.9.56

**Next: stability soak toward v1.0.0.** Soak window restarted 2026-04-11; target ≥ 2 weeks bug-free before cutting 1.0.0. During the soak, Scope B bug fixes that were deferred from v0.9.56 can be batched into a v0.9.57 patch release (dataSafety verb, apprecovery URL, vitals memory/lmk rewire, errorCountMetricSet CLI).

---

### v0.9.56 (shipped 2026-04-11) — Enterprise / Managed Google Play

**Scope A only.** Audit bug fixes (original Scope B) deferred to v0.9.57. Kept v0.9.56 focused on the marquee feature for a cleaner release narrative and smaller blast radius. Shipped successfully — first Android publishing CLI with Play Custom App Publishing API support. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.56

**Release notes:** see `CHANGELOG.md` (root) and the v0.9.56 section of `apps/docs/reference/changelog.md`. Full lessons learned in `feedback_main_branch_release.md` (memory) — v0.9.56 ship session hit 5+ cascading issues (Socket Security, Bundle Size bug, CodeQL false positive, branch-protection required-context mismatch, bot-PR CI trigger), all resolved during the release but added ~2 hours of work. Next release: consider direct-to-main flow.

**Theme:** Rewrite the broken `gpc enterprise` surface as a first-class feature. Ship real Managed Google Play / Custom App Publishing support — no other CLI in the Android publishing space has this. Full research in [`ENTERPRISE_RESEARCH.md`](./ENTERPRISE_RESEARCH.md).

**Why this release exists:** `gpc enterprise` has been fiction since it shipped. It calls nonexistent endpoints (`/organizations/{id}/apps` vs Google's `/accounts/{id}/customApps`), misses the multipart binary upload entirely (just POSTs JSON metadata), wraps a fictional `list` method, and the docs tell users the wrong parameter (Workspace org ID vs developer account ID). Anyone who has tried it got 404s. Before cutting v1.0.0, this has to be either fixed or removed — and fixing it unlocks a real differentiator, so we fix it.

**Marketing angle:** *"GPC is now the first Android publishing CLI with Managed Google Play support. Fastlane doesn't. gradle-play-publisher doesn't. Private-app publishing in 5 minutes via CI/CD."*

---

#### Scope A — Enterprise / Managed Google Play (the marquee feature)

Targets Option M from `ENTERPRISE_RESEARCH.md` §8. Ship a working end-to-end `gpc enterprise` experience, not just bug fixes.

**A1. Rewrite `enterprise-client.ts`**
- Base URL: `https://playcustomapp.googleapis.com/playcustomapp/v1/accounts` (metadata)
- Media upload URL: `https://playcustomapp.googleapis.com/upload/playcustomapp/v1/accounts/{account}/customApps`
- **Delete the `apps.list` method entirely** — it wraps an endpoint that does not exist in Google's public API. Private apps are discoverable via the regular Publisher API (`gpc apps list`).
- **Rewrite `apps.create`** to do a real multipart media upload: JSON metadata (`CustomApp`) + binary bundle in a single `multipart/related` request.
- Accept a bundle file path as a required argument alongside the metadata.
- Parent pattern: `accounts/{account}` where `{account}` is the int64 developer account ID from the Play Console URL.
- OAuth scope unchanged — `androidpublisher` works for both Publisher API v3 and Custom App API. No new auth code.

**A2. Rewrite `core/commands/enterprise.ts`**
- Delete `listEnterpriseApps`.
- Rewrite `createEnterpriseApp` signature to accept a bundle path parameter.
- Add a new `publishEnterpriseApp` wrapper that wraps create with input validation and returns a structured result (`{packageName, title, organizations[]}`).

**A3. Rewrite `cli/commands/enterprise.ts`**
- Remove the `list` subcommand.
- Rename `--org` to `--account` (deprecation alias for `--org` for one version, emitting a deprecation warning when used).
- Add `--bundle <path>` required option to `create` and `publish`.
- Add `--org-id <id>` option (repeatable) for specifying target enterprise `organizationId` values at create time. Document that these can't be changed programmatically later (Play Console UI only).
- Add a confirmation prompt before `create`: *"This operation is permanent. Custom apps cannot be made public later. Continue? [y/N]"* — skippable with `--yes`.
- Add a new `publish` subcommand that's a one-shot equivalent of `create` with better framing for CI/CD usage.

**A4. Add `gpc doctor` enterprise probe**
- New check in `packages/cli/src/commands/doctor.ts` that:
  - Detects whether the Play Custom App Publishing API is enabled for the configured Google Cloud project
  - Warns if the service account is missing the "create and publish private apps" permission in Play Console user access controls
  - Non-blocking informational check — doesn't fail `doctor` if user isn't trying to use enterprise

**A5. Rewrite docs**
- Rewrite `apps/docs/commands/enterprise.md`:
  - Correct the parameter semantics — `--account` is a developer account ID from the Play Console URL, not a Google Workspace or Cloud Identity org ID
  - Add the "permanently private" warning prominently
  - Document the Play Console permission grant requirement
  - Add an example CI/CD workflow snippet
- Create new `apps/docs/guide/enterprise-publishing.md` guide — full walkthrough:
  1. Finding your developer account ID
  2. Enabling the Play Custom App Publishing API in Google Cloud
  3. Granting the service account permission in Play Console
  4. Obtaining enterprise organization IDs from your customer
  5. Running `gpc enterprise publish` from CI
  6. Updating a private app after initial creation (via regular `gpc releases upload`)

**A6. Tests**
- Unit tests for `enterprise-client.ts`: assert the multipart body structure, URL template, and path parameters
- Unit tests for `core` wrappers: validate that bundle file path is required, org IDs pass through, error paths
- Update `packages/cli/tests/help-consistency.test.ts` for the new flags
- **Integration test strategy:** no live CI tests (we don't have an enterprise test account). Smoke test manually before release with the user's real developer account.

**A7. Marketing launch post draft**
- Write to `.dev/marketing/build-in-public/v0.9.56-enterprise.md` — draft blog post and X thread about private app publishing

---

#### Scope B — Deferred to v0.9.57

The audit bug fixes that were originally bundled with v0.9.56 are now deferred. They are:

- `apprecovery.cancel` + `apprecovery.deploy` URL bug (singular → plural)
- `dataSafety.get` removal (no Google endpoint)
- `dataSafety.update` PUT → POST
- `gpc vitals memory` / `lmk` wrong metric (breaking change — needs its own release narrative and migration path)
- `errorCountMetricSet` dead type → wire `gpc vitals errors count` command
- Type completeness pass (OTP enums, permission enums, subscription state)

Full details preserved in the git history of this file (pre-2026-04-11 narrow-scope revision). Re-scope into v0.9.57 or later when we're ready.

---

#### Scope C — Explicitly deferred (original)

Items flagged during the audit but NOT in v0.9.56 scope:

- **`otp.offers.activate` + `otp.offers.deactivate`** — real gaps but low priority. Workaround exists via `batchUpdateOfferStates`. Not ship-critical.
- **`gpc games` auth reality check** — needs live API test; can't verify from code alone. Add to a separate "broken or experimental commands" task.
- **`gpc enterprise list` fictional endpoint** — not a "fix," just delete entirely. Covered in A1 above.
- **URL discrepancies requiring live tests** — `edits.images` base path (`listings` vs `images`), `voidedpurchases` casing, `errorReports.search` nested vs flat path. All tests pass against our current URLs, so defer until we have a live-test harness.
- **Android Management API** — confirmed out of scope (wrong audience).
- **Play Integrity API** — confirmed out of scope (backend runtime concern, not publishing).

---

#### Decisions needed before implementation

1. **Ship scope:** full Scope A + B, or split into v0.9.56 (bug fixes only) + v0.9.57 (enterprise)?
   - **Recommendation:** ship together. Single release, one changelog, stronger marketing. "Fixes + new feature" is a more compelling release than either alone.
2. **Version bump:** v0.9.56 (patch) or v0.10.0 (minor)?
   - **Recommendation:** v0.9.56. Keeps the 0.9.x series consistent with the pre-1.0 plan. The vitals memory change is technically breaking but scoped; call it out in release notes with a migration path (`gpc vitals wakelocks`).
3. **Live testing:** do we run a one-time smoke test against a real developer account before release?
   - **Recommendation:** yes, for enterprise at minimum. Ideally for apprecovery cancel/deploy too — the singular-path bug is confirmed in code but the real endpoint behavior is unknown.
4. **Marketing push:** quiet ship or real launch?
   - **Recommendation:** real launch. Enterprise support is a differentiator. The launch post doubles as a forcing function for quality.
5. **`--org` → `--account` rename:** hard break or deprecation alias?
   - **Recommendation:** one-version deprecation alias. `--org` still works in v0.9.56 but emits a warning. Hard remove in v0.9.57 or v1.0.0.

---

#### Test additions (estimated)

- Enterprise: 8-12 new tests (multipart upload shape, path params, `--bundle` required, `--account` rename, `--org` deprecation warning, permanent-private confirmation prompt, error paths, doctor probe)
- Total: ~10 new tests (brings us from 1,882 → ~1,892)

---

#### Release notes draft

```
## v0.9.58 — QoL & Discoverability

Planned 2026-04-14. Shipping same day. Theme: make the CLI feel faster and more discoverable. Single-day scope; option "B" from the planning discussion.

### Tier A — Ship today

| # | Item | Files | Complexity |
|---|------|-------|-----------|
| 1 | Completion v1.5: replace hard-coded `getCommandTree()` with a walker over Commander's registered command/option tree. Force-load the lazy `commandLoaders` once during generation. | `packages/cli/src/commands/completion.ts`, `packages/cli/src/program.ts` | Medium |
| 2 | Emit constrained-flag choices statically for all shells (bash/zsh/fish/powershell): `--track`, `--status`, `--output`, `--mapping-type`, `--notify`, etc. Harvest from existing `.choices()` / code-defined enums. | `packages/cli/src/commands/completion.ts` | Medium |
| 3 | `gpc vitals lmk` rewire (Tier B carry-over from v0.9.57): switch from `stuckBackgroundWakelockRateMetricSet` to `lowMemoryKillerRateMetricSet`. Add the metric to the `VitalsMetricSet` type with its 5 metrics (lmkRate, lmkRate7dUserWeighted, lmkRate28dUserWeighted, userPerceivedLmkRate, distinctUsers). Wire `lmk`, `wakeup`, `error-count` into the CLI METRIC_MAP so `compare` / `watch` accept them. Fix `THRESHOLD_CONFIG_KEYS[lmk]` from `stuckWakelockRate` to `lmkRate`. Breaking — include migration note in release. **Explicit non-goals:** do NOT rename `memory` → `wakelocks`, do NOT deprecate `wakeup` as duplicate of `battery`, do NOT touch `getVitalsMemory`. Cosmetic cleanups deferred. | `packages/api/src/types.ts`, `packages/core/src/commands/vitals.ts`, `packages/cli/src/commands/vitals.ts`, tests | Medium |
| 4 | Tests: extend `completion.test.ts` to cover walker output, flag choices across all 4 shells, and the regenerated command tree after a new command is added (regression guard against future drift). | `packages/cli/tests/completion.test.ts` | Medium |
| 5 | Docs: update completion page in `apps/docs/` with `eval "$(gpc completion <shell>)"` snippets and a note about constrained-flag completion. | `apps/docs/guide/…` | Trivial |
| 6 | Release: follow the 6-phase `.dev/engineering/RELEASE_STRATEGY.md` checklist, watch the binary workflow to completion, verify Homebrew tap bump. | — | — |

### Explicitly out of scope (pushed to v0.9.59)

- **`gpc __complete <context>` dynamic values** — profiles, packages, tracks-for-app, releases-for-track. Needs lazy-import discipline to hit <100ms cold-start budget; not worth rushing into a same-day release.
- **Homebrew completion auto-install** — ship completion files into `#{zsh_completion}/_gpc` + `#{bash_completion}/gpc` via the brew formula so brew users get it for free. Small change but requires testing the formula; defer.
- **Fish dynamic polish** — audit generated fish output, add `complete -a '(gpc __complete …)'` call sites once `__complete` lands.
- **~~`gpc watch vitals`~~** — shipped as `gpc watch` in v0.9.67 (unified rollout + multi-metric monitoring).
- **Interactive picker** — menu when `gpc` is run bare.
- **Error message overhaul** — richer per-exit-code suggestions.

### Ecosystem context (research 2026-04-14)

Commander.js has no native completion support ([tj/commander.js#2008](https://github.com/tj/commander.js/issues/2008)). Dominant 2026 pattern is `<tool> completion <shell>` emitting a script the user `eval`s (`gh`, `pnpm`, `deno`, `kubectl`, `docker`, `npm`). We already match that pattern. The pragmatic library choice if we ever outgrow the custom generator is `@pnpm/tabtab` (maintained fork of tabtab, powers pnpm's own completion at ~200-command scale). Omelette is stagnant. `@stricli/core` is a Commander replacement, not viable. Carapace-based libraries require a Go runtime — dealbreaker for npm distribution.

### Endpoint count after v0.9.58

No change: **217 endpoints**. This release is pure CLI / type layer.

---

## v0.9.60 — Completion v2 (code complete 2026-04-15, awaiting release cut)

Theme: finish the shell completion story started in v0.9.58. Pure CLI/tooling layer, no API surface changes, endpoint count stays at 217. Release gated on explicit user approval per `feedback_release_strategy.md`.

### What landed in code

| # | Item | Status |
|---|------|--------|
| 1 | Hidden `gpc __complete <context> [args]` subcommand with four contexts: `profiles`, `packages`, `tracks-for-app`, `releases-for-track`. Lazy-import discipline enforced (only `@gpc-cli/config` + node:fs). | ✅ `packages/cli/src/commands/__complete.ts` |
| 2 | Bash / fish / zsh generators shell out to `gpc __complete <ctx>` for the four dynamic slots (`--profile`, `--app`, `--apps`, `--track`). Hidden commands filtered from the introspected tree via `isHidden()` helper. | ✅ `packages/cli/src/commands/completion.ts` |
| 3 | Zsh upgraded to real `_arguments` integration with helper functions (`_gpc_profiles`, `_gpc_packages`, `_gpc_tracks_for_app`) and static-choice option specs; hint-comment block removed. | ✅ same file |
| 4 | `bin.ts` update-check-skip for `__complete` (its `setTimeout(..., 3000)` was blocking exit for 3s, inflating TAB latency). | ✅ `packages/cli/src/bin.ts` |
| 5 | Unit tests: 4 contexts × multiple scenarios (empty, populated, stale cache, malformed JSON, prototype pollution, cross-cache aggregation). | ✅ `packages/cli/tests/__complete.test.ts` |
| 6 | End-to-end bash-source integration test (hermetic sandbox, simulates TAB presses against the generated script). | ✅ `packages/cli/tests/complete-integration.test.ts` |
| 7 | Perf guard: spawns the built bin, asserts median < 500ms across all four contexts, plus an explicit < 1.5s regression guard for the bin.ts update-check skip. | ✅ `packages/cli/tests/complete-perf.test.ts` |
| 8 | Generator-output assertions for bash/zsh/fish shell-outs + hidden-command filter regression test. | ✅ `packages/cli/tests/completion.test.ts` |
| 9 | Docs: shell-completion section in `apps/docs/commands/utility.md` + Homebrew auto-install note in `apps/docs/guide/installation.md`. Test count refreshed to 1,914 across README, `llms.txt`, `llms-full.txt`, FAQ, fastlane comparison, and vitepress FAQ schema. | ✅ |
| 10 | e2e flake fix: `gpc doctor` test timeout raised from vitest's 5s default to 20s (the command performs real DNS + HTTPS resolution, observed ~7s cold). | ✅ `e2e/commands.test.ts` |

### Pre-release review fixes (applied)

Launched three review agents in parallel (correctness / security / coverage). Findings applied:

- **`--track` context incomplete**: shell scripts don't parse `--app` from the already-typed command line. Mitigated by aggregating custom track names from all fresh status caches when no package arg is provided.
- **JSON prototype-pollution defense**: `sanitize()` helper mirrors `packages/config/src/loader.ts:92` and strips `__proto__`, `constructor`, `prototype` from parsed config + cache files.
- **Bash-choice quoting**: `joinBashChoices()` escapes spaces, quotes, `$`, and backticks when emitting `.choices()` into `compgen -W` lists. No current callsites use `.choices()`, but defense-in-depth.
- **`GPC_DEBUG=1` logging**: completion failures now surface on stderr for diagnosis without breaking the silent-fallback UX.
- **bin.ts regression guard**: explicit test asserts `__complete` exits in < 1.5s (catches the 3s setTimeout regression if anyone refactors bin.ts).

### Decisions locked (honored)

- **Silent when cache is empty/stale.** `gh` / `kubectl` behavior.
- **Zsh rewrite bundled with bash/fish dynamic.** Shipped together, not staggered.
- **PowerShell dynamic values deferred** to v0.9.61 (shell-out convention differs).
- **No new cache file.** Reused `~/.cache/gpc/status-<pkg>.json`.

### Still pending (release-time work)

- `yasserstudio/homebrew-tap` → `Formula/gpc.rb`: add `install` hook writing `#{zsh_completion}/_gpc`, `#{bash_completion}/gpc`, `#{fish_completion}/gpc.fish`. Can't complete until the v0.9.60 binary URLs + SHA256 checksums exist.
- Version cut + npm publish + GitHub Release per `.dev/engineering/RELEASE_STRATEGY.md`.
- Post-release: bump "Version: 0.9.60" stamps in `apps/docs/public/llms.txt`, `llms-full.txt`, screenshots.md "as of" markers, and `CLAUDE.md`.

### Explicitly out of scope (deferred to future versions)

- `gpc watch vitals` streaming tail → v0.9.61
- Interactive picker on bare `gpc`
- Error message overhaul (40+ exit-code suggestions)
- Node.js 22 migration (deadline 2026-06-02, still runway)

### Endpoint count after v0.9.60

No change: **217 endpoints**. CLI/tooling layer only.

### Test count after v0.9.60

**1,914 tests** across 8 packages (1,879 → 1,914).

---

## v0.9.61 — Smarter Changelog Generation ✅ SHIPPED 2026-04-16

Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.61

Theme: replaced the manual "write release notes" step with a single command that clusters commits, scores a headline, and drafts a prompt you paste into your LLM. First release in the **changelog-generation series** (v0.9.61 → v0.9.64) that ends with one-command commit→translated Play Store release notes.

### Shipped (final stats)

- **45 files changed**, 1,945 insertions, 81 deletions in the release commit (`a16833f`)
- **Tests**: 1,941 → **1,978** (+37, exceeded the +14 target due to expanded edge-case coverage)
- **Endpoint count**: unchanged at 217
- **No new runtime deps** — CLI stays dependency-free
- **All seven npm packages published**, 6 binaries attached to the GitHub Release, Homebrew tap auto-bumped
- Marketing posted: X (long-form via Premium), LinkedIn. Reddit + Show HN + Dev.to long-form deferred to a future release per user decision.

### Architecture decisions locked (post-implementation)

- **Separator**: switched from `__GPC_REC__` text marker to ASCII `\x1e` (Record Sep) + `\x1f` (Unit Sep) after security review caught body-collision risk. Documented as the canonical choice for v0.9.62 PlayStoreRenderer too.
- **Markdown renderer is lossless**: emits one bullet per visible commit; no cluster-dedup at the markdown layer (avoided data loss when a cluster spans many commits in one type). Clustering benefits surface only in `--format prompt` mode.
- **CLI flag is `--format`, not `--output`**: avoids global `-o, --output` clash.
- **`SECTION_ORDER` includes `release` and `other`**: late-session addition after smoke test exposed that the project's squash-merge release flow (`release: v0.9.X — Title`) would otherwise vanish from output.
- **Three open decisions resolved as planned defaults**: `--strict` mode = yes; no-tag fallback = fail with `CHANGELOG_NO_TAG`; SSH+HTTPS remote parsing = both.

### Pre-release review fixes (3 parallel review agents)

Five ship-blockers caught and fixed before the release commit:
1. NUL-byte (`\x1e`/`\x1f`) separators replace text markers (collision attack defense)
2. Markdown renderer lossless rewrite (data-loss bug from cluster-dedup)
3. `--repo` regex validation (`^[\w.-]+/[\w.-]+$`) — rejects `https://evil.com/foo`-style injection into Full Changelog link
4. Newline stripping in markdown + prompt renderers (defense against `git commit -m $'foo\n## fake header'`)
5. `--end-of-options` added to `git rev-parse` and `git log` (refs starting with `-` no longer parsed as flags)

Two agent overcalls verified false: revert-pair dedup actually works (both branches use canonicalized subject); `Buffer.trim()` claim was wrong (`execFile` defaults to utf8 encoding).

### Marketing series commitment (publicly announced)

The X and LinkedIn posts publicly committed to this series:
- **v0.9.61** (today) — GitHub Release notes ✅
- **v0.9.62** — Play Store per-locale notes via `--target play-store`
- **v0.9.63** — opt-in AI translation **via Vercel AI SDK** (locked publicly; provider choice no longer open)
- **v0.9.64** — `--apply` writes translated notes into your draft release

End-state vision: *"From git commit to translated Play Store release notes, live on the store, in one command."*

---

### Original spec (preserved for reference)

Theme: replace the manual "write release notes" step with a single command that clusters commits, scores a headline, and drafts a prompt you paste into your LLM. First release in the **changelog-generation series** (v0.9.61 → v0.9.64) that ends with one-command commit→translated Play Store release notes.

### Theme

`gpc changelog generate` exists today only as a GitHub-Releases reader. Promote it to a parent command and add a `generate` subcommand that produces release notes from local git history. Output matches the canonical template in `apps/docs/advanced/conventions.md` byte-for-byte.

### Scope (locked)

```
gpc changelog generate [--from <ref>] [--to <ref>] [--output md|json|prompt] [--repo <owner/name>]
```

- `--from` defaults to `git describe --tags --match 'v*' --abbrev=0`
- `--to` defaults to `HEAD`
- `--repo` defaults to parsed `git remote get-url origin` (handles both `https://` and `git@github.com:` forms)
- Refs pre-validated with `git rev-parse --verify` — clean errors, not raw git stderr
- `git log --no-merges` so squash-PR repos don't double-count
- Existing `gpc changelog` (GitHub reader) keeps its current default-action behavior; `generate` is wired as a subcommand

### Smart layer (not just grouping)

| Smart | Mechanism | Cost |
|-------|-----------|------|
| **Cluster commits** | File-path overlap + Jaccard keyword similarity on subjects + 2-day time-proximity. Cluster label = most common path component or shared keyword. | ~80 LOC |
| **Headline scoring** | Largest cluster by `+lines/-lines` weight, tie-break by feat>fix. Suggest top 3; allow `--headline <cluster-id>` override. | ~30 LOC |
| **Dedup + cleanup** | Detect Revert pairs and drop both. Merge "fix typo" / "wip" / "address review" follow-ups into the parent cluster. Verb canonicalization (Added/Adds/Add → add). Strip emoji + conventional-commit prefix noise. | ~50 LOC |
| **PR-ref preservation** | Keep `(#123)` in subjects. Don't fetch PR titles in v0.9.61 — that's v0.9.62. | ~10 LOC |
| **Jargon linter** | Banned-word scan on emitted subjects (sourced from conventions.md: `mutex`, `token bucket`, `barrel exports`, etc.). Stderr warnings, non-fatal. `--strict` mode exits non-zero on hits (CI-friendly). | ~40 LOC |
| **Scope-leak warning** | If parser finds `feat(cli):`, strip and warn once "scopes were dropped per convention". | ~10 LOC |
| **Empty-section pruning** | Don't emit a `breaking:` line when there are zero breaking commits. | trivial |

### Output modes

1. **`--output md`** (default) — canonical template, ready to paste into `gh release create -F -`
2. **`--output json`** — structured form for tooling
3. **`--output prompt`** — emits a ready-to-paste prompt for Claude/ChatGPT including the project's voice rules and clustered commits with diffstat. **Killer feature for the solo workflow.** Keeps the CLI dependency-free — the LLM lives where the user already uses it.

### Architecture (factor for the v0.9.62-64 series)

`Renderer` interface from day one — pays for itself in v0.9.62 when the Play Store renderer drops in without touching the core pipeline.

```ts
// packages/core/src/commands/changelog-generate.ts
interface Renderer {
  render(generated: GeneratedChangelog, opts: RenderOpts): string | LocaleBundle
}
const renderers = { md: MdRenderer, json: JsonRenderer, prompt: PromptRenderer }
// v0.9.62 adds: playStore: PlayStoreRenderer

interface GitRunner {
  log(args: { from: string; to: string; cwd: string }): Promise<RawCommit[]>
  describeLatestTag(cwd: string): Promise<string | null>
  verifyRef(ref: string, cwd: string): Promise<boolean>
  remoteUrl(cwd: string): Promise<string | null>
}
export const defaultGitRunner: GitRunner  // shells out via execFile
export function generateChangelogFromGit(
  opts: { from?: string; to?: string; cwd?: string; output: OutputMode; repo?: string; strict?: boolean },
  runner?: GitRunner
): Promise<string | LocaleBundle>
```

Inject `runner` so unit tests stay pure. One integration test uses `defaultGitRunner` against a temp git repo (`fs.mkdtemp` + `git init` + seed commits) to catch shell-out bugs.

### Files

**Create**
- `packages/core/src/commands/changelog-generate.ts` (~250 LOC including all smart layers)
- `packages/core/src/commands/changelog-renderers/{md,json,prompt}.ts` (~50 LOC each)
- `packages/core/tests/changelog-generate.test.ts` (~13 unit tests + 1 integration)

**Modify**
- `packages/cli/src/commands/changelog.ts` — restructure to parent + `.command("generate")` subcommand
- `packages/cli/tests/changelog-command.test.ts` — add subcommand wiring + JSON output + jargon-warning + `--strict` exit code tests
- `packages/core/src/index.ts` — re-export new function + types
- `packages/cli/tests/help-consistency.test.ts` — verify new subcommand passes consistency rules
- `packages/cli/tests/completion.test.ts` — verify walker auto-picks up the new subcommand (proves the v0.9.58-60 walker investment pays off)

### Open decisions (lock before coding)

1. **`--strict` mode on jargon hits**: yes. Useful in CI, free to add.
2. **First-release case** (no `v*` tag): fail with suggestion `pass --from explicitly or create a v0.0.1 tag`. Don't silently fall back to first commit — too easy to produce 1000-line "release notes."
3. **SSH remote parsing**: yes, both `https://github.com/owner/repo.git` and `git@github.com:owner/repo.git` need the same canonical `owner/repo` extraction.

### Smoke test (multi-version)

Before tagging, run on this repo:
- `gpc changelog generate --from v0.9.57 --to v0.9.58`
- `gpc changelog generate --from v0.9.58 --to v0.9.59`
- `gpc changelog generate --from v0.9.59 --to v0.9.60`

Diff each against the actually-published GitHub Release. Acceptable: structure matches; subjects may differ where the user rewrote them by hand (that's the human-edit step the prompt-mode targets). Document the diff pattern in PR description.

### Success criteria (verifiable)

1. Build clean, lint clean
2. ~14 new tests, all green; total ~1,955
3. Smoke against v0.9.57→58, 58→59, 59→60 — structure matches published notes
4. `gpc changelog generate --output json` parses as valid JSON
5. Tab completion shows `generate` subcommand without code changes to `completion.ts` (proves walker works as designed)
6. Running with no git tags emits clear error, not stack trace
7. Help text matches `help-consistency.test.ts` rules
8. `--strict` exits 1 on jargon hit; default mode exits 0 with stderr warning

### Out of scope (explicitly deferred)

- Writing a `CHANGELOG.md` file (project uses GitHub Releases, not a CHANGELOG file — confirmed in conventions.md)
- `--gh` flag to call `gh release create` (don't take a hard dep on `gh` CLI; document the `-F -` pipe pattern instead)
- `--copy` clipboard support (cross-platform mess, not worth it)
- Co-author aggregation (solo project; user has hard rule against AI co-authors)
- `--include-internal` flag (YAGNI; add when someone asks)
- Translated GitHub release notes — explicitly **rejected** (low-ROI; GitHub releases stay English by convention)

### Endpoint count after v0.9.61

No change: **217 endpoints**. CLI/tooling layer only.

### Test count after v0.9.61

Target: **~1,955 tests** (1,941 → ~1,955).

### Marketing angle

*"`gpc changelog generate` — clusters your commits, scores a headline, and drafts the release notes for you. Pipe straight into `gh release create -F -`."*

---

## v0.9.62 — Multilingual Changelog: Play Store target

Shipped 2026-04-17. Same-day follow-up to v0.9.61. Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.62

### Shipped (final stats)

- **Test count**: 1,978 → 1,999 (+21 new)
- **Endpoint count**: unchanged at 217
- **No new runtime deps**: dependency-free CLI preserved
- **Live smoke verified** against visioo (16 locales auto-detected: en-US, ar, de-DE, es-ES, fr-FR, hr, it-IT, nl-NL, pl-PL, pt-BR, sr, tr-TR, el-GR, ro, ru-RU, bg) and sfn-emploi (3 locales: ar, en-US, fr-FR). Overflow handling verified on v0.9.55→v0.9.61 range (1936 chars clipped to 500 with stderr warning). Backwards compat: default `--target github` output byte-identical to v0.9.61.

### Architecture decisions locked (post-implementation)

- **`PlayStoreRenderer` plugged into the v0.9.61 `Renderer` interface** — zero core-pipeline refactor required, exactly as predicted in the v0.9.61 architecture plan
- **en-US source is lossless** — same bullets as github target, truncated to 500 Unicode code points (`[...text].length`) only when over. Keeps v0.9.61's "lossless bullets" decision
- **`--locales auto` resolution uses profile machinery** — same `resolvePackageName` / `getClient` pipeline every other app-scoped command uses; no new flags
- **Missing `--locales` with `--target play-store` errors hard** — `CHANGELOG_LOCALES_REQUIRED` exit 2, matches v0.9.61's "no-tag = fail" style
- **`--strict` collects all overflows then exits 1** — CI sees the full report in one run, not fail-fast

### Open decisions resolved (recommended path shipped)

1. App resolution: reused profile machinery (not explicit --app requirement)
2. en-US source: lossless bullets with truncation (not headline summary, not user-selectable)
3. Missing --locales: error (not default to en-US, not default to auto)
4. Strict overflow: collect all then exit 1 (not fail-fast, not always-warn)

---

### Original spec (preserved for reference)

Planned right after v0.9.61 ships. Theme: extend the changelog series to per-locale Play Store release notes (the `recentChanges[]` field on each `Release`).

### Why this exists

Play Store "What's new" per locale is a real shipping pain: 500-char limit per locale, German runs long, Chinese runs short, devs either copy-paste English (looks lazy) or pay translators. **GPC is the first publishing CLI to solve this end-to-end.** Fastlane and gradle-play-publisher don't.

### Scope

```
gpc changelog generate --target play-store --locales en-US,fr-FR,es-ES,de-DE
gpc changelog generate --target play-store --locales auto   # infer from current Play listing
```

Output:
```
en-US  (412/500): - Faster CLI startup. - Fixed crash on launch.
fr-FR  ( -- /500): [needs translation — paste prompt below or use --ai (v0.9.63)]
es-ES  ( -- /500): [needs translation — ...]
de-DE  ( -- /500): [needs translation — ...]
```

### What ships

- `PlayStoreRenderer` plugged into the v0.9.61 `Renderer` interface — no core refactor required
- `--locales auto` reads existing Play listing locales via `gpc listings list` machinery — never miss a locale you already publish to
- Per-locale char-budget meter (current/500 char visualization)
- Translation stubs marked with clear `[needs translation]` placeholder
- Documentation: new `apps/docs/guide/multilingual-release-notes.md`

### Out of scope (deferred to v0.9.63 / v0.9.64)

- AI translation itself (v0.9.63)
- Writing translated text into a draft release (v0.9.64)

### Effort

~150 LOC (renderer + locale-detection plumbing + tests). ~8 new tests.

---

## v0.9.63 — AI-assisted Play Store translation ✅ SHIPPED 2026-04-20

Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.63

Final stats: **2,037 tests** (+38 from 1,999), 217 endpoints unchanged, four new runtime deps all lazy-loaded (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`). `gpc changelog generate` without `--ai` imports none of them; static-analysis guard (`changelog-ai-lazy.test.ts`) enforces this on every build.

Theme: turned v0.9.62's `[needs translation]` placeholder into real translated text via the user's own LLM key. Third release in the changelog-generation series (v0.9.61 → v0.9.64).

### Provider abstraction (LOCKED — publicly committed)

**Vercel AI SDK** (`ai` on npm, TypeScript-first). Publicly committed in the v0.9.61 + v0.9.62 X and LinkedIn threads. Provider choice is no longer open.

Why Vercel AI SDK over per-provider SDKs:
- Provider-agnostic `generateText` API across Anthropic, OpenAI, Google, and 20+ others
- BYO env keys per provider (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`)
- TypeScript-first, structured output support (matches our 500-char-per-locale constraint pattern)

### Open decisions locked via AskUserQuestion (2026-04-20)

1. **Provider default when `--provider` is absent**: **auto-detect first env key** in order `AI_GATEWAY_API_KEY` → `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → `GOOGLE_GENERATIVE_AI_API_KEY`. If Gateway key is found, route through Vercel AI Gateway (see decision 5); otherwise use direct provider SDK. Log the picked path + provider to stderr (e.g. `→ routing via AI Gateway (anthropic/claude-sonnet-4-6)` or `→ direct Anthropic SDK (claude-sonnet-4-6)`).
2. **Model default per provider**: **hardcoded sensible defaults**. Anthropic → `claude-sonnet-4-6`, OpenAI → `gpt-4o-mini`, Google → `gemini-2.5-flash`. All three are non-reasoning, cost-effective, instruction-tuned for constrained output. **Explicitly avoiding reasoning models as defaults** (`gpt-5`, `o3`, `gpt-5-mini` with default `reasoningEffort: 'medium'`) — translation is not a reasoning task; reasoning tokens would be billed for no quality gain. Overridable with `--model`. Identical defaults used on both Gateway and direct paths.
3. **Provider whitelist**: **curated list** — `anthropic`, `openai`, `google` only, identical on Gateway and direct paths to keep UX predictable. Unknown provider errors with exit code 2 and lists valid choices. No pass-through, no escape hatch in v0.9.63.
4. **Per-locale error policy**: **lenient by default** — continue on error, emit `[translation failed: <reason>]` placeholder, exit 0. **`--strict` collects all errors and exits 1.** Mirrors v0.9.62's collect-all overflow pattern.
5. **Gateway pivot (locked after reviewing Vercel AI Gateway docs)**: **Option B — Gateway-primary with direct-SDK fallback**. If `AI_GATEWAY_API_KEY` is set, route through `gateway("anthropic/claude-sonnet-4-6")` from the `ai` package. Unlocks cost-per-call in USD (populated into our JSON output), 20+ providers, `sort: 'cost'` routing, `models: [...]` auto-fallback, Vercel-dashboard observability. Otherwise fall through to direct provider SDKs exactly as originally specced. Preserves the v0.9.61/62 "BYO Anthropic/OpenAI/Google key" public commitment while giving Gateway users a strict superset of features. Cost field is **only populated on the Gateway path** — asymmetric JSON shape is accepted as the price of keeping both paths working.

### Scope

```bash
# Auto-picks provider from env, model defaults
gpc changelog generate --target play-store --locales auto --ai

# Explicit
gpc changelog generate --target play-store --locales fr-FR,es-ES \
  --ai --provider anthropic --model claude-sonnet-4-6

# CI: any failure exits 1
gpc changelog generate --target play-store --locales auto --ai --strict

# Inspect what would be sent without spending tokens
gpc changelog generate --target play-store --locales auto --ai --dry-run
```

### Architecture

Surgical insertion into the v0.9.61 / v0.9.62 pipeline. No core refactor.

- **Keep `buildLocaleBundle` sync and pure.** It continues to emit `status: "placeholder"` for non-source locales.
- **New `translateBundle(bundle, translator, opts): Promise<LocaleBundle>`** in `packages/core/src/commands/changelog-renderers/play-store.ts`. Iterates `bundle.locales`, replaces each placeholder entry with translated text or a `status: "failed"` entry. Re-applies the 500-code-point truncation with stderr warning (same helper as v0.9.62). In strict mode, collects errors and throws at end.
- **New file `packages/core/src/commands/changelog-ai.ts`.** Exports `createTranslator(config): Translator` where `Translator = (locale: string, sourceText: string) => Promise<{ text: string; tokensIn: number; tokensOut: number; costUsd?: number }>`. Lazy-imports `ai` and either the `gateway` export or `@ai-sdk/<provider>` on first call based on resolver outcome. Passes `temperature: 0.2` as a top-level `generateText` option. Per-locale calls (not batched) so per-locale failures are isolated.
- **Two code paths inside the translator factory:**
  - **Gateway path** (when `AI_GATEWAY_API_KEY` is set) — `import { gateway } from 'ai'` and call `gateway(\`${provider}/${model}\`)`. **Cost is fetched via one aggregate call, not per-locale.** The Gateway docs clarify that `providerMetadata.gateway.generationId` is returned inline but dollar cost requires a follow-up. On each `generateText` call, attach `providerOptions.gateway.tags: [\`gpc-changelog-\${runId}\`]` (UUID generated once per `gpc changelog generate` invocation). After all translations complete, call `gateway.getSpendReport({ tags: [\`gpc-changelog-\${runId}\`], startDate, endDate })` exactly **once** and surface `totalCost` as a single top-level `ai.costUsd` field (not per-locale). Degrades gracefully: if the spend-report call errors (plan-gated, network, etc.), `costUsd` stays undefined and the run succeeds.
  - **Direct path** (fallback) — `import { anthropic } from '@ai-sdk/anthropic'` (or the OpenAI/Google equivalent) and call `anthropic(model)`. No cost data; `costUsd` left undefined.
- **Env var fallback is SDK-native.** Each provider factory (`gateway` / `anthropic` / `openai` / `google`) reads its own env var internally — `AI_GATEWAY_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`. Our resolver only decides **which factory to import**; it does not manually pluck keys and pass them through. Simpler and matches the SDK's idioms.
- **Provider-specific "suppress reasoning" config encapsulated in the translator.** Each provider has a different way to opt out of reasoning/thinking tokens for a non-reasoning task like translation. The translator factory holds the per-provider knobs so callers never see them:
  - **OpenAI (`gpt-4o-mini`)** — no-op, the default is already non-reasoning.
  - **Google (`gemini-2.5-flash`)** — pass `providerOptions.google.thinkingConfig.thinkingBudget: 0`. Gemini 2.5 has thinking on by default; a 0 budget fully suppresses it.
  - **Anthropic (`claude-sonnet-4-6`)** — no-op, extended thinking is opt-in and off by default.
- **CLI wiring** in `packages/cli/src/commands/changelog.ts`: adds `--ai`, `--provider`, `--model`, `--strict`, `--dry-run`. Resolver runs before `translateBundle` is called.
- **`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`** added as deps of `@gpc-cli/core`. All lazy-loaded; default `gpc changelog generate` (no `--ai`) must not import any of them.
- **Lazy-import guard is a new module-introspection test**, not a latency test. The existing `complete-perf.test.ts` only covers `gpc __complete`. Add `packages/core/tests/changelog-ai-lazy.test.ts` that imports `@gpc-cli/core`, runs the changelog-generate path without `--ai`, then asserts `require.cache` (or ESM equivalent via `Object.keys(import.meta)` probing) contains no entry matching `/\bai\b|@ai-sdk/`. Deterministic, no flake, fast. One new test.

Decision against a `@gpc-cli/plugin-ai` plugin: extra install step for what should be a single flag. Bundle in core, gate behind lazy import.

### Prompt design

Reuses the existing `renderPlayStorePrompt` template scoped to one locale per call.

System rules (per call):
- 500 Unicode code-point limit (hard cap)
- Preserve bullet format (one item per line, starts with `- `)
- User-facing tone, no jargon
- Don't translate technical names (package names, CLI flags, "GPC")
- Drop conventional-commit prefix (`feat:`, `fix:`) if it's unnatural in the target language

No few-shot samples from live Play Store listings. The v0.9.61 linter already constrains English source to project voice; translation should preserve tone, not invent it. Revisit post-1.0 if output quality demands it.

### Error-reason mapping

Each AI SDK throw surfaces as `[translation failed: <reason>]`. `<reason>` is a short stable slug, not the raw error message (which may contain PII, API keys in stack traces, or provider-specific vendor strings):

| AI SDK error shape | `<reason>` slug |
|---|---|
| `error.name === 'RateLimitError'` or `statusCode === 429` | `rate_limited` |
| `statusCode === 401` or `403`, or provider returns "API key invalid" | `auth` |
| Anthropic `error.name === 'APIUserAbortError'` + content-filter hit | `safety_blocked` |
| OpenAI `statusCode === 400` with body containing `content_policy` | `safety_blocked` |
| Google `finishReason === 'SAFETY'` or block-reason populated | `safety_blocked` |
| `AbortError` or >30s elapsed | `timeout` |
| Network / DNS / TLS errors | `network` |
| Everything else | `unknown` |

All unmapped or sensitive fields are logged to stderr at DEBUG level (gated by existing `GPC_DEBUG=1`) so users can diagnose `unknown` reasons without leaking them to the JSON output or Play Store draft. ~15 LOC of mapping. Add one test per reason slug — **+7 tests** (in addition to the 19 already counted below, adjust the total).

### JSON output extension

Extends v0.9.62's shape with a top-level `ai` block. `path` indicates which route was used. `costUsd` is **aggregate for the whole run** (summed via `gateway.getSpendReport` by tag), populated only on the Gateway path.

```json
{
  "from": "v0.9.62",
  "to": "HEAD",
  "limit": 500,
  "sourceLanguage": "en-US",
  "ai": {
    "path": "gateway",
    "runId": "4f1e8a3c-2b9d-4e7a-b1f6-...",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "tokensIn": 1234,
    "tokensOut": 890,
    "costUsd": 0.0047
  },
  "locales": [
    { "language": "en-US", "text": "...", "status": "ok" },
    { "language": "fr-FR", "text": "...", "status": "ok" },
    { "language": "pt-BR", "text": "[translation failed: rate_limited]", "status": "failed" }
  ]
}
```

On the direct-SDK path, the shape is the same minus `costUsd` + `runId`, with `"path": "direct"`. Backwards-compatible — consumers that don't read `costUsd` / `runId` / `path` still get provider / model / token counts. New status value: `"failed"` (alongside existing `ok`, `over`, `placeholder`, `empty`).

### Effort

- `changelog-ai.ts` (provider resolver, model defaults, Gateway + direct branches, aggregate `getSpendReport` cost call, translator factory) — ~130 LOC
- `translateBundle` in `play-store.ts` — ~40 LOC
- CLI wiring (`--ai / --provider / --model / --strict / --dry-run`) — ~30 LOC
- Env-key detection (Gateway first, then direct) + whitelist validation — ~40 LOC
- Error-reason mapper — ~15 LOC
- Tests: env-key resolution with Gateway present (3), env-key resolution direct-path (3), Gateway translator with mocked `generateText` (3), direct translator with mocked `generateText` (3), strict vs lenient (3), truncation after translate (1), dry-run (2), cost-field-asymmetry + aggregate `getSpendReport` (2), error-reason mapper (7 — one per slug), lazy-import introspection guard (1) — **~28 new tests**

Total: ~255 LOC. **Actual: 1,999 → 2,037 tests (+38)**. Shipped same-day.

### Smoke tests (before tagging)

Per `feedback_live_smoke_before_release.md` — unit tests do not substitute.

- **Direct-path smoke (v0.9.61/62 user journey)**: `gpc changelog generate --target play-store --locales auto --ai` against **visioo** (16 locales) with only `ANTHROPIC_API_KEY` set. Spot-check French + Spanish translations for tone. Confirm stderr says `→ direct Anthropic SDK`.
- **Gateway-path smoke (new)**: same command against **visioo** with only `AI_GATEWAY_API_KEY` set. Confirm stderr says `→ routing via AI Gateway`. Confirm JSON output includes `costUsd` and `path: "gateway"`.
- **Arabic edge case**: run against **sfn-emploi** (ar, en-US, fr-FR). Verify Arabic survives code-point truncation (RTL + composed graphemes).
- **Env-key priority**: set both `AI_GATEWAY_API_KEY` and `ANTHROPIC_API_KEY`, confirm Gateway wins.
- **Direct-SDK fallthrough**: unset `ANTHROPIC_API_KEY`, set `OPENAI_API_KEY`, confirm auto-detection falls through to OpenAI.
- **`--strict` failure simulation**: inject a bad model name via `--model not-a-real-model` — confirm exit 1 and clean error on both paths.
- **`--dry-run`** against visioo: zero API calls, prompts printed to stdout.
- **Cold-start budget check**: `gpc changelog generate --help` (no `--ai`) under 500ms. Confirms lazy-import discipline held on both paths.

### Out of scope (deferred)

- **`--apply` writes to draft release** — that's v0.9.64
- **Translation caching (local)** — YAGNI for this release; output can be piped to a file
- **Anthropic prompt caching (`cacheControl: { type: 'ephemeral' }`)** — considered, not viable: Sonnet 4.6's minimum cacheable prompt is 1024 tokens, and our translation system prompt sits around 200-300. Revisit only if the prompt grows (e.g., post-1.0 if few-shot voice samples are added).
- **Few-shot voice samples from live listing** — static prompt rules are sufficient
- **Streaming output (`streamText`)** — batch `generateText` is fine for ≤500-char responses
- **Reasoning / thinking (`thinking: { type: 'adaptive' }`)** — translation is not a reasoning task; extra latency and cost for no quality gain
- **Tools / agents / MCP connectors** — pure `generateText` call, no tool schemas
- **Proxy / base URL override (`createAnthropic({ baseURL })`)** — no `--base-url` flag in v0.9.63; revisit if enterprise users with corporate LLM gateways ask
- **xAI / Grok** — architecturally identical (`@ai-sdk/xai`, `XAI_API_KEY`, `grok-4-fast-non-reasoning` as the natural translation default, `import { xai } from '@ai-sdk/xai'` matches the Anthropic/OpenAI shape). Intentionally deferred to keep v0.9.63 locked at three providers per the AskUserQuestion answer. First candidate when the whitelist expands post-1.0.
- **Mistral / Groq / Perplexity / OpenRouter** — post-1.0, demand-driven
- **Cost / token-budget guardrails** — no `--max-tokens` flag; BYO-key users own their spend

### Endpoint count after v0.9.63

Unchanged — 217 endpoints. v0.9.63 adds no new API calls (Vercel AI SDK is not a Google Play API).

### Test count after v0.9.63

1,999 → **2,037** (actual, +38).

### Marketing angle

Narrower than v0.9.64's "commit → live on store" demo. For v0.9.63 the story is:

> *"Opt-in AI translation for Play Store release notes. Bring your own key — Anthropic, OpenAI, or Google. 500-char cap enforced per locale. One flag: `--ai`."*

Paired with the v0.9.64 follow-up, the full series payoff lands next release.

### Implementation-time references

- **Vercel AI SDK docs as `llms.txt`**: https://ai-sdk.dev/llms.txt — paste into the implementation session to ground the coding agent in the full SDK surface (generateText signature, provider instantiation, streaming opts, error types). Saves a round of doc-fetching during coding.
- Provider package docs: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google` on https://ai-sdk.dev/providers.
- Our existing renderer layer: `packages/core/src/commands/changelog-renderers/play-store.ts` — `buildLocaleBundle` is the insertion point; see line 90 of current HEAD for the placeholder branch that `translateBundle` replaces.

---

## v0.9.64 — Apply translated notes to draft release

Planned after v0.9.63. Closes the loop: commit → translated → live on the store, in one command.

### Scope

```
gpc changelog generate --target play-store --locales auto --ai --apply
```

- `--apply` writes results into the next draft release's `recentChanges[]` via existing `@gpc-cli/api` client
- Confirmation prompt before write (skippable with `--yes`)
- Integrates with `gpc publish` flow — could become a `gpc publish --auto-notes` shortcut
- Shows diff (current vs proposed) before applying

### Effort

~100 LOC (already have the API plumbing). ~6 new tests.

### Marketing angle (the series payoff)

*"From git commit to translated Play Store release notes, live on the store, in one command. No other Android publishing CLI does this."*

---

## v0.9.59 — Deferred scope

Staged items from v0.9.58 that didn't fit in the same-day ship window. Not yet scheduled.

- **Completion dynamic values** — hidden `gpc __complete <context> [args]` subcommand. Contexts: `profiles` (from config, no API/auth import), `packages` (from cached `apps list`), `tracks-for-app` (static set), `releases-for-track` (from last `releases list`). Latency budget: <100ms cold. Requires lazy-import discipline — `__complete` handlers must NOT pull in the full API/auth stack.
- **Homebrew completion auto-install** — brew formula installs completion files into `#{zsh_completion}/_gpc` + `#{bash_completion}/gpc` so brew users get completion for free with no `eval` needed. Matches the `gh` / `deno` pattern.
- **Fish dynamic polish** — once `__complete` lands, add `complete -c gpc -l profile -a '(gpc __complete profiles)'` style directives to the fish output.
- **~~`gpc watch vitals`~~** — shipped as `gpc watch` in v0.9.67 (unified rollout + multi-metric vitals + threshold alerting + auto-actions).
- **Interactive picker** — bare `gpc` invocation drops into a menu for discovery (prompts, profile select, common commands).
- **Error message overhaul** — richer suggestions per exit code (0-6), actionable next-step hints for the 40+ error catalog entries.

---

## v0.9.57 -- API fixes + type completeness

Researched 2026-04-13. Shipped 2026-04-13. All items verified against Google's discovery document and current codebase.

### Tier A -- Non-breaking (ship together)

| # | Item | Files | Complexity |
|---|------|-------|-----------|
| 1 | `apprecovery.cancel` + `.deploy` URL fix: singular `appRecovery` -> plural `appRecoveries` (lines 1587, 1591 in client.ts) | api/client.ts, api/tests/api.test.ts | Trivial |
| 2 | `dataSafety.update` HTTP verb: PUT -> POST (line 1073 in client.ts) | api/client.ts, api/tests/api.test.ts | Trivial |
| 3 | `dataSafety.get` removal: no Google endpoint exists. CLI already guards with user-friendly error. Remove client method + test. | api/client.ts, api/tests/api.test.ts, api/tests/api-coverage.test.ts | Small |
| 4 | OTP offer `activateOffer` / `deactivateOffer`: individual methods missing (subscription offers have them, OTP offers don't). Google endpoints: `POST .../{offerId}:activate` / `:deactivate` | api/client.ts (interface + impl), core/commands/one-time-products.ts, cli/commands/one-time-products.ts, tests | Medium |
| 5 | `gpc vitals errors count`: wire `errorCountMetricSet` (already in VitalsMetricSet type) to a new CLI subcommand | core/commands/vitals.ts, cli/commands/vitals.ts, tests | Medium |
| 6 | Type completeness pass | api/types.ts, tests | Medium |
|   | - `AppLevelPermission`: missing entirely, needs 15 values | | |
|   | - `DeveloperLevelPermission`: exists with 9 non-suffixed values, needs 19 `_GLOBAL` suffixed values | | |
|   | - OTP offer state: missing `INACTIVE_PUBLISHED` | | |
|   | - OTP availability enum: missing entirely, needs 5 values | | |
|   | - `SubscriptionState`: currently just `string`, needs proper union with 9 values incl. `PENDING_PURCHASE_CANCELED` | | |
| 7 | Docs: remove duplicate `guide/authentication.md` key in config.ts (lines 64 + 127, keep the better description) | apps/docs/.vitepress/config.ts | Trivial |

### Tier B -- Breaking change (ship with migration notes, or defer to v0.9.58)

| # | Item | Details | Complexity |
|---|------|---------|-----------|
| 8 | `gpc vitals lmk` rewire | Currently uses `stuckBackgroundWakelockRateMetricSet` (wrong). Should use `lowMemoryKillerRateMetricSet` (not in VitalsMetricSet type yet). `gpc vitals memory` also uses stuckBackgroundWakelock (debatable). `battery` and `wakeup` are duplicates. METRIC_MAP missing `wakeup` and `lmk` for compare/watch. | Large |

### Dropped from plan

- ~~`applications.tracks.releases.list`~~: already implemented (`client.releases.list()` at line 895-900 in client.ts). Removed from roadmap.

### Endpoint count after v0.9.57

Current: 216. Add 2 (OTP activate/deactivate). Remove 1 (dataSafety.get). Net: **217 endpoints**.

---

## v0.9.56 — Enterprise apps for Managed Google Play

### New

- feat(cli): `gpc enterprise publish <bundle>` — publish private apps to Managed Google Play in one step. First Android publishing CLI with Custom App API support.
- feat(cli): `gpc enterprise create --account <id> --bundle <path> --title "<title>"` — the underlying create primitive with explicit args
- feat(cli): `gpc doctor` now probes for the "create and publish private apps" service account permission
- feat(docs): new guide at `apps/docs/guide/enterprise-publishing.md` — full walkthrough from account setup to CI/CD

### Fixed

- fix(api): `gpc enterprise` completely rewritten — previous versions called nonexistent URLs and missed the multipart binary upload entirely. Private app creation has never worked against Google's real API before this release.
- fix(cli): `gpc enterprise list` removed — Google's Play Custom App Publishing API exposes no list method. Use `gpc apps list` to find private apps in your developer account; they appear alongside regular apps there.
- fix(docs): `gpc enterprise --org` was documented as a Google Workspace organization ID — it's actually the developer account ID from your Play Console URL. Parameter renamed to `--account` and the docs now explain this correctly.

### Breaking (with migration path)

- DEPRECATED: `gpc enterprise --org` renamed to `--account`. `--org` still works in v0.9.56 with a deprecation warning, will be removed in a future version. If you were using the flag in CI, rename it.
- REMOVED: `gpc enterprise list` — the Google API method it wrapped does not exist.

### Marketing

- First Android publishing CLI with Managed Google Play / Custom App API support
- Full research behind the rewrite: `.dev/engineering/ENTERPRISE_RESEARCH.md`
```

---

### v0.9.55 (shipped 2026-04-09) — API Freshness Audit + Multi-Profile Fix

**Theme:** Sync @gpc-cli/api with Google Play Developer API updates from May 2025 → Jan 2026 release notes. Type-layer corrections only, no runtime behavior changes. Grounded in official API reference (verified against `purchases.subscriptionsv2.revoke` and `purchases.subscriptionsv2.get`).

#### Scope (4 code changes + 1 JSDoc)

**P0 — Type correctness fixes**

1. **`offerPhase` shape bug** (Jan 2026 update misinterpreted in v0.9.54 audit)
   - Remove `offerPhase?: string` from `SubscriptionPurchaseV2` root (`packages/api/src/types.ts:502-503`) — field does not exist on root per official reference
   - Change `SubscriptionPurchaseLineItem.offerPhase` from `string` to object (`types.ts:558`):
     ```ts
     offerPhase?: {
       basePrice?: Record<string, unknown>;
       freeTrial?: Record<string, unknown>;
       introductoryPrice?: Record<string, unknown>;
       proratedPeriod?: Record<string, unknown>;
     };
     ```

2. **`RevokeSubscriptionV2Request` — typed body with RevocationContext union** (May 2025 `item_based_refund` option)
   - New type in `types.ts`:
     ```ts
     export interface RevokeSubscriptionV2Request {
       revocationContext?: {
         fullRefund?: Record<string, never>;
         proratedRefund?: Record<string, never>;
         itemBasedRefund?: { productId: string };
       };
     }
     ```
   - Update `client.ts:1440` signature: `revokeSubscriptionV2(packageName, token, body?: RevokeSubscriptionV2Request)`
   - Note: `itemBasedRefund.productId` is a single string (add-on product), not an array

3. **`AcknowledgeSubscriptionRequest` — typed body with externalAccountId** (Nov 2025)
   - New type in `types.ts`:
     ```ts
     export interface AcknowledgeSubscriptionRequest {
       developerPayload?: string;
       externalAccountId?: string;
     }
     ```
   - Update `client.ts:1433` signature: type the `body?` param

4. **`deferSubscriptionV2` JSDoc** — clarify add-ons deferral applies to all line items server-side (Jan 2026 — no request shape change needed)

**P0 — CLI bug fix**

4b. **`--profile` global flag was never applied** — the flag was defined on the program but commands ignored it, always using the default profile. Parse the flag from argv at startup in `bin.ts` and set `GPC_PROFILE`, which the config loader already honors. Surfaced while setting up multi-profile live testing for visioo / jowee / sfn-emploi. (`packages/cli/src/bin.ts`, new `argv-profile.ts` + tests)

**P0 — Documentation alignment**

5. **Bump version references across all docs to v0.9.55**
   - `apps/docs/` — all version strings, install commands, release badges, changelog entries
   - `README.md` (root + any package READMEs referencing a version)
   - `.agents/skills/gpc-*` — skill frontmatter/version pins if any reference v0.9.54
   - `apps/docs/advanced/conventions.md` release notes section if applicable
   - Verify `packages/*/package.json` versions land correctly via changeset (no manual edits)
6. **Update docs for new/changed API surface**
   - `apps/docs/reference/` (or equivalent) — document `AcknowledgeSubscriptionRequest`, `RevokeSubscriptionV2Request`, corrected `offerPhase` object shape
   - `apps/docs/guide/` monetization/subscriptions pages — add `--external-account-id` example for acknowledge (if CLI flag added in core)
   - Verify VitePress build passes (`pnpm --filter docs build`)

#### Deferred to v0.9.56 or later

- **`subscriptionId` optional in v1 `purchases.subscriptions.*`** — low value, v1 already emits deprecation warning (shutdown Aug 2027). Users should migrate to V2.
- **RTDN `NotificationType` enum** — no enum exists in the codebase yet; adding it is a separate feature, scope creep for a type-audit release.

#### Test additions (~5 tests)

- `revokeSubscriptionV2` with `itemBasedRefund.productId`
- `revokeSubscriptionV2` with `fullRefund` empty object
- `acknowledgeSubscription` with `externalAccountId`
- `offerPhase` object round-trip in `getSubscriptionV2` response
- Compile-time check: removed `SubscriptionPurchaseV2.offerPhase` root field

#### Release notes draft

```
## v0.9.55 — Type correctness fixes

- fix(api): correct offerPhase field shape (object, not string) and remove from V2 root
- feat(api): type acknowledge request body, add externalAccountId support
- feat(api): type revokeSubscriptionV2 request body with RevocationContext union
- docs(api): clarify subscriptionsv2.defer add-ons behavior
```

#### Post-cut: GPC skills sync

After v0.9.55 is shipped (npm + GitHub Release + binaries + docs deployed), sync `.agents/skills/gpc-*` to the new version:

- Review all 16 skills for references to changed API surface:
  - `gpc-monetization` — acknowledge `externalAccountId`, revoke `itemBasedRefund`, corrected `offerPhase` shape
  - `gpc-sdk-usage` — typed request bodies (`AcknowledgeSubscriptionRequest`, `RevokeSubscriptionV2Request`)
  - `gpc-release-flow`, `gpc-troubleshooting` — version string bumps only
  - Other 12 skills — version bumps only unless they reference subscription APIs
- Bump skills package version to match (v1.9.1 if currently v1.9.0)
- Publish via `npx skills add yasserstudio/gpc-skills` flow
- Verify `gpc install-skills` picks up the new version
- Update the skills README/index if field shapes are documented inline

#### Soak clock impact

Resets v1.0.0 soak clock. New target: v0.9.55 ship date + 14 days bug-free. Justification: shipping known-stale types into 1.0 is worse than a small delay.

---

### v0.9.54 (shipped) — API Audit Fixes, OTP Restructure, Missing Methods

**Theme:** Full API correctness audit against official Google Play Developer API v3 reference (2026-04-03). Fixes broken URLs, removes phantom endpoints, adds missing batch operations.

#### P0 — Bug fixes (broken endpoints)

**OTP offer URL structure — BUG (High)**

GPC uses a simplified 2-level path that does not exist in the official API:
```
CURRENT (wrong):  /{packageName}/oneTimeProducts/{productId}/offers/{offerId}
CORRECT:          /{packageName}/oneTimeProducts/{productId}/purchaseOptions/{purchaseOptionId}/offers/{offerId}
```

The official API nests offers under `purchaseOptions`. The `-` wildcard can be used for `purchaseOptionId` to span all purchase options.

**Affected API methods (5):**
- `oneTimeProducts.listOffers` — fix URL to include `/purchaseOptions/-/`
- `oneTimeProducts.getOffer` — fix URL, add `purchaseOptionId` param
- `oneTimeProducts.createOffer` — fix URL, add `purchaseOptionId` param
- `oneTimeProducts.updateOffer` — fix URL, add `purchaseOptionId` param
- `oneTimeProducts.deleteOffer` — fix URL, add `purchaseOptionId` param

**Affected CLI commands:** `gpc otp offers list/get/create/update/delete` — add `--purchase-option` flag (default `"-"` for wildcard)

**Standalone `purchaseOptions` resource — PHANTOM (Medium)**

GPC implements `purchaseOptions.list/get/create/activate/deactivate` at `/{packageName}/purchaseOptions/`. This top-level path **does not exist** in the official API. Purchase options only exist nested under `/oneTimeProducts/{productId}/purchaseOptions/`.

The CLI's `purchase-options` command group already redirects to `otp offers`, so user impact is minimal, but the API client methods are dead code.

**Fix:** Remove 5 phantom methods from `PlayApiClient.purchaseOptions`. Update CLI redirect messages. Restructure under `oneTimeProducts` if individual purchaseOption CRUD is needed (currently only batch ops exist in the official API).

**`refundSubscriptionV2` — PHANTOM (Medium)**

GPC implements `refundSubscriptionV2` hitting `/purchases/subscriptionsv2/tokens/{token}:refund`. This endpoint **does not exist** in the official API. The v2 API has only `cancel`, `defer`, `get`, `revoke`.

Refund paths:
- **v2:** Use `revoke` with `revocationContext` (handles refund + revocation together)
- **v1:** `purchases.subscriptions.refund` (deprecated, replaced by `orders.refund`)
- **Orders:** `orders.refund` (the official replacement)

**Fix:** Remove `refundSubscriptionV2` from API client. Update CLI `purchases subscription refund` to use `orders.refund`. Add deprecation notice pointing to `orders refund` as the canonical path.

#### P0 — Phantom endpoint cleanup

**`users.get` — PHANTOM (Low)**

GPC implements `get(developerId, userId)` but the official API has **no GET method** on users. Only `list`, `create`, `patch`, `delete`.

**Fix:** Remove from `UsersApiClient`. CLI `gpc users get <email>` should filter from `users.list` response instead.

**`grants.list` — PHANTOM (Low)**

GPC implements `grants.list(developerId, email)` but the official API has **no list method** on grants. Only `create`, `patch`, `delete`.

**Fix:** Remove from `UsersApiClient.grants`. CLI `gpc grants list <email>` should document this limitation. If the endpoint silently works (undocumented), keep it with a comment noting it's not in the official reference.

**`onetimeproducts.create` — MISMATCH (Low)**

Official API has no `create` (POST). It uses `patch` (PATCH) with `allowMissing=true` for create-or-update semantics.

**Fix:** Change `create()` implementation from `http.post` to `http.patch` with `allowMissing=true` query parameter. No CLI change needed.

#### P0 — Preflight: 16KB page size alignment scanner

**Context:** Android 15+ requires all native libraries (`.so` files) to have ELF LOAD segments aligned to 16KB. Google Play has enforced this since **November 1, 2025**. Apps with non-compliant `.so` files are rejected. GPC's `native-libs` scanner currently checks ABI coverage and 64-bit compliance but does not check 16KB alignment.

**New rule in `native-libs-scanner.ts`:**
- `ruleId: "native-libs-16kb-alignment"`
- `severity: "critical"` (enforcement is live, non-compliant = rejection)
- Scans all `.so` files in `lib/arm64-v8a/`, `lib/armeabi-v7a/`, etc.

**Implementation:**
1. For each `.so` ZIP entry, read the first 64 bytes (ELF header)
2. Parse ELF magic (`\x7fELF`), class (32/64-bit), endianness
3. Read `e_phoff` (program header offset) and `e_phnum` (count) from ELF header
4. Read each program header, find `PT_LOAD` segments (`p_type == 1`)
5. Check `p_align` field: if `< 16384` (2^14), flag as non-compliant
6. Report each non-compliant `.so` with filename, current alignment, and fix suggestion

**ELF binary format (well-defined, no external deps):**
```
ELF64 header: 64 bytes
  e_phoff:    offset 32, 8 bytes (program header table offset)
  e_phentsize: offset 54, 2 bytes (program header entry size)
  e_phnum:    offset 56, 2 bytes (number of program headers)

Program header (ELF64): 56 bytes each
  p_type:  offset 0,  4 bytes (1 = PT_LOAD)
  p_align: offset 48, 8 bytes (alignment)

ELF32 header: 52 bytes
  e_phoff:    offset 28, 4 bytes
  e_phentsize: offset 42, 2 bytes
  e_phnum:    offset 44, 2 bytes

Program header (ELF32): 32 bytes each
  p_type:  offset 0,  4 bytes (1 = PT_LOAD)
  p_align: offset 28, 4 bytes
```

**Severity logic:**
- Non-compliant `.so` + no `android:pageSizeCompat` in manifest → `critical` (will be rejected)
- Non-compliant `.so` + `android:pageSizeCompat="true"` in manifest → `warning` (compat mode, works but shows dialog to users on 16KB devices -- not ideal)
- All `.so` files compliant → no finding

**Output example:**
```
CRITICAL  native-libs-16kb-alignment
  lib/arm64-v8a/libfoo.so: LOAD segment aligned to 4KB (2^12), requires 16KB (2^14)
  lib/arm64-v8a/libbar.so: LOAD segment aligned to 4KB (2^12), requires 16KB (2^14)

  Fix: Recompile native libraries with -Wl,-z,max-page-size=16384
       or upgrade to NDK r28+ which aligns to 16KB by default.
```

**Suggestion text:**
```
Recompile with: -Wl,-z,max-page-size=16384
Or upgrade to NDK r28+ (16KB aligned by default).
Or set cmake flag: -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON (NDK r27).
See: https://developer.android.com/guide/practices/page-sizes
```

**Zero new dependencies.** Pure Buffer/DataView parsing of ELF headers from ZIP entries (GPC already reads ZIP entries via `yauzl`).

**Manifest parser addition:** parse `android:pageSizeCompat` attribute from `<application>` element. Pass to scanner context so 16KB check can adjust severity.

**Estimated: ~8 tests** (compliant .so, non-compliant .so, mixed, no native libs, 32-bit ELF, 64-bit ELF, pageSizeCompat downgrade, malformed ELF).

#### P0 — Preflight: exported components without permission protection

**Context:** Components with `android:exported="true"` and no `android:permission` attribute are accessible to any app on the device. This is a common security review flag and can lead to data leaks, intent injection, or unauthorized access. Google Play's app security improvement program flags these.

**New rule in `manifest-scanner.ts`:**
- `ruleId: "exported-no-permission"`
- `severity: "warning"` (not a hard rejection, but a security risk flagged in review)
- Scans all activities, services, receivers, and providers

**Logic:**
1. For each component where `exported === true` (explicitly set):
2. Check if `android:permission` is declared on that component
3. Skip components that are expected to be exported without permission:
   - Main launcher activity (`android.intent.action.MAIN` + `android.intent.category.LAUNCHER`)
   - Content providers that use `android:grantUriPermissions="true"` (intentional)
4. Flag remaining exported-without-permission components

**Output example:**
```
WARNING  exported-no-permission
  Service "com.example.MyService" is exported without a permission attribute.
  Any app on the device can bind to this service.

  Fix: Add android:permission="com.example.MY_PERMISSION" to the <service> declaration,
       or set android:exported="false" if external access is not needed.
```

**Estimated: ~4 tests** (exported + no permission, exported + permission, launcher activity skip, non-exported skip).

#### P0 — Preflight: April 2026 Google Play policy batch (deadline: May 15, 2026)

**Context:** Google announced a policy batch on April 15, 2026 with a 30-day compliance window. Three new scanner rules address the most impactful changes. Source: [support.google.com/googleplay/android-developer/answer/16926792](https://support.google.com/googleplay/android-developer/answer/16926792).

**Rule 1: Contacts Permission (`permissions-scanner.ts`)**
- `ruleId: "contacts-permission-broad"`
- `severity: "warning"`
- Flag `android.permission.READ_CONTACTS` and `android.permission.WRITE_CONTACTS` in manifest permissions
- Message: "Google Play now requires Android Contact Picker instead of broad contacts access. Apps using READ_CONTACTS/WRITE_CONTACTS must migrate by May 15, 2026."
- ~2 tests (broad contacts flagged, no contacts clean)

**Rule 2: Geofencing foreground service (`manifest-scanner.ts`)**
- `ruleId: "geofencing-foreground-service"`
- `severity: "warning"`
- Flag `<service>` elements with `android:foregroundServiceType` containing `location` when the manifest also declares `ACCESS_BACKGROUND_LOCATION` or known geofencing intent filters
- Message: "Geofencing is no longer an approved foreground service use case. Migrate to WorkManager or AlarmManager. Deadline: May 15, 2026."
- ~3 tests (foreground + geofencing flagged, foreground location without geofencing clean, no foreground service clean)

**Rule 3: Health Connect granular permissions (`permissions-scanner.ts`)**
- `ruleId: "health-connect-granular"`
- `severity: "info"` for targetSdk < 36, `"warning"` for targetSdk >= 36
- Flag broad health permissions (`android.permission.health.READ_ALL_HEALTH_DATA`) when targeting Android 16+
- New Health Connect data types (menstrual phases, alcohol, symptoms) require individual permission declarations
- Message: "Android 16 requires granular Health Connect permissions. Broad READ_ALL_HEALTH_DATA is deprecated."
- ~3 tests (broad on targetSdk 36 warning, broad on targetSdk 35 info, granular clean)

---

#### P1 — Missing batch operations

**OTP purchaseOptions batch ops** — entirely new resource:
```bash
gpc otp purchase-options batch-delete <product-id> --ids <option-ids>
gpc otp purchase-options batch-update-states <product-id> --file <path>
```
API URLs:
- `POST /{packageName}/oneTimeProducts/{productId}/purchaseOptions:batchDelete`
- `POST /{packageName}/oneTimeProducts/{productId}/purchaseOptions:batchUpdateStates`

`productId` accepts `-` wildcard for cross-product operations.

**OTP offers batch ops + cancel** — 6 missing methods:
```bash
gpc otp offers cancel <product-id> <purchase-option-id> <offer-id>
gpc otp offers batch-get <product-id> --ids <offer-ids>
gpc otp offers batch-update <product-id> --file <path>
gpc otp offers batch-update-states <product-id> --file <path>
gpc otp offers batch-delete <product-id> --ids <offer-ids>
```
API URLs (all under `/{packageName}/oneTimeProducts/{productId}/purchaseOptions/{purchaseOptionId}/offers`):
- `:cancel` (POST) — cancel vs deactivate: cancel is permanent, deactivate is reversible
- `:batchGet` (POST)
- `:batchUpdate` (POST) — up to 100 per request
- `:batchUpdateStates` (POST)
- `:batchDelete` (POST)

`productId` and `purchaseOptionId` both accept `-` wildcard.

**Subscription offers `batchGet` + `batchUpdateStates`**:
```bash
gpc subscriptions offers batch-get <product-id> <base-plan-id> --ids <offer-ids>
gpc subscriptions offers batch-update-states <product-id> <base-plan-id> --file <path>
```
API: `monetization.subscriptions.basePlans.offers.batchGet`, `.batchUpdateStates`

#### P1 — Minor gaps

**`edits.testers.patch`** — partial update (only `patch` missing, `get`/`update` exist):
- Wire into existing `testers add` flow as a PATCH alternative to full PUT replacement

**`inappproducts.patch`** — PATCH (partial update) vs existing `update` (PUT, full replace):
- Add `patch()` method to API client, expose via `gpc iap patch <sku> --file <path>`

#### P2 — System APKs (niche but complete coverage)

**`gpc system-apks`** — OEM pre-install APK generation from AAB:
```bash
gpc system-apks create <version-code> --file <device-spec.json>
gpc system-apks list <version-code>
gpc system-apks get <version-code> <variant-id>
gpc system-apks download <version-code> <variant-id> --output <path>
```
API: `systemapks.variants.create`, `.list`, `.get`, `.download`
Base URL: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications`

#### Summary

| Priority | Scope | Type | Changes | Est. tests |
|----------|-------|------|---------|------------|
| P0 | OTP offer URL fix | Bug fix | Fix 5 API methods, add purchaseOptionId param | 10 |
| P0 | Remove phantom purchaseOptions | Cleanup | Remove 5 dead API methods | 2 |
| P0 | Remove refundSubscriptionV2 | Bug fix | Remove 1 phantom, reroute CLI to orders.refund | 3 |
| P0 | Remove users.get phantom | Cleanup | Remove 1 method, filter from list | 2 |
| P0 | Remove grants.list phantom | Cleanup | Remove or annotate 1 method | 1 |
| P0 | Fix onetimeproducts.create | Bug fix | POST → PATCH + allowMissing | 2 |
| P0 | 16KB page size alignment scanner | New preflight rule | ELF header parsing in native-libs-scanner | 8 |
| P0 | Exported components without permission | New preflight rule | Manifest scanner: exported=true + no android:permission | 4 |
| P0 | Contacts Permission policy (April 2026) | New preflight rule | Flag READ_CONTACTS/WRITE_CONTACTS in permissions-scanner | 2 |
| P0 | Geofencing foreground service (April 2026) | New preflight rule | Flag foregroundServiceType=location + geofencing in manifest-scanner | 3 |
| P0 | Health Connect granular perms (April 2026) | New preflight rule | Flag broad health perms on targetSdk >= 36 in permissions-scanner | 3 |
| P1 | OTP purchaseOptions batch | New | 2 API methods, 2 CLI commands | 6 |
| P1 | OTP offers batch + cancel | New | 6 API methods, 5 CLI commands | 12 |
| P1 | Subscription offers batch | New | 2 API methods, 2 CLI commands | 6 |
| P1 | edits.testers.patch | New | 1 API method | 2 |
| P1 | inappproducts.patch | New | 1 API method, 1 CLI command | 2 |
| P2 | System APKs | New | 4 API methods, 4 CLI commands | 8 |
| **Total** | | | **~30 API changes, ~14 CLI commands, 5 new scanner rules** | **~76** |

**Implementation order:** P0 fixes first (correctness + 16KB scanner), then P1 new methods, then P2.

**Zero new dependencies.**

#### Live testing plan (pre-release gate)

Two apps for live verification. All tests must pass before tagging the release.

**Prerequisite:** Grant SFN service account (`sfn-play-publisher@sfn-emploi-mobile-app.iam.gserviceaccount.com`) access to `tv.visioo.app` in Play Console > Users and permissions. Visioo's `.gpcrc.json` already points to SFN's SA key.

**SFN (`com.sfnemploiappli`) — 65MB AAB, 3 ABIs, no monetization:**

| # | Test | Command | Expected |
|---|------|---------|----------|
| 1 | 16KB alignment scanner | `gpc preflight app-release.aab` | Shows 16KB check results for arm64-v8a, armeabi-v7a, x86_64 `.so` files |
| 2 | Exported-without-permission | `gpc preflight app-release.aab` | Shows exported component warnings (if any) |
| 3 | Status still works | `gpc status` | Releases, vitals, reviews displayed |
| 4 | Users list (no phantom get) | `gpc users list` | Returns user list without errors |
| 5 | System APKs list | `gpc system-apks list 91` | Returns variant list or empty (not 404) |
| 6 | Testers patch | `gpc testers add test@example.com --track internal --dry-run` | Dry-run output, no error |
| 7 | Phantom refund removed | `gpc purchases subscription refund <token>` | Shows deprecation notice pointing to `gpc purchases orders refund` |

**Visioo (`tv.visioo.app`) — has subscriptions, monetization data:**

| # | Test | Command | Expected |
|---|------|---------|----------|
| 8 | OTP offer URL fix | `gpc otp offers list` | Returns offers or empty list (not 404/500) |
| 9 | OTP create fix | `gpc otp list` | Returns products or empty (PATCH+allowMissing works) |
| 10 | Subscriptions list | `gpc subscriptions list` | Returns subscription list |
| 11 | Subscription offers batch get | `gpc subscriptions offers batch-get <product-id> <base-plan-id> --ids <id>` | Returns offer data or empty |
| 12 | IAP patch | `gpc iap patch <sku> --file <path> --dry-run` | Dry-run output, no error |
| 13 | Grants list | `gpc grants list <email>` | Returns grants or empty (undocumented endpoint, may or may not work) |
| 14 | Status | `gpc status` | Works with Visioo data |
| 15 | Preflight | `gpc preflight <aab>` | 16KB scanner runs on Visioo AAB (if available) |

**Smoke tests (both apps):**

| # | Test | Command | Expected |
|---|------|---------|----------|
| 16 | Build passes | `pnpm build` | All 7 packages compile |
| 17 | All tests pass | `pnpm test` | 1,874 tests green |
| 18 | Doctor passes | `gpc doctor` | No failures |
| 19 | Version correct | `gpc version` | Shows 0.9.54 |
| 20 | JSON output | `gpc status --json` | Valid JSON with all sections |

---

### v0.9.48 items (deferred to post-1.0 or folded into future releases)

The following items were originally planned for v0.9.48 but were not shipped. They are non-blocking for 1.0:

- **doctor --fix expansion** (3 new handlers: version, auth, unknown-config-keys) — deferred
- **auth setup-gcp interactive flow** (browser open, key validation, auto-login) — deferred
- **Pager for long lists** (`maybePaginate` across 8+ list commands) — deferred
- **Destructive command confirmations** — SHIPPED (cancel, revoke, cancel-v2 all have `requireConfirm`)

---

### v0.9.34 (shipped) — Bug fixes, color output, onboarding foundations

**Bug fixes**
- `fix(iap)` **Bug F** ✅ — `gpc iap batch-get --skus/--file` now shows deprecation notice and exits 1 before any API call (was exiting code 4 with 403).
- `fix(migrate)` **Bug G** ✅ — `gpc migrate fastlane` now warns before overwriting existing `.gpcrc.json`; aborts unless `--yes` is passed.

**Color output** (`picocolors`, ~3KB — no cold-start impact)
- `NO_COLOR` / `FORCE_COLOR` env var support + `--no-color` global flag
- `✓` → green, `✗` → red, `⚠` → yellow in `vitals`, `doctor`, `status`, `validate`
- Track status colors: `completed` gray, `inProgress` green, `halted` red, `draft` dim
- Diff coloring: `+` lines green, `-` lines red in `listings diff`, `releases diff`, `subscriptions diff`

**Onboarding foundations**
- First-run banner: if no config exists on any command, print `✦ First time? Run gpc config init to get set up.`
- Auth error CTA: 403/401 errors append `→ Run gpc doctor to diagnose your credentials.`
- `gpc config init` auto-runs `gpc doctor` inline after completing
- `gpc doctor` success handoff: print `✓ Ready. Try: gpc status`

**Testing infrastructure**
- `GPC_MOCK_VERSION=X.X.X` — lets `gpc update --check` report any version without downgrading
- `GPC_MOCK_INSTALL_METHOD=npm|binary|dev` — overrides install method detection for testing all update paths

**New API commands**
- `gpc reviews reply <review-id> --text "..."` — single `reviews.reply` call, most obvious missing reviews command
- `gpc anomalies list` — `playdeveloperreporting.anomalies.list`, surfaces quality spikes without threshold config
- `gpc vitals wakeup` — `vitals.excessivewakeuprate` (battery drain signal)
- `gpc vitals lmk` — `vitals.lmkrate` (Low Memory Killer events, memory pressure signal)

---

### v0.9.35 (shipped) — The Big One: Full Pre-1.0 Feature Release

**Terminal UX**
- Upload progress bar for `releases upload` and `internal-sharing upload` (bytes transferred, speed, ETA)
- Spinner during multi-API waits (`gpc status` freezes 2–3s — show rotating label while fetching)
- Terminal-width-aware table truncation (`process.stdout.columns` instead of hardcoded 60)
- Number right-alignment in tables (crash rates, rollout %, version codes)
- Bold/dim column headers + `─` separator instead of `-`

**Onboarding commands**
- `gpc auth login` with no flags → interactive prompts (profile name → credentials path → package name) instead of usage text
- `gpc quickstart` — single guided flow: detect config → verify credentials → check package → run doctor → show status. Idempotent, picks up from wherever the user is.

---

### v0.9.36 — Listing text optimization

**Gap:** gpc has no character limit enforcement. The API silently rejects over-limit text. Limits: title 30, shortDescription 80, fullDescription 4000.

**New utility:** `packages/core/src/utils/listing-text.ts` — pure, zero-dep functions: `lintListings()`, `wordDiff()` (LCS), `enrichDiffs()`

**`gpc listings lint`** (local, no API call)
```bash
gpc listings lint [--dir metadata] [--strict] [--output json]
```
Per-field table: chars / limit / usage% / status. Exit 2 if any field over limit or missing. `--strict` treats >80% as error.

**`gpc listings analyze`** (live, fetches remote)
```bash
gpc listings analyze [--lang en-US] [--expected en-US,de-DE,fr-FR]
```
Same table but for what's live on Play Store. `--expected` flags missing translations.

**`gpc listings push` preflight gate** — runs lint before committing. Abort if any field exceeds limit (unless `--force`). Warn if approaching limit.

**Enhanced `gpc listings diff`** — `--lang` filter, char count header per field, word-level inline diff for `fullDescription`

---

### v0.9.37 (shipped) — Missing API coverage: recovery, orders, grants, subscription lifecycle

**App Recovery** — complete the `gpc recovery` group (only `list` exists today):
```bash
gpc recovery create --version-code 35 --percentage 100
gpc recovery deploy <action-id>
gpc recovery add-targeting <action-id> --regions US,GB
gpc recovery cancel <action-id>
```
API: `apprecovery.create`, `.deploy`, `.addTargeting`, `.cancel`

**Orders** — zero current coverage, supports refund workflows:
```bash
gpc orders get <order-id>
gpc orders batch-get --file order-ids.json
gpc orders refund <order-id> [--revoke]
```

**Grants** — per-package permissions, finer-grained than `gpc users`:
```bash
gpc grants list --user user@example.com
gpc grants create --user user@example.com --permission VIEW_APP_INFORMATION,REPLY_TO_REVIEWS
gpc grants delete <grant-name>
gpc grants patch <grant-name> --permission VIEW_APP_INFORMATION
```

**Subscription lifecycle** (`purchases.subscriptionsv2` — richer than v1):
```bash
gpc purchases subscription get <token>
gpc purchases subscription cancel <token>
gpc purchases subscription defer <token> --until 2027-01-01
gpc purchases subscription refund <token>
gpc purchases subscription revoke <token>   # refund + revoke entitlement
```

---

### v0.9.38 (shipped) — Resumable Uploads, Bug Fixes, Rate Limiting & Security Audit

- **feat(upload): resumable upload protocol** — 8MB chunked uploads with auto-resume on failure, real-time progress bar
- **fix(upload): file size limits corrected** — 2GB AAB / 1GB APK (was 500MB/150MB)
- **fix(upload): 4-byte magic check** — file type detection reads 4 bytes instead of full file
- **fix(api): HTTP 408 now retryable** — Request Timeout added to retry set
- **fix(api): max retries raised from 3 to 5** — Google recommends 5-10 for resumable uploads
- **feat(api): Reporting API rate limit bucket** — separate 10/sec bucket for reporting endpoints
- **feat(api): edit session expiry warning** — warns when edit session is about to expire
- **feat(api): V1 subscription API deprecation warning** — warns on `purchases.subscriptions` v1 usage
- **fix(api): `inappproducts.list` maxResults removed** — parameter deprecated by Google
- **security: removed competitor refs, private doc filenames, benchmark data from public repo**
- **fix(homebrew): added linux-arm64 platform, fixed v0.9.37 binary build**
- **fix(cli): Bug M (High)** ✅ — `gpc quickstart` exits 1 even when doctor passes; fixed by spawning `gpc doctor` directly instead of `node <binary> doctor`
- **fix(core): Bug H (Medium)** ✅ — `gpc vitals lmk` / `memory` 400 INVALID_ARGUMENT; added base `stuckBackgroundWakelockRate` metric
- **fix(cli): Bug T (Medium)** ✅ — vitals table headers show indices instead of names; defensive array handling
- **fix(core): Bug U (Medium)** ✅ — `gpc vitals startup` missing `startType` dimension; added to valid dimensions, auto-includes
- **fix(cli): Bug R (Low)** ✅ — `gpc pricing convert` raw 400; friendly error message

**Actual new tests:** 11 → total 1,710

---

### v0.9.39 — `gpc preflight` (Pre-Submission Compliance Scanner)

**The missing tool in the Android ecosystem.** No free, offline, CLI-first scanner exists that checks an AAB against Google Play Developer Program Policies before submission. GPC will be the first.

Inspired by [RevylAI/greenlight](https://github.com/RevylAI/greenlight) (iOS App Store equivalent, 1.2k stars in 5 weeks). Nothing comparable exists for Android — Google Checks is paid and privacy-only, Play Policy Insights is Gradle-only lint, Privado is data-safety-only, and Pre-Launch Reports are post-upload.

**Commands:**
```bash
gpc preflight app.aab                        # Run all scanners in parallel
gpc preflight manifest app.aab               # Manifest analysis only
gpc preflight permissions app.aab            # Permissions audit only
gpc preflight metadata ./fastlane/metadata   # Listing compliance only
gpc preflight codescan ./src                 # Source code patterns only
gpc preflight privacy app.aab               # Tracking/data safety only
gpc preflight app.aab --fail-on critical --json  # CI mode
```

**Scanners (9 total):**

| Scanner | What it checks | Source |
| ------- | -------------- | ------ |
| **Manifest** | targetSdk ≥ 34, debuggable, testOnly, cleartext traffic, versionCode | AAB/APK |
| **Permissions** | Dangerous permissions, restricted (SMS, call log), background location, accessibility service | AAB/APK |
| **Native Libs** | arm64-v8a required, 32-bit only warning, ABI coverage | AAB/APK |
| **Metadata** | App name ≤30 chars, keyword stuffing, description limits, privacy policy URL, screenshot counts | Metadata dir |
| **Secrets** | Hardcoded API keys (AWS, Google, Firebase, Stripe), tokens, private keys | Source dir |
| **Billing** | Non-Play billing for digital goods, alternative payment SDK detection | Source dir |
| **Privacy** | Known tracking SDKs (DEX class names), ADVERTISING_ID, declared vs actual permissions | AAB + source |
| **Policy** | Families (COPPA), financial services, health claims, gambling, UGC requirements | Manifest + metadata |
| **Size** | Download size > 150 MB, unusually large assets, App Bundle recommendation | AAB/APK |

**Severity model:**
- `critical` — will likely cause rejection (restricted permission without approved use, debuggable=true)
- `warning` — may cause rejection/delay (dangerous permission without justification, targetSdk < minimum)
- `info` — best practice (minSdk < 24, large download size)

**Architecture:**
- Scanner framework: `PreflightScanner` interface → orchestrator runs all in `Promise.all`
- AXML parser from scratch (~300 lines Buffer parsing, zero deps) — parses `AndroidManifest.xml` from AAB binary
- Reuses existing code: `parseCentralDirectory` (ZIP), `lintListing` (metadata), `analyzeBundle` (size)
- Exit code 6 on `--fail-on` threshold breach (consistent with `--vitals-gate`, `--threshold`)
- `.preflightrc.json` for custom thresholds, allowed permissions, severity overrides, disabled rules

**New files:**
```
packages/core/src/scanners/
  scanner-types.ts          — PreflightFinding, PreflightScanner, PreflightContext, PreflightResult
  manifest-parser.ts        — Android binary XML (AXML) parser
  manifest-scanner.ts       — SDK version, debug flags, components
  permissions-scanner.ts    — Dangerous/restricted permissions audit
  native-libs-scanner.ts    — ABI architecture checks
  metadata-scanner.ts       — Listing compliance (reuses lintListing)
  secrets-scanner.ts        — Hardcoded credentials in source
  billing-scanner.ts        — Non-Play billing pattern detection
  privacy-scanner.ts        — Tracking SDKs, data collection
  policy-scanner.ts         — Policy-specific heuristics
  size-scanner.ts           — App size analysis (reuses analyzeBundle)
packages/core/src/commands/preflight.ts  — Orchestrator
packages/cli/src/commands/preflight.ts   — CLI command + sub-commands
```

**Implementation sub-phases:**

| Sub-phase | Scope | Est. tests |
| --------- | ----- | ---------- |
| 10a | Scanner framework, AXML parser, manifest/permissions/native-libs scanners, CLI command | ~40 |
| 10b | Metadata scanner (listing compliance, screenshots, privacy policy URL) | ~15 |
| 10c | Code scanning (secrets, billing, privacy/tracking SDKs) | ~25 |
| 10d | Policy-specific checks (families, financial, health, gambling, UGC) + size | ~15 |
| 10e | `.preflightrc.json` configuration | ~5 |

**Estimated total: ~100 new tests**

**Competitive positioning:**

| Tool | Coverage | Free | CLI | Offline |
| ---- | -------- | ---- | --- | ------- |
| **gpc preflight** | Full policy surface | Yes | Yes | Yes |
| Google Checks | Privacy/data safety only | Paid | Yes | No |
| Play Policy Insights | Code-level lint only | Yes | Gradle only | Yes |
| Privado CLI | Data safety forms only | Yes | Yes | Yes |
| Pre-Launch Reports | Crashes, a11y, perf | Yes | No | No |

**Key risks:**
- AXML parser correctness — Android binary XML has edge cases (resource refs, namespaces, UTF-16). Test against real AABs.
- False positives in code scanning — secrets/billing scanners will have FPs. Default to `warning` severity, allow suppression via config.
- Large AAB files — use targeted ZIP entry extraction, not full-file read.

**Also shipped in v0.9.39:**

- `gpc init` — scaffold `.gpcrc.json`, `.preflightrc.json`, `metadata/android/en-US/` listing files, GitHub Actions / GitLab CI templates. Non-destructive, interactive when TTY.
- `gpc diff` — read-only preview of release state across all tracks, track-to-track comparison (`--from`/`--to`), and local vs remote metadata diff (`--metadata`). No mutations.
- `--copy-notes-from <track>` on `gpc releases upload` and `gpc releases promote` — fetches release notes from another track's latest release. Mutually exclusive with `--notes`/`--notes-dir`/`--notes-from-git`.
- `gpc status --review-days <n>` — configurable reviews window (was hardcoded 30 days).
- `gpc status --threshold crashes=1.5,anr=0.5` — one-off CLI threshold overrides (percent values, merged with config).
- `gpc status --watch` — footer now shows elapsed time with live countdown: `Fetched 45s ago · refreshing in 15s`.
- `gpc releases count` — aggregate release stats per track with status breakdown.
- `gpc feedback` enhanced — audit log context, shell, CI detection, `--print` flag.
- Auto-retry on 409 Conflict for `promoteRelease` via `withRetryOnConflict` helper.
- fix: `gpc diff --from/--to` type mismatch (would crash at runtime).
- fix: `--review-days` validation (exits 2 on invalid values).

**Actual new tests:** 144 → total 1,710

---

### v0.9.40 (shipped) — Bug Fixes

- fix: Bug V (`gpc init --ci` collision → `--ci-template`)
- fix: Bug X (`gpc feedback --print` `[object Object]`)
- fix: Bug Y (`--copy-notes-from` + `--notes` mutual exclusion)

**Actual new tests:** 0 → total 1,710

---

### v0.9.41 (shipped) — Bug Fixes & Refactor

- fix: Bug H (vitals lmk metric field names `stuckBackground` → `stuckBg`)
- fix: Bug S (releases notes get fallback for completed releases)
- fix: Bug Z (subscriptions list empty output)
- refactor: extracted `resolvePackageName` + `getClient` to shared utility (−183 lines across 21 files)
- refactor: `console.warn` → `process.emitWarning` in core
- **Zero open bugs** after this release

**Actual new tests:** 0 → total 1,710

---

### v0.9.42 (shipped) — Upload Completion Detection

- fix: upload completion detection recovery when final chunk response is lost
- fix: 30-second timeouts for upload progress queries (were unbounded)
- fix: safe JSON parsing for malformed server responses during upload

**Actual new tests:** 2 → total 1,739 (note: test count jumped due to prior uncounted tests)

---

### v0.9.43 (shipped) — Root Cause Upload Fix

- fix: **critical** — Node.js `fetch` was following HTTP 308 as redirect (RFC 7238), breaking Google's "Resume Incomplete" protocol. Added `X-GUploader-No-308` header (same fix as Google's official Go SDK)
- feat: 12 smart error messages for common API failures (duplicate version code, insufficient permissions, etc.)
- Live verified: 67.3MB AAB upload to SFN Emploi, versionCode 86 → internal track completed

**Actual new tests:** 0 → total 1,739

---

### v0.9.44 (shipped) — Changelog Command & Preflight Graceful Fallback

- feat: `gpc changelog` — view release history from the terminal (GitHub Releases API, table/detail/JSON, no auth required)
- fix: `gpc preflight` graceful fallback when AAB manifest cannot be parsed (emits warning, skips manifest-dependent scanners, runs others)
- 2 new bugs found: Bug AA (changelog crash), Bug AB (preflight protobufjs ESM/CJS interop)

**Actual new tests:** 0 → total 1,739

---

### v0.9.45 (shipped) — Code Review Fixes & Security Hardening

Full code review across all 7 packages identified and fixed 10 issues:

- fix: Bug AA — `gpc changelog` crash (missing `loadConfig()` before `getOutputFormat`)
- fix: Bug AB — `gpc preflight` protobufjs ESM/CJS interop (`import * as` → `import default`); broadened manifest parse fallback to catch all errors
- fix(core): image export validates HTTP response before writing files (was writing error HTML as PNG on 404)
- fix(core): sensitive data redaction now covers non-string values (objects, numbers, arrays)
- fix(core): train gate failures use `GpcError` with exit code 6 (was plain `Error`)
- fix(config): profile resolution errors when profiles defined but requested key missing
- fix(cli): TypeScript TS2304 — added missing `GpcConfig` type imports in `config.ts` and `train.ts`
- fix(api): URL-encoded query parameters in games-client.ts
- fix(core): `train-state.ts` uses `path.dirname()` instead of string manipulation
- security: plugin trust check uses explicit first-party allowlist instead of `@gpc-cli/` prefix match

**Actual new tests (code review):** 5

**Google Play API catch-up (May 2025 – Jan 2026):**

Google shipped 5 new endpoints and 10+ new fields. Adding all to v0.9.45:

| Priority | Endpoint | Released | What it does |
|----------|----------|----------|--------------|
| P0 | `orders.get` | May 2025 | Get order details by order ID |
| P0 | `orders.batchGet` | May 2025 | Batch get multiple orders |
| P1 | `purchases.subscriptionsv2.cancel` | Sep 2025 | V2 cancel with `cancellationType` param |
| P1 | `purchases.subscriptionsv2.defer` | Jan 2026 | V2 defer for subscriptions with add-ons |
| P1 | `purchases.productsv2` (new resource) | Jun 2025 | V2 product purchases for multi-offer OTPs |

Commands:
```bash
gpc orders get <order-id>
gpc orders batch-get --ids o1,o2,o3
gpc purchases subscription cancel <token> [--type USER_CANCELED|SYSTEM_CANCELED|DEVELOPER_CANCELED|REPLACED]
gpc purchases subscription defer <token> --until 2026-06-01
gpc purchases product get-v2 <token>
```

Type updates for `SubscriptionPurchaseV2`:
- `offerPhase` — current phase (free trial, intro, base plan) [Jan 2026]
- `outOfAppPurchaseContext` — resubscription from Play Store [Nov 2025]
- `itemReplacement` — replaced subscription item details [Nov 2025]
- `price_step_up_consent_details` — price increase consent [Sep 2025]
- `latest_successful_order_id` — replaces deprecated `latestOrderId` [May 2025]
- `canceledStateContext`, `testPurchase`, `signupPromotion`, `externalAccountIdentifiers`, `recurringPrice`
- `PriceChangeState.CANCELED` enum value [May 2025]

Type updates for Orders: `offerPhaseDetails` [Nov 2025]

Deprecation warnings: v1 `cancel`, `defer`, `refund` → suggest v2 equivalents

**Actual new tests (total):** 18 → total 1,834

---

### v0.9.46+ — RTDN + subscription price migration

**Real-Time Developer Notifications** — no other CLI wraps this:
```bash
gpc rtdn status
gpc rtdn setup --topic projects/P/topics/T
gpc rtdn validate --endpoint https://api.example.com/webhook
gpc rtdn events [--limit 50] [--type SUBSCRIPTION_CANCELED]
```
Auth: same service account + `pubsub` IAM roles on the GCP project. `gpc rtdn events` decodes base64 `developerNotification` payloads into a readable table.

**Subscription price migration:**
```bash
gpc subscriptions base-plans migrate-prices <product-id> <base-plan-id> --dry-run
```
API: `monetization.subscriptions.basePlans.batchMigratePrices` — updates prices without breaking existing subscriptions.

---

### Future — Intelligence layer

**Release regression analysis**
```bash
gpc vitals compare v1.2.3 v1.2.4 [--dimension deviceModel]
```
Side-by-side crash rate, ANR, startup, rendering. Regressions in red. Export as markdown for PR descriptions or release notes.

**Review sentiment analysis** (local NLP, no external API)
```bash
gpc reviews analyze [--days 30] [--output markdown]
```
Sentiment trend over time, topic clustering (crashes / UI / performance / pricing), rating distribution by version code, top keywords in 1★ vs 5★. Alerts when negative sentiment spikes.

**Vitals-gated auto-halt**
```bash
gpc vitals watch --auto-halt-rollout
```
Background daemon. Pauses live rollout automatically if vitals breach thresholds mid-rollout. Completes the `--vitals-gate` story shipped in v0.9.32.

---

### Future — Release automation + data access

**Automated release trains** — most-requested CI/CD feature, no competing tool provides it:
```jsonc
// .gpcrc.json
"release-train": {
  "stages": [
    { "track": "internal",   "rollout": 100 },
    { "track": "alpha",      "rollout": 100, "after": "2d" },
    { "track": "beta",       "rollout": 100, "after": "5d" },
    { "track": "production", "rollout": 10,  "after": "7d" },
    { "track": "production", "rollout": 100, "after": "14d" }
  ],
  "gates": { "crashes": { "max": 1.5 }, "anr": { "max": 0.5 } }
}
```
Commands: `gpc train start`, `gpc train status`, `gpc train pause`, `gpc train abort`

**GCS reports download** — financial and stats reports are delivered to a private GCS bucket; Publisher API can't fetch them but `@google-cloud/storage` can:
```bash
gpc reports gcs-bucket
gpc reports download financial --month 2026-02
gpc reports download stats --type crashes --since 2026-01-01
```

**Quota monitoring** — visibility into 200k daily / 3,000/min API limits for CI pipelines:
```bash
gpc quota status
gpc quota usage --bucket subscriptions
```

**Subscription analytics**
```bash
gpc subscriptions analytics [--days 90]
```
Active/in-trial/cancelled counts, trial→paid conversion per offer, regional revenue breakdown, churn cohort (from `listVoided`).

---

### Future — Workflow & DX improvements

**`gpc workflow` — declarative JSON pipeline engine**
```bash
gpc workflow run                    # Execute .gpc/workflow.json
gpc workflow validate               # Dry-run validate the pipeline
gpc workflow run --step upload      # Run a single step
```
Define multi-step release pipelines in `.gpc/workflow.json` with step outputs, variable interpolation, and `--dry-run`. Steps can reference outputs from previous steps (`${steps.upload.versionCode}`).

**`gpc guidelines` — offline-searchable Google Play policy database**
```bash
gpc guidelines list                 # List all policy categories
gpc guidelines show permissions     # Show restricted permissions policy
gpc guidelines search "billing"     # Search policies by keyword
```
Embed Google Play Developer Program Policies as structured data. Searchable offline. Complements `gpc preflight` — preflight flags violations, guidelines explains *why*.

**`gpc releases count` — aggregate release stats**
```bash
gpc releases count                  # Total releases per track
gpc releases count --track beta     # Version code count on a track
```
Quick aggregate view for CI dashboards and reporting.

**`gpc schema` — runtime API schema inspector**
```bash
gpc schema list                     # List all API endpoints
gpc schema show edits.tracks.update # Show request/response schema
```
Self-documenting API explorer. Educational and debugging tool.

**`gpc feedback report` — file friction reports from CLI**
```bash
gpc feedback report                          # Open GitHub issue with debug context
gpc feedback report --title "upload timeout" # Pre-filled title
```
Collects CLI version, Node version, OS, last error, and opens a pre-filled GitHub issue. Reduces friction for bug reports.

**`gpc apps wall` — community showcase**
```bash
gpc apps wall list                  # Browse apps built with GPC
gpc apps wall submit                # Submit your app
```
Community showcase of apps using GPC. Marketing + social proof. Low priority but high marketing value post-1.0.

**Smart error recovery patterns**
- Recover `gpc releases promote` when version is already in another track's submission (auto-cancel stale, retry)
- Auto-select editable release when multiple drafts exist on a track
- Suppress 409 Conflict warnings on stale edit operations (auto-retry with fresh edit)
- Idempotent operations: re-running a command with same args should succeed, not fail on "already exists"

**`gpc quota status` — persistent API quota tracking across sessions**
```bash
gpc quota status                    # Today's usage + remaining daily + per-minute window
gpc quota status --since 7d         # Last 7 days, top commands by call count
gpc quota status --json             # CI-friendly
```
Derive from a local append-only log at `~/.cache/gpc/quota.log` (one line per API call, with command + endpoint + timestamp + quota cost). The 6-bucket rate limiter is in-process only — this surface answers "how close am I to the daily cap *across* CI runs + local work?". Include warning thresholds (80/95%) and a top-commands breakdown.
Competitive note: tamtom/play-console-cli v0.5.0 (2026-04-19) shipped this by piggybacking on a new audit log. If we add it, factor so preflight / doctor / audit can share the same log file. ~1 day.

**`gpc auth setup --auto` — end-to-end gcloud-driven service account creation**
Upgrade to the existing `gpc auth setup-gcp` (line 1986, v1.0.0 onboarding item): add an `--auto` mode that actually drives `gcloud` end-to-end rather than walking the user through console screens.
```bash
gpc auth setup --auto               # Enables APIs, creates SA, grants IAM, downloads key, writes profile
gpc auth setup --auto --dry-run     # Preview the gcloud invocations without running them
```
Wraps `gcloud services enable androidpublisher.googleapis.com`, `iam service-accounts create`, `projects add-iam-policy-binding`, `iam service-accounts keys create`, then wires the resulting key into a new GPC profile. Requires `gcloud` on PATH — fall back to the existing manual walkthrough when missing. Competitive note: tamtom v0.5.0 shipped this via `auth setup --auto`; both AndroidPoet/playconsole-cli and tamtom now advertise "one-command setup" as the marquee onboarding feature. Closes the parity gap while keeping our wizard (OAuth + ADC paths) as the fallback.

**Cross-refs to existing backlog items (already captured above):**
- `gpc workflow` (see "Future — Workflow & DX improvements" above) — tamtom v0.4.8 shipped a workflow engine in Feb 2026. Ours stays differentiated only if we actually ship it.
- `gpc feedback report` (see above) — tamtom's `snitch` (v0.4.8) is the same idea. Low-effort, high-signal for a solo-maintained CLI.

---

### Future — Ecosystem

**GitHub Actions Marketplace Action** -- PULLED FORWARD TO v0.9.81 (see Road to 1.0 and `V0981_GPC_ACTION_PLAN.md`). Primary organic distribution channel; Fastlane `supply` became the default via marketplace discoverability:
```yaml
- uses: yasserstudio/gpc-action@v1
  with:
    service-account: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    command: publish
    aab: app/build/outputs/bundle/release/app-release.aab
    track: internal
```

**Multi-app parallel operations**
```bash
gpc --apps com.example.phone,com.example.tv releases upload *.aab
```
Global `--apps <csv>` / `--apps-from <file>` flag. Parallel API calls, unified report, partial success handling.

**Plugin registry**
```bash
gpc plugins search firebase
gpc plugins install @gpc-cli/plugin-firebase
```
Official plugins: `plugin-firebase`, `plugin-sentry`, `plugin-jira`, `plugin-slack`

**Bundle analysis enhancements** (v0.9.23 shipped the core; remaining):
- Top-N largest files
- Per-module thresholds via `.bundlesize.json`
- Estimated APK size per device config

---

### Future — Extended APIs + AI release notes

**Play Games Services v2** (`gpc games`)
- `gpc games leaderboards list/get/create/update`
- `gpc games achievements list/get/create/update`
- `gpc games events list/get/create/update`
Separate OAuth scope: `games`. Distinct audience (game devs) — but valuable for completeness before 1.0.

**~~Play Custom App API~~** — **DONE.** Shipped in v0.9.56 as `gpc enterprise publish`.

**~~AI-assisted release notes~~** — **DONE.** Shipped across v0.9.61-v0.9.64 as `gpc changelog generate --target play-store --locales auto --ai --apply`. Implemented directly in core (lazy-loaded AI deps), not as a plugin.

---

### v1.0.0 — Stable release

**Onboarding completion**
- `gpc doctor --fix` — inline remediation for each failing check (move keys, update config paths, open URLs for manual steps)
- `gpc auth setup-gcp` — step-by-step GCP service account creation guidance (replaces 6+ manual console screens)
- Destructive command confirmations: `releases rollout halt`, `iap delete`, `listings delete` prompt `[y/N]` before executing. Skip with `--yes`.
- Pager for long lists: auto-pipe to `$PAGER` when row count > terminal height (TTY only)

**1.0 gate items**
- [ ] Wall of Apps community showcase
- [ ] Stability soak — 2+ weeks without critical bugs (clock reset 2026-03-17, target ≥ 2026-03-31)
- [ ] Public launch: blog post, X/Twitter thread, Reddit r/androiddev, Android Weekly

## Publisher API Coverage Status

Full audit against official Google Play Android Publisher API v3 (2026-04-03).

### Completed (all shipped)

| Resource | Endpoints | Shipped |
|----------|----------|---------|
| `edits` | insert, get, validate, commit, delete | v0.2.x ✅ |
| `edits.details` | get, update, patch | v0.2.x ✅ |
| `edits.bundles` | list, upload | v0.3.x ✅ |
| `edits.apks` | list, upload, addExternallyHosted | v0.3.x ✅ |
| `edits.tracks` | list, get, create, update, patch | v0.3.x ✅ |
| `edits.listings` | list, get, update, patch, delete, deleteAll | v0.4.x ✅ |
| `edits.images` | list, upload, delete, deleteAll | v0.4.x ✅ |
| `edits.testers` | get, update | v0.7.x ✅ |
| `edits.deobfuscationfiles` | upload | v0.3.x ✅ |
| `edits.countryavailability` | get | v0.4.x ✅ |
| `edits.expansionfiles` | get, update, patch, upload | v0.9.51 ✅ |
| `reviews` | list, get, reply | v0.5.x ✅ |
| `monetization` | convertRegionPrices | v0.6.x ✅ |
| `monetization.subscriptions` | list, get, create, patch, delete, batchGet, batchUpdate | v0.6.x ✅ |
| `monetization.subscriptions.basePlans` | activate, deactivate, delete, migratePrices, batchMigratePrices, batchUpdateStates | v0.9.53 ✅ |
| `monetization.subscriptions.basePlans.offers` | list, get, create, patch, delete, activate, deactivate, batchUpdate | v0.6.x ✅ |
| `monetization.onetimeproducts` | list, get, ~~create~~→patch+allowMissing, delete, batchGet, batchUpdate, batchDelete | v0.9.x ⚠️ (create uses wrong HTTP method) |
| `monetization.onetimeproducts` offers | listOffers, getOffer, createOffer, updateOffer, deleteOffer | v0.9.x ⚠️ **BUG: URL path missing `/purchaseOptions/{id}/` segment** |
| `purchaseOptions` (standalone) | list, get, create, activate, deactivate | v0.9.x ⚠️ **PHANTOM: top-level resource does not exist in API** |
| `inappproducts` | list, get, insert, update, delete, batchGet, batchUpdate, batchDelete | v0.6.x ✅ |
| `purchases.products` | get, acknowledge, consume | v0.6.x ✅ |
| `purchases.productsv2` | get | v0.9.45 ✅ |
| `purchases.subscriptions` | get, acknowledge, cancel, defer, refund, revoke | v0.6.x ✅ |
| `purchases.subscriptionsv2` | get, cancel, defer, revoke | v0.9.45 ✅ (⚠️ phantom `refund` method exists -- no such endpoint) |
| `purchases.voidedpurchases` | list | v0.6.x ✅ |
| `orders` | get, batchGet, refund | v0.9.45 ✅ |
| `externaltransactions` | create, get, refund | v0.9.x ✅ |
| `apprecovery` | list, create, cancel, deploy, addTargeting | v0.9.37 ✅ |
| `generatedapks` | list, download | v0.3.x ✅ |
| `internalappsharingartifacts` | uploadBundle, uploadApk | v0.3.x ✅ |
| `applications` | dataSafety | v0.9.x ✅ |
| `applications.deviceTierConfigs` | list, get, create | v0.9.x ✅ |
| `applications.tracks.releases` | list | v0.9.x ✅ |
| `users` | list, create, patch, delete | v0.7.x ✅ (⚠️ phantom `get` method -- no such endpoint) |
| `grants` | create, patch, delete | v0.9.35 ✅ (⚠️ phantom `list` method -- no such endpoint) |
| Reporting: vitals (7 metric sets) | query | v0.5.x ✅ |
| Reporting: anomalies | list | v0.9.35 ✅ |
| Reporting: errorIssues, errorReports | search | v0.9.x ✅ |

### Bugs found in audit (v0.9.54 P0)

| Resource | Issue | Severity |
|----------|-------|----------|
| `oneTimeProducts.*.Offer*` (5 methods) | URL path missing `/purchaseOptions/{id}/` segment -- hitting non-existent endpoints | **High** |
| `purchaseOptions` (5 methods) | Standalone resource at `/{pkg}/purchaseOptions/` does not exist in API -- dead code | **Medium** |
| `purchases.subscriptionsv2.refund` | Endpoint does not exist in official API -- phantom method | **Medium** |
| `users.get` | Endpoint does not exist in official API -- phantom method | **Low** |
| `grants.list` | Endpoint does not exist in official API -- phantom method | **Low** |
| `onetimeproducts.create` | Uses POST but official API uses PATCH + `allowMissing=true` | **Low** |

### Targeted for v0.9.54

| Resource | Missing methods | Type | Target |
|----------|----------------|------|--------|
| `monetization.onetimeproducts.purchaseOptions` | batchDelete, batchUpdateStates | New | v0.9.54 |
| `monetization.onetimeproducts.purchaseOptions.offers` | cancel, batchGet, batchUpdate, batchUpdateStates, batchDelete | New | v0.9.54 |
| `monetization.subscriptions.basePlans.offers` | batchGet, batchUpdateStates | New | v0.9.54 |
| `edits.testers` | patch | New | v0.9.54 |
| `inappproducts` | patch (PATCH, distinct from update PUT) | New | v0.9.54 |
| `systemapks.variants` | create, list, get, download | New | v0.9.54 |

### Deprecation status (official API)

| Method | Status | Replacement |
|--------|--------|-------------|
| `monetization.subscriptions.archive` | Deprecated (non-functional) | None needed -- archiving removed |
| `purchases.subscriptions.get` | Deprecated | `purchases.subscriptionsv2.get` |
| `purchases.subscriptions.refund` | Deprecated | `orders.refund` |
| `purchases.subscriptions.revoke` | Deprecated | `purchases.subscriptionsv2.revoke` |

GPC implements the deprecated v1 methods with deprecation warnings pointing to v2 equivalents. This is correct -- v1 shutdown is Aug 2027.

### Low priority / legacy (intentionally deferred)

| Resource | Endpoints | Reason |
|----------|-----------|--------|
| `edits.apklistings` | list, get, patch, update, delete, deleteAll | Legacy -- superseded by track-level release notes |
| `apps.fetchReleaseFilterOptions` | get | Minimal value -- filter options for release queries |

APK listings are a legacy pattern superseded by AAB + track-level notes.

---

## APIs We Are Not Building

Research confirmed these are not viable additions:

| API / Feature | Reason |
|--------------|--------|
| **Play Instant Apps** | Deprecated Dec 2025 — Google killing the entire product. Adding would mean removing in 6 months. |
| **SafetyNet Attestation** | Shut down June 2024. Already fully replaced by Play Integrity API. |
| **Play EMM API** | No new registrations accepted. Deprecated in favour of Android Management API. Enterprise MDM only — not for app devs. |
| **Android Management API** | Device fleet management for enterprise IT teams. Unrelated to app publishing. |
| **Play SDK Console API** | No REST API exists. Console is read-only for SDK owners, no programmatic control. |
| **Google Play Pass API** | Not exposed publicly. Invitation-only program, algorithmic revenue allocation, no developer controls. |
| **Play Games Services** | Distinct audience (game devs only), separate API, separate scope. Out of gpc's niche — better as a standalone `gpg` CLI if ever. |
| **Firebase App Distribution** | Different product, different credentials, different infrastructure. gpc already has `internal-sharing upload` for the Play-native equivalent. Adding Firebase would widen scope beyond Play Console. |
| **BigQuery Data Export setup** | GCP admin work, not Play Console work. Belongs in a GCP tooling CLI, not gpc. |
| **Dashboard Web UI** | Not a CLI. Antithetical to the tool's identity. |
| **Play Integrity token verify** | Backend/SDK concern, not a publishing workflow. Requires a separate OAuth scope. Useful but off-niche — backend teams have language-specific libraries for this. |
| **Slack/webhook-driven release approvals** | Primarily Slack infrastructure, thin Play Console connection. Complexity for a niche edge case. |

---

## Unexplored Google Play Ecosystem APIs

Entirely separate APIs beyond the Publisher suite:

| API | Purpose | GPC Fit | Priority |
|-----|---------|---------|----------|
| Play Integrity API | Device/app attestation verification | `gpc integrity verify` | Tier 2 |
| Play Games Services v2 | Leaderboards, achievements, events, cloud save | `gpc games` | Tier 3 |
| Play Custom App API | Private enterprise app distribution | `gpc enterprise` | Tier 3 |
| Play EMM API | Enterprise mobility management | Out of scope | — |

---


### v0.9.35 (shipped — Bug Fixes, Color Output, Onboarding)

**Theme:** Fix bugs surfaced in v0.9.33 live testing, color output across all commands, onboarding UX improvements, and new vitals/reviews/anomalies commands.

- **fix(iap): Bug F** ✅ — `gpc iap batch-get` shows deprecation notice and exits 1 before any API call (instead of crashing with 403)
- **fix(migrate): Bug G** ✅ — `gpc migrate fastlane` warns before overwriting existing `.gpcrc.json`; aborts unless `--yes` is passed
- **feat(color):** `✓` green, `✗` red, `⚠` yellow across `vitals`, `doctor`, `status`, `validate`; track status colors; diff coloring; `NO_COLOR`/`FORCE_COLOR` support
- **feat(onboarding):** First-run banner, auth error guidance (403/401 → run gpc doctor), `gpc config init` auto-runs doctor, `gpc doctor` success handoff message
- **feat(reviews):** `gpc reviews reply <review-id> --text "..."` — reply to user reviews from terminal
- **feat(anomalies):** `gpc anomalies list` — surface quality spikes from Reporting API
- **feat(vitals):** `gpc vitals wakeup` — excessive wake-up rate; `gpc vitals lmk` — Low Memory Killer events

**Actual new tests:** 37 → total 1,536

---

### v0.9.36 (shipped) — Bug Fixes & Security

- **fix(core): Bug H** ✅ — `gpc vitals lmk` metric names corrected to `stuckBackgroundWakelockRate7dUserWeighted` / `28dUserWeighted`; base metric was rejected by API with 400 INVALID_ARGUMENT
- **fix(cli): Bug M** ✅ — `gpc quickstart` no longer passes `--quiet` to internal doctor spawn; Commander treated it as unknown subcommand option causing exit 1 even when all checks passed
- **fix(core): Bug N** ✅ — `sendNotification` switched from `execSync` shell string to `execFile` array args on all platforms; eliminates shell injection via notification title/body
- **fix(cli): Bug O** ✅ — `gpc quota usage` output matches `quota status`; `topCommands` no longer renders as `[object Object]`
- **refactor(cli):** Extracted `printQuotaTable()` shared helper in quota.ts — eliminates 35-line duplicate between `quota status` and `quota usage`

**Actual new tests:** 15 → total 1,551

---

### v0.9.37 (shipped) — Security Hardening & Code Quality

- **security: plugins install/uninstall** — `execSync` shell string → `spawnSync` array args (no shell injection)
- **fix(api): PlayApiError rename** — was `ApiError` in @gpc-cli/api, naming collision fixed
- **fix(core): runWatchLoop** — throws instead of `process.exit(2)` for testability
- **fix: workspace:* lockfile** — workspace:^ → workspace:* lockfile consistency
- **security: removed competitor refs, private doc filenames from public repo**

**Actual new tests:** 4 → total 1,555

---

## v0.9.76 — Google I/O 2026 Response (planned 2026-05-20)

**Theme:** API parity with Google I/O 2026 announcements + positioning update for Android CLI 1.0 stable and AI Studio publish-to-internal-track.

**Research doc:** `.dev/engineering/GOOGLE_IO_2026.md` (full I/O impact analysis, 2026-05-20).

**Why this release exists:** Google I/O 2026 (May 19-20) shipped Play Developer API changes, deprecated subscription endpoints, introduced AI Studio internal-track publishing, and stabilized Android CLI 1.0. GPC needs to stay current on API surface and reaffirm its positioning as the production publishing complement to Google's expanding dev toolchain.

---

### Tier A — API parity (code changes)

| # | Item | Files | Complexity |
|---|------|-------|-----------|
| 1 | **New `SubscriptionPurchaseV2` fields** — add `onHoldStateContext` and `inGracePeriodStateContext` (both provide pending/failed order ID when subscription enters ON_HOLD or IN_GRACE_PERIOD due to declined renewal). Announced May 19, 2026. | `packages/api/src/types.ts`, tests | Small |
| 2 | **May 2026 subscription API deprecation warnings** — review the [May 2026 deprecation list](https://developer.android.com/google/play/billing/play-developer-apis-deprecations#may19-2026-api-deprecation) and add deprecation notices to affected methods in the API client. Follow the same pattern as existing v1 subscription deprecation warnings (stderr warning on use, suggestion to migrate). | `packages/api/src/client.ts`, `packages/core/src/commands/purchases.ts`, tests | Medium |
| 3 | **Verify Jan 2026 API coverage** — confirm GPC already handles: (a) `purchases.subscriptionsv2.defer` with add-ons (defers all items), (b) `OfferPhase` field on `SubscriptionPurchaseLineItem` (already patched in v0.9.55 as object shape). If gaps exist, patch. | `packages/api/src/types.ts`, `packages/api/src/client.ts` | Small |

### Tier B — Docs and positioning

| # | Item | Files | Complexity |
|---|------|-------|-----------|
| 4 | **Update `android-cli-interop.md`** — Android CLI 1.0 is now stable (was preview). Capabilities: semantic analysis, Compose preview, Journeys UI testing, SDK management. Supports Claude Code, Codex, Antigravity. Still NO publishing. Add AI Studio context: single-click publish to Internal Testing Track (not production). GPC owns production lifecycle. | `apps/docs/guide/android-cli-interop.md` | Medium |
| 5 | **Monetization docs update** — account recovery extended from 30 to 60 days (reduces involuntary churn up to 18%). Delayed charging optimization (low-risk failed payments get access while retry happens). Document in relevant monetization/subscription guide pages. | `apps/docs/commands/purchases.md` or `apps/docs/guide/` | Small |
| 6 | **Android 17 (API 37) preflight awareness** — add a note to preflight docs that Android 17 stable ships June 2026 with mandatory large-screen resizability (ignores manifest orientation/resize on >600dp). Target SDK deadline not yet announced. No scanner changes yet, but document the upcoming requirement. | `apps/docs/commands/preflight.md` | Trivial |

### Tier C — Near-term watch items (NOT in v0.9.76, track for future releases)

| Item | Trigger | Target |
|------|---------|--------|
| Agentic catalog management API endpoints | Google ships REST endpoints for bulk price changes, SKU import, metadata config | v0.9.77+ |
| Subscription management API (plan change at cancellation) | Google ships the new API | v0.9.77+ |
| `gpc preflight` large-screen resizability scanner | Android 17 stable + target SDK deadline announced (expect mid-2027) | v0.9.77+ |
| Engage SDK REST API | If Google exposes Engage SDK as a server API | Post-1.0 |
| AI Studio production publishing expansion | If AI Studio extends beyond internal test track | Competitive response |

### Explicitly out of scope

- Play Shorts, Ask Play, Gemini app discovery — user-facing Play Store features, no API surface for publishers
- Play Integrity warm-up latency improvement — no API change, just performance
- AppFunctions platform API — on-device MCP server for apps, unrelated to publishing
- Antigravity 2.0 / Antigravity CLI — dev orchestration platform, not publishing. GPC is already naturally agent-compatible (any agent can run `gpc` commands)
- Play Games Sidekick — gaming social features, no publisher API

### Test additions (estimated)

- New SubscriptionPurchaseV2 fields: ~4 tests (type correctness, JSON round-trip for both new fields)
- Deprecation warnings: ~4 tests (verify stderr warning on deprecated method call, verify suggestion text)
- Jan 2026 coverage verification: ~2 tests (if gaps found)
- **Total: ~10 new tests** (2,310 -> ~2,320)

### Endpoint count after v0.9.76

No change expected: **217 endpoints**. The new fields are on existing `SubscriptionPurchaseV2` response types, not new endpoints. Deprecation warnings don't add endpoints.

If the May 2026 deprecation list reveals new replacement endpoints, endpoint count may increase.

### Release notes draft

```
## v0.9.76 — Google I/O 2026 Response

### API
- feat(api): add `onHoldStateContext` and `inGracePeriodStateContext` fields to `SubscriptionPurchaseV2` (I/O 2026, May 19)
- feat(api): May 2026 subscription API deprecation warnings with migration suggestions
- fix(api): verify add-on deferral and OfferPhase coverage from Jan 2026 API update

### Docs
- docs: update Android CLI interop page for 1.0 stable + AI Studio internal-track publishing
- docs: account recovery extended to 60 days, delayed charging optimization
- docs: Android 17 (API 37) preflight awareness note (stable June 2026)
```

### Marketing angle

> *"v0.9.76 syncs GPC with everything announced at Google I/O 2026. New subscription API fields, deprecation warnings for the May 2026 wave, and updated positioning: Android CLI handles build/debug/test, AI Studio handles prototype-to-internal-track, GPC handles everything after — production releases, staged rollouts, metadata, monetization, CI/CD. The full lifecycle."*

### Competitive positioning update (for X/LinkedIn if warranted)

Google I/O 2026 confirmed GPC's thesis:

- **Android CLI 1.0 stable:** build, debug, test. No publishing.
- **AI Studio:** prototype to internal test track (single-click). No production. No rollouts. No metadata. No monetization.
- **Play Console UI:** still the only Google-provided path to production.
- **GPC:** the CLI path to production. Complements all three.

One-liner: *"Google handles the build side. GPC handles the publish side. That split held at I/O 2026."*

---

## Current Status (v0.9.86)

- **Version:** `v0.9.86` (latest shipped 2026-06-22)
- **Tests:** 2,408 across 7 packages + e2e
- **Coverage:** 90%+ line coverage on all core packages
- **API endpoints:** 227 (Publisher v3 + Reporting v1beta1 + Custom App Publishing v1 + Games Configuration v1configuration)
- **Packages:** 7 published under `@gpc-cli` scope on npm
- **Agent skills:** 18 skills (`gpc install-skills`)
- **Docs:** [yasserstudio.github.io/gpc](https://yasserstudio.github.io/gpc/) (108 pages)
- **Install:** `npm install -g @gpc-cli/cli` or `brew install yasserstudio/tap/gpc`
- **Open bugs:** zero
- **Audit:** zero production findings (cleared in v0.9.82)
- **Security:** deepsec audit complete, CI supply chain hardened, Trusted Publisher + Staged Publishing
- **GitHub Action:** `yasserstudio/gpc-action` on Marketplace (launched v0.9.81)
- **Next milestone:** v1.0.0 (stability soak + marketing push)

### Recent release highlights

| Version | Date | Headline |
|---------|------|----------|
| v0.9.86 | 2026-06-22 | Complete Google Play Games API: achievements + leaderboards CRUD (10 new endpoints) |
| v0.9.85 | 2026-06-20 | Complete the install fix (api peerDependencies still leaked workspace:*) |
| v0.9.84 | 2026-06-20 | Install fix (workspace: specifiers in published manifests) + --regions-version |
| v0.9.83 | 2026-06-11 | Response & usage quality: pagination resume fix, consistent list JSON, error fidelity |
| v0.9.82 | 2026-06-07 | Dependency health, docs alignment, lint cleanup, vitals gate fix |
| v0.9.81 | 2026-06-06 | GPC GitHub Action on Marketplace, config precedence fix |
| v0.9.80 | 2026-05-30 | Full-codebase security audit (15 fixes), API alignment (13 fixes), code quality (20 fixes) |
| v0.9.79 | 2026-05-25 | Developer clarity, API contract refresh, preflight targetSdk 36, Node 24 CI |
| v0.9.78 | 2026-05-24 | Track management fixes, `gpc releases assign`, validateAndCommit auto-rescue |
| v0.9.77 | 2026-05-22 | Fix large AAB upload timeout, supply chain hardening (Trusted Publisher + Staged Publishing) |
| v0.9.76 | 2026-05-20 | Google I/O 2026 response: API parity, deprecation warnings, positioning update |
| v0.9.75 | 2026-05-19 | Data safety CSV fix, input validation, docs rewrite |
| v0.9.74 | 2026-05-15 | Security hardening: deepsec audit, 16 fixes, CI supply chain lockdown |
| v0.9.66 | 2026-04-24 | Developer verification: `gpc verify checklist`, `gpc doctor --verify`, `gpc preflight signing` |
| v0.9.65 | 2026-04-23 | Preflight scanners for April 2026 Google Play policy enforcement dates |
| v0.9.64 | 2026-04-22 | `--apply` writes translated notes to draft release; bundle race fix; embedded docs (99 pages); changelog series complete |

---

## v0.9.47-v0.9.51 (shipped) — API Completeness, Bug Fixes, RTDN, Security & Polish

**Theme:** The feature completion arc before 1.0. Closed all known bugs, completed API coverage to 209 endpoints, added RTDN, rewrote rate limiter, hardened supply chain, added rejected app support.

**Actual result:** 209 API endpoints, 1,869 tests, zero known bugs, 78 docs pages, 16 agent skills.

---

### Bug Fixes (from Testing Checklist)

| Bug | Severity | Issue | Fix |
|-----|----------|-------|-----|
| **AC** | Medium | `gpc changelog --version <tag>` — Commander.js global `--version` intercepts the flag | Rename to `--tag <tag>` or `--release <tag>` |
| **AD** | High | `gpc releases upload app.apk` sends APK to `bundles.upload()` endpoint → 403 | Wire `edits.apks.upload`, auto-detect `.apk` vs `.aab` |
| **AD-notes** | Medium | `gpc preflight app.apk` rejects APK ("missing base/manifest/AndroidManifest.xml") | Add APK manifest extraction path in preflight |
| **AD-notes** | Low | `gpc bundle analyze app.apk --output json` — `type` field is `null` instead of `"APK"` | Set type from file extension/magic bytes |
| **Q** | Medium | `gpc vitals crashes/anr/wakeup/lmk` + `gpc anomalies list` throw raw 403 when Reporting API disabled | Graceful degradation like `vitals overview` does |
| — | Low | `gpc status --watch 5` exits code 1, but `--days 0` exits code 2 | Normalize validation exit codes to 2 |
| — | Low | `gpc vitals compare-versions --output markdown` renders human-readable table, not markdown table | Use markdown table formatter |
| — | Low | Upload last-chunk retry (4 attempts at final offset) — flaky but succeeds | Investigate `gpc publish` vs `gpc releases upload` retry handling difference |
| — | Low | `gpc quota usage` — `topCommands` shows raw JSON in table mode | Flatten to readable columns |

---

### New Command Group: RTDN (Real-Time Developer Notifications)

No other CLI wraps this. Major differentiator.

```bash
gpc rtdn status                                    # Check notification config
gpc rtdn setup --topic projects/P/topics/T         # Configure Pub/Sub topic
gpc rtdn validate --endpoint https://example.com   # Test webhook delivery
gpc rtdn events [--limit 50] [--type SUBSCRIPTION_CANCELED]  # Decode notifications
```

Uses same service account + `pubsub` IAM roles on the GCP project. `rtdn events` decodes base64 `developerNotification` payloads into a readable table.

New files:
```
packages/api/src/rtdn-client.ts         — Pub/Sub topic management + notification decoding
packages/core/src/commands/rtdn.ts      — Business logic for RTDN commands
packages/cli/src/commands/rtdn.ts       — CLI command registration
```

---

### APK Upload Support (fixes Bug AD)

```bash
gpc releases upload app.apk                        # Auto-detect format
gpc releases upload app.aab                        # Existing (unchanged)
gpc releases upload app.apk --format apk           # Explicit
```

- Wire `edits.apks.upload` + `edits.apks.list` in API client
- Auto-detect `.apk` vs `.aab` by extension + magic bytes
- Resumable upload reuse (same chunked protocol)
- `gpc preflight` APK support (extract manifest from APK root, not AAB base/ path)
- Fix `bundle analyze --output json` type field for APK

---

### Subscription Price Migration

```bash
gpc subscriptions base-plans migrate-prices <product-id> <base-plan-id> --dry-run
gpc subscriptions base-plans migrate-prices <product-id> <base-plan-id> --file prices.json
```

API: `monetization.subscriptions.basePlans.batchMigratePrices` — updates prices without breaking existing subscriptions. `--dry-run` shows preview.

---

### Batch Endpoints (10 new API methods)

Complete the monetization API surface:

| Command | API Method |
|---------|-----------|
| `gpc otp batch-get` | `onetimeproducts.batchGet` |
| `gpc otp batch-update` | `onetimeproducts.batchUpdate` |
| `gpc otp batch-delete` | `onetimeproducts.batchDelete` |
| `gpc otp offers batch-delete` | `purchaseOptions.batchDelete` |
| `gpc otp offers batch-update-states` | `purchaseOptions.batchUpdateStates` |
| `gpc subscriptions base-plans batch-update-states` | `basePlans.batchUpdateStates` |
| `gpc subscriptions offers batch-get` | `offers.batchGet` |
| `gpc subscriptions offers batch-update` | `offers.batchUpdate` |
| `gpc subscriptions offers batch-update-states` | `offers.batchUpdateStates` |

---

### Rate Limiter Rewrite

Current implementation is wrong — ad-hoc buckets covering 5 of 209 endpoints. Google's actual model: 6 buckets at 3,000 queries/min each.

- Rewrite to match Google's actual quota structure
- All 209+ endpoints rate-limited (not just 5)
- Per-bucket tracking: `edits`, `purchases`, `reviews`, `reporting`, `monetization`, `default`
- `gpc quota status` shows live bucket usage
- Warn before hitting limits in CI batch operations

---

### Draft Release Workflow

```bash
gpc releases upload app.aab --status draft          # Upload without going live
gpc releases promote --from internal --to beta --status draft  # Promote as draft
```

Spec-documented workflow not currently exposed. Upload → assign as draft → commit → inspect in Console → promote later.

---

### Reviews & Voided Purchases Completeness

**Reviews:**
- `--translate <lang>` flag on `gpc reviews list` (API supports `translationLanguage`, CLI doesn't expose it)
- `--all` auto-pagination (currently capped at 10/page, no follow of `nextPageToken`)
- 350-char validation on `gpc reviews reply` before API call
- Add `originalText` + `deviceMetadata` fields to `UserComment` type
- Production-only warning in `--help` (API only returns production reviews)
- 7-day data window note in `--help`

**Voided Purchases:**
- `--type` flag (0=in-app only, 1=in-app + subscriptions — subscription voids silently excluded today)
- `--all` auto-pagination
- `--include-partial-refunds` flag
- Add missing `voidedQuantity` field to `VoidedPurchase` type

---

### Doctor & Edit Lifecycle Improvements

**Doctor:**
- API enablement check — probe `androidpublisher.googleapis.com` enabled (common 403 cause)
- Developer ID format validation (must be long numeric string)

**Edit lifecycle:**
- `edits.validate` before `edits.commit` — catch errors before irreversible commit
- Warning on concurrent Play Console edits (spec: "If anyone makes changes through the Play Console while you have an edit in progress, your edit is discarded")
- Publish frequency warning — same track twice in 24h (Google says "do not publish alpha/beta more than once a day")

---

### Spec Alignment (small fixes)

- `?uploadType=media` on simple uploads (works without it, but not spec-compliant)
- Add `google_play_games_pc:` to form factor track validation
- Add `qa` to `STANDARD_TRACKS`
- Add `targetingInfo` field on `GeneratedApksPerVersion` type
- Reviews 7-day data window in `--help`

---

### Implementation Order (status as of v0.9.51)

1. ~~Bug fixes first (AC -> AD -> Q -> minor)~~ **Done (v0.9.47)** -- zero open bugs
2. ~~Spec alignment small fixes~~ **Done (v0.9.47)** -- qa track, google_play_games_pc, form factor validation
3. ~~APK upload~~ **Done (v0.9.47)** -- auto-detect .apk vs .aab
4. ~~Rate limiter rewrite~~ **Done (v0.9.47)** -- 6-bucket Google model, all endpoints rate-limited
5. ~~Reviews & voided purchases completeness~~ **Done (v0.9.47)** -- --all auto-pagination, --translate, 350-char validation, --type, --include-partial-refunds
6. ~~Doctor & edit lifecycle~~ **Done (v0.9.48)** -- doctor --fix, 20 checks, edits.validate before commit
7. ~~Draft release workflow~~ **Done (v0.9.47)** -- --status draft on upload and promote
8. ~~Batch monetization endpoints~~ **Done (v0.9.47)** -- 10 batch endpoints
9. ~~RTDN command group~~ **Done (v0.9.47)** -- gpc rtdn status/decode/test
10. ~~API parameter completeness~~ **Done (v0.9.51)** -- changesNotSentForReview, changesInReviewBehavior, deobfuscationFileType, deviceTierConfigId, allowMissing, latencyTolerance, expansion files, OTP pagination, reviews startIndex

---

### Appendix: API Spec Audit Findings (2026-03-27)

Findings from auditing the [Google Play Upload docs](https://developers.google.com/android-publisher/upload) against GPC's implementation.

#### Upload Spec Gaps

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 1 | **Simple uploads missing `?uploadType=media`** | Medium | Trivial | Simple uploads POST without the `uploadType=media` query param. Works in practice but not spec-compliant. Fix in `uploadRequest()` in `http.ts`. |
| 2 | **No APK upload path** | Medium | Small | Only AAB bundles supported via `edits.bundles.upload`. `edits.apks.upload` endpoint not wired. Needed for Wear OS, Android TV, and legacy projects. |
| 3 | ~~**No expansion file upload**~~ | **Done (v0.9.51)** | — | `edits.expansionfiles` get/update/patch/upload implemented for legacy APK support. |
| 4 | **No multipart upload** | Skip | — | `uploadType=multipart` sends file + metadata in one `multipart/related` request. No practical benefit — metadata can be sent separately. |
| 5 | **Image upload reads entire file into memory** | Low | Small | `readFile()` loads full image into Buffer. Fine for images (max 1024 KB per Google) but could stream for consistency. Low priority. |

### Usage Policy Compliance

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 6 | **No publish frequency warning** | Medium | Trivial | Google says "do not publish alpha/beta more than once a day". GPC should warn (not block) when a user uploads to the same track twice in 24 hours. Check via audit log timestamps. |

### Voided Purchases API Gaps

Audit against [Voided Purchases docs](https://developers.google.com/android-publisher/voided-purchases) (2026-03-27).

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 7 | **Missing `type` query param** | Medium | Trivial | Spec has `type=0` (in-app only) or `type=1` (in-app + subscriptions). GPC's `listVoided()` doesn't expose this. Default 0 means subscription voids are silently excluded. Add `--type` flag to `gpc purchases voided`. |
| 8 | **Missing `includeQuantityBasedPartialRefund` param** | Low | Trivial | Spec has `includeQuantityBasedPartialRefund=true` for multi-quantity partial refunds. GPC doesn't expose it. Add as `--include-partial-refunds` flag. |
| 9 | **`VoidedPurchase` type missing fields** | Medium | Trivial | Spec response includes `kind` field. GPC's type omits it. Also missing `voidedQuantity` (for partial refunds). Add both to the interface. |
| 10 | **No auto-pagination for voided purchases** | Medium | Small | Spec uses `nextPageToken` for pagination. GPC returns it but the CLI command doesn't auto-paginate — user has to manually pass `--token`. Add `--all` flag that auto-follows `nextPageToken`. |
| 11 | **`startTime`/`endTime` accept date objects but spec wants epoch millis** | Low | Trivial | API client signature uses `string` but the spec says "time in milliseconds since Unix epoch". Verify the CLI passes epoch millis, not ISO dates. |
| 12 | **No quota-safe initial fetch guidance** | Low | Small | Spec warns initial fetch can exhaust 6,000/day quota. GPC could warn on first run or when `--all` would exceed ~100 pages. |

### Reviews API Gaps

Audit against [Reply to Reviews docs](https://developers.google.com/android-publisher/reply-to-reviews) (2026-03-27).

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 13 | **`UserComment` missing `originalText` field** | Medium | Trivial | When `translationLanguage` is set and differs from review language, the API returns translated text in `text` and original in `originalText`. GPC's type doesn't include it — translated reviews silently lose the original. |
| 14 | **`UserComment` missing `deviceMetadata` object** | Low | Small | Spec includes `deviceMetadata` with `productName`, `manufacturer`, `deviceClass`, `screenWidthPx`, `screenHeightPx`, `nativePlatform`, `screenDensityDpi`, `glEsVersion`, `cpuModel`, `cpuMake`, `ramMb`. GPC omits the entire object. Useful for `gpc reviews list --device-info`. |
| 15 | **`lastModified` missing `nanos` field** | Low | Trivial | GPC types have `lastModified: { seconds: string }` but spec includes `nanos` too. Minor precision loss. |
| 16 | **No auto-pagination for reviews** | Medium | Small | Same as voided purchases — `nextPageToken` returned but CLI doesn't auto-paginate. Add `--all` flag. Currently limited to 10 per page by default (spec allows up to 100 via `maxResults`). |
| 17 | **`--translate` flag not exposed in CLI** | Medium | Trivial | API client supports `translationLanguage` param but the `gpc reviews list` CLI command doesn't expose it as a flag. Add `--translate <lang>` (e.g. `--translate en`). |
| 18 | **Reviews limited to production only — no warning** | Low | Trivial | Spec says API only returns reviews for production versions. GPC should warn if user expects alpha/beta reviews. |
| 19 | **Reply text max 350 chars — no validation** | Medium | Trivial | Spec says `replyText` max 350 chars, HTML tags stripped. GPC's `gpc reviews reply` shows character count but doesn't validate the 350-char limit before sending. |
| 20 | **Reviews only available for last week — no warning** | Low | Trivial | Spec says "retrieve only reviews created or modified within the last week". GPC should mention this in `--help` or warn when `--since` exceeds 7 days. |

### Generated APKs API Gaps

Audit against [Generated APKs docs](https://developers.google.com/android-publisher/generated-apks) (2026-03-27).

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 21 | **Missing `targetingInfo` field on `GeneratedApksPerVersion`** | Medium | Small | Spec says response includes `TargetingInfo` per signing key. GPC's type omits it. Needed for the `toc.json` workflow (bundletool install-apks). |
| 22 | **No `--bundletool-dir` output format** | Low | Medium | Spec describes a workflow: write `toc.json` from `targetingInfo`, download APKs named `{DownloadId}.apk`, use with `bundletool install-apks --apks /dir`. GPC downloads individual APKs but doesn't support building this directory structure. |
| 23 | **No draft-release → download → promote workflow** | Low | Medium | Spec describes a 9-step workflow: upload AAB to draft → commit → download generated APKs → process → promote to production. GPC could expose this as `gpc generated-apks fetch --version-code N --output-dir ./apks` with `toc.json` auto-generation. |
| 24 | **`GeneratedApk` type may be incomplete** | Low | Trivial | Current type has 5 fields. Verify against live API response — spec mentions signing key association which may mean additional fields. |

### APKs & Tracks API Gaps

Audit against [APKs and Tracks docs](https://developers.google.com/android-publisher/tracks) (2026-03-27).

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 25 | **No `edits.apks.upload` endpoint** | Medium | Small | GPC only supports AAB upload via `edits.bundles.upload`. APK upload is missing. Needed for Wear OS, Android TV, and legacy projects that can't use AAB. Wire up `edits.apks.upload` and add `--format apk` flag to `gpc releases upload`. |
| 26 | **Missing `google_play_games_pc` form factor tracks** | Low | Trivial | `validate.ts` has `wear:`, `automotive:`, `tv:`, `android_xr:` but not `google_play_games_pc:` prefix. Spec lists it as a valid form factor. Add to `STANDARD_TRACKS`. |
| 27 | **No `--status draft` workflow support** | Medium | Small | Spec describes draft releases (upload → assign to track as `"draft"` → commit → inspect in Console → promote later). GPC's `gpc releases upload` defaults to `completed`/`inProgress` but doesn't document or guide the draft workflow. Add `--status draft` flag and mention in help text. |
| 28 | **Halt completed release not documented** | Low | Trivial | Spec says you can halt a `"completed"` release (rolls back to previous completed release). GPC's `gpc releases rollout halt` only targets `inProgress`/`halted` releases. Verify if `halt` works on completed releases and document it. |
| 29 | **No "serving fallback release" awareness** | Low | Small | When a completed release is halted, the previous completed release becomes the "serving fallback". GPC's `gpc releases status` and `gpc diff` don't surface this concept. Could show "(fallback)" indicator. |
| 30 | **`qa` track name not in standard tracks** | Low | Trivial | Spec uses `"qa"` as the internal testing track name. GPC uses `"internal"`. Both work but `qa` isn't in `STANDARD_TRACKS` for validation. Add it. |
| 31 | **Form factor track validation too rigid** | Low | Trivial | Current `STANDARD_TRACKS` hardcodes specific form factor tracks. Spec says closed testing tracks use `"[prefix]:$name"` where `$name` is custom. The `TRACK_PATTERN` regex handles this, but validation warns on valid custom form factor tracks like `wear:my-test`. |

### Edits Lifecycle Gaps

Audit against [Edits docs](https://developers.google.com/android-publisher/edits) (2026-03-27).

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 32 | **No warning about concurrent Console edits** | Medium | Trivial | Spec says "If anyone makes changes through the Play Console while you have an edit in progress, your edit is discarded." GPC should warn on `edits.insert` or in `gpc doctor` output that an open Console session can invalidate API edits. |
| 33 | **No `edits.get` usage for edit status** | Low | Trivial | GPC has `edits.get` wired but never calls it to check if an edit is still valid before operating. Could use it as a pre-flight check in long-running operations. |
| 34 | **`edits.validate` not called before `edits.commit`** | Medium | Small | Spec shows validate → commit as a two-step pattern. GPC's `withFreshEdit` goes straight to the operation then commits. Adding a validate step before commit would catch errors before the irreversible commit. Some commands do call validate — verify consistency. |
| 35 | **No `edits.listings.patch` support** | Low | Trivial | Spec lists both `update` (full replace) and `patch` (partial update) for listings. GPC only uses `update`. `patch` would allow updating just the title without resending the full listing body. |
| 36 | **`edits.tracks.patch` wired in API but not exposed in CLI** | Low | Trivial | v0.9.46 added `tracks.patch` to the API client but no CLI command uses it yet. Could be useful for partial track updates without resending the full track resource. |

### Quota & Rate Limiting Gaps

Audit against [Quotas docs](https://developers.google.com/android-publisher/quotas) (2026-03-27).

**Major finding:** GPC's rate limiter model doesn't match Google's actual quota buckets at all.

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 37 | **Rate limit buckets don't match Google's quota model** | **High** | Medium | Google uses 6 quota buckets at **3,000 queries/min each**: Subscriptions, Subscription Updates, One-time Purchases, Orders, ExternalTransactions, Publishing/Monetization/Reviews. GPC has ad-hoc buckets (`default` at 200/s, `reviewsGet` at 200/hr, `reviewsPost` at 2,000/day, `voidedBurst` at 30/30s, `voidedDaily` at 6,000/day, `reporting` at 10/s). The bucket names, limits, and groupings are all wrong. Need full rewrite to match the spec. |
| 38 | **Most API calls have no rate limiting** | **High** | Medium | Only 5 of 209 endpoints use `rateLimit()`: reviews.list, reviews.get, reviews.reply, voided.list (x2 buckets). All other endpoints (subscriptions, purchases, orders, publishing, tracks, listings, etc.) have zero rate limiting. Any burst usage could hit Google's 3,000/min bucket limits. |
| 39 | **`default` bucket is fictional** | Medium | Small | GPC has a `default` bucket at 200 tokens/s but it's never actually used by any API call (no `rateLimit(limiter, "default")` call exists). Dead code. |
| 40 | **Reviews quota is wrong** | Medium | Trivial | Spec says reviews GET = 200/hour, reviews POST = 2,000/day. GPC has these correct for reviews but they should be part of the "Publishing, Monetization, and Reply to Reviews" bucket at 3,000/min — the separate hourly/daily limits are additional per the Reviews-specific doc. Both layers should apply. |
| 41 | **Voided purchases quota modeled separately from spec** | Low | Trivial | Voided purchases has its own quotas (6,000/day, 30/30s) per the voided purchases doc, but the spec's main quota page doesn't list a separate voided bucket. The voided-specific limits may be additional. Verify. |
| 42 | **No `gpc quota` integration with real Google Cloud quotas** | Low | Medium | Spec points to Google Cloud Console quotas page. GPC's `gpc quota status` shows local tracking only. Could link to or fetch real quota usage from Cloud Console API. |

### Getting Started / Auth Gaps

Audit against [Getting Started docs](https://developers.google.com/android-publisher/getting_started) (2026-03-27).

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 43 | **`gpc doctor` doesn't check if API is enabled** | Medium | Small | Spec says you must enable `androidpublisher.googleapis.com` on the GCP project. A common failure mode is having a valid SA key but the API not enabled — results in cryptic 403. `gpc doctor` could make a lightweight API probe and suggest "Enable the Google Play Developer API in Cloud Console" on failure. |
| 44 | **`gpc doctor` doesn't check SA permissions** | Medium | Small | Spec lists required permissions ("View financial data", "Manage orders", "Reply to reviews"). `gpc doctor` verifies the SA can create/delete edits (app access) but doesn't test financial or reviews permissions. Could add granular permission probes. |
| 45 | **No Developer ID auto-detection or validation** | Low | Trivial | Spec says Developer ID is in the Console URL and changes on app transfer. GPC requires `--developer-id` for user/grant commands but doesn't validate the format (must be a long numeric string). Add format validation. |
| 46 | **`gpc config init` doesn't guide API enablement** | Low | Small | The setup wizard helps with SA path and package name but doesn't mention the prerequisite of enabling the API in GCP. Could add a check or a "Before you start" step. |
| 47 | **No OAuth client flow for individual users** | Low | Medium | Spec describes OAuth client flow for per-user access (vs service account). GPC supports OAuth but the setup is undocumented compared to SA. Lower priority since SA is the common case. |

### Concurrency Gaps

Audit against [Concurrency docs](https://developers.google.com/android-publisher/edits/concurrency) (2026-03-27).

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 48 | **No warning when Console changes may conflict** | Medium | Small | Spec says committing an edit sends ALL pending Console changes for review too. GPC should warn before commit: "Any changes pending in the Play Console will also be sent for review." Could add a `--confirm` step or `gpc doctor` check for open Console sessions. |
| 49 | **No multi-user edit conflict detection** | Low | Small | Spec says multiple users can have active edits but first commit invalidates all others. GPC's `withFreshEdit` handles the retry but doesn't warn the user that another team member's edit was invalidated. Could log "Warning: committing this edit will invalidate edits by other users." |
| 50 | **`withFreshEdit` doesn't explain WHY the edit was invalidated** | Low | Trivial | When retry happens on `API_EDIT_EXPIRED`, the error message doesn't distinguish between Console-caused invalidation, another user's commit, or timeout. Could surface the specific cause from the API error body. |

### Full API Coverage Audit (Publisher API v3)

Cross-referenced GPC against the [official REST API reference](https://developers.google.com/android-publisher/api-ref/rest) (2026-03-27).

**Result: 124 of 155 Publisher endpoints implemented (80%)**. GPC also has ~49 Reporting API + Games + Enterprise endpoints beyond the Publisher spec, bringing the total to 208 (204 at v0.9.46, +4 expansion file methods in v0.9.51).

#### Missing Endpoints — Grouped by Priority

**High (commonly needed):**

| # | Endpoint | Priority | Notes |
|---|----------|----------|-------|
| 51 | `edits.apks.upload` | **Done (v0.9.47)** | APK upload shipped. Auto-detects .apk vs .aab. |
| 52 | `edits.apks.list` | **Done (v0.9.47)** | List APKs in an edit. |

**Medium (batch operations & newer APIs):**

| # | Endpoint | Priority | Notes |
|---|----------|----------|-------|
| 53 | `onetimeproducts.batchDelete` | Medium | Batch delete OTPs |
| 54 | `onetimeproducts.batchGet` | Medium | Batch read OTPs |
| 55 | `onetimeproducts.batchUpdate` | Medium | Batch create/update OTPs |
| 56 | `onetimeproducts.purchaseOptions.batchDelete` | Medium | Batch delete purchase options |
| 57 | `onetimeproducts.purchaseOptions.batchUpdateStates` | Medium | Batch activate/deactivate purchase options |
| 58 | `onetimeproducts.purchaseOptions.offers.*` (8 endpoints) | Medium | Full OTP purchase options offers CRUD — activate, batchDelete, batchGet, batchUpdate, batchUpdateStates, cancel, deactivate, list |
| 59 | `subscriptions.basePlans.batchMigratePrices` | Medium | Batch price migration for base plans |
| 60 | `subscriptions.basePlans.batchUpdateStates` | Medium | Batch activate/deactivate base plans |
| 61 | `subscriptions.basePlans.offers.batchGet` | Medium | Batch read subscription offers |
| 62 | `subscriptions.basePlans.offers.batchUpdate` | Medium | Batch update subscription offers |
| 63 | `subscriptions.basePlans.offers.batchUpdateStates` | Medium | Batch activate/deactivate subscription offers |
| 64 | `edits.testers.patch` | Medium | Partial testers update (only `update` exists) |
| 65 | `inappproducts.patch` | Medium | Partial IAP update (only `update` exists) |

**Low (niche or deprecated):**

| # | Endpoint | Priority | Notes |
|---|----------|----------|-------|
| 66 | `systemapks.variants.*` (4 endpoints) | Low | System APK variants — create, download, get, list. Niche use case (OEM system images). |
| 67 | `edits.expansionfiles.*` (4 endpoints) | **Done (v0.9.51)** | Implemented for legacy APK support. |
| 68 | `purchases.subscriptions.refund` (deprecated) | Skip | Use `orders.refund` instead. |
| 69 | `purchases.subscriptions.revoke` (deprecated) | Skip | Use `purchases.subscriptionsv2.revoke` instead. |
| 70 | `monetization.subscriptions.archive` (deprecated) | Skip | Archiving no longer supported by Google. |
| 71 | `applications.dataSafety` POST variant | Low | GPC has GET/PUT but spec shows POST. Verify if POST is needed vs PUT. |

### Roadmap Summary

**v0.9.47 scope — 71 gaps identified across 10 API docs:**

| Category | Count | Priority |
|----------|-------|----------|
| Quota rewrite (#37–#38) | 2 | **High** — rate limiter completely wrong |
| APK upload (#25, #51–#52) | 3 | **High** — blocks Wear OS / Android TV users |
| Upload spec compliance (#1, #3) | 2 | Medium — trivial fixes |
| Voided purchases gaps (#7–#12) | 6 | Medium |
| Reviews gaps (#13–#20) | 8 | Medium |
| Tracks/edits gaps (#26–#36) | 11 | Medium/Low |
| Auth/setup gaps (#43–#47) | 5 | Medium/Low |
| Concurrency gaps (#48–#50) | 3 | Medium/Low |
| Generated APKs gaps (#21–#24) | 4 | Low/Medium |
| Publish frequency warning (#6) | 1 | Medium |
| Missing batch endpoints (#53–#65) | 13 | Medium |
| System APKs (#66) | 1 | Low |
| Deprecated/skip (#67–#70) | 4 | Skip |
| Data safety POST (#71) | 1 | Low |

### Best Practices from API Overview

Audit against [Google Play Developer APIs overview](https://developer.android.com/google/play/developer-api) (2026-03-27).

| # | Gap | Priority | Effort | Notes |
|---|-----|----------|--------|-------|
| 72 | **No subscription polling warning** | Low | Trivial | Google says "Don't poll the API for subscription status on a regular basis" and "rely on RTDN instead". GPC's `gpc purchases subscription get` and `gpc vitals watch` don't warn about this. Could add a note in `--help` and docs. |
| 73 | **No RTDN integration or guidance** | Low | Medium | Google recommends Real-Time Developer Notifications for subscription changes. GPC has no RTDN support or documentation. Could add a `gpc rtdn` command or at least document how to set up RTDN alongside GPC in the docs. Not a CLI feature per se, but important for SDK users. |

**Status as of v0.9.51 -- shipped items from original priorities:**
1. ~~Quota rewrite~~ **Done (v0.9.47)** -- 6-bucket model, all endpoints rate-limited
2. ~~APK upload~~ **Done (v0.9.47)** -- #25, #51, #52 all shipped
3. Simple upload `?uploadType=media` fix (trivial -- #1) -- still open, works without it
4. ~~Voided purchases `type` param + auto-pagination~~ **Done (v0.9.47)** -- #7, #10
5. ~~Reviews `--translate` flag + 350-char validation~~ **Done (v0.9.47)** -- #17, #19
6. ~~Missing batch endpoints for OTP and subscriptions~~ **Done (v0.9.47)** -- 10 batch endpoints

**Remaining for v1.0.0:**
- ~~v0.9.79: API contract refresh~~ **Done (shipped 2026-05-25)**
- v0.9.80: Security audit, API alignment, code quality, docs refresh (plan: `.dev/engineering/V0980_AUDIT_PLAN.md`)
- Hall of Fame community showcase (plan: `.dev/engineering/WALL_OF_APPS_PLAN.md`)
- Website launch: gpccli.com (plan: `.dev/engineering/WEBSITE_PLAN.md`)
- Public marketing push (blog posts, X threads, Reddit, Android Weekly)
- Stability soak period (2+ weeks, zero critical bugs, starts after v0.9.90)
- Simple upload `?uploadType=media` spec compliance (#1)
- Parameter sprawl cleanup on subscription/OTP update methods (technical debt)

**Hard deadlines (upcoming):**
- **June 16, 2026** -- GitHub Actions runners default to Node.js 24 (Sept 16: Node 20 removed)
- **June 30, 2026** -- Google Play fee structure change (US/UK/EU). Docs-only.
- **August 31, 2026** -- Target SDK level 36 (Android 16) required for all new apps/updates
- **August 31, 2026** -- Play Billing Library v7 sunset (client-side, docs-only)
- **September 30, 2026** -- Developer Verification enforcement (BR, ID, SG, TH first)

---

## v0.9.80 -- Security Audit, API Alignment, Code Quality (planned)

Audit date: 2026-05-26. Full plan: `.dev/engineering/V0980_AUDIT_PLAN.md`.

Driven by: deepsec v2.0.9 (94 findings after triage), Google Play Developer API v3 discovery doc (rev 20260520), manual code quality review across all 7 packages. Includes full docs alignment pass and SEO/AI/LLM optimization.

### Track A: Security (15 items)

| # | Finding | File(s) | Severity |
|---|---------|---------|----------|
| A1 | Project config can self-approve plugins (bypass user trust gate) | `config/src/loader.ts` | HIGH |
| A2 | Shell injection in stage-publish npm version check | `scripts/stage-publish.js` | HIGH |
| A3 | Release tag interpolation in binary.yml (shell injection) | `.github/workflows/binary.yml` | HIGH |
| A4 | OIDC release job runs unpinned npm/cdxgen code | `.github/workflows/release.yml` | HIGH |
| A5 | CI PR jobs expose secrets to checked-out code | `.github/workflows/ci.yml` | HIGH |
| A6 | Webhook payload leaks secrets (purchase tokens, passwords) | `core/src/utils/webhooks.ts`, `cli/src/bin.ts` | HIGH |
| A7 | Service account secret echoed in auth error messages | `auth/src/service-account.ts` | HIGH |
| A8 | ADC tokens share constant cache key (multi-account confusion) | `auth/src/token-cache.ts` | HIGH_BUG |
| A9 | Preflight manifest parse failures pass by default | `core/src/preflight/` | HIGH_BUG |
| A10 | Watch suppresses halt/webhook after prior breach action | `core/src/commands/watch.ts` | HIGH_BUG |
| A11 | Preflight: `android:testOnly` read from wrong manifest element | `core/src/preflight/` | HIGH_BUG |
| A12 | Preflight: APK native libraries never checked for 16KB alignment | `core/src/preflight/` | HIGH_BUG |
| A13 | Preflight: only 256 bytes of ELF read, misses late PT_LOAD headers | `core/src/preflight/` | HIGH_BUG |
| A14 | Status fetch suppresses section failures, reports false healthy | `core/src/commands/status.ts` | HIGH_BUG |
| A15 | Generated CI template: unpinned `npm install -g @gpc-cli/cli` | `core/src/commands/init.ts` | HIGH |

### Track B: Google API Alignment (13 items)

| # | Issue | Severity |
|---|-------|----------|
| B1 | `canceledStateContext` flattened vs Google's nested `userInitiatedCancellation` | HIGH |
| B2 | `outOfAppPurchaseContext.externalTransactionToken` does not exist in Google schema | HIGH |
| B3 | `signupPromotion` shape `{promotionType, promotionCode}` vs Google's `{oneTimeCode, vanityCode}` | HIGH |
| B4 | `inappproducts.batchGet` sends `packageName.sku` param key, should be `sku` | HIGH |
| B5 | `User.developerAccountPermission` singular vs Google's plural `developerAccountPermissions` | HIGH |
| B6 | Missing `latencyTolerance` on inappproducts update/delete | MEDIUM |
| B7 | Missing `Grant.name` field | MEDIUM |
| B8 | `acknowledgeSubscription` v1 missing deprecation warning | MEDIUM |
| B9 | `buyOption` missing `legacyCompatible` + `multiQuantityEnabled` | MEDIUM |
| B10 | `rentOption` missing `expirationPeriod` | MEDIUM |
| B11 | `ItemReplacement` missing `replacementMode` | MEDIUM |
| B12 | `oneTimeProducts.listOffers` missing pagination params | MEDIUM |
| B13 | Tax compliance types missing `regionalProductAgeRatingInfos` + `productTaxCategoryCode` | MEDIUM |

### Track C: Code Quality P1 (10 items)

| # | Issue | File |
|---|-------|------|
| C1 | `bundles.list` missing `?? []` null fallback (crash risk) | `api/src/client.ts:864` |
| C2 | `tracks.list` missing `?? []` null fallback (crash risk) | `api/src/client.ts:895` |
| C3 | `download()` has no retry logic unlike all other HTTP methods | `api/src/http.ts:859-893` |
| C4 | Plugin permissions validated but never enforced | `core/src/plugins.ts:36-58` |
| C5 | Raw `throw new Error()` in API client (bypasses PlayApiError) | `api/src/client.ts:1748` |
| C6 | Raw `throw new Error()` in watch + changelog commands | `core/src/commands/watch.ts:189`, `changelog.ts:42,49,51` |
| C7 | Hard `process.exit()` bypasses error handler | `cli/src/commands/bundles.ts:58`, `enterprise.ts:312`, `purchases.ts:240,258` |
| C8 | Unguarded `JSON.parse` in config writer | `config/src/writer.ts:74` |
| C9 | Profile name prototype pollution (`__proto__` as profile name) | `config/src/writer.ts:90-108` |
| C10 | Plugin `register()` can crash entire CLI | `core/src/plugins.ts:52` |

### Track D: Code Quality P2 (10 items, ship if time allows)

| # | Issue |
|---|-------|
| D1 | Standardize `?? []` over `\|\| []` in client.ts (10 sites) |
| D2 | `reports.list` path: use `p()` encoding for consistency |
| D3 | Standardize batchGet on `URLSearchParams` (2 sites) |
| D4 | Watch metrics: parallelize with `Promise.all` (~500ms saved/round) |
| D5 | `signing-consistency.ts`: use PlayApiClient instead of raw fetch |
| D6 | Tilde expansion: use `os.homedir()` instead of naive `.replace("~", ...)` |
| D7 | `readConfigFile`: wrap JSON.parse, throw ConfigError not SyntaxError |
| D8 | `writer.ts`: sanitize parsed JSON from disk (share sanitizeObject from loader) |
| D9 | Duplicated `formatSize()` utility in two files |
| D10 | 18 `as any` casts in CLI monetization commands |

### Track E: Docs Alignment + SEO/AI/LLM Optimization

Full docs refresh: align all surfaces with v0.9.80 state, optimize for search engines and AI/LLM crawlers. Uses marketing skills from `coreyhaines31/marketingskills`.

- E1: Version stamps and stats alignment (README, llms.txt, FAQ, badges, api-coverage grid)
- E2: Docs content alignment (command references, security.md, architecture.md, changelog, api-coverage, troubleshooting, preflight)
- E3: SEO optimization (titles, meta descriptions, JSON-LD, OG/Twitter cards, sitemap, internal links, heading hierarchy)
- E4: AI/LLM optimization (llms.txt, llms-full.txt, CLAUDE.md, agent skills refresh, robots.txt, ai-plugin.json, AI-parseable patterns)
- E5: Announcement and branding (VitePress banner, homepage features, npm descriptions)

### Estimated effort

~850 LOC code + docs refresh, ~55 items, target ~2,380 tests (from 2,332).

### Implementation order

1. A1-A2 (plugin trust + shell injection), B1-B5 (breaking type mismatches), C1-C2 (null fallback crashes)
2. A3-A5 (CI hardening), A6-A7 (secret redaction), B6-B13 (API field completeness)
3. C3-C10 (P1 quality), A8-A15 (preflight + status bugs)
4. D1-D10 (P2 quality)
5. E1-E5 (docs alignment, SEO, AI/LLM optimization -- runs parallel with code tracks)

---

## Post-1.0 Roadmap

### Tier 1 — High impact, ship within 4 weeks of 1.0

**~~GitHub Action~~** -- **DONE.** Shipped in v0.9.81 (2026-06-06). `yasserstudio/gpc-action` live on the GitHub Actions Marketplace. TypeScript action on Node 24, built-in preflight gate, drop-in r0adkll migration. Plan: `.dev/engineering/V0981_GPC_ACTION_PLAN.md`.

**~~`gpc changelog generate`~~** — **DONE.** Shipped as the v0.9.61-v0.9.64 changelog-generation series. v0.9.61: smart clustering + prompt mode. v0.9.62: Play Store per-locale target. v0.9.63: AI translation (BYO key). v0.9.64: `--apply` into draft releases + embedded docs. Tier 4 "AI-assisted release notes" folded in and complete.

**`gpc doctor --score`**
- Health score for Play Store release readiness (A-F grade)
- Checks: auth configured, config valid, preflight passes, vitals thresholds set, CI integration detected
- Outputs score + breakdown + suggestions
- Shareable badge for README (SVG via shields.io or custom endpoint)
- Developers love scores — gamifies good practices

**Discord server + bot**
- Community hub for support, feedback, show-and-tell
- Phase 1: GitHub webhooks (zero code)
- Phase 2: Custom bot with slash commands (/gpc docs, /gpc version, /gpc compare)
- Plan: `.dev/engineering/DISCORD_PLAN.md`
- Launch WITH v1.0 marketing push, not before

**Developer Verification 2a — pre-API tooling → PULLED FORWARD TO v0.9.66**
- Google's mandatory verification enforcement begins Sept 30, 2026 (Brazil, Indonesia, Singapore, Thailand first). No public API yet, but offline tooling is valuable now and differentiates from every other Play CLI.
- Already shipped (v0.9.49): `gpc verify` static status + resources surface, doctor check #20, status footer.
- **Shipping in v0.9.66 (pulled forward from post-1.0, decision 2026-04-24):**
  - **`gpc doctor --verify`** — load the local Android keystore (via `GPC_KEYSTORE_PATH` env or profile config), compute the SHA-256 certificate fingerprint, and compare against the cert inside the most recent uploaded AAB fetched through `edits.bundles.list`. Warns on mismatch — the same fingerprint divergence that drops apps into Google's 2% manual-registration bucket. Advisory-only, no new API surface on Google's side.
  - **Preflight signing-key consistency scanner** — signing-key consistency check. Extracts signing cert from the AAB being scanned, compares against the previous track release's cert. Flags mismatches before upload. Extends existing `preflight` scanner, no new command.
  - **`gpc verify checklist`** — interactive walkthrough of Play Console registration steps, outputs a checked-off markdown report for CI artifacts.
  - **Enriched `gpc verify`** — upgrade from static info to account-aware: pull app count, surface "additional keys" and "non-Play apps" action items contextually.
  - **Docs refresh** — FAQ details from Google's official sources (Android 7+ enforcement, ADB exempt, enterprise exempt, multiple keys per package, sanctioned countries excluded, limited distribution).
- **Rationale for pull-forward:** Google sent auto-registration emails to all Play developers (April 17, 2026). The action items in that email (add additional keys, register non-Play apps) are exactly what `gpc doctor --verify` and `gpc verify checklist` help with. September 30 enforcement is 5 months away. Marketing angle: "first CLI to audit your signing keys before enforcement hits."
- **Watch item — trigger for Phase 2b:** monitor [`androidpublisher` v3 release notes](https://developers.google.com/android-publisher/release-notes) monthly for verification endpoints. Android Studio's signing-bundle registration-status indicator (Google publicly committed "coming months" in the March 2026 blog post) is the most likely tell; once it ships, the REST/gRPC surface that backs it is usually exposed shortly after.
- **Phase 2b (deferred until endpoints exist):** registration status queries, programmatic package registration, `gpc status` footer upgrade showing actual registration state instead of a static link.
- Background: `apps/docs/guide/developer-verification.md` (refreshed 2026-04-20 with $25 fee, on-device Verifier service, honest "what's coming" wording).
- Research source: agent brief 2026-04-20 (summarized in session notes) + full official docs review 2026-04-24. Primary sources: [developer.android.com/developer-verification](https://developer.android.com/developer-verification), [Play Console guide](https://developer.android.com/developer-verification/guides/google-play-console), [ADC guide](https://developer.android.com/developer-verification/guides/android-developer-console), [FAQ](https://developer.android.com/developer-verification/faq), [limited distribution](https://developer.android.com/developer-verification/guides/limited-distribution), March 2026 [rolling-out blog post](https://android-developers.googleblog.com/2026/03/android-developer-verification-rolling-out-to-all-developers.html).

### Tier 2 — Medium impact, ship within 8 weeks of 1.0

**VS Code extension**
- Sidebar panel showing `gpc status` output for current project
- Click-to-run: upload, rollout, preflight
- Terminal integration (runs CLI commands, not a separate tool)
- VS Code marketplace is a discovery channel
- Thin wrapper — delegates everything to the CLI

**`gpc compete`** (easter egg)
- Shows comparison table in the terminal (GPC vs Fastlane vs gradle-play-publisher)
- Developers share funny/bold CLI outputs on social media
- Zero effort, high shareability
- Hidden from --help, discoverable via `gpc compete` or `gpc vs`

**Terminal demo on website**
- Interactive asciinema replay embedded on gpccli.com landing page
- Visitors watch real GPC commands execute with real output
- No video player, no YouTube — inline terminal that auto-plays
- Record with Matte or asciinema, embed with asciinema-player.js

**Weekly Release Radar newsletter**
- Automated email: your apps' vitals summary, new reviews, release status
- Built from `gpc status --all-apps --output json` piped to email template
- Buttondown or Resend for delivery
- Tiny audience at first but high retention — weekly touchpoint
- Doubles as a forcing function to keep `gpc status` accurate

### Tier 3 — Lower priority, ship when community demands it

**System APKs resource** (`gpc system-apks`)
- List, get, create, download system APK variants from bundles
- Enterprise/OEM use case
- 4 new endpoints

**One-Time Product Offers nested CRUD** (confirmed in discovery doc revision 20260520)
- Full lifecycle for OTP purchase option offers (7 methods): activate, batchDelete, batchGet, batchUpdate, batchUpdateStates, cancel, deactivate, list
- Parent-level batch ops: `purchaseOptions.batchDelete`, `purchaseOptions.batchUpdateStates`
- v0.9.79 audited coverage: all 7 methods + 2 batch parent ops confirmed implemented (client.ts:1776-1911)

**`reviews.list` sortOrder parameter**
- Add `reviewsSortOrder` query param (newest, rating)
- Trivial addition to types + client

**Play Games Services v2** (`gpc games`)
- Leaderboards, achievements, events, cloud saves
- Separate API, separate auth scope
- Large effort, niche audience

**~~Play Custom App API~~** — moved to v0.9.56. Shipping as the marquee feature of the enterprise release. See v0.9.56 section in Release Plan and `.dev/engineering/ENTERPRISE_RESEARCH.md`.

**Play Integrity API** (`gpc integrity verify`)
- Device/app attestation verification
- Different API, different use case

### Tier 4 — Ecosystem and scale

**Plugin registry**
- Official plugins: Firebase, Sentry, Jira, Slack integrations
- Community plugin discovery via npm search
- `gpc plugins search` command

**Multi-app parallel operations**
- `--apps com.a,com.b,com.c` flag on all commands
- Parallel execution with aggregated output
- Monorepo-friendly batch workflows

**~~AI-assisted release notes~~** — folded into the v0.9.61 → v0.9.64 changelog series. Translation lands in v0.9.63. Plugin-vs-core decision (lazy-load `@anthropic-ai/sdk` in core vs ship `@gpc-cli/plugin-ai`) deferred until v0.9.63 implementation begins.

**`gpc workflow` declarative engine**
- YAML/JSON-defined multi-step release pipelines
- Step outputs, variable interpolation, conditional logic
- Alternative to shell scripts for complex release workflows

---

## Watch List (May 2026)

Items announced or hinted at by Google that have no API surface yet. Monitor monthly.

| Item | Source | Expected | Action when available |
|------|--------|----------|----------------------|
| Parallel track publishing | I/O 2026 blog | Later 2026 | Test tracks isolated from production reviews. Update release flow recommendations. |
| Submission history API | I/O 2026 blog | Later 2026 | New endpoints for review submission records. Wire into `gpc releases` or `gpc status`. |
| Agentic catalog management | I/O 2026 blog | TBD | Bulk price changes, SKU import. Console-first, REST endpoints may follow. |
| In-app subscription management API | I/O 2026 / PBL 9.0 | TBD | Plan changes at cancellation with prorated refunds. Server-side REST for `gpc subscriptions`. |
| Developer Verification API | Verification program | TBD | Registration status queries, programmatic package registration. Phase 2b of v0.9.66 work. |
| Play Age Signals API | US state laws (Utah May 2026, Louisiana July 2026) | Beta available | Client-side API. No publishing CLI impact unless server endpoints emerge. |
| In-App Content Search / Deep Links | Play Store AI discovery | TBD | If Google exposes deep link registration via Developer API, add to `gpc listings`. |

Last reviewed: 2026-06-25 (re-checked for v0.9.87: discovery doc still `20260520`; Submission History API + parallel-track publishing confirmed "later in 2026" with no endpoints yet).
