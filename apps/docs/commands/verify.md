---
outline: deep
---

<CommandHeader
  name="gpc verify"
  description="Android developer verification status, signing key audit, and readiness checklist."
  usage="gpc verify [options]"
  :badges="['--json', '--open']"
/>

## Overview

Google is rolling out mandatory [developer verification](https://developer.android.com/developer-verification) for all Android apps on certified devices. Enforcement begins September 30, 2026 in Brazil, Indonesia, Singapore, and Thailand.

`gpc verify` shows your verification status with account-aware app info, signing key enrollment, and contextual action items. `gpc verify checklist` walks through every readiness step.

See the full [Developer Verification guide](/guide/developer-verification) for details on what's changing and what you need to do.

## Synopsis

```bash
gpc verify [options]
gpc verify checklist [options]
```

## Options

| Flag     | Type   | Description                                        |
| -------- | ------ | -------------------------------------------------- |
| `--open` | `flag` | Open the verification page in your default browser |
| `--json` | `flag` | Output as JSON                                     |

## Subcommands

### `gpc verify checklist`

Interactive readiness walkthrough. Auto-detects account access, bundle uploads, and Play App Signing enrollment. Prompts for manual steps (identity verification, auto-registration review, additional keys).

In non-interactive mode (CI, piped output, `--no-interactive`), all items are shown without prompts and a markdown report is printed.

## Examples

Show verification status with app info:

```bash
gpc verify
```

```
Android Developer Verification

  Status:   Enforcement begins September 30, 2026 (158 days, BR/ID/SG/TH)
  Account:  ci@project.iam.gserviceaccount.com
  App:      com.example.app
  Bundles:  12 (latest: v86)
  Signing:  Play App Signing enrolled

  Action items:
  - Run full readiness walkthrough → gpc verify checklist

  Resources:
  → https://developer.android.com/developer-verification
  → https://developer.android.com/developer-verification/guides/google-play-console
  → https://developer.android.com/developer-verification/faq
```

Run the readiness checklist:

```bash
gpc verify checklist
```

```
Developer Verification Checklist
  Answer Y/N for items we cannot auto-detect.

Have you completed identity verification in Play Console? [y/N]: y
Have you reviewed your auto-registration results in Play Console? [y/N]: y
Have you registered all additional signing keys used outside Play? [y/N]: n

Verification Readiness: 5/7

  ✓ Play Console account active
  ✓ Identity verification complete
  ✓ Auto-registration results reviewed
  ✓ App accessible via API
  ✓ Play App Signing enrolled
  ✗ At least one bundle uploaded
  ✗ Additional signing keys registered
```

Open the verification page in your browser:

```bash
gpc verify --open
```

Get verification info as JSON:

```bash
gpc verify --json
```

```json
{
  "enforcement": {
    "date": "2026-09-30",
    "daysRemaining": 158,
    "regions": ["Brazil", "Indonesia", "Singapore", "Thailand"],
    "active": false
  },
  "account": "ci@project.iam.gserviceaccount.com",
  "app": {
    "packageName": "com.example.app",
    "accessible": true,
    "bundleCount": 12,
    "latestVersionCode": 86,
    "playAppSigningEnrolled": true
  },
  "actionItems": [
    { "priority": "low", "title": "Run full readiness walkthrough", "command": "gpc verify checklist" }
  ],
  "resources": { "..." : "..." }
}
```

## Related

- [Developer Verification guide](/guide/developer-verification) — full explanation of the program, timeline, and requirements
- [`gpc doctor --verify`](/commands/utility#gpc-doctor) — signing key fingerprint comparison
- [`gpc preflight signing`](/commands/preflight#preflight-signing) — signing key consistency check across releases
