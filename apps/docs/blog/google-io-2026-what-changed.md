---
title: "Google I/O 2026: What Changed for Android CLI Tools"
date: 2026-05-20
description: "Google I/O 2026 stabilized Android CLI 1.0, launched AI Studio internal-track publishing, and shipped new Play Developer API fields. Here is what it means for GPC."
author: Yasser Berrehail
tags: [google-io-2026, android-cli, play-api, ai-studio]
---

<BlogPost />

# Google I/O 2026: What Changed for Android CLI Tools

Google I/O 2026 (May 19-20) was the most agent-forward I/O to date. Google stabilized the Android CLI at version 1.0, launched one-click publishing from AI Studio to the Internal Testing Track, and shipped new Play Developer API fields for subscription state tracking. GPC stays current with all of these changes in v0.9.76.

## What Each Tool Covers

Google's developer ecosystem now includes three tools with distinct scopes. None of them covers production publishing from the command line.

| Capability                  | Android CLI 1.0 |  Google AI Studio  |   GPC   |
| --------------------------- | :-------------: | :----------------: | :-----: |
| Project scaffolding         |       Yes       | Yes (from prompts) |   No    |
| Build and run               |       Yes       |         No         |   No    |
| Emulator management         |       Yes       |  In-browser only   |   No    |
| Internal test track publish |       No        | Yes (single-click) |   Yes   |
| **Production releases**     |       No        |         No         | **Yes** |
| **Staged rollouts**         |       No        |         No         | **Yes** |
| **Track promotion**         |       No        |         No         | **Yes** |
| **Metadata and listings**   |       No        |         No         | **Yes** |
| **Vitals monitoring**       |       No        |         No         | **Yes** |
| **Subscriptions and IAP**   |       No        |         No         | **Yes** |
| **Preflight scanning**      |       No        |         No         | **Yes** |
| **CI/CD integration**       |       No        |         No         | **Yes** |

Google handles the build side. GPC handles the publish side. That split held at I/O 2026.

### Android CLI 1.0 (stable)

The Android CLI went from preview to stable. It covers SDK downloads, project creation, emulator management, on-device deployment, semantic symbol resolution, Compose preview rendering, and end-to-end UI testing via Journeys. It supports Claude Code, OpenAI Codex, and Google Antigravity as agent hosts.

It does not publish to the Play Store, manage tracks or rollouts, read vitals, or sync metadata.

For the combined workflow, see [Using GPC with Google's Android CLI](/guide/android-cli-interop).

### Google AI Studio

AI Studio can now generate native Kotlin/Compose apps from text prompts and publish them to the **Internal Testing Track** with a single click. This is useful for prototyping but has clear limits: no production publishing, no staged rollouts, no metadata management, no CI/CD. Apps are currently intended for personal use.

Most developers build with Android Studio and Gradle, not AI Studio. It is an optional on-ramp, not the standard path.

### Antigravity 2.0

Google launched Antigravity 2.0 as a standalone agent orchestration platform with CLI, SDK, and managed execution. It coordinates Android CLI and other tools but has no publishing capabilities itself. GPC's CLI-first design makes it naturally compatible with any agent orchestrator.

## Play Developer API Changes

### New subscription state fields (May 19, 2026)

Google added two new fields to `SubscriptionPurchaseV2`:

- **`onHoldStateContext`** -- contains `renewalDeclined.pendingOrderId` when a subscription enters `ON_HOLD` due to a declined renewal payment
- **`inGracePeriodStateContext`** -- contains `renewalDeclined.pendingOrderId` during the grace period retry window

These fields give developers visibility into why a subscription payment failed and which order triggered the state change. Combined with the extended account recovery window (30 to 60 days), they enable better involuntary churn recovery workflows. GPC v0.9.76 adds both fields to the typed API client.

```bash
# Get subscription with new state context fields
gpc purchases subscription get "purchase-token-abc123" --json
```

### Subscription billing improvements

Google extended the account recovery window from 30 to 60 days for failed payments. Top developers reported up to 18% reduction in involuntary churn and up to 9% reduction in total churn. A new delayed charging optimization lets low-risk users keep access while payment retries happen in the background.

These changes work automatically. No GPC configuration changes needed.

### May 2026 deprecation wave

Google continued the subscription API v1-to-v2 migration with a new deprecation wave. GPC already warns on deprecated v1 methods and provides v2 alternatives. See the [API Deprecations](/reference/deprecations) reference for the full timeline and migration guide.

### Earlier 2026 API additions (already covered)

Two January 2026 additions were already in GPC before I/O:

- `purchases.subscriptionsv2.defer` supports subscriptions with add-ons (defers all items together)
- `OfferPhase` field on `SubscriptionPurchaseLineItem` identifies the current phase (base price, free trial, intro price, prorated)

## Android 17 (API 37)

Android 17 reaches stable in June 2026. The biggest behavior change for developers targeting API 37: **mandatory large-screen resizability**. `screenOrientation`, `resizeableActivity`, `minAspectRatio`, and `maxAspectRatio` manifest attributes are ignored on displays wider than 600dp. There is no opt-out.

Other notable changes: background audio requires `MediaSessionService`, a new `ACCESS_LOCAL_NETWORK` permission for device discovery, and OTP SMS reading gets a 3-hour delay (use SMS Retriever API instead).

The target SDK deadline for API 37 has not been announced yet. Historically it arrives 12-18 months after the stable release. GPC's [preflight scanner](/commands/preflight) will add manifest checks when the deadline is announced.

## Key Numbers from I/O 2026

| Metric                                 | Value         | Source                                                                                                                            |
| -------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Spam reviews blocked in 2025           | 160 million   | [What's new in Google Play](https://android-developers.googleblog.com/2026/05/io-2026-whats-new-in-google-play.html)              |
| Fraud prevented in 2025                | $3.2 billion  | [What's new in Google Play](https://android-developers.googleblog.com/2026/05/io-2026-whats-new-in-google-play.html)              |
| Large-screen Android devices           | 580+ million  | [17 things for Android developers](https://android-developers.googleblog.com/2026/05/17-things-android-developers-google-io.html) |
| Multi-device user spend multiplier     | 14x           | [17 things for Android developers](https://android-developers.googleblog.com/2026/05/17-things-android-developers-google-io.html) |
| Account recovery extension             | 30 to 60 days | [What's new in Google Play](https://android-developers.googleblog.com/2026/05/io-2026-whats-new-in-google-play.html)              |
| Involuntary churn reduction (top devs) | up to 18%     | [What's new in Google Play](https://android-developers.googleblog.com/2026/05/io-2026-whats-new-in-google-play.html)              |
| Engage SDK monthly active users        | 30 million    | [What's new in Google Play](https://android-developers.googleblog.com/2026/05/io-2026-whats-new-in-google-play.html)              |

## What This Means for GPC

GPC's thesis is confirmed: Google is expanding its developer toolchain and still does not cover production publishing from the CLI. Android CLI handles build/debug/test. AI Studio handles prototype-to-internal-test. GPC handles everything after: production releases, staged rollouts, track promotion, metadata sync, vitals monitoring, subscription management, and CI/CD pipelines.

v0.9.76 keeps GPC current with every relevant I/O announcement. [Install or update](https://yasserstudio.github.io/gpc/guide/installation) to get the new subscription state fields and deprecation warnings.

## FAQ

### Does Google's Android CLI replace GPC?

No. The Android CLI (stable 1.0) covers project scaffolding, SDK management, emulator control, and on-device deployment. It does not publish to the Play Store, manage tracks or rollouts, read vitals, or sync metadata. GPC covers the publishing half. They are complementary tools, not competitors.

### Can AI Studio publish to production?

No. AI Studio publishes to the **Internal Testing Track only**. It cannot promote to production, manage staged rollouts, sync metadata, or integrate with CI/CD. Apps built in AI Studio still need GPC (or the Play Console UI) to reach production.

### What changed in the Play Developer API at I/O 2026?

Two new fields on `SubscriptionPurchaseV2` (`onHoldStateContext` and `inGracePeriodStateContext`), a continued v1-to-v2 subscription deprecation wave, account recovery extended from 30 to 60 days, and delayed charging optimization. GPC v0.9.76 adds full support for all of these changes.
