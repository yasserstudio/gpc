---
outline: deep
---

<CommandHeader
  name="gpc subscriptions"
  description="Manage subscriptions, base plans, and subscription offers using the modern monetization API."
  usage="gpc subscriptions <subcommand> [options]"
  :badges="['--json', '--dry-run']"
/>

::: info Play Billing Library deadline (client-side)
The Google Play Billing Library lives in your **app's code**, not in GPC. GPC manages the server-side catalog (subscriptions, base plans, offers, prices) through the Play Developer API; the Billing Library is what your app links against to make purchases. As of **August 31, 2026**, new apps and app updates must use **Billing Library 8 or later** (9.0 shipped May 19, 2026). That requirement applies to the AAB/APK you build and upload, not to anything GPC sends. See Google's [Billing Library deprecation FAQ](https://developer.android.com/google/play/billing/deprecation-faq).

Do not conflate this with the _other_ August 31, 2026 deadline: the annual **target API level** requirement (new apps and updates must target API 36 / Android 16). The two share a date but are independent -- this one is your billing library version (client-side, invisible to GPC); the other is your app's `targetSdkVersion`, which GPC's [`preflight`](/commands/preflight) scanner does check.
:::

## Commands

| Command                                                                                 | Description                        |
| --------------------------------------------------------------------------------------- | ---------------------------------- |
| [`subscriptions list`](#subscriptions-list)                                             | List subscriptions                 |
| [`subscriptions get`](#subscriptions-get)                                               | Get a subscription                 |
| [`subscriptions create`](#subscriptions-create)                                         | Create a subscription from JSON    |
| [`subscriptions update`](#subscriptions-update)                                         | Update a subscription from JSON    |
| [`subscriptions delete`](#subscriptions-delete)                                         | Delete a subscription              |
| [`subscriptions base-plans activate`](#subscriptions-base-plans-activate)               | Activate a base plan               |
| [`subscriptions base-plans deactivate`](#subscriptions-base-plans-deactivate)           | Deactivate a base plan             |
| [`subscriptions base-plans delete`](#subscriptions-base-plans-delete)                   | Delete a base plan                 |
| [`subscriptions base-plans migrate-prices`](#subscriptions-base-plans-migrate-prices)   | Migrate base plan prices           |
| [`subscriptions offers list`](#subscriptions-offers-list)                               | List offers for a base plan        |
| [`subscriptions offers get`](#subscriptions-offers-get)                                 | Get an offer                       |
| [`subscriptions offers template`](#subscriptions-offers-template)                       | Print starter offer JSON           |
| [`subscriptions offers create`](#subscriptions-offers-create)                           | Create an offer from JSON or flags |
| [`subscriptions offers update`](#subscriptions-offers-update)                           | Update an offer from JSON or flags |
| [`subscriptions offers delete`](#subscriptions-offers-delete)                           | Delete an offer                    |
| [`subscriptions offers activate`](#subscriptions-offers-activate)                       | Activate an offer                  |
| [`subscriptions offers deactivate`](#subscriptions-offers-deactivate)                   | Deactivate an offer                |
| [`subscriptions offers batch-get`](#subscriptions-offers-batch-get)                     | Batch get multiple offers          |
| [`subscriptions offers batch-update-states`](#subscriptions-offers-batch-update-states) | Batch activate/deactivate offers   |
| [`subscriptions diff`](#subscriptions-diff)                                             | Compare local JSON vs remote       |

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
  ],
  "nextPageToken": null,
  "meta": { "count": 1 }
}
```

::: info List output shape (v0.9.83+)
`list` commands return a JSON envelope: items under their named key, a `nextPageToken` (`null` when there are no more pages), a `meta.count`, and a `message` when empty. Earlier versions returned a bare array — switch `jq '.[]'` to `jq '.subscriptions[]'`.
:::

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

| Flag         | Short | Type      | Default        | Description                              |
| ------------ | ----- | --------- | -------------- | ---------------------------------------- |
| `--file`     |       | `string`  | **(required)** | Path to JSON file with subscription data |
| `--activate` |       | `boolean` | `false`        | Activate all base plans after creation   |

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

| Flag                | Short | Type     | Default        | Description                                                                                                         |
| ------------------- | ----- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--file`            |       | `string` | **(required)** | Path to JSON file with subscription data                                                                            |
| `--update-mask`     |       | `string` |                | Comma-separated field mask (e.g., `listings,basePlans`)                                                             |
| `--regions-version` |       | `string` | `2022/02`      | Regional pricing version. Pass a newer version (e.g. `2025/01`) to opt in to Google's updated region/currency list. |

### Example

```bash
gpc subscriptions update premium_monthly \
  --app com.example.myapp \
  --file subscription-update.json \
  --update-mask listings \
  --regions-version 2025/01
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

## `subscriptions offers template`

Print starter JSON for `offers create --file`. Runs offline and makes no API call.

### Synopsis

```bash
gpc subscriptions offers template retention [--per-user]
```

### Options

| Flag         | Short | Type      | Default | Description                                                         |
| ------------ | ----- | --------- | ------- | ------------------------------------------------------------------- |
| `--per-user` |       | `boolean` | `false` | Per-user retention offer (`retentionPerUserRule`) instead of cohort |

### Example

```bash
gpc subscriptions offers template retention > offer.json
gpc subscriptions offers create premium_monthly monthly-base --file offer.json
```

The cohort template follows the sample in Google's retention offers guide: subscribers who have paid for at least 90 days get 50% off for two billing periods and can claim the offer again 180 days after the discount ends. Add `startTime` and `endTime` yourself if the offer should run for a limited time. The phase `duration` is `P1M`, so change it to your base plan's billing period if the plan is not monthly, and list every region you sell in under `regionalConfigs`.

---

## `subscriptions offers create`

Create a new offer from a JSON file, or build a retention offer from flags.

### Synopsis

```bash
gpc subscriptions offers create <product-id> <base-plan-id> --file <path>
gpc subscriptions offers create <product-id> <base-plan-id> --retention <cohort|per-user> --offer-id <id> --discount <fraction> [options]
```

Give either `--file` or `--retention`, not both.

### Options

| Flag                | Short | Type      | Default           | Description                                                            |
| ------------------- | ----- | --------- | ----------------- | ---------------------------------------------------------------------- |
| `--file`            |       | `string`  |                   | Path to JSON file with offer data                                      |
| `--retention`       |       | `string`  |                   | Build a retention offer from flags: `cohort` or `per-user`             |
| `--offer-id`        |       | `string`  |                   | Offer ID (required with `--retention`)                                 |
| `--discount`        |       | `string`  |                   | Discount as a fraction: `0.5` is 50% off (required with `--retention`) |
| `--periods`         |       | `number`  | `1`               | Billing periods the discount lasts (1 to 52)                           |
| `--min-duration`    |       | `string`  | `0d`              | Days subscribed before the offer shows, such as `90d` (cohort only)    |
| `--multiple-claims` |       | `boolean` | `false`           | Let a user claim the offer more than once (cohort only)                |
| `--cooldown`        |       | `string`  |                   | Days between claims, such as `180d` (cohort, with `--multiple-claims`) |
| `--regions`         |       | `string`  | base plan regions | Comma-separated region codes, such as `US,GB`                          |
| `--start`           |       | `string`  |                   | RFC 3339 time the offer becomes available                              |
| `--end`             |       | `string`  |                   | RFC 3339 time the offer stops being available                          |
| `--activate`        |       | `boolean` | `false`           | Activate the offer after creating it                                   |
| `--regions-version` |       | `string`  | `2022/02`         | Regional pricing version                                               |

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

### Retention offer from flags

`--retention` builds the offer for you. GPC reads the base plan from Google Play and copies its billing period into the phase and its regions into the offer. When the base plan sells in other regions, the offer does too, unless you pass `--regions`.

```bash
# 50% off for 2 months, shown to users subscribed for 90 days or more
gpc subscriptions offers create premium_monthly p1m \
  --app com.example.app \
  --retention cohort --offer-id winback-50 \
  --discount 0.5 --periods 2 --min-duration 90d

# 30% off once, for subscribers you target with purchases subscription target-offer
gpc subscriptions offers create premium_monthly p1m \
  --app com.example.app \
  --retention per-user --offer-id save-30 --discount 0.3 --activate
```

The offer is created as a draft. GPC prints the command to activate it, or add `--activate` to do both. If the activate step fails, the draft stays in Play Console and the error shows the command to activate it. Add `--dry-run` to see the offer without sending it.

Flag values are checked before GPC loads credentials, so a bad value exits with code 2 even on a machine with no key set up.

Durations are in days: `90d` or `P90D`. Google does not accept months for these fields. `--discount` is a fraction, so `--discount 50` fails and suggests `0.5`.

### Retention offers

When the file targets `retentionRule` or `retentionPerUserRule`, GPC checks it against Google's retention rules before calling the API and lists every problem at once:

- `targeting` holds exactly one rule.
- On create, the file has one phase and at least one offer-level `regionalConfigs` entry (Google requires both), and the phase sets a `relativeDiscount` somewhere.
- `retentionRule.scope` is `{ "thisSubscription": {} }` and `minDuration` is set, in days (`P0D` to `P1826D`; months such as `P3M` are rejected).
- `minOfferCooldownDuration` (`P1D` to `P1826D`) is set when `allowMultipleClaims` is `true`, and left out otherwise.
- `retentionPerUserRule` is `{}`.
- One phase, `recurrenceCount` from 1 to 52, priced with `relativeDiscount` only (greater than 0, less than 1). `price`, `absoluteDiscount` and `free` are not allowed.
- `startTime` and `endTime` are RFC 3339 timestamps with a timezone; `endTime` is in the future and after `startTime`.

A failed check exits with code 2 and nothing is sent to Google Play. On create, GPC then reads the base plan and refuses one that is not auto-renewing (prepaid or installments). Google also requires, when `recurrenceCount` is above 1, a phase `duration` equal to the base plan billing period, and checks it server-side. On update, Google checks both. Start from [`offers template retention`](#subscriptions-offers-template).

| Code                      | Exit | Description                                                                                                             |
| ------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------- |
| `RETENTION_OFFER_INVALID` | 2    | The retention offer breaks one or more rules; nothing was sent                                                          |
| `RETENTION_FLAG_INVALID`  | 2    | A retention flag has a bad value; nothing was sent                                                                      |
| `BASE_PLAN_NOT_FOUND`     | 2    | The subscription has no base plan with that ID                                                                          |
| `USAGE_ERROR`             | 2    | `--file` and retention flags were mixed, or neither was given, or `--retention` is missing `--offer-id` or `--discount` |

---

## `subscriptions offers update`

Update an existing offer from a JSON file, or change one retention setting with a flag.

### Synopsis

```bash
gpc subscriptions offers update <product-id> <base-plan-id> <offer-id> --file <path> [options]
gpc subscriptions offers update <product-id> <base-plan-id> <offer-id> [--start <time>] [--end <time>] [--min-duration <days>] [--[no-]multiple-claims] [--cooldown <days>]
```

### Options

| Flag                | Short | Type      | Default   | Description                                                                         |
| ------------------- | ----- | --------- | --------- | ----------------------------------------------------------------------------------- |
| `--file`            |       | `string`  |           | Path to JSON file with offer data                                                   |
| `--update-mask`     |       | `string`  |           | Comma-separated field mask (with `--file`)                                          |
| `--start`           |       | `string`  |           | RFC 3339 time the offer becomes available                                           |
| `--end`             |       | `string`  |           | RFC 3339 time the offer stops being available                                       |
| `--min-duration`    |       | `string`  |           | Days subscribed before the offer shows (cohort)                                     |
| `--multiple-claims` |       | `boolean` |           | Allow (`--multiple-claims`) or stop (`--no-multiple-claims`) repeat claims (cohort) |
| `--cooldown`        |       | `string`  |           | Days between claims (cohort)                                                        |
| `--regions-version` |       | `string`  | `2022/02` | Regional pricing version (e.g. `2025/01`) for the offer                             |

### Example

```bash
gpc subscriptions offers update premium_monthly p1m free-trial-7d \
  --app com.example.myapp \
  --file offer-update.json \
  --update-mask phases \
  --regions-version 2025/01
```

A file with retention targeting runs the same [retention checks](#retention-offers) as `offers create`, except that `phases` and `regionalConfigs` may be left out of a partial update. The check reads the whole file, not only the fields in `--update-mask`.

Without `--file`, each flag changes one setting and GPC builds the update mask. `--min-duration`, `--multiple-claims` and `--cooldown` keep the offer's other targeting values. They work only on a cohort retention offer.

GPC reads the offer first and checks the times it would end up with: `--end` must be in the future and after the start, whether the start comes from `--start` or from the offer.

| Code                     | Exit | Description                                                                                        |
| ------------------------ | ---- | -------------------------------------------------------------------------------------------------- |
| `RETENTION_FLAG_INVALID` | 2    | A flag has a bad value, the times do not fit, or the offer is not a cohort offer; nothing was sent |
| `USAGE_ERROR`            | 2    | `--file` was mixed with flags or `--update-mask`, or nothing to update was given                   |

```bash
gpc subscriptions offers update premium_monthly p1m winback-50 \
  --app com.example.app \
  --min-duration 30d --end 2027-03-01T00:00:00Z
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

## `subscriptions offers batch-get`

Batch get multiple offers at once (max 100). Supports wildcard `-` for product-id and base-plan-id.

### Synopsis

```bash
gpc subscriptions offers batch-get <product-id> <base-plan-id> --ids <offer-ids>
```

### Example

```bash
gpc subscriptions offers batch-get premium_monthly p1m --ids offer1,offer2,offer3
```

## `subscriptions offers batch-update-states`

Batch activate or deactivate multiple offers at once (max 100).

### Synopsis

```bash
gpc subscriptions offers batch-update-states <product-id> <base-plan-id> --file <path>
```

### Example

```bash
gpc subscriptions offers batch-update-states premium_monthly p1m --file states.json
```

## `subscriptions diff`

Compare a local JSON file against the remote subscription state. Shows field-level differences for `listings`, `basePlans`, and `taxAndComplianceSettings`.

### Synopsis

```bash
gpc subscriptions diff <product-id> --file <path>
```

### Options

| Flag     | Short | Type     | Default        | Description                        |
| -------- | ----- | -------- | -------------- | ---------------------------------- |
| `--file` |       | `string` | **(required)** | Path to local JSON file to compare |

### Example

```bash
gpc subscriptions diff premium_monthly \
  --app com.example.myapp \
  --file subscription.json
```

Output shows each field that differs between local and remote:

```
Field: listings
  Local:  {"en-US":{"title":"Premium Monthly","description":"Updated desc"}}
  Remote: {"en-US":{"title":"Premium Monthly","description":"Original desc"}}

Field: basePlans
  No differences
```

Use `--output json` for structured diff output.

---

## Related

- [iap](./iap) -- In-app products (one-time purchases)
- [purchases](./purchases) -- Purchase verification and management
- [pricing](./pricing) -- Regional price conversion
