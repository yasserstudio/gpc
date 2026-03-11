# Recovery

Manage app recovery actions for your published apps.

## Commands

### `gpc recovery list`

List all recovery actions for the app.

```bash
gpc recovery list
gpc recovery list --output json
```

### `gpc recovery cancel <action-id>`

Cancel a pending recovery action.

```bash
gpc recovery cancel abc123
```

### `gpc recovery deploy <action-id>`

Deploy a recovery action to affected users.

```bash
gpc recovery deploy abc123
```

## Options

| Option     | Type     | Description            |
| ---------- | -------- | ---------------------- |
| `--output` | `string` | Output format          |
| `--app`    | `string` | App package name       |
