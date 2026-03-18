---
outline: deep
---

<CommandHeader
  name="gpc internal-sharing"
  description="Upload builds for review-free internal distribution — share with testers without going through the review process."
  usage="gpc internal-sharing <subcommand> [options]"
  :badges="['--json', '--dry-run']"
/>

## Commands

| Command                                               | Description                               |
| ----------------------------------------------------- | ----------------------------------------- |
| [`internal-sharing upload`](#internal-sharing-upload) | Upload an AAB or APK for internal sharing |

## `internal-sharing upload`

Upload an AAB or APK file for internal sharing. Returns a download URL that can be shared with testers who have access to the app. The file type is auto-detected from the extension; use `--type` to override.

### Synopsis

```bash
gpc internal-sharing upload <file> [options]
```

### Options

| Flag     | Short | Type     | Default     | Description                        |
| -------- | ----- | -------- | ----------- | ---------------------------------- |
| `--type` | `-t`  | `string` | auto-detect | File type: `bundle` (AAB) or `apk` |
| `--app`  |       | `string` |             | App package name                   |
| `--json` |       | `flag`   |             | Output as JSON                     |

### Example

Upload an AAB for internal sharing:

```bash
gpc internal-sharing upload app-release.aab --app com.example.myapp
```

```
Uploading app-release.aab (24.3 MB)...

Upload complete
  Download URL: https://play.google.com/apps/internaltest/com.example.myapp/...
  SHA-256:      a1b2c3d4e5f6...
  Version code: 143

Share this URL with testers who have internal app sharing enabled.
```

Upload an APK with explicit type:

```bash
gpc internal-sharing upload debug-build.apk \
  --app com.example.myapp \
  --type apk
```

```
Uploading debug-build.apk (18.7 MB)...

Upload complete
  Download URL: https://play.google.com/apps/internaltest/com.example.myapp/...
  SHA-256:      f6e5d4c3b2a1...
  Version code: 143
```

JSON output for CI pipelines:

```bash
gpc internal-sharing upload app-release.aab \
  --app com.example.myapp \
  --json
```

```json
{
  "downloadUrl": "https://play.google.com/apps/internaltest/com.example.myapp/4a5b6c7d8e9f",
  "certificateFingerprint": "SHA256:A1:B2:C3:D4:E5:F6:...",
  "sha256": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "versionCode": "143"
}
```

::: tip
Internal app sharing must be enabled in the Google Play Console under **Settings > Internal app sharing** before uploads will work. Testers must also opt in on their device.
:::

## Errors

| Code                        | Exit | Description                                                       |
| --------------------------- | ---- | ----------------------------------------------------------------- |
| `UPLOAD_QUOTA_EXCEEDED`     | 4    | Too many internal sharing uploads in the time window              |
| `FILE_TOO_LARGE`            | 2    | The file exceeds the maximum upload size (150 MB AAB, 100 MB APK) |
| `INVALID_BUNDLE`            | 2    | The AAB or APK is malformed or unsigned                           |
| `INTERNAL_SHARING_DISABLED` | 4    | Internal app sharing is not enabled for this app                  |

## Related

- [releases](./releases) -- Formal track-based release management
- [generated-apks](./generated-apks) -- Download device-specific APKs from bundles
