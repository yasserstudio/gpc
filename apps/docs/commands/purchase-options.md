---
outline: deep
---

<CommandHeader
  name="gpc purchase-options"
  description="Manage purchase options for one-time products."
  usage="gpc purchase-options <subcommand> [options]"
  :badges="['--json', '--dry-run']"
/>

::: info Relationship to one-time-products
Purchase options are part of the modern monetization API. They define how a one-time product can be purchased (pricing phases, eligibility, regional overrides). Use [`gpc otp`](./one-time-products) to manage the products themselves, and `gpc purchase-options` to manage the purchase options attached to them.
:::

## Commands

| Command                                                       | Description                  |
| ------------------------------------------------------------- | ---------------------------- |
| [`purchase-options list`](#purchase-options-list)             | List purchase options        |
| [`purchase-options get`](#purchase-options-get)               | Get a purchase option        |
| [`purchase-options create`](#purchase-options-create)         | Create a purchase option     |
| [`purchase-options activate`](#purchase-options-activate)     | Activate a purchase option   |
| [`purchase-options deactivate`](#purchase-options-deactivate) | Deactivate a purchase option |

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
