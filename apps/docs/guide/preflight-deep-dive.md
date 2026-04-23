---
outline: deep
---

# Preflight Deep-Dive

A Google Play rejection costs a week. `gpc preflight` is the offline scanner that catches the issues Google's review queue would catch — before you hit submit.

The [command reference](/commands/preflight) covers flags and options. This guide covers **why it exists, how it works, what each scanner catches, and how to tune it** for your project.

::: tip TL;DR
`gpc preflight app.aab` reads the AAB, parses the manifest, walks native libs, and runs 9 scanners in parallel. No API calls. Takes 1–3 seconds on a typical app. Returns findings grouped by severity. CI breaks the build on `error`+ by default.
:::

## Why preflight exists

Every Android team has learned the same lesson the hard way: Google's review process is a black box with slow feedback. A rejection means:

- **~5 business days** of lost shipping time (review queue + your fix + re-review)
- **Blocked releases** for the entire app — you can't ship urgent fixes until the rejected build is sorted
- **Compounding cost** when the issue is something trivial (a forgotten `android:exported`, a `targetSdkVersion` one version below the floor)

Almost every rejection reason is **statically detectable** from the AAB. Google does the detection during review. Nothing prevents you from running the same checks locally, except that nobody ships a tool for it.

GPC does. `gpc preflight` runs the same class of static checks Google applies, entirely offline, in your CI pipeline, before the upload.

## How it works

```
gpc preflight app.aab
    │
    ├── AAB Reader (yauzl)
    │   ├── base/manifest/AndroidManifest.xml  → manifest-parser
    │   ├── base/lib/**/*.so                   → ELF parser
    │   └── base/**/*.dex                      → size metrics
    │
    └── Orchestrator (parallel fan-out)
        ├── manifest scanner     → targetSdk, debuggable, exported, ...
        ├── permissions scanner  → 18 restricted permissions
        ├── native-libs scanner  → 64-bit + 16KB alignment
        ├── metadata scanner     → listing character limits (if --metadata)
        ├── secrets scanner      → hardcoded API keys (if --source)
        ├── billing scanner      → non-Play billing SDKs
        ├── privacy scanner      → tracking SDKs, Advertising ID
        ├── policy scanner       → Families, UGC, finance, health
        └── size scanner         → download size, asset budgets
```

Three properties worth calling out:

**Offline.** No network calls. No credentials required. Run it in an air-gapped CI runner. Run it on your laptop on a plane. The scanner rules ship in the binary.

**Parallel.** All scanners fan out concurrently. The critical path is AAB extraction + manifest parsing; scanners add microseconds.

**Graceful degradation.** If the manifest can't be fully parsed (some obfuscators or large apps produce manifests the binary-XML decoder stumbles on), GPC emits a warning and **skips only the manifest-dependent scanners**. Native-libs, secrets, billing, and size still run. You get partial results instead of a crash.

## The 9 scanners

Each scanner owns a category of Play policy. Rules inside a scanner are independent — disabling one doesn't affect the others.

### 1. Manifest

Flags the `AndroidManifest.xml` configurations that cause the fastest rejections in review:

- `android:debuggable="true"` — **critical**. Automatic rejection.
- `android:testOnly="true"` — **critical**. Automatic rejection.
- `targetSdkVersion` below the floor — **error**. Floor moves annually; GPC defaults to 35, configurable via `targetSdkMinimum`.
- Missing `android:exported` on components with intent filters (Android 12+) — **error**. Install fails on target SDK ≥ 31.
- Missing `foregroundServiceType` on `startForeground()` services (Android 14+) — **error**.
- `android:usesCleartextTraffic="true"` without a network security config — **warning**.
- Components exported without a permission guard — **warning**.
- `QUERY_ALL_PACKAGES` permission — **error**. Requires declared justification; rarely approved.
- Geofencing foreground service (April 2026 policy) — **warning**. Flags services with `foregroundServiceType="location"` combined with `ACCESS_BACKGROUND_LOCATION`. Google removed geofencing as an approved foreground service use case; compliance deadline is May 15, 2026. Suppress via `.preflightrc.json` if your app uses legitimate background location tracking.

### 2. Permissions

18 restricted permissions that require Play Console declaration or restricted-use approval:

`READ_SMS`, `SEND_SMS`, `RECEIVE_SMS`, `READ_CALL_LOG`, `WRITE_CALL_LOG`, `PROCESS_OUTGOING_CALLS`, `ACCESS_BACKGROUND_LOCATION`, `MANAGE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`, `REQUEST_INSTALL_PACKAGES`, `SYSTEM_ALERT_WINDOW`, `USE_FULL_SCREEN_INTENT`, `BIND_ACCESSIBILITY_SERVICE`, `PACKAGE_USAGE_STATS`, `BIND_DEVICE_ADMIN`, `BIND_NOTIFICATION_LISTENER_SERVICE`.

**April 2026 policy rules** (compliance deadline: May 15, 2026):

- **Contacts broad access** — **warning**. Flags `READ_CONTACTS` / `WRITE_CONTACTS`. Google now requires the Android Contact Picker API instead of broad contacts access.
- **Health Connect granular permissions** — **warning** on targetSdk 36+, **info** otherwise. Flags `READ_ALL_HEALTH_DATA`. Android 16 requires individual Health Connect data type permissions.

Declared permissions you've already approved in Play Console? Add them to `allowedPermissions` in `.preflightrc.json` and the scanner will skip them for that project.

### 3. Native libraries

Two real-world rejection classes that bite Android teams regularly:

- **64-bit compliance** (required since Aug 2019). The scanner walks `lib/**/*.so` and flags any 32-bit-only ABI lineup.
- **16KB page size alignment** (enforced by Google Play since Nov 2025). The scanner parses ELF LOAD segments and verifies alignment is a multiple of 16KB. This catches apps built against older NDK tools that still emit 4KB-aligned binaries.

A surprising number of apps pass the "modern build tooling" sniff test and still fail here because of a transitive native dependency. The scanner names the offending `.so`.

### 4. Metadata (listings)

Runs when `--metadata <dir>` points at a Fastlane-format metadata directory. Catches:

- Title > 30 characters — **error** (listing will reject)
- Short description > 80 characters — **error**
- Full description > 4000 characters — **error**
- Missing title, short description, or full description — **error**
- Screenshot count below minimum — **warning**
- Missing `privacy_policy_url.txt` — **error** (required for many app categories)

### 5. Secrets (code scan)

Runs when `--source <dir>` points at a source tree. Regex-based scan for **hardcoded secrets** across `.kt`, `.java`, `.ts`, `.js`, `.xml`, `.json`, `.gradle`, `.properties`:

- AWS access key IDs (`AKIA...`)
- AWS secret access keys
- Google API keys (`AIza...`)
- Stripe secret keys (`sk_live_...`)
- Private RSA/EC keys (`-----BEGIN ... PRIVATE KEY-----`)
- Generic high-entropy strings adjacent to suspicious identifiers (`apiKey`, `secret`, `password`, `token`)

Not a replacement for a dedicated SAST tool, but catches the most common self-inflicted wounds before they ship.

### 6. Billing

Detects **non-Play billing SDKs** embedded in the AAB. Google Play policy requires in-app digital-goods purchases flow through Play Billing. The scanner flags Stripe, Braintree, PayPal, Square, and Razorpay when they appear in code or `build.gradle` dependency blocks.

This rule has false positives — some apps legitimately use non-Play billing for physical goods or services outside Play's scope. Use `severityOverrides` to demote it to `info` if that's your case.

### 7. Privacy

Flags **tracking SDKs and data collection** that trigger additional Data Safety declarations:

- Facebook SDK, AppsFlyer, Adjust, Branch, Singular, Kochava
- `AD_ID` permission usage without a Data Safety entry
- Google Advertising ID direct read

Most findings here are `warning`/`info` — they're reminders to update your Data Safety form, not rejection reasons.

### 8. Policy

Umbrella for the Play policies that apply to specific app categories:

- **Families / COPPA**: apps declaring kids-under-13 audiences get stricter Data Safety requirements
- **Financial apps**: flagged package names (containing `finance`, `bank`, `loan`, `crypto`) prompt for SAFE form
- **Health apps**: flagged for medical device disclosure
- **UGC**: content-moderation reminder
- **Overlay permissions**: `SYSTEM_ALERT_WINDOW` triggers UGC-adjacent rules

These are **reminders**, not automatic rejections. But missing declarations in review delays your release.

### 9. Size

Measures the AAB's download size components and flags:

- Total download size above `maxDownloadSizeMb` threshold (default 150 MB) — **warning**
- Any single native lib > 40 MB — **warning**
- Asset budget breaches (custom `maxAssetMb` per directory)

Not a rejection scanner — Google Play accepts up to 200 MB base APK — but unreasonable size kills install conversion. Treat this as a product-quality signal.

## Severity model

| Severity     | Rejection risk                             | What to do                                                                    |
| ------------ | ------------------------------------------ | ----------------------------------------------------------------------------- |
| **critical** | Automatic rejection in review              | Fix before merging. Zero exceptions.                                          |
| **error**    | Likely rejection or extended review delay  | Fix or explicitly `severityOverride` after Play Console declaration approval. |
| **warning**  | May surface issues in review or at install | Review case-by-case. Often needs a Data Safety update, not a code fix.        |
| **info**     | Best-practice advisory                     | No action required. Reminders only.                                           |

CI default: fail on `error`+. The rationale: `warning` is too noisy for a hard gate (tracking SDKs + `cleartextTraffic` are ~normal for most apps), and `critical` alone is too permissive (you want to stop `QUERY_ALL_PACKAGES` before it ships).

## Tuning `.preflightrc.json`

Commit a `.preflightrc.json` to your repo root for project-specific tuning:

```json
{
  "failOn": "error",
  "targetSdkMinimum": 35,
  "maxDownloadSizeMb": 200,
  "allowedPermissions": [
    "android.permission.READ_SMS",
    "android.permission.ACCESS_BACKGROUND_LOCATION"
  ],
  "disabledRules": ["privacy-advertising-id-read"],
  "severityOverrides": {
    "billing-stripe-sdk": "info",
    "policy-finance-app-signal": "info"
  }
}
```

Common patterns:

**Approved restricted permissions.** After your Play Console declaration is approved, add the permission to `allowedPermissions`. The scanner stops flagging it but still runs every other rule.

**Legitimate non-Play billing.** If your app is a physical-goods marketplace, Stripe is fine. `severityOverrides.billing-stripe-sdk: "info"` silences the finding without disabling the scanner.

**Legacy `cleartextTraffic`.** Old apps migrating to HTTPS can temporarily `disabledRules: ["manifest-cleartext-traffic"]` while rolling out network security config per-domain.

**Stricter SDK floor.** Teams publishing new apps targeting 36+ can set `targetSdkMinimum: 36` and catch any dependency that drops below. GPC's default (35) tracks Google Play's current floor — override upward, not downward.

## CI patterns

### GitHub Actions: block the PR

```yaml
- name: Preflight
  run: |
    gpc preflight app.aab --fail-on error --json > preflight.json

- name: Upload report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: preflight-report
    path: preflight.json
```

The `if: always()` ensures the report uploads even when the scanner fails the build. Reviewers can click the artifact without re-running.

### Post findings as PR comments

```yaml
- name: Comment findings
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const report = require('./preflight.json');
      const errors = report.findings.filter(f => ['critical', 'error'].includes(f.severity));
      const body = errors.map(f =>
        `**${f.severity}** · ${f.ruleId}\n> ${f.message}`
      ).join('\n\n');
      github.rest.issues.createComment({
        ...context.repo,
        issue_number: context.issue.number,
        body: body || 'Preflight passed.'
      });
```

### Two-tier gate: strict on main, lenient on PRs

```yaml
- name: Preflight (strict on main)
  if: github.ref == 'refs/heads/main'
  run: gpc preflight app.aab --fail-on warning

- name: Preflight (lenient on PRs)
  if: github.ref != 'refs/heads/main'
  run: gpc preflight app.aab --fail-on error
```

### Fastlane lane

```ruby
lane :preflight do
  sh("gpc preflight app.aab --fail-on error --json > preflight.json")
rescue
  UI.user_error!("Preflight failed. See preflight.json.")
end

before_all do
  preflight
end
```

## What preflight cannot catch

Being honest about the tool's limits matters more than marketing. Preflight is **static analysis of the AAB**. It cannot catch:

- **Runtime policy violations.** If your app crashes on launch, shows unauthorized ads, or collects data it shouldn't at runtime, preflight won't see it.
- **Content policy.** Hate speech, misleading claims, impersonation. These are human-review categories.
- **Functional quality.** App doesn't work on half the devices, has broken core flows. Use the internal test track and real testers.
- **Store listing copy quality.** Metadata length checks pass even if the description is spam.
- **Obfuscated billing bypasses.** A determined developer using a non-Play billing SDK loaded dynamically will slip past the scanner.
- **Policy changes between scan and review.** Google's policies evolve. A clean scan today doesn't guarantee a clean review 6 months later.

Run preflight on every release. Keep internal testing and beta tracks. Read the monthly Google Play policy updates. Preflight reduces rejection risk significantly; it does not eliminate it.

## Related

- [`gpc preflight` command reference](/commands/preflight) — flags, subcommands, exit codes
- [CI/CD integration guide](/ci-cd/) — platform-specific recipes
- [Data Safety declaration workflow](/guide/developer-verification) — human steps preflight reminds you about
