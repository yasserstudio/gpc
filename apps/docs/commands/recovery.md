---
outline: deep
---

<CommandHeader
  name="gpc recovery"
  description="Manage app recovery actions to update published apps on user devices without a full release."
  usage="gpc recovery <subcommand> [options]"
  :badges="['--json', '--dry-run']"
/>

## Commands

| Command                                       | Description                                    |
| --------------------------------------------- | ---------------------------------------------- |
| [`recovery list`](#recovery-list)             | List all recovery actions for the app          |
| [`recovery cancel`](#recovery-cancel)         | Cancel a pending recovery action               |
| [`recovery deploy`](#recovery-deploy)         | Deploy a recovery action to affected users     |

## `recovery list`

List all recovery actions for the app, including their status, target version codes, and the number of affected users.

### Synopsis

```bash
gpc recovery list [options]
```

### Options

| Flag       | Short | Type     | Default | Description                        |
| ---------- | ----- | -------- | ------- | ---------------------------------- |
| `--app`    |       | `string` |         | App package name                   |
| `--json`   |       | `flag`   |         | Output as JSON                     |

### Example

```bash
gpc recovery list --app com.example.myapp
```

```
Recovery Actions

  Action ID      Status       Target Version   Affected Users   Created
  ─────────      ──────       ──────────────   ──────────────   ───────
  ra-001         PENDING      145              12,340           2026-03-10
  ra-002         DEPLOYED     142              8,920            2026-02-28
  ra-003         CANCELLED    140              3,100            2026-02-15

  3 recovery actions found
```

List with JSON output:

```bash
gpc recovery list --app com.example.myapp --json
```

```json
{
  "recoveryActions": [
    {
      "appRecoveryId": "ra-001",
      "status": "PENDING",
      "targeting": {
        "versionList": {
          "versionCodes": ["145"]
        },
        "allUsers": {
          "isAllUsersRequested": true
        }
      },
      "remoteInAppUpdateData": {
        "remoteAppUpdateDataPerBundle": [
          {
            "versionCode": "147",
            "recoveredDeviceCount": 0
          }
        ]
      },
      "createTime": "2026-03-10T14:22:00Z"
    }
  ]
}
```

---

## `recovery cancel`

Cancel a pending recovery action. Only actions with status `PENDING` can be cancelled. Once cancelled, the action will not be deployed to any users.

### Synopsis

```bash
gpc recovery cancel <action-id> [options]
```

### Options

| Flag       | Short | Type     | Default | Description                        |
| ---------- | ----- | -------- | ------- | ---------------------------------- |
| `--app`    |       | `string` |         | App package name                   |
| `--json`   |       | `flag`   |         | Output as JSON                     |

### Example

```bash
gpc recovery cancel ra-001 --app com.example.myapp
```

```
Recovery action cancelled
  Action ID: ra-001
  Status:    CANCELLED
```

---

## `recovery deploy`

Deploy a recovery action to push a fix to affected users. The recovery action must be in `PENDING` status and a newer version code must be available as the recovery target.

### Synopsis

```bash
gpc recovery deploy <action-id> [options]
```

### Options

| Flag       | Short | Type     | Default | Description                        |
| ---------- | ----- | -------- | ------- | ---------------------------------- |
| `--app`    |       | `string` |         | App package name                   |
| `--json`   |       | `flag`   |         | Output as JSON                     |

### Example

Deploy a recovery action:

```bash
gpc recovery deploy ra-001 --app com.example.myapp
```

```
Recovery action deployed
  Action ID:       ra-001
  Target version:  145
  Recovery build:  147
  Affected users:  12,340
  Status:          DEPLOYED
```

Deploy with JSON output:

```bash
gpc recovery deploy ra-001 --app com.example.myapp --json
```

```json
{
  "appRecoveryId": "ra-001",
  "status": "DEPLOYED",
  "targeting": {
    "versionList": {
      "versionCodes": ["145"]
    }
  },
  "remoteInAppUpdateData": {
    "remoteAppUpdateDataPerBundle": [
      {
        "versionCode": "147",
        "recoveredDeviceCount": 0
      }
    ]
  },
  "deployTime": "2026-03-12T11:05:00Z"
}
```

## Errors

| Code | Exit | Description                                                        |
| ---- | ---- | ------------------------------------------------------------------ |
| `RECOVERY_ACTION_NOT_FOUND`  | 4 | No recovery action exists with the specified ID       |
| `INVALID_ACTION_STATUS`      | 4 | The action is not in a valid state for the operation (e.g., deploying an already cancelled action) |
| `NO_RECOVERY_BUILD`          | 4 | No newer version code is available as a recovery target |
| `API_ERROR`                  | 4 | Google Play API rejected the request                  |

## Related

- [releases](./releases) -- Manage releases and track assignments
- [vitals](./vitals) -- Monitor crash rates and ANR data
