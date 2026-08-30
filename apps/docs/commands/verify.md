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

The checklist also carries dated policy items you cannot auto-detect: the September 30, 2026 verification enforcement start, the July 15, 2026 app registration mandate, the February 2027 [memory quality requirements](/guide/preflight-deep-dive#play-quality-requirements-landing-in-2027), and the April 2027 Zero-Tap Sign-In requirement (Android Restore Credentials API, games currently exempt).

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
Have you reviewed the September 30, 2026 enforcement timeline (Brazil, Indonesia, Singapore, Thailand)? [y/N]: y
Have you reviewed your auto-registration results in Play Console? [y/N]: y
Is every app on your account registered in Play Console? [y/N]: n
Have you reviewed the February 2027 memory and DEX optimization quality requirements? [y/N]: n
Does your sign-in flow implement the Android Restore Credentials API (Zero-Tap Sign-In)? [y/N]: n
Have you registered all additional signing keys used outside Play? [y/N]: n

Verification Readiness: 6/11

  ✓ Play Console account active
  ✓ Identity verification complete
  ✓ Verification enforcement timeline reviewed
  ✓ Auto-registration results reviewed
  ✗ All Play apps registered in Play Console
  ✗ Memory quality requirements reviewed
  ✗ Zero-Tap Sign-In (Restore Credentials API) implemented
  ✓ App accessible via API
  ✗ At least one bundle uploaded
  ✓ Play App Signing enrolled
  ✗ Additional signing keys registered
```

Each item shows one of three states. `✓` means done, `✗` means action needed, and `?` means GPC cannot detect it and you did not answer for it. Manual items only ever become `✓` or `✗` when you answer their prompt, so with `--no-interactive`, `--json`, or in CI they stay at `?`.

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
    {
      "priority": "low",
      "title": "Run full readiness walkthrough",
      "command": "gpc verify checklist"
    }
  ],
  "resources": { "...": "..." }
}
```

## Related

- [Developer Verification guide](/guide/developer-verification) — full explanation of the program, timeline, and requirements
- [`gpc doctor --verify`](/commands/utility#gpc-doctor) — signing key fingerprint comparison
- [`gpc preflight signing`](/commands/preflight#preflight-signing) — signing key consistency check across releases
