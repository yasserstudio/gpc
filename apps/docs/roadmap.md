---
outline: deep
---

# Roadmap

GPC follows a phased development approach. All nine foundational phases are complete, and the project is now in the `0.9.x` pre-release series working toward a stable `1.0.0` launch.

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

### Phase 9 Highlights

- Interactive mode (guided workflows for complex operations)
- `--dry-run` support for all write operations
- Audit logging and unified error hierarchy
- Proxy and custom CA support (`GPC_CA_CERT`, `HTTPS_PROXY`)
- Performance optimization (lazy loading, HTTP compression, connection keep-alive)
- In-memory token cache with mutex deduplication
- Parallel pagination helper and async config discovery
- 90%+ test coverage on all core packages (1,255 tests)
- Standalone binary (esbuild bundle + Bun compile, 5 platforms)
- Homebrew tap (`brew install yasserstudio/tap/gpc`)
- npm publish (`npm install -g @gpc-cli/cli`)
- VitePress documentation site
- Security audit
- `gpc doctor` diagnostics command

## Road to 1.0

The remaining items before the stable `1.0.0` release:

- [x] Final API coverage audit (187 endpoints verified)
- [x] Performance benchmarks (cold start < 300ms, sub-ms command latency)
- [x] Security review and credential hardening
- [x] npm publish automation refinement (provenance, dry-run, verification)
- [x] Documentation completeness review
- [ ] End-to-end testing against live apps
- [ ] Wall of Apps community showcase

Once these items are addressed and the CLI has been validated in production workflows, the version will bump from `0.9.x` to `1.0.0`.

## Post-1.0 Vision

Features and directions planned after the stable release:

- **App Bundle analysis** -- size optimization tools, per-module breakdown, size regression alerts
- **Play Integrity API** -- device integrity checks, API abuse detection integration
- **Automated release trains** -- scheduled track promotions, timed rollout curves
- **Dashboard web UI** -- companion web interface for visual release management
- **Community plugin ecosystem** -- plugin registry, starter templates, featured plugins
- **Multi-account management** -- switch between developer accounts, cross-account operations
- **Webhook integrations** -- Slack, Discord, and Teams notifications for releases, errors, and vitals alerts

## Current Status

- **Version:** `0.9.x` pre-release series
- **Tests:** 1,255 across 7 packages + e2e
- **Coverage:** 90%+ line coverage on all core packages
- **API endpoints:** 187 (complete coverage)
- **Packages:** 7 published under `@gpc-cli` scope on npm
- **Docs:** [yasserstudio.github.io/gpc](https://yasserstudio.github.io/gpc/)
- **Install:** `npm install -g @gpc-cli/cli` or `brew install yasserstudio/tap/gpc`
