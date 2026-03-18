# gpc grants

Manage per-app permission grants for developer account users. Grants control which users can perform specific actions on specific apps, independent of their global account role.

## Synopsis

```sh
gpc grants [--developer-id <id>] <subcommand>
```

## Subcommands

### `grants list <email>`

List all per-app grants for a user.

```sh
gpc grants list user@example.com
gpc grants list user@example.com --developer-id 123456789
```

### `grants create <email>`

Grant app-level permissions to a user.

```sh
gpc grants create user@example.com \
  --package com.example.app \
  --permissions CAN_MANAGE_RELEASES,VIEW_APP_INFORMATION
```

**Options:**

| Option | Description |
|--------|-------------|
| `--package <name>` | App package name (required) |
| `--permissions <list>` | Comma-separated permission names (required) |

**Available permissions:**

- `CAN_ACCESS_ALL_ORDERS_AND_SUBSCRIPTIONS`
- `CAN_MANAGE_RELEASES`
- `CAN_MANAGE_STORE_LISTING`
- `CAN_MANAGE_USERS`
- `CAN_REPLY_TO_REVIEWS`
- `CAN_VIEW_APP_QUALITY`
- `VIEW_APP_INFORMATION`
- `VIEW_FINANCIAL_DATA`

### `grants update <email>`

Update app-level permissions for a user.

```sh
gpc grants update user@example.com \
  --package com.example.app \
  --permissions CAN_MANAGE_RELEASES,CAN_REPLY_TO_REVIEWS
```

### `grants delete <email>`

Remove a per-app grant from a user. Prompts for confirmation.

```sh
gpc grants delete user@example.com --package com.example.app
```

## Global Options

| Option | Description |
|--------|-------------|
| `--developer-id <id>` | Developer account ID (overrides config) |

## See Also

- [`gpc users`](/commands/users) — manage account-level users
