# Generated APKs

Download device-specific APKs generated from your app bundles. Useful for QA testing on specific device configurations.

## Commands

### `gpc generated-apks list <version-code>`

List all generated APKs for a specific version code.

```bash
gpc generated-apks list 142
gpc generated-apks list 142 --output json
```

### `gpc generated-apks download <version-code> <apk-id>`

Download a specific generated APK.

```bash
gpc generated-apks download 142 abc123 --output ./downloads/device.apk
```

## Options

| Option     | Type     | Description             |
| ---------- | -------- | ----------------------- |
| `--output` | `string` | Output path or format   |
| `--app`    | `string` | App package name        |
