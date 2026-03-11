# Internal Sharing

Upload builds for review-free internal distribution. Useful for QA teams testing builds without track management.

## Commands

### `gpc internal-sharing upload <file>`

Upload an AAB or APK for internal sharing.

```bash
gpc internal-sharing upload app.aab
gpc internal-sharing upload app.apk --type apk
```

The file type is auto-detected from the extension. Use `--type` to override.

## Options

| Option     | Type     | Description                      |
| ---------- | -------- | -------------------------------- |
| `--type`   | `string` | File type: `bundle` or `apk`    |
| `--output` | `string` | Output format                    |
| `--app`    | `string` | App package name                 |
