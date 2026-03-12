---
outline: deep
---

# subscriptions

Manage subscriptions, base plans, and subscription offers.

## Commands

| Command                                                                               | Description                     |
| ------------------------------------------------------------------------------------- | ------------------------------- |
| [`subscriptions list`](#subscriptions-list)                                           | List subscriptions              |
| [`subscriptions get`](#subscriptions-get)                                             | Get a subscription              |
| [`subscriptions create`](#subscriptions-create)                                       | Create a subscription from JSON |
| [`subscriptions update`](#subscriptions-update)                                       | Update a subscription from JSON |
| [`subscriptions delete`](#subscriptions-delete)                                       | Delete a subscription           |
| [`subscriptions base-plans activate`](#subscriptions-base-plans-activate)             | Activate a base plan            |
| [`subscriptions base-plans deactivate`](#subscriptions-base-plans-deactivate)         | Deactivate a base plan          |
| [`subscriptions base-plans delete`](#subscriptions-base-plans-delete)                 | Delete a base plan              |
| [`subscriptions base-plans migrate-prices`](#subscriptions-base-plans-migrate-prices) | Migrate base plan prices        |
| [`subscriptions offers list`](#subscriptions-offers-list)                             | List offers for a base plan     |
| [`subscriptions offers get`](#subscriptions-offers-get)                               | Get an offer                    |
| [`subscriptions offers create`](#subscriptions-offers-create)                         | Create an offer from JSON       |
| [`subscriptions offers update`](#subscriptions-offers-update)                         | Update an offer from JSON       |
| [`subscriptions offers delete`](#subscriptions-offers-delete)                         | Delete an offer                 |
| [`subscriptions offers activate`](#subscriptions-offers-activate)                     | Activate an offer               |
| [`subscriptions offers deactivate`](#subscriptions-offers-deactivate)                 | Deactivate an offer             |

## `subscriptions list`

List all subscriptions for the app.

### Synopsis

```bash
gpc subscriptions list [options]
```

### Options

| Flag           | Short | Type     | Default | Description               |
| -------------- | ----- | -------- | ------- | ------------------------- |
| `--page-size`  |       | `number` |         | Results per page          |
| `--page-token` |       | `string` |         | Page token for pagination |
| `--limit`      |       | `number` |         | Maximum total results     |
| `--next-page`  |       | `string` |         | Resume from page token    |

### Example

```bash
gpc subscriptions list --app com.example.myapp
```

```json
{
  "subscriptions": [
    {
      "productId": "premium_monthly",
      "basePlans": [
        {
          "basePlanId": "p1m",
          "state": "ACTIVE",
          "autoRenewingBasePlanType": {
            "billingPeriodDuration": "P1M"
          }
        }
      ]
    }
  ]
}
```

Paginate:

```bash
gpc subscriptions list --app com.example.myapp --page-size 10 --next-page abc123
```

---

## `subscriptions get`

Get details for a single subscription by product ID.

### Synopsis

```bash
gpc subscriptions get <product-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions get premium_monthly --app com.example.myapp
```

---

## `subscriptions create`

Create a new subscription from a JSON file.

### Synopsis

```bash
gpc subscriptions create --file <path>
```

### Options

| Flag         | Short | Type      | Default        | Description                                  |
| ------------ | ----- | --------- | -------------- | -------------------------------------------- |
| `--file`     |       | `string`  | **(required)** | Path to JSON file with subscription data     |
| `--activate` |       | `boolean` | `false`        | Activate all base plans after creation       |

The `--activate` flag creates the subscription and then activates all draft base plans in a single step, so you don't need a separate `subscriptions base-plans activate` call.

Client-side validation runs before the API call: the subscription JSON is checked for required fields, and `prorationMode` values are auto-fixed if they lack the expected prefix.

### Example

Create the JSON file:

```json
{
  "productId": "premium_monthly",
  "listings": {
    "en-US": {
      "title": "Premium Monthly",
      "description": "Full access to all premium features, billed monthly."
    }
  },
  "basePlans": [
    {
      "basePlanId": "p1m",
      "autoRenewingBasePlanType": {
        "billingPeriodDuration": "P1M"
      },
      "regionalConfigs": [
        {
          "regionCode": "US",
          "price": { "currencyCode": "USD", "units": "9", "nanos": 990000000 }
        }
      ],
      "state": "ACTIVE"
    }
  ]
}
```

Run the command:

```bash
gpc subscriptions create \
  --app com.example.myapp \
  --file subscription.json
```

Create and activate base plans in one step:

```bash
gpc subscriptions create \
  --app com.example.myapp \
  --file subscription.json \
  --activate
```

Preview without creating:

```bash
gpc subscriptions create --file subscription.json --dry-run
```

---

## `subscriptions update`

Update an existing subscription from a JSON file.

### Synopsis

```bash
gpc subscriptions update <product-id> --file <path> [options]
```

### Options

| Flag            | Short | Type     | Default        | Description                                             |
| --------------- | ----- | -------- | -------------- | ------------------------------------------------------- |
| `--file`        |       | `string` | **(required)** | Path to JSON file with subscription data                |
| `--update-mask` |       | `string` |                | Comma-separated field mask (e.g., `listings,basePlans`) |

### Example

```bash
gpc subscriptions update premium_monthly \
  --app com.example.myapp \
  --file subscription-update.json \
  --update-mask listings
```

---

## `subscriptions delete`

Delete a subscription. The subscription must have no active base plans.

### Synopsis

```bash
gpc subscriptions delete <product-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions delete premium_monthly --app com.example.myapp
```

---

## `subscriptions base-plans activate`

Activate a base plan for a subscription.

### Synopsis

```bash
gpc subscriptions base-plans activate <product-id> <base-plan-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions base-plans activate premium_monthly p1m \
  --app com.example.myapp
```

---

## `subscriptions base-plans deactivate`

Deactivate a base plan. Existing subscribers keep their plan until expiry.

### Synopsis

```bash
gpc subscriptions base-plans deactivate <product-id> <base-plan-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions base-plans deactivate premium_monthly p1m \
  --app com.example.myapp
```

---

## `subscriptions base-plans delete`

Delete a base plan. The base plan must be deactivated first.

### Synopsis

```bash
gpc subscriptions base-plans delete <product-id> <base-plan-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions base-plans delete premium_monthly p1m \
  --app com.example.myapp
```

---

## `subscriptions base-plans migrate-prices`

Migrate prices for a base plan across regions.

### Synopsis

```bash
gpc subscriptions base-plans migrate-prices <product-id> <base-plan-id> --file <path>
```

### Options

| Flag     | Short | Type     | Default        | Description                           |
| -------- | ----- | -------- | -------------- | ------------------------------------- |
| `--file` |       | `string` | **(required)** | Path to JSON file with migration data |

### Example

Create the migration JSON:

```json
{
  "regionalPriceMigrations": [
    {
      "regionCode": "US",
      "oldestAllowedPriceVersionTime": "2026-01-01T00:00:00Z",
      "priceIncreaseType": "OPT_OUT_PRICE_INCREASE"
    }
  ],
  "regionsVersion": { "version": "2026/03" }
}
```

Run the migration:

```bash
gpc subscriptions base-plans migrate-prices premium_monthly p1m \
  --app com.example.myapp \
  --file migration.json
```

---

## `subscriptions offers list`

List all offers for a specific base plan.

### Synopsis

```bash
gpc subscriptions offers list <product-id> <base-plan-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions offers list premium_monthly p1m \
  --app com.example.myapp
```

---

## `subscriptions offers get`

Get details for a specific offer.

### Synopsis

```bash
gpc subscriptions offers get <product-id> <base-plan-id> <offer-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions offers get premium_monthly p1m free-trial-7d \
  --app com.example.myapp
```

---

## `subscriptions offers create`

Create a new offer from a JSON file.

### Synopsis

```bash
gpc subscriptions offers create <product-id> <base-plan-id> --file <path>
```

### Options

| Flag     | Short | Type     | Default        | Description                       |
| -------- | ----- | -------- | -------------- | --------------------------------- |
| `--file` |       | `string` | **(required)** | Path to JSON file with offer data |

### Example

Create the offer JSON:

```json
{
  "offerId": "free-trial-7d",
  "phases": [
    {
      "recurrenceCount": 1,
      "duration": "P7D",
      "pricingInfo": { "free": {} }
    }
  ],
  "targeting": {
    "acquisitionRule": {
      "scope": { "anySubscriptionInApp": {} }
    }
  },
  "state": "ACTIVE"
}
```

Run the command:

```bash
gpc subscriptions offers create premium_monthly p1m \
  --app com.example.myapp \
  --file offer.json
```

---

## `subscriptions offers update`

Update an existing offer from a JSON file.

### Synopsis

```bash
gpc subscriptions offers update <product-id> <base-plan-id> <offer-id> --file <path> [options]
```

### Options

| Flag            | Short | Type     | Default        | Description                       |
| --------------- | ----- | -------- | -------------- | --------------------------------- |
| `--file`        |       | `string` | **(required)** | Path to JSON file with offer data |
| `--update-mask` |       | `string` |                | Comma-separated field mask        |

### Example

```bash
gpc subscriptions offers update premium_monthly p1m free-trial-7d \
  --app com.example.myapp \
  --file offer-update.json \
  --update-mask phases
```

---

## `subscriptions offers delete`

Delete an offer. The offer must be deactivated first.

### Synopsis

```bash
gpc subscriptions offers delete <product-id> <base-plan-id> <offer-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions offers delete premium_monthly p1m free-trial-7d \
  --app com.example.myapp
```

---

## `subscriptions offers activate`

Activate an offer so it becomes available to users.

### Synopsis

```bash
gpc subscriptions offers activate <product-id> <base-plan-id> <offer-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions offers activate premium_monthly p1m free-trial-7d \
  --app com.example.myapp
```

---

## `subscriptions offers deactivate`

Deactivate an offer. New users will no longer see it.

### Synopsis

```bash
gpc subscriptions offers deactivate <product-id> <base-plan-id> <offer-id>
```

### Options

No command-specific options.

### Example

```bash
gpc subscriptions offers deactivate premium_monthly p1m free-trial-7d \
  --app com.example.myapp
```

## Related

- [iap](./iap) -- In-app products (one-time purchases)
- [purchases](./purchases) -- Purchase verification and management
- [pricing](./pricing) -- Regional price conversion
