---
outline: deep
---

<CommandHeader
  name="gpc verify"
  description="Android developer verification status, deadlines, and resources."
  usage="gpc verify [options]"
  :badges="['--json', '--open']"
/>

## Overview

Google is rolling out mandatory [developer verification](https://developer.android.com/developer-verification) for all Android apps on certified devices. `gpc verify` shows your verification status, enforcement deadlines, and links to the right resources.

See the full [Developer Verification guide](/guide/developer-verification) for details on what's changing and what you need to do.

## Synopsis

```bash
gpc verify [options]
```

## Options

| Flag     | Type   | Description                                     |
| -------- | ------ | ----------------------------------------------- |
| `--open` | `flag` | Open the verification page in your default browser |
| `--json` | `flag` | Output as JSON                                  |

## Examples

Show verification status and resources:

```bash
gpc verify
```

```
Android Developer Verification

  Status:   Enforcement begins September 2026 (BR, ID, SG, TH)
  Account:  ci@project.iam.gserviceaccount.com
  Console:  Play Console (auto-registered for Play apps)

  What you need to do:
  1. Confirm identity verification in Play Console → Settings → Developer Account
  2. Check auto-registration results above your app list
  3. Register any non-Play apps within Play Console

  Resources:
  → https://developer.android.com/developer-verification
  → https://developer.android.com/developer-verification/guides/google-play-console
  → https://developer.android.com/developer-verification/guides/limited-distribution
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
    "date": "2026-09",
    "regions": ["Brazil", "Indonesia", "Singapore", "Thailand"],
    "active": false
  },
  "account": "ci@project.iam.gserviceaccount.com",
  "resources": {
    "overview": "https://developer.android.com/developer-verification",
    "playConsole": "https://developer.android.com/developer-verification/guides/google-play-console",
    "androidConsole": "https://developer.android.com/developer-verification/guides/android-developer-console",
    "limitedDistribution": "https://developer.android.com/developer-verification/guides/limited-distribution"
  }
}
```

## Related

- [Developer Verification guide](/guide/developer-verification) — full explanation of the program, timeline, and requirements
- [`gpc doctor`](/commands/utility#gpc-doctor) — includes a verification deadline check
- [`gpc preflight`](/commands/preflight) — shows verification reminder after scan results
