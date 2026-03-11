# Device Tiers

Manage device tier configurations for capability-based targeting.

## Commands

### `gpc device-tiers list`

List all device tier configurations.

```bash
gpc device-tiers list
gpc device-tiers list --output json
```

### `gpc device-tiers get <config-id>`

Get details of a specific device tier configuration.

```bash
gpc device-tiers get abc123
```

### `gpc device-tiers create --file <path>`

Create a new device tier configuration from a JSON file.

```bash
gpc device-tiers create --file tiers.json
```

## Options

| Option     | Type     | Description                |
| ---------- | -------- | -------------------------- |
| `--file`   | `string` | Path to JSON config file   |
| `--output` | `string` | Output format              |
| `--app`    | `string` | App package name           |
| `--limit`  | `number` | Maximum results to return  |
