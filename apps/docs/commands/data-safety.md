# Data Safety

Manage data safety declarations for your app's Play Store listing.

## Commands

### `gpc data-safety get`

View current data safety declarations.

```bash
gpc data-safety get
gpc data-safety get --output json
```

### `gpc data-safety update --file <path>`

Update data safety declarations from a JSON file.

```bash
gpc data-safety update --file safety.json
```

### `gpc data-safety export --dir <path>`

Export current declarations to a local file.

```bash
gpc data-safety export --dir ./metadata
```

## Options

| Option     | Type     | Description            |
| ---------- | -------- | ---------------------- |
| `--file`   | `string` | Path to JSON file      |
| `--dir`    | `string` | Export directory        |
| `--output` | `string` | Output format          |
| `--app`    | `string` | App package name       |
