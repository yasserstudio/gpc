---
outline: deep
---

# Roadmap

GPC is in a pre-release stability soak (`0.9.x`) heading toward a `1.0.0` public launch. This page outlines what's shipped, what's next, and what's on the horizon.

## Shipped (v0.9.0 – v0.9.38)

| Phase | What shipped                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------- |
| **0** | Monorepo scaffold (Turborepo + pnpm + tsup)                                                    |
| **1** | Auth (service account, OAuth, ADC), config, CLI shell                                          |
| **2** | API client, edits lifecycle, apps commands                                                     |
| **3** | Releases, tracks, rollouts, upload, promote                                                    |
| **4** | Listings, metadata, images, Fastlane compat                                                    |
| **5** | Reviews, vitals, reporting API, CI threshold alerting                                          |
| **6** | Subscriptions, IAP, purchases, pricing, regional conversion                                    |
| **7** | Reports, users, testers, grants, CSV import                                                    |
| **8** | Plugin SDK, plugin manager, lifecycle hooks, plugin-ci                                         |
| **9** | Security audit, interactive mode, VitePress docs, standalone binary, Homebrew tap, npm publish |

**Current state:** 187 API endpoints, 1,566 tests, 7 packages, 90%+ line coverage.

## v1.0.0 — Stable Release

The `1.0.0` milestone is a quality and stability bar, not a feature gate. Requirements:

- [ ] Stability soak — no regressions for 2+ weeks on production apps
- [ ] Live AAB upload verification across all auth methods
- [ ] CLI API surface freeze (no breaking changes to flags, output, or exit codes)
- [ ] Docs audit — every command page reviewed and tested
- [ ] README and landing page polish for public launch

## Phase 10 — `gpc preflight` (Pre-Submission Compliance Scanner)

**The missing tool in the Android ecosystem.** No free, offline, CLI-first scanner exists that checks an AAB against Google Play Developer Program Policies before submission. GPC will be the first.

Inspired by [Greenlight](https://github.com/RevylAI/greenlight) (which does this for iOS/App Store), `gpc preflight` will scan your app **offline** — no Google account or API calls needed — and flag rejection risks before you upload.

### Commands

```bash
# Run all scanners in parallel
gpc preflight app.aab

# Run individual scanners
gpc preflight manifest app.aab
gpc preflight permissions app.aab
gpc preflight metadata ./fastlane/metadata
gpc preflight codescan ./src
gpc preflight privacy app.aab

# CI mode — fail on critical findings
gpc preflight app.aab --fail-on critical --json
```

### Scanners

| Scanner         | What it checks                                                                                                  | Source              |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Manifest**    | targetSdk ≥ 34, debuggable flag, testOnly, cleartext traffic, versionCode                                       | AAB/APK             |
| **Permissions** | Dangerous permissions audit, restricted permissions (SMS, call log), background location, accessibility service | AAB/APK             |
| **Native Libs** | arm64-v8a required, 32-bit only warning, ABI coverage                                                           | AAB/APK             |
| **Metadata**    | App name length (≤30 chars), keyword stuffing, description limits, privacy policy URL, screenshot counts        | Metadata dir        |
| **Secrets**     | Hardcoded API keys, tokens, private keys, credentials in source                                                 | Source dir          |
| **Billing**     | Non-Play billing for digital goods, alternative payment SDK detection                                           | Source dir          |
| **Privacy**     | Known tracking SDKs, ADVERTISING_ID, data collection patterns, declared vs. actual permissions                  | AAB + source        |
| **Policy**      | Families Policy (COPPA), financial services, health claims, gambling indicators, UGC requirements               | Manifest + metadata |
| **Size**        | Download size > 150 MB warning, unusually large assets, App Bundle recommendation                               | AAB/APK             |

### Severity Model

| Level        | Meaning                      | Example                                            |
| ------------ | ---------------------------- | -------------------------------------------------- |
| **Critical** | Will likely cause rejection  | Restricted permission without approved use case    |
| **Warning**  | May cause rejection or delay | Dangerous permission without obvious justification |
| **Info**     | Best practice recommendation | minSdkVersion below 24                             |

### Design Principles

- **Offline by default** — no API calls, no account needed. Runs entirely on local files.
- **Zero external dependencies** — AXML manifest parser built from scratch, consistent with GPC's zero-runtime-dep approach.
- **CI-native** — `--fail-on critical` exits with code 6 (same as `--vitals-gate` and `--threshold`). JSON output for pipeline integration.
- **Configurable** — `.preflightrc.json` for custom thresholds, allowed permissions, severity overrides, and disabled rules.
- **Plugin-extensible** — the `PreflightScanner` interface is simple enough for plugin-contributed scanners.

### Implementation Phases

| Phase | Scope                                                                                           | Est. tests |
| ----- | ----------------------------------------------------------------------------------------------- | ---------- |
| 10a   | Scanner framework, AXML manifest parser, manifest/permissions/native-libs scanners, CLI command | ~40        |
| 10b   | Metadata scanner (listing compliance, screenshots, privacy policy URL)                          | ~15        |
| 10c   | Code scanning (secrets, billing patterns, privacy/tracking SDKs)                                | ~25        |
| 10d   | Policy-specific checks (families, financial, health, gambling, UGC) + size analysis             | ~15        |
| 10e   | `.preflightrc.json` configuration, documentation                                                | ~5         |

### Why This Matters

| Tool                 | Coverage                 | Free | CLI         | Offline |
| -------------------- | ------------------------ | ---- | ----------- | ------- |
| **gpc preflight**    | Full policy surface      | Yes  | Yes         | Yes     |
| Google Checks        | Privacy/data safety only | Paid | Yes         | No      |
| Play Policy Insights | Code-level lint only     | Yes  | Gradle only | Yes     |
| Privado CLI          | Data safety forms only   | Yes  | Yes         | Yes     |
| Pre-Launch Reports   | Crashes, a11y, perf      | Yes  | No          | No      |

GPC would be the only tool that covers the **full Google Play policy surface**, works **offline**, and is **free and open source**.

## Future Ideas

These are not committed — they depend on community interest and contributor bandwidth.

- **`gpc watch`** — unified daemon that monitors vitals, reviews, and rollout health with webhook alerts
- **`gpc changelog`** — auto-generate release notes from git history, PR labels, and conventional commits
- **`gpc screenshot`** — generate Play Store screenshots from Compose previews or connected devices
- **`gpc a11y`** — accessibility scanner for APK resources (content descriptions, touch targets, contrast)
- **GitHub App** — bot that comments on PRs with bundle size diff, preflight findings, and vitals status
