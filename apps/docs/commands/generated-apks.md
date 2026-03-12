---
outline: deep
---

# generated-apks

List and download device-specific APKs generated from your app bundles. When you upload an AAB to Google Play, the platform generates split APKs optimized for specific device configurations. These commands let your QA team download and test those exact APKs on target devices.

## Commands

| Command                                                 | Description                                    |
| ------------------------------------------------------- | ---------------------------------------------- |
| [`generated-apks list`](#generated-apks-list)           | List generated APKs for a version code         |
| [`generated-apks download`](#generated-apks-download)   | Download a specific generated APK              |

## `generated-apks list`

List all generated APKs for a specific app bundle version code. Shows the variant ID, target configuration, and file size for each generated APK.

### Synopsis

```bash
gpc generated-apks list <version-code> [options]
```

### Options

| Flag       | Short | Type     | Default | Description                        |
| ---------- | ----- | -------- | ------- | ---------------------------------- |
| `--app`    |       | `string` |         | App package name                   |
| `--json`   |       | `flag`   |         | Output as JSON                     |

### Example

List APKs for version code 142:

```bash
gpc generated-apks list 142 --app com.example.myapp
```

```
Generated APKs for version 142

  Variant ID   ABI           Screen Density   Size
  ──────────   ───           ──────────────   ────
  apk-001      arm64-v8a     xxhdpi           12.4 MB
  apk-002      arm64-v8a     xhdpi            11.8 MB
  apk-003      armeabi-v7a   xxhdpi           10.2 MB
  apk-004      armeabi-v7a   xhdpi             9.7 MB
  apk-005      x86_64        xxhdpi           13.1 MB

  5 APKs generated
```

List with JSON output:

```bash
gpc generated-apks list 142 --app com.example.myapp --json
```

```json
{
  "generatedApks": [
    {
      "variantId": "apk-001",
      "generatedSplitApks": [
        {
          "downloadId": "dl-abc-001",
          "moduleName": "base",
          "splitId": "config.arm64_v8a",
          "variantId": "apk-001"
        },
        {
          "downloadId": "dl-abc-002",
          "moduleName": "base",
          "splitId": "config.xxhdpi",
          "variantId": "apk-001"
        }
      ],
      "generatedStandaloneApks": [],
      "generatedUniversalApk": {
        "downloadId": "dl-abc-010"
      }
    }
  ]
}
```

---

## `generated-apks download`

Download a specific generated APK by its download ID. Use `generated-apks list` first to find the download ID for the target device configuration.

### Synopsis

```bash
gpc generated-apks download <version-code> <download-id> [options]
```

### Options

| Flag       | Short | Type     | Default               | Description                        |
| ---------- | ----- | -------- | --------------------- | ---------------------------------- |
| `--output` | `-o`  | `string` | `./<download-id>.apk` | Output file path                   |
| `--app`    |       | `string` |                       | App package name                   |

### Example

Download a specific split APK:

```bash
gpc generated-apks download 142 dl-abc-001 \
  --app com.example.myapp \
  --output ./downloads/arm64-base.apk
```

```
Downloading dl-abc-001...
Saved to ./downloads/arm64-base.apk (12.4 MB)
```

Download the universal APK for broad testing:

```bash
gpc generated-apks download 142 dl-abc-010 \
  --app com.example.myapp \
  --output ./downloads/universal.apk
```

```
Downloading dl-abc-010...
Saved to ./downloads/universal.apk (28.6 MB)
```

## Errors

| Code | Exit | Description                                                        |
| ---- | ---- | ------------------------------------------------------------------ |
| `VERSION_CODE_NOT_FOUND`  | 4 | No bundle exists with the specified version code      |
| `DOWNLOAD_ID_NOT_FOUND`   | 4 | The download ID does not match any generated APK      |
| `BUNDLE_NOT_PROCESSED`    | 4 | The bundle is still being processed; try again later  |

## Related

- [releases](./releases) -- Manage releases and uploads
- [internal-sharing](./internal-sharing) -- Share builds without track management
- [device-tiers](./device-tiers) -- Device tier configurations for targeting
