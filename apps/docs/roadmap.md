---
outline: deep
---

# Roadmap

Each phase maps to a version (`0.X.0`). Sub-updates (`0.X.y`) ship between phases.

## Completed Phases

| Phase | Version | Focus                                       | Status |
| ----- | ------- | ------------------------------------------- | ------ |
| 0     | —       | Monorepo scaffold, tooling                  | Done   |
| 1     | v0.1.x  | Auth, config, CLI shell                     | Done   |
| 2     | v0.2.x  | API client, apps commands                   | Done   |
| 3     | v0.3.x  | Releases, tracks, rollouts, upload, promote | Done   |
| 4     | v0.4.x  | Listings, metadata, images, Fastlane compat | Done   |
| 5     | v0.5.x  | Reviews, vitals, reporting API, CI alerting | Done   |
| 6     | v0.6.x  | Subscriptions, IAP, purchases, pricing      | Done   |
| 7     | v0.7.x  | Reports, users, testers, grants             | Done   |
| 8     | v0.8.x  | Plugin SDK, plugin manager, lifecycle hooks | Done   |

## Phase 9 — Polish & v1.0.0

Production hardening and stable release.

- [x] Interactive mode (guided workflows for complex operations)
- [x] `--dry-run` support for all write operations
- [x] Audit logging
- [x] Proxy and custom CA support (`GPC_CA_CERT`, `HTTPS_PROXY`)
- [x] Performance optimization (lazy command loading)
- [x] In-memory token cache with mutex deduplication
- [x] HTTP compression and connection keep-alive
- [x] Parallel pagination helper
- [x] Async config file discovery
- [x] Unified error hierarchy (exitCode + toJSON on all error types)
- [x] 90%+ test coverage on core packages
- [x] Standalone binary (esbuild bundle + Bun compile, cross-platform)
- [x] Security audit
- [x] README and docs final polish
- [x] CHANGELOG complete
- [x] VitePress documentation site
- [x] Homebrew tap (`yasserstudio/homebrew-tap`)
- [ ] Wall of Apps community showcase

## Version Map

| Version | Phase | Focus                      |
| ------- | ----- | -------------------------- |
| `0.1.0` | 1     | Auth, config, CLI shell    |
| `0.2.0` | 2     | API client, apps           |
| `0.3.0` | 3     | Releases, tracks, rollouts |
| `0.4.0` | 4     | Listings, metadata         |
| `0.5.0` | 5     | Reviews, vitals            |
| `0.6.0` | 6     | Monetization               |
| `0.7.0` | 7     | Reports, users, testers    |
| `0.8.0` | 8     | Plugin system              |
| `1.0.0` | 9     | Polish, stability          |
