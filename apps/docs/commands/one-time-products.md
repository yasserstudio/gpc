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

Update an existing product. The `updateMask` is automatically derived from the provided fields, and `regionsVersion` defaults to `2022/02`.

```bash
gpc otp update premium_upgrade --file updated.json
```

Specify an explicit update mask to limit which fields are updated, or a newer regional pricing version:

```bash
gpc otp update premium_upgrade --file updated.json --update-mask listings
gpc otp update premium_upgrade --file updated.json --regions-version 2025/01
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

```bash
gpc otp offers get premium_upgrade launch_discount --purchase-option buy_once
```

### `gpc otp offers create <product-id> --file <path>`

Create a new offer for a product.

```bash
gpc otp offers create premium_upgrade --file offer.json --purchase-option buy_once
```

### `gpc otp offers update <product-id> <offer-id> --file <path>`

Update an existing offer. The `updateMask` is automatically derived, and `regionsVersion` defaults to `2022/02` (override with `--regions-version`).

```bash
gpc otp offers update premium_upgrade launch_discount --file offer-update.json --purchase-option buy_once
gpc otp offers update premium_upgrade launch_discount --file offer-update.json --update-mask discountedOffer
gpc otp offers update premium_upgrade launch_discount --file offer-update.json --regions-version 2025/01
```

### `gpc otp offers delete <product-id> <offer-id>`

Delete an offer. Requires confirmation.

::: tip `--purchase-option` is required for single-offer commands
Google Play only serves batch endpoints for one-time product offers, so `offers get`, `offers create`, `offers update`, and `offers delete` are sent as single-item batch requests and need a concrete purchase option ID. Omitting `--purchase-option` on those four commands fails immediately as a missing-option error, before any API call. The `-` wildcard works only with `offers list`; run that first if you do not know which purchase option an offer belongs to.
:::

### Offer Creation Payload

The JSON file for `gpc otp offers create` is a Google Play [`OneTimeProductOffer`](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts.purchaseOptions.offers). Every offer is one of three types: `discountedOffer`, `preOrderOffer` or `gameRewardOffer`. Its price in each region is set relative to the purchase option's price.

A discounted offer, 30% off in the US and a fixed 1.00 off in the UK, limited to 1,000 redemptions:

```json
{
  "offerId": "launch-discount",
  "discountedOffer": {
    "startTime": "2026-10-01T00:00:00Z",
    "endTime": "2026-10-31T23:59:59Z",
    "redemptionLimit": "1000"
  },
  "regionalPricingAndAvailabilityConfigs": [
    { "regionCode": "US", "availability": "AVAILABLE", "relativeDiscount": 0.7 },
    {
      "regionCode": "GB",
      "availability": "AVAILABLE",
      "absoluteDiscount": { "currencyCode": "GBP", "units": "1" }
    }
  ],
  "offerTags": [{ "tag": "launch" }]
}
```

### Regional Pricing in Offers

`regionalPricingAndAvailabilityConfigs` is a list with one entry per region. Each entry sets `regionCode`, `availability` (`AVAILABLE` or `NO_LONGER_AVAILABLE`), and exactly one of:

| Field              | Meaning                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| `relativeDiscount` | Fraction of the purchase option price the user pays, between 0 and 1 (`0.7` = 30% off) |
| `absoluteDiscount` | Amount subtracted from the purchase option price, as `{ currencyCode, units, nanos }`  |
| `noOverride`       | `{}` to charge the purchase option's price in that region                              |

Prices themselves live on the purchase option. Use `gpc pricing convert` to generate per-region purchase option prices from a single base price.

### Play Games Rewards offers

A `gameRewardOffer` is a [Play Games Rewards](https://developer.android.com/games/rewards) offer: an in-game item that Google Play hands out through Quests and other Play Games experiences. `redemptionLimit` caps how many times it can be redeemed: `"1"` to `"50"`, or `"0"`/unset for unlimited.

```json
{
  "offerId": "quest-reward-skin",
  "gameRewardOffer": { "redemptionLimit": "1" },
  "regionalPricingAndAvailabilityConfigs": [
    { "regionCode": "US", "availability": "AVAILABLE", "noOverride": {} }
  ]
}
```

Google's guide sets up rewards offers in Play Console (Monetize with Play > Products > One-time products), and rewards must be available in every region where your game is published. The Play Developer API exposes the same `gameRewardOffer` field, so GPC lists, reads and updates these offers like any other.

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

| Option              | Type     | Description                                                                                                 |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `--file`            | `string` | Path to JSON file                                                                                           |
| `--update-mask`     | `string` | Comma-separated field mask (for update commands)                                                            |
| `--regions-version` | `string` | Regional pricing version (create/update commands, default `2022/02`)                                        |
| `--purchase-option` | `string` | Purchase option ID. Required on `offers get/create/update/delete`; defaults to `"-"` (all) on `offers list` |
| `--sort`            | `string` | Sort field for list output                                                                                  |
| `--output`          | `string` | Output format                                                                                               |
| `--app`             | `string` | App package name                                                                                            |

## Related

- [purchase-options](./purchase-options) -- Purchase option management for one-time products
- [iap](./iap) -- Legacy in-app products API
- [subscriptions](./subscriptions) -- Subscription management
- [purchases](./purchases) -- Purchase verification and management
- [pricing](./pricing) -- Regional price conversion
