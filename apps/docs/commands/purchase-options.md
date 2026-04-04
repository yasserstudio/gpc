---
outline: deep
---

<CommandHeader
  name="gpc purchase-options"
  description="Purchase option management (redirects to OTP commands)."
  usage="gpc purchase-options <subcommand> [options]"
  :badges="['redirect']"
/>

::: warning Redirected to OTP commands
The standalone `purchase-options` resource does not exist in the Google Play API. Purchase options are managed through one-time product offer paths. All `gpc purchase-options` commands redirect to the equivalent `gpc otp` commands.

For batch operations on purchase options, use:
- `gpc otp purchase-options batch-delete <product-id> --file <path>`
- `gpc otp purchase-options batch-update-states <product-id> --file <path>`
:::

## Commands

All commands below redirect to their `gpc otp offers` equivalents:

| Command                        | Redirects to                         |
| ------------------------------ | ------------------------------------ |
| `purchase-options list`        | `gpc otp offers list <product-id>`   |
| `purchase-options get <id>`    | `gpc otp offers get <product-id> <id>` |
| `purchase-options create`      | `gpc otp offers create <product-id>` |
| `purchase-options activate`    | `gpc otp offers activate ...`        |
| `purchase-options deactivate`  | `gpc otp offers deactivate ...`      |

## `purchase-options list`

List all purchase options for the app.

### Synopsis

```bash
gpc purchase-options list [options]
```

### Options

| Flag     | Short | Type     | Default | Description                                    |
| -------- | ----- | -------- | ------- | ---------------------------------------------- |
| `--sort` |       | `string` |         | Sort by field (prefix with `-` for descending) |

### Example

```bash
gpc purchase-options list --app com.example.myapp
```

---

## `purchase-options get`

Get details of a specific purchase option.

### Synopsis

```bash
gpc purchase-options get <id>
```

### Example

```bash
gpc purchase-options get po_launch_promo --app com.example.myapp
```

---

## `purchase-options create`

Create a new purchase option from a JSON file.

### Synopsis

```bash
gpc purchase-options create --file <path>
```

### Options

| Flag     | Short | Type     | Default        | Description                                 |
| -------- | ----- | -------- | -------------- | ------------------------------------------- |
| `--file` |       | `string` | **(required)** | Path to JSON file with purchase option data |

### Example

```bash
gpc purchase-options create \
  --app com.example.myapp \
  --file purchase-option.json
```

Preview without creating:

```bash
gpc purchase-options create \
  --app com.example.myapp \
  --file purchase-option.json \
  --dry-run
```

---

## `purchase-options activate`

Activate a purchase option so it becomes available to users.

### Synopsis

```bash
gpc purchase-options activate <id>
```

### Example

```bash
gpc purchase-options activate po_launch_promo --app com.example.myapp
```

Preview:

```bash
gpc purchase-options activate po_launch_promo --app com.example.myapp --dry-run
```

---

## `purchase-options deactivate`

Deactivate a purchase option. Users will no longer see it.

### Synopsis

```bash
gpc purchase-options deactivate <id>
```

### Example

```bash
gpc purchase-options deactivate po_launch_promo --app com.example.myapp
```

Preview:

```bash
gpc purchase-options deactivate po_launch_promo --app com.example.myapp --dry-run
```

## Related

- [one-time-products](./one-time-products) -- One-time product management (alias: `otp`)
- [subscriptions](./subscriptions) -- Subscription management
- [pricing](./pricing) -- Regional price conversion
