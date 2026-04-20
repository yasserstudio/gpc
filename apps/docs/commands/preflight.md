---
outline: deep
---

<CommandHeader
  name="gpc preflight"
  description="Pre-submission compliance scanner — check your AAB against Google Play policies before uploading. Entirely offline, no API calls."
  usage="gpc preflight <file> [options]"
  :badges="['--json', '--fail-on', 'offline']"
/>

## Overview

`gpc preflight` scans your Android App Bundle (AAB) against Google Play Developer Program Policies before you upload. It catches issues that would cause rejection — wrong target SDK, missing declarations, restricted permissions, hardcoded secrets — all without calling any API.

::: tip Want the architecture and per-scanner detail?
See the [Preflight Deep-Dive](/guide/preflight-deep-dive) guide — how the 9 scanners work, real rejection examples, CI patterns, and tuning recipes. This page is the flag reference.
:::

**9 scanners** run in parallel:

| Scanner         | What it checks                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **manifest**    | targetSdk, debuggable, testOnly, cleartext traffic, missing `exported`, foreground service types, exported-without-permission |
| **permissions** | 18 restricted permissions (SMS, call log, background location, photo/video, etc.)                                             |
| **native-libs** | 64-bit compliance, **16KB page size alignment** (ELF LOAD segment check, enforced since Nov 2025)                             |
| **metadata**    | Store listing character limits, missing title, screenshots, privacy policy URL                                                |
| **secrets**     | Hardcoded API keys (AWS, Google, Stripe, private keys)                                                                        |
| **billing**     | Non-Play billing SDKs (Stripe, Braintree, PayPal)                                                                             |
| **privacy**     | Tracking SDKs (Facebook, Adjust, AppsFlyer), Advertising ID, data collection                                                  |
| **policy**      | Families/COPPA, financial apps, health apps, UGC, overlay permissions                                                         |
| **size**        | Download size warnings, large native libs, large assets                                                                       |

## Commands

| Command                                           | Description                                      |
| ------------------------------------------------- | ------------------------------------------------ |
| [`preflight`](#gpc-preflight)                     | Run all scanners on an AAB file                  |
| [`preflight manifest`](#preflight-manifest)       | Manifest scanner only                            |
| [`preflight permissions`](#preflight-permissions) | Permissions scanner only                         |
| [`preflight metadata`](#preflight-metadata)       | Metadata/listing scanner only                    |
| [`preflight codescan`](#preflight-codescan)       | Source code scanners (secrets, billing, privacy) |

## `gpc preflight`

Run all applicable scanners on an AAB file.

### Synopsis

```bash
gpc preflight <file.aab> [options]
```

### Options

| Option                 | Description                                                                | Default             |
| ---------------------- | -------------------------------------------------------------------------- | ------------------- |
| `--fail-on <severity>` | Fail if any finding meets severity: `critical`, `error`, `warning`, `info` | `error`             |
| `--scanners <names>`   | Comma-separated scanner names to run                                       | all                 |
| `--metadata <dir>`     | Path to metadata directory (Fastlane format)                               | —                   |
| `--source <dir>`       | Path to source directory for code scanning                                 | —                   |
| `--config <path>`      | Path to `.preflightrc.json`                                                | `.preflightrc.json` |
| `--json`               | Output as JSON                                                             | —                   |

### Examples

```bash
# Full scan
gpc preflight app.aab

# Full scan with metadata and source
gpc preflight app.aab --metadata fastlane/metadata/android --source app/src

# CI mode — fail on any error or critical finding
gpc preflight app.aab --fail-on error --json

# Only run manifest and permissions checks
gpc preflight app.aab --scanners manifest,permissions

# Use custom config
gpc preflight app.aab --config .preflight-strict.json
```

### Exit Codes

| Code | Meaning                                                        |
| ---- | -------------------------------------------------------------- |
| `0`  | All checks passed                                              |
| `1`  | Runtime error (file not found, invalid AAB)                    |
| `2`  | Usage error (invalid flags, unknown scanner name)              |
| `6`  | Threshold breached (findings at or above `--fail-on` severity) |

## `preflight manifest`

Run only the manifest scanner.

```bash
gpc preflight manifest app.aab
```

Checks: targetSdkVersion, debuggable, testOnly, versionCode, cleartext traffic, missing `android:exported`, missing `foregroundServiceType`.

## `preflight permissions`

Run only the permissions scanner.

```bash
gpc preflight permissions app.aab
```

Checks 18 restricted permissions against Google Play policies and generates Data Safety reminders.

## `preflight metadata`

Scan a Fastlane-format metadata directory.

```bash
gpc preflight metadata fastlane/metadata/android
```

Checks: title/description character limits, missing title, screenshot count, privacy policy URL.

Expected directory structure:

```
metadata/android/
├── en-US/
│   ├── title.txt
│   ├── short_description.txt
│   ├── full_description.txt
│   ├── privacy_policy_url.txt
│   └── images/
│       └── phoneScreenshots/
│           ├── 1.png
│           └── 2.png
├── fr-FR/
│   └── ...
```

## `preflight codescan`

Run source code scanners (secrets, billing, privacy).

```bash
gpc preflight codescan app/src
```

Scans `.kt`, `.java`, `.ts`, `.js`, `.xml`, `.json`, `.gradle`, `.properties` files. Skips `node_modules/`, `build/`, `.git/`.

## Severity Levels

Findings are ranked by severity:

| Severity     | Meaning                                    | Example                                                      |
| ------------ | ------------------------------------------ | ------------------------------------------------------------ |
| **critical** | Will cause rejection                       | debuggable=true, missing 64-bit libs, hardcoded secrets      |
| **error**    | Likely causes rejection or extended review | QUERY_ALL_PACKAGES, missing exported, restricted permissions |
| **warning**  | May cause issues                           | cleartext traffic, large download size, tracking SDKs        |
| **info**     | Best practice                              | minSdk advisory, data safety reminders, size breakdown       |

## Configuration

Create a `.preflightrc.json` in your project root:

```json
{
  "failOn": "error",
  "targetSdkMinimum": 35,
  "maxDownloadSizeMb": 150,
  "allowedPermissions": ["android.permission.READ_SMS"],
  "disabledRules": ["cleartext-traffic"],
  "severityOverrides": {
    "billing-stripe-sdk": "info"
  }
}
```

| Field                | Type       | Description                                                |
| -------------------- | ---------- | ---------------------------------------------------------- |
| `failOn`             | `string`   | Severity threshold: `critical`, `error`, `warning`, `info` |
| `targetSdkMinimum`   | `number`   | Minimum required targetSdkVersion (default: 35)            |
| `maxDownloadSizeMb`  | `number`   | Download size warning threshold in MB (default: 150)       |
| `allowedPermissions` | `string[]` | Permissions to skip (e.g., approved via declaration form)  |
| `disabledRules`      | `string[]` | Rule IDs to suppress entirely                              |
| `severityOverrides`  | `object`   | Override severity for specific rule IDs                    |

## CI/CD Integration

### GitHub Actions

```yaml
- name: Preflight check
  run: gpc preflight app.aab --fail-on error --json > preflight.json

- name: Upload report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: preflight-report
    path: preflight.json
```

### GitLab CI

```yaml
preflight:
  stage: test
  script:
    - gpc preflight app.aab --fail-on error --json
  artifacts:
    paths:
      - preflight.json
    when: always
```

## Notes

### Manifest parsing limitations

Some large or complex AABs have manifests that cannot be fully decoded. When this happens, GPC does **not** crash — instead it:

1. Emits a **warning** finding: "Manifest could not be fully parsed"
2. **Skips** manifest-dependent scanners (manifest, permissions, policy, privacy)
3. **Runs** all other scanners normally (native-libs, size, secrets, billing)

You still get partial results. To run manifest checks, try the metadata scanner instead:

```bash
gpc preflight --metadata fastlane/metadata/android
```
