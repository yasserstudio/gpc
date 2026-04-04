---
outline: deep
---

<CommandHeader
  name="gpc one-time-products"
  description="Manage one-time products using the modern Google Play monetization API."
  usage="gpc one-time-products <subcommand> [options]"
  :badges="['--json', '--dry-run']"
/>

This is the newer replacement for the legacy in-app products API (`gpc iap`). Use this for new products.

## Product Commands

### `gpc otp list`

List all one-time products.

```bash
gpc otp list
gpc otp list --sort productId
```

### `gpc otp get <product-id>`

Get details of a specific product.

```bash
gpc otp get premium_upgrade
```

### `gpc otp create --file <path>`

Create a new one-time product from a JSON file.

```bash
gpc otp create --file product.json
```

### `gpc otp update <product-id> --file <path>`

Update an existing product. The `regionsVersion` query parameter and `updateMask` are automatically derived from the provided fields.

```bash
gpc otp update premium_upgrade --file updated.json
```

Specify an explicit update mask to limit which fields are updated:

```bash
gpc otp update premium_upgrade --file updated.json --update-mask listings
```

### `gpc otp delete <product-id>`

Delete a one-time product. Requires confirmation.

```bash
gpc otp delete premium_upgrade
gpc otp delete premium_upgrade --yes    # Skip confirmation
```

## Offer Commands

### `gpc otp offers list <product-id>`

List all offers for a product.

```bash
gpc otp offers list premium_upgrade
```

### `gpc otp offers get <product-id> <offer-id>`

Get details of a specific offer.

### `gpc otp offers create <product-id> --file <path>`

Create a new offer for a product.

### `gpc otp offers update <product-id> <offer-id> --file <path>`

Update an existing offer. The `regionsVersion` and `updateMask` are automatically included.

```bash
gpc otp offers update premium_upgrade launch_discount --file offer-update.json
gpc otp offers update premium_upgrade launch_discount --file offer-update.json --update-mask pricingPhases
```

### `gpc otp offers delete <product-id> <offer-id>`

Delete an offer. Requires confirmation.

### Offer Creation Payload

When creating an offer with `gpc otp offers create`, the JSON file describes pricing phases, eligibility criteria, and regional overrides.

```json
{
  "offerId": "launch_discount",
  "pricingPhases": {
    "pricingPhases": [
      {
        "recurrenceMode": "NON_RECURRING",
        "billingPeriod": "",
        "price": {
          "currencyCode": "USD",
          "units": "0",
          "nanos": 990000000
        }
      }
    ]
  },
  "targeting": {
    "acquisitionRule": {
      "scope": {
        "anySubscriptionInApp": true
      }
    }
  }
}
```

### Regional Pricing in Offers

Override prices per region by adding `regionalConfigs` to the offer payload. Each entry maps a region code to a price override:

```json
{
  "offerId": "regional_promo",
  "regionalConfigs": {
    "US": {
      "newSubscriberAvailability": true,
      "price": { "currencyCode": "USD", "units": "4", "nanos": 990000000 }
    },
    "GB": {
      "newSubscriberAvailability": true,
      "price": { "currencyCode": "GBP", "units": "3", "nanos": 990000000 }
    },
    "JP": {
      "newSubscriberAvailability": true,
      "price": { "currencyCode": "JPY", "units": "700", "nanos": 0 }
    },
    "IN": {
      "newSubscriberAvailability": true,
      "price": { "currencyCode": "INR", "units": "349", "nanos": 0 }
    },
    "BR": {
      "newSubscriberAvailability": true,
      "price": { "currencyCode": "BRL", "units": "24", "nanos": 990000000 }
    }
  },
  "pricingPhases": {
    "pricingPhases": [
      {
        "recurrenceMode": "NON_RECURRING",
        "billingPeriod": "",
        "price": { "currencyCode": "USD", "units": "4", "nanos": 990000000 }
      }
    ]
  }
}
```

Use `gpc pricing convert` to generate region prices from a single base price, then merge the output into your offer JSON.

### `gpc otp offers cancel <product-id> <offer-id>`

Permanently cancel an offer. Unlike deactivate (which is reversible), cancel is permanent and cannot be undone.

```bash
gpc otp offers cancel premium_upgrade launch_discount
```

### `gpc otp offers batch-get <product-id> --file <path>`

Batch get multiple offers (max 100).

```bash
gpc otp offers batch-get premium_upgrade --file offer-ids.json
```

### `gpc otp offers batch-update <product-id> --file <path>`

Batch create or update multiple offers (max 100).

```bash
gpc otp offers batch-update premium_upgrade --file updates.json --dry-run
```

### `gpc otp offers batch-update-states <product-id> --file <path>`

Batch activate, deactivate, or cancel multiple offers.

```bash
gpc otp offers batch-update-states premium_upgrade --file states.json
```

### `gpc otp offers batch-delete <product-id> --file <path>`

Batch delete multiple offers.

```bash
gpc otp offers batch-delete premium_upgrade --file delete-ids.json
```

## Purchase Option Batch Commands

### `gpc otp purchase-options batch-delete <product-id> --file <path>`

Batch delete purchase options across one or multiple products.

```bash
gpc otp purchase-options batch-delete premium_upgrade --file delete-requests.json
```

### `gpc otp purchase-options batch-update-states <product-id> --file <path>`

Batch activate or deactivate purchase options.

```bash
gpc otp purchase-options batch-update-states premium_upgrade --file state-requests.json
```

### `gpc otp diff <product-id> --file <path>`

Compare a local JSON file against the remote one-time product state. Shows field-level differences.

```bash
gpc otp diff premium_upgrade --file product.json
```

Output shows each field that differs between local and remote. Use `--output json` for structured diff output.

## Options

| Option              | Type     | Description                                                    |
| ------------------- | -------- | -------------------------------------------------------------- |
| `--file`            | `string` | Path to JSON file                                              |
| `--update-mask`     | `string` | Comma-separated field mask (for update commands)               |
| `--purchase-option` | `string` | Purchase option ID for offer commands (default: `"-"` for all) |
| `--sort`            | `string` | Sort field for list output                                     |
| `--output`          | `string` | Output format                                                  |
| `--app`             | `string` | App package name                                               |

## Related

- [purchase-options](./purchase-options) -- Purchase option management for one-time products
- [iap](./iap) -- Legacy in-app products API
- [subscriptions](./subscriptions) -- Subscription management
- [purchases](./purchases) -- Purchase verification and management
- [pricing](./pricing) -- Regional price conversion
