---
outline: deep
---

<CommandHeader
  name="gpc iap"
  description="Legacy in-app products command. Prefer gpc one-time-products and gpc subscriptions for new integrations."
  usage="gpc iap <subcommand> [options]"
  :badges="['--json', '--dry-run']"
/>

::: warning Legacy API
These commands use the older in-app products API. **For new products, use [`gpc otp`](./one-time-products) instead** — it provides richer features including regional pricing, product tags, and offer management.
:::

## Commands

| Command                           | Description                                         |
| --------------------------------- | --------------------------------------------------- |
| [`iap list`](#iap-list)           | List in-app products                                |
| [`iap get`](#iap-get)             | Get an in-app product by SKU                        |
| [`iap create`](#iap-create)       | Create an in-app product from JSON                  |
| [`iap update`](#iap-update)       | Update an in-app product from JSON                  |
| [`iap delete`](#iap-delete)       | Delete an in-app product                            |
| [`iap sync`](#iap-sync)           | Sync in-app products from a directory of JSON files |
| [`iap batch-get`](#iap-batch-get) | ~~Deprecated~~ — use `iap get` or `iap list`        |

## `iap list`

List all in-app products for the app.

### Synopsis

```bash
gpc iap list [options]
```

### Options

| Flag          | Short | Type     | Default | Description                  |
| ------------- | ----- | -------- | ------- | ---------------------------- |
| `--max`       |       | `number` |         | Maximum results per page     |
| `--limit`     |       | `number` |         | Maximum total results        |
| `--next-page` |       | `string` |         | Resume from pagination token |

### Example

```bash
gpc iap list --app com.example.myapp
```

```json
{
  "inappproduct": [
    {
      "sku": "coins_100",
      "status": "active",
      "purchaseType": "managedUser",
      "defaultPrice": { "priceMicros": "990000", "currency": "USD" },
      "listings": {
        "en-US": { "title": "100 Coins", "description": "A pack of 100 coins" }
      }
    }
  ]
}
```

Paginate results:

```bash
gpc iap list --app com.example.myapp --max 20 --next-page abc123
```

---

## `iap get`

Get details for a single in-app product by SKU.

### Synopsis

```bash
gpc iap get <sku>
```

### Options

No command-specific options.

### Example

```bash
gpc iap get coins_100 --app com.example.myapp
```

---

## `iap create`

Create a new in-app product from a JSON file.

### Synopsis

```bash
gpc iap create --file <path>
```

### Options

| Flag     | Short | Type     | Default        | Description                         |
| -------- | ----- | -------- | -------------- | ----------------------------------- |
| `--file` |       | `string` | **(required)** | Path to JSON file with product data |

### Example

Create the product JSON:

```json
{
  "sku": "coins_100",
  "status": "active",
  "purchaseType": "managedUser",
  "defaultPrice": {
    "priceMicros": "990000",
    "currency": "USD"
  },
  "listings": {
    "en-US": {
      "title": "100 Coins",
      "description": "A pack of 100 coins for in-game purchases."
    }
  },
  "defaultLanguage": "en-US"
}
```

Run the command:

```bash
gpc iap create --app com.example.myapp --file product.json
```

Preview without creating:

```bash
gpc iap create --app com.example.myapp --file product.json --dry-run
```

---

## `iap update`

Update an existing in-app product from a JSON file.

### Synopsis

```bash
gpc iap update <sku> --file <path>
```

### Options

| Flag     | Short | Type     | Default        | Description                         |
| -------- | ----- | -------- | -------------- | ----------------------------------- |
| `--file` |       | `string` | **(required)** | Path to JSON file with product data |

### Example

```bash
gpc iap update coins_100 \
  --app com.example.myapp \
  --file product-update.json
```

---

## `iap delete`

Delete an in-app product by SKU.

### Synopsis

```bash
gpc iap delete <sku>
```

### Options

No command-specific options.

### Example

```bash
gpc iap delete coins_100 --app com.example.myapp
```

Preview without deleting:

```bash
gpc iap delete coins_100 --app com.example.myapp --dry-run
```

---

## `iap sync`

Bulk sync in-app products from a directory of JSON files. Each JSON file defines one product. Products that exist are updated; missing ones are created.

### Synopsis

```bash
gpc iap sync --dir <path> [options]
```

### Options

| Flag        | Short | Type      | Default        | Description                             |
| ----------- | ----- | --------- | -------------- | --------------------------------------- |
| `--dir`     |       | `string`  | **(required)** | Directory containing product JSON files |
| `--dry-run` |       | `boolean` | `false`        | Preview changes without applying        |

### Example

Directory structure:

```
products/
  coins_100.json
  coins_500.json
  premium_unlock.json
```

Sync all products:

```bash
gpc iap sync --app com.example.myapp --dir ./products
```

Preview sync changes:

```bash
gpc iap sync --app com.example.myapp --dir ./products --dry-run
```

```
[dry-run] Would create: 1, update: 2
```

```json
{
  "created": 1,
  "updated": 2,
  "unchanged": 0,
  "errors": 0
}
```

---

## `iap batch-get`

::: danger Permanently Deprecated
The `inappproducts.batchGet` endpoint has been permanently blocked by Google. This command will exit immediately with an error.

Use `gpc iap get <sku>` to fetch a single product, or `gpc iap list` to list all products.
:::

```bash
gpc iap batch-get <sku> [<sku>...]
# Error: The inappproducts batchGet endpoint is permanently blocked by Google.
# Use `gpc iap get <sku>` or `gpc iap list` instead.
```

## Related

- [one-time-products](./one-time-products) -- Modern one-time products API (recommended for new products)
- [purchase-options](./purchase-options) -- Purchase option management
- [subscriptions](./subscriptions) -- Subscription products
- [purchases](./purchases) -- Purchase verification
- [pricing](./pricing) -- Regional price conversion
