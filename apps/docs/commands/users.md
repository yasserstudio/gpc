---
outline: deep
---

<CommandHeader
  name="gpc users"
  description="Manage developer account users, permissions, and grants."
  usage="gpc users <subcommand> [options]"
  :badges="['--json', '--dry-run', '--developer-id']"
/>

::: warning Permission Propagation
Permission changes can take up to 48 hours to propagate across Google Play systems. All mutation commands display this warning.
:::

## Commands

| Command                         | Description                              |
| ------------------------------- | ---------------------------------------- |
| [`users list`](#users-list)     | List all users in the developer account  |
| [`users get`](#users-get)       | Get user details                         |
| [`users invite`](#users-invite) | Invite a user to the developer account   |
| [`users update`](#users-update) | Update user permissions                  |
| [`users remove`](#users-remove) | Remove a user from the developer account |

## Developer Account ID

All user commands require a developer account ID. Provide it via:

1. `--developer-id <id>` flag on the `users` parent command
2. `GPC_DEVELOPER_ID` environment variable
3. `developerId` in `.gpcrc.json` config file

```bash
# Flag
gpc users list --developer-id 1234567890

# Environment variable
export GPC_DEVELOPER_ID=1234567890
gpc users list

# Config file
gpc config set developerId 1234567890
gpc users list
```

## `users list`

List all users in the developer account.

### Synopsis

```bash
gpc users list [options]
```

### Options

| Flag             | Short | Type     | Default | Description                                      |
| ---------------- | ----- | -------- | ------- | ------------------------------------------------ |
| `--developer-id` |       | `string` |         | Developer account ID (on parent `users` command) |
| `--limit`        |       | `number` |         | Maximum total results                            |
| `--next-page`    |       | `string` |         | Resume from pagination token                     |

### Example

```bash
gpc users list --developer-id 1234567890
```

```json
{
  "users": [
    {
      "email": "admin@example.com",
      "developerAccountPermissions": ["ADMIN"],
      "name": "Admin User"
    },
    {
      "email": "reviewer@example.com",
      "developerAccountPermissions": ["CAN_REPLY_TO_REVIEWS"],
      "grants": [
        {
          "packageName": "com.example.myapp",
          "appLevelPermissions": ["CAN_MANAGE_PUBLIC_LISTING", "CAN_REPLY_TO_REVIEWS"]
        }
      ]
    }
  ]
}
```

---

## `users get`

Get detailed information about a specific user.

### Synopsis

```bash
gpc users get <email>
```

### Options

| Flag             | Short | Type     | Default | Description                                      |
| ---------------- | ----- | -------- | ------- | ------------------------------------------------ |
| `--developer-id` |       | `string` |         | Developer account ID (on parent `users` command) |

### Example

```bash
gpc users get reviewer@example.com --developer-id 1234567890
```

---

## `users invite`

Invite a new user to the developer account with specified permissions.

### Synopsis

```bash
gpc users invite <email> [options]
```

### Options

| Flag             | Short | Type       | Default | Description                                            |
| ---------------- | ----- | ---------- | ------- | ------------------------------------------------------ |
| `--developer-id` |       | `string`   |         | Developer account ID (on parent `users` command)       |
| `--role`         |       | `string[]` |         | Developer-level permissions (space-separated)          |
| `--grant`        |       | `string[]` |         | Per-app grants (format: `com.example.app:PERM1,PERM2`) |

Available developer-level permissions: `ADMIN`, `CAN_VIEW_FINANCIAL_DATA`, `CAN_MANAGE_PERMISSIONS`, `CAN_REPLY_TO_REVIEWS`, `CAN_MANAGE_PUBLIC_LISTING`, `CAN_MANAGE_TRACK_USERS`, `CAN_MANAGE_TRACK_CONFIGURATION`, `CAN_VIEW_NON_FINANCIAL_DATA`.

### Example

Invite with developer-level roles:

```bash
gpc users invite user@example.com \
  --developer-id 1234567890 \
  --role ADMIN CAN_VIEW_FINANCIAL_DATA
```

Invite with per-app grants:

```bash
gpc users invite user@example.com \
  --developer-id 1234567890 \
  --grant "com.example.myapp:CAN_MANAGE_PUBLIC_LISTING,CAN_REPLY_TO_REVIEWS"
```

Invite with both roles and grants:

```bash
gpc users invite user@example.com \
  --developer-id 1234567890 \
  --role CAN_VIEW_FINANCIAL_DATA \
  --grant "com.example.app1:CAN_MANAGE_PUBLIC_LISTING" \
  --grant "com.example.app2:CAN_REPLY_TO_REVIEWS"
```

Preview without sending:

```bash
gpc users invite user@example.com \
  --developer-id 1234567890 \
  --role ADMIN \
  --dry-run
```

---

## `users update`

Update permissions for an existing user.

### Synopsis

```bash
gpc users update <email> [options]
```

### Options

| Flag             | Short | Type       | Default | Description                                            |
| ---------------- | ----- | ---------- | ------- | ------------------------------------------------------ |
| `--developer-id` |       | `string`   |         | Developer account ID (on parent `users` command)       |
| `--role`         |       | `string[]` |         | Developer-level permissions (space-separated)          |
| `--grant`        |       | `string[]` |         | Per-app grants (format: `com.example.app:PERM1,PERM2`) |

### Example

Update developer-level permissions:

```bash
gpc users update user@example.com \
  --developer-id 1234567890 \
  --role CAN_VIEW_FINANCIAL_DATA CAN_REPLY_TO_REVIEWS
```

Update per-app grants:

```bash
gpc users update user@example.com \
  --developer-id 1234567890 \
  --grant "com.example.myapp:CAN_MANAGE_PUBLIC_LISTING,CAN_MANAGE_TRACK_USERS"
```

---

## `users remove`

Remove a user from the developer account.

### Synopsis

```bash
gpc users remove <email>
```

### Options

| Flag             | Short | Type     | Default | Description                                      |
| ---------------- | ----- | -------- | ------- | ------------------------------------------------ |
| `--developer-id` |       | `string` |         | Developer account ID (on parent `users` command) |

### Example

```bash
gpc users remove user@example.com --developer-id 1234567890
```

Preview without removing:

```bash
gpc users remove user@example.com --developer-id 1234567890 --dry-run
```

## Related

- [testers](./testers) -- Tester management by track
- [auth](./auth) -- Authentication and profiles
