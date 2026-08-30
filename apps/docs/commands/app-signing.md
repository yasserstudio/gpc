---
outline: deep
---

<CommandHeader
  name="gpc app-signing"
  description="Enroll an app in Play App Signing with a self-hosted Google Cloud KMS key, and rotate that key."
  usage="gpc app-signing <subcommand> [options]"
  :badges="['--json', '--dry-run', 'advanced']"
/>

::: danger Do not use this for standard Play App Signing
Standard enrollment with Google-generated or Google-managed keys **cannot be done via API**. Set it up in Play Console instead.

This advanced API is strictly for enterprise organizations with mandatory compliance, regulatory, or policy requirements to retain key custody in an external Google Cloud KMS instance. Google's own documentation carries the same warning on `appSigning.enrollApp`.

See [Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756) in the Play Console Help Center.
:::

## Prerequisites

- An **active Google Cloud KMS key** (a specific `cryptoKeyVersion`), correctly configured for Android app signing.
- **IAM permissions granted to Google Play** on that key: Decrypt and Sign. Grant them before calling either subcommand — Google validates this server-side and the call fails otherwise.
- For `rotate`, the app must already be enrolled with a self-hosted Cloud KMS key, and you need a **signing certificate lineage** file as proof of rotation. Produce it with [`apksigner rotate`](https://developer.android.com/studio/command-line/apksigner#rotate_signing_keys_2).

Both subcommands print the warning above before sending anything. The confirmation prompt only appears in an interactive terminal: as with every other mutating GPC command, there is no prompt under CI, a non-TTY, `--no-interactive`, `GPC_NO_INTERACTIVE`, or the global `--yes`, and the call proceeds. Gate it in your pipeline yourself if you need a human in the loop.

## Commands

| Command                                     | Description                                        |
| ------------------------------------------- | -------------------------------------------------- |
| [`app-signing enroll`](#app-signing-enroll) | Enroll an app using a self-hosted Cloud KMS key    |
| [`app-signing rotate`](#app-signing-rotate) | Rotate the signing key of a self-hosted enrollment |

## `app-signing enroll`

Enrolls an app in Play App Signing using a self-hosted Cloud KMS key.

Pick exactly one mode:

- `--new-app` — the app has **not** been published to Open testing or Production. Google requires the certificate associated with the Cloud KMS key, so `--cert` is mandatory here.
- `--existing-app` — the app is already published. Only the key is sent.

### Synopsis

```bash
gpc app-signing enroll --kms-key <resource-name> (--new-app | --existing-app) [options]
```

### Options

| Flag             | Type     | Default | Description                                                       |
| ---------------- | -------- | ------- | ----------------------------------------------------------------- |
| `--kms-key`      | `string` |         | Cloud KMS `cryptoKeyVersion` resource name (required)             |
| `--new-app`      | `flag`   |         | App not yet published to Open testing or Production               |
| `--existing-app` | `flag`   |         | App already published                                             |
| `--cert`         | `path`   |         | PEM certificate for the Cloud KMS key (required with `--new-app`) |
| `--upload-cert`  | `path`   |         | PEM certificate for the upload key (optional)                     |
| `--app`          | `string` |         | App package name (global)                                         |
| `--yes`          | `flag`   |         | Skip the confirmation prompt (global)                             |
| `--dry-run`      | `flag`   |         | Preview the request without sending it (global)                   |
| `--json`         | `flag`   |         | Output as JSON (global)                                           |

The `--kms-key` value is the full resource name:

```
projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
```

### Examples

Enroll an app that is already published:

```bash
gpc app-signing enroll \
  --app com.example.app \
  --existing-app \
  --kms-key projects/acme/locations/global/keyRings/play/cryptoKeys/signing/cryptoKeyVersions/1
```

Enroll an app that has not reached Open testing or Production, and register an upload key at the same time:

```bash
gpc app-signing enroll \
  --app com.example.app \
  --new-app \
  --kms-key projects/acme/locations/global/keyRings/play/cryptoKeys/signing/cryptoKeyVersions/1 \
  --cert ./signing-cert.pem \
  --upload-cert ./upload-cert.pem \
  --yes
```

JSON output returns the certificate hashes Play recorded:

```json
{
  "signingCertificate": {
    "certificateHashMd5": "43:51:43:A1:B5:FC:8B:B7:0A:3A:A9:B1:0F:66:73:A8",
    "certificateHashSha1": "86:61:97:1A:D5:EF:E5:74:1E:A7:5B:84:7C:68:37:65:CD:94:16:DE",
    "certificateHashSha256": "94:49:C7:F3:A9:3C:F0:C5:5A:67:5D:DF:1C:83:73:2D:87:D5:62:55:E7:0B:15:0D:9E:6F:3C:F8:63:BB:7F:C1"
  },
  "uploadCertificate": {
    "certificateHashSha256": "3C:1B:0F:..."
  }
}
```

`uploadCertificate` is returned only when `--upload-cert` was supplied.

## `app-signing rotate`

Rotates an app's signing key to a new self-hosted Cloud KMS key.

::: warning Self-hosted enrollments only
This applies only to apps enrolled with self-hosted Cloud KMS keys. For standard Google-managed Play App Signing, key rotation must be requested through the Play Console UI.
:::

### Synopsis

```bash
gpc app-signing rotate --kms-key <resource-name> --cert <pem> --lineage <file> --reason <reason>
```

### Options

| Flag        | Type     | Default | Description                                                    |
| ----------- | -------- | ------- | -------------------------------------------------------------- |
| `--kms-key` | `string` |         | New Cloud KMS `cryptoKeyVersion` resource name (required)      |
| `--cert`    | `path`   |         | PEM certificate for the new Cloud KMS key (required)           |
| `--lineage` | `path`   |         | Signing certificate lineage file, proof of rotation (required) |
| `--reason`  | `enum`   |         | Rotation reason (required)                                     |
| `--app`     | `string` |         | App package name (global)                                      |
| `--yes`     | `flag`   |         | Skip the confirmation prompt (global)                          |
| `--dry-run` | `flag`   |         | Preview the request without sending it (global)                |
| `--json`    | `flag`   |         | Output as JSON (global)                                        |

### Rotation reasons

| Value                            | Meaning                         |
| -------------------------------- | ------------------------------- |
| `COMPROMISED_KEY`                | Key is compromised              |
| `USE_STRONGER_KEY`               | A stronger key is required      |
| `USE_SAME_KEY_FOR_MULTIPLE_APPS` | Same key used for multiple apps |
| `ROUTINE_KEY_UPGRADE`            | Routine key upgrade             |
| `OTHER`                          | Other reason                    |

Values are case-insensitive and accept dashes, so `--reason routine-key-upgrade` works. Google's `KEY_ROTATION_REASON_UNSPECIFIED` cannot be used and is rejected before the request is sent.

### Example

```bash
gpc app-signing rotate \
  --app com.example.app \
  --kms-key projects/acme/locations/global/keyRings/play/cryptoKeys/signing/cryptoKeyVersions/2 \
  --cert ./new-signing-cert.pem \
  --lineage ./lineage.bin \
  --reason ROUTINE_KEY_UPGRADE \
  --yes
```

```json
{
  "rotatedKeyCertificate": {
    "certificateHashSha256": "94:49:C7:F3:..."
  }
}
```

## Errors

| Situation                                         | What GPC does                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| Neither or both of `--new-app` / `--existing-app` | Usage error (exit 2), nothing sent                                 |
| `--new-app` without `--cert`                      | Usage error (exit 2) — Google requires the certificate             |
| Unknown `--reason`                                | Usage error (exit 2) with the accepted values                      |
| Missing or empty certificate / lineage file       | Usage error (exit 2) naming the flag                               |
| A private key passed to any file flag             | Usage error (exit 2), nothing sent — keys never leave your machine |
| Cloud KMS key missing Play's IAM grants           | Play API error (exit 4) with Google's message                      |

## See also

- [`gpc enterprise`](./enterprise) — Managed Google Play private app publishing
- [Play App Signing Help Center](https://support.google.com/googleplay/android-developer/answer/9842756)
