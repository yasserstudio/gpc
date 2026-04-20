---
outline: deep
---

# GPC vs gradle-play-publisher

If you are using [Triple-T's gradle-play-publisher](https://github.com/Triple-T/gradle-play-publisher) (GPP) and wondering whether GPC replaces it or complements it, the short answer is: **both are fine**. GPP is a Gradle plugin that runs at build time. GPC is a standalone CLI that runs anywhere. They solve different parts of the problem.

## At a Glance

|                            | **GPC**                                          | **gradle-play-publisher** |
| -------------------------- | ------------------------------------------------ | ------------------------- |
| Form factor                | Standalone CLI + SDK                             | Gradle plugin             |
| API coverage               | **217 endpoints**                                | ~15                       |
| Runtime                    | Node.js or standalone binary                     | Gradle / JVM              |
| Cold start                 | <500ms                                           | 5-10s (Gradle boot)       |
| Works outside Gradle       | Yes                                              | No                        |
| Reviews & Vitals           | Yes                                              | No                        |
| Subscriptions & IAP        | Yes                                              | No                        |
| Financial reports          | Yes                                              | No                        |
| **Managed Google Play**    | **Yes (first CLI to support)**                   | No                        |
| **Preflight scanner**      | **9 offline policy checks**                      | No                        |
| **Multilingual changelog** | **`gpc changelog generate --target play-store`** | No                        |
| CI/CD native               | JSON output + semantic exit codes                | Gradle tasks              |
| Plugin system              | Yes (lifecycle hooks)                            | No                        |
| Licensing                  | Free to use, code on GitHub                      | Apache 2.0                |

## When GPP Is the Right Tool

GPP is a good fit if:

- Your release workflow is Gradle-driven end-to-end.
- You want `./gradlew publishBundle` in your CI pipeline alongside `assemble`.
- Your Android codebase has clean Gradle conventions and flavor configuration.
- You only need uploads, tracks, rollouts, and metadata sync.

There is no reason to migrate off GPP just for the sake of migrating. It is maintained and does its job well.

## When GPC Extends What GPP Cannot

GPP stops at upload. GPC covers the rest of the Play Store surface:

| Capability                         | GPC command                                                 | GPP equivalent |
| ---------------------------------- | ----------------------------------------------------------- | -------------- |
| Query crash rates + ANR            | `gpc vitals crashes` / `gpc vitals anr`                     | None           |
| Read and reply to reviews          | `gpc reviews list --all` / `gpc reviews reply`              | None           |
| Manage subscriptions and IAP       | `gpc subscriptions list` / `gpc iap list`                   | None           |
| Pre-upload policy scanning         | `gpc preflight app.aab`                                     | None           |
| Multi-locale release notes         | `gpc changelog generate --target play-store --locales auto` | None           |
| Financial reports                  | `gpc reports download`                                      | None           |
| Tester management                  | `gpc testers add` / `gpc testers remove`                    | None           |
| Managed Google Play (private apps) | `gpc enterprise publish`                                    | None           |

## Recommended: Coexistence

For most teams with an existing GPP setup, the cleanest path is **keep GPP for uploads and add GPC for ops**:

```yaml
# GitHub Actions example. GPP builds and uploads, GPC monitors and gates
- name: Build and publish to internal track
  run: ./gradlew publishBundle

- name: Install GPC
  run: npm install -g @gpc-cli/cli

- name: Gate promotion on vitals
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.SA_KEY }}
    GPC_APP: com.example.app
  run: |
    gpc preflight app.aab
    gpc status --sections vitals
    gpc releases rollout increase --track production --to 50 --vitals-gate
```

No duplicated config. Both tools use the same Google Play service account key.

## When to Replace GPP Entirely

Consider replacing GPP with GPC if:

- You want to run publish steps outside the Gradle build (bare CI step, remote trigger, manual runbook).
- You need per-variant rollout logic that is awkward in GPP's DSL.
- You publish multiple apps from a single CI job and GPP's per-project config is painful.
- You need preflight scanning before upload. GPP cannot do this.
- You need Managed Google Play — GPP cannot do this either.
- Your Gradle startup time is a bottleneck (5-10s per run adds up across CI steps).

The replacement is mechanical: map your GPP Gradle task to `gpc releases upload app.aab --track <track>` and your metadata directory to `gpc listings push --dir src/main/play/`.

## Getting Started

```bash
npm install -g @gpc-cli/cli
gpc auth login --service-account path/to/key.json
gpc doctor
gpc status
```

Works with your existing Google Play service account. Every write operation supports `--dry-run`.

## Related Pages

- [Compare all Google Play CLIs](/alternatives/) — plural hub with full feature matrix.
- [GPC vs Fastlane supply](/alternatives/fastlane) — if you are choosing between automation tools.
- [Android CLI interop](/guide/android-cli-interop) — use GPC alongside Google's official Android CLI.
- [Quick Start](/guide/quick-start) / [Full command reference](/commands/)
