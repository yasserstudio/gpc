---
outline: deep
---

<CommandHeader
  name="gpc purchases"
  description="Manage purchases, subscription purchases, voided purchases, and order refunds."
  usage="gpc purchases <subcommand> [options]"
  :badges="['--json']"
/>

## Commands

| Command                                                                 | Description                                     |
| ----------------------------------------------------------------------- | ----------------------------------------------- |
| [`purchases get`](#purchases-get)                                       | Get a product purchase                          |
| [`purchases acknowledge`](#purchases-acknowledge)                       | Acknowledge a product purchase                  |
| [`purchases consume`](#purchases-consume)                               | Consume a consumable purchase                   |
| [`purchases subscription get`](#purchases-subscription-get)             | Get a subscription purchase (v2 API)            |
| [`purchases subscription cancel`](#purchases-subscription-cancel)       | Cancel a subscription (v1 API)                  |
| [`purchases subscription defer`](#purchases-subscription-defer)         | Defer a subscription expiry                     |
| [`purchases subscription revoke`](#purchases-subscription-revoke)       | Revoke a subscription (v2 API)                  |
| [`purchases product get-v2`](#purchases-product-get-v2)                 | Get product purchase (v2 — multi-offer OTPs)    |
| [`purchases subscription cancel-v2`](#purchases-subscription-cancel-v2) | Cancel a subscription (v2 — cancellation types) |
| [`purchases subscription defer-v2`](#purchases-subscription-defer-v2)   | Defer subscription renewal (v2 — add-ons)       |
| [`purchases voided`](#purchases-voided)                                 | List voided purchases                           |
| [`purchases orders get`](#purchases-orders-get)                         | Get order details                               |
| [`purchases orders batch-get`](#purchases-orders-batch-get)             | Batch get orders (up to 1000)                   |
| [`purchases orders refund`](#purchases-orders-refund)                   | Refund an order                                 |
| [`purchases orders review-refund`](#purchases-orders-review-refund)     | Respond to a chargeback review                  |

## `purchases get`

Get product purchase details using both v1 and v2 API endpoints.

### Synopsis

```bash
gpc purchases get <product-id> <token>
```

### Options

No command-specific options.

### Example

```bash
gpc purchases get coins_100 "purchase-token-abc123" \
  --app com.example.myapp
```

```json
{
  "purchaseState": 0,
  "consumptionState": 0,
  "developerPayload": "",
  "orderId": "GPA.1234-5678-9012-34567",
  "purchaseType": 0,
  "acknowledgementState": 1,
  "purchaseTimeMillis": "1741046400000",
  "regionCode": "US"
}
```

---

## `purchases acknowledge`

Acknowledge a product purchase. Required for all purchases to prevent automatic refund after 3 days.

### Synopsis

```bash
gpc purchases acknowledge <product-id> <token> [options]
```

### Options

| Flag        | Short | Type     | Default | Description              |
| ----------- | ----- | -------- | ------- | ------------------------ |
| `--payload` |       | `string` |         | Developer payload string |

### Example

```bash
gpc purchases acknowledge coins_100 "purchase-token-abc123" \
  --app com.example.myapp
```

With developer payload:

```bash
gpc purchases acknowledge coins_100 "purchase-token-abc123" \
  --app com.example.myapp \
  --payload "user_id=12345"
```

Preview without acknowledging:

```bash
gpc purchases acknowledge coins_100 "purchase-token-abc123" \
  --app com.example.myapp \
  --dry-run
```

---

## `purchases consume`

Consume a consumable product purchase, allowing the user to buy it again.

### Synopsis

```bash
gpc purchases consume <product-id> <token>
```

### Options

No command-specific options.

### Example

```bash
gpc purchases consume coins_100 "purchase-token-abc123" \
  --app com.example.myapp
```

---

## `purchases subscription get`

Get subscription purchase details using the v2 Purchases API.

### Synopsis

```bash
gpc purchases subscription get <token>
```

### Options

No command-specific options.

### Example

```bash
gpc purchases subscription get "sub-token-xyz789" \
  --app com.example.myapp
```

```json
{
  "kind": "androidpublisher#subscriptionPurchaseV2",
  "lineItems": [
    {
      "productId": "premium_monthly",
      "expiryTime": "2026-04-09T12:00:00Z",
      "autoRenewingPlan": {
        "autoRenewEnabled": true
      }
    }
  ],
  "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
  "regionCode": "US"
}
```

::: tip Subscription Recovery (I/O 2026)

Google extended the account recovery window from **30 to 60 days** for failed payments. Top developers reported up to 18% reduction in involuntary churn.

Two new fields on `SubscriptionPurchaseV2` (added in GPC v0.9.76) give visibility into payment failures:

- **`onHoldStateContext`** -- present when `subscriptionState` is `SUBSCRIPTION_STATE_ON_HOLD`. Contains `renewalDeclined.pendingOrderId` from the declined renewal.
- **`inGracePeriodStateContext`** -- present when `subscriptionState` is `SUBSCRIPTION_STATE_IN_GRACE_PERIOD`. Contains `renewalDeclined.pendingOrderId` during the retry window.

GPC v0.9.79 also surfaces two top-level convenience fields so you do not need to drill into the state context objects:

- **`onHoldPendingOrderId`** -- the pending order ID when the subscription is on hold.
- **`gracePeriodPendingOrderId`** -- the pending order ID when the subscription is in grace period.

A new delayed charging optimization lets low-risk users keep access while payment retries happen in the background. No GPC configuration changes needed.
:::

---

## `purchases subscription cancel`

Cancel an active subscription. The subscription remains active until the end of the current billing period.

### Synopsis

```bash
gpc purchases subscription cancel <subscription-id> <token>
```

### Options

No command-specific options.

### Example

```bash
gpc purchases subscription cancel premium_monthly "sub-token-xyz789" \
  --app com.example.myapp
```

---

## `purchases subscription defer`

Defer a subscription's expiry date to a later time.

### Synopsis

```bash
gpc purchases subscription defer <subscription-id> <token> --expiry <iso-date>
```

### Options

| Flag       | Short | Type     | Default        | Description                        |
| ---------- | ----- | -------- | -------------- | ---------------------------------- |
| `--expiry` |       | `string` | **(required)** | Desired new expiry date (ISO 8601) |

### Example

```bash
gpc purchases subscription defer premium_monthly "sub-token-xyz789" \
  --app com.example.myapp \
  --expiry 2026-06-01T00:00:00Z
```

```json
{
  "newExpiryTimeMillis": "1748736000000"
}
```

---

## `purchases subscription revoke`

Revoke a subscription immediately using the v2 API. The user loses access right away.

### Synopsis

```bash
gpc purchases subscription revoke <token>
```

### Options

| Flag            | Type     | Default    | Description                                               |
| --------------- | -------- | ---------- | --------------------------------------------------------- |
| `--refund-type` | `string` | `prorated` | `full`, `prorated`, or `item`                             |
| `--product-id`  | `string` | —          | Product ID to refund (required with `--refund-type item`) |

::: warning Non-interactive runs need `--yes`
This command moves money and cannot be undone. In CI, with piped stdin, or with `--no-interactive`, it refuses to run without `--yes` (exit `2`, `CONFIRMATION_REQUIRED`). `--dry-run` never needs it.
:::

### Example

```bash
gpc purchases subscription revoke "sub-token-xyz789" \
  --app com.example.myapp
```

---

## `purchases voided`

List voided purchases (refunds, chargebacks, revocations).

### Synopsis

```bash
gpc purchases voided [options]
```

### Options

| Flag                        | Short | Type     | Default | Description                                                    |
| --------------------------- | ----- | -------- | ------- | -------------------------------------------------------------- |
| `--start-time`              |       | `string` |         | Start time in milliseconds since epoch                         |
| `--end-time`                |       | `string` |         | End time in milliseconds since epoch                           |
| `--type`                    |       | `number` | `0`     | Purchase type: `0` = in-app only, `1` = in-app + subscriptions |
| `--include-partial-refunds` |       | flag     |         | Include quantity-based partial refunds                         |
| `--max-results`             |       | `number` |         | Maximum results per page                                       |
| `--limit`                   |       | `number` |         | Maximum total results                                          |
| `--next-page`               |       | `string` |         | Resume from pagination token                                   |

::: info Rate Limit
The voided purchases API is limited to 6,000 requests per day and 30 requests per 30 seconds.
:::

### Example

List all voided purchases:

```bash
gpc purchases voided --app com.example.myapp
```

List voided purchases in a time range:

```bash
gpc purchases voided \
  --app com.example.myapp \
  --start-time 1709251200000 \
  --end-time 1741046400000 \
  --max-results 50
```

::: info List output shape (v0.9.83+)
`purchases voided --json` returns a JSON envelope: `voidedPurchases`, a `nextPageToken` (`null` when there are no more pages), a `meta.count`, and a `message` when empty. Switch `jq '.[]'` to `jq '.voidedPurchases[]'`.
:::

---

## `purchases orders refund`

Refund an order by order ID. Google's `orders.refund` always issues a full refund; add `--revoke` to also remove the user's access. For a partial refund of a subscription, use [`purchases subscription revoke`](#purchases-subscription-revoke) with `--refund-type prorated`.

### Synopsis

```bash
gpc purchases orders refund <order-id> [options]
```

### Options

| Flag       | Type      | Default | Description                                                 |
| ---------- | --------- | ------- | ----------------------------------------------------------- |
| `--revoke` | `boolean` | `false` | Also revoke the purchase (the user loses access right away) |

::: warning Non-interactive runs need `--yes`
This command moves money and cannot be undone. In CI, with piped stdin, or with `--no-interactive`, it refuses to run without `--yes` (exit `2`, `CONFIRMATION_REQUIRED`). `--dry-run` never needs it.
:::

### Example

Refund, keep access:

```bash
gpc purchases orders refund "GPA.1234-5678-9012-34567" \
  --app com.example.myapp
```

Refund and revoke access, in CI:

```bash
gpc purchases orders refund "GPA.1234-5678-9012-34567" \
  --app com.example.myapp \
  --revoke \
  --yes
```

Preview without executing:

```bash
gpc purchases orders refund "GPA.1234-5678-9012-34567" \
  --app com.example.myapp \
  --revoke \
  --dry-run
```

## `purchases orders review-refund`

Respond to a chargeback request that Google Play has flagged for developer review.

### Chargeback disputes

When a user disputes a charge with their bank, Google Play sends a
`pendingRefundReviewNotification` [RTDN](/commands/rtdn) containing a `pendingRefundToken`
and the disputed `orderId`. You have **24 hours** to answer with a refund preference and any
evidence that the purchase was used. Play decides the outcome; your preference and usage
evidence are inputs to that decision, not the decision itself.

Decode the notification to get the token:

```bash
gpc rtdn decode "<base64-payload>" --output json
```

See Google's [Play Developer API release notes](https://developer.android.com/google/play/billing/play-developer-apis-release-notes)
for the API's announcement.

### Synopsis

```bash
gpc purchases orders review-refund <order-id> [options]
```

### Options

| Flag                           | Type      | Default | Description                                                       |
| ------------------------------ | --------- | ------- | ----------------------------------------------------------------- |
| `--pending-refund-token`       | `string`  | —       | Required. Token from the `pendingRefundReviewNotification` RTDN   |
| `--preference`                 | `string`  | —       | Required. `approve`, `decline`, or `neutral`                      |
| `--sample-content-provided`    | `boolean` | —       | Required. A free sample, trial, or functionality info was offered |
| `--no-sample-content-provided` | `boolean` | —       | Required. Nothing was offered before purchase                     |
| `--consumption-percent`        | `number`  | —       | How much of the purchase was consumed, 0-100 (sent as milliunits) |
| `--usage-events-file`          | `path`    | —       | JSON file with an array of consumption usage events (max 1,000)   |

::: warning Non-interactive runs need `--yes`
This command moves money and cannot be undone. In CI, with piped stdin, or with `--no-interactive`, it refuses to run without `--yes` (exit `2`, `CONFIRMATION_REQUIRED`). `--dry-run` never needs it.
:::

One of `--sample-content-provided` / `--no-sample-content-provided` is required — Google Play
has no default for it.

### Example

Decline the chargeback, with usage evidence:

```bash
gpc purchases orders review-refund "GPA.1234-5678-9012-34567" \
  --app com.example.app \
  --pending-refund-token "$PENDING_REFUND_TOKEN" \
  --preference decline \
  --sample-content-provided \
  --consumption-percent 82 \
  --usage-events-file ./usage-events.json
```

`usage-events.json` holds an array of consumption events:

```json
[
  {
    "consumptionTime": "2026-08-30T10:15:00Z",
    "consumptionItemDescription": "Opened chapter 4",
    "obfuscatedAccountId": "user-account-id",
    "ipAddress": "203.0.113.10",
    "location": { "regionCode": "US" }
  }
]
```

Every timestamp must be RFC 3339, `location.regionCode` is a required
[CLDR region code](https://cldr.unicode.org/) when a location is supplied, and lists longer
than 1,000 events are rejected.

Take no side, without evidence:

```bash
gpc purchases orders review-refund "GPA.1234-5678-9012-34567" \
  --app com.example.app \
  --pending-refund-token "$PENDING_REFUND_TOKEN" \
  --preference neutral \
  --no-sample-content-provided
```

Preview without executing:

```bash
gpc purchases orders review-refund "GPA.1234-5678-9012-34567" \
  --app com.example.app \
  --pending-refund-token "$PENDING_REFUND_TOKEN" \
  --preference approve \
  --sample-content-provided \
  --dry-run
```

## `purchases product get-v2`

Get product purchase details using the v2 API. Supports multi-offer one-time products.

### Synopsis

```bash
gpc purchases product get-v2 <token> [options]
```

### Example

```bash
gpc purchases product get-v2 "purchase-token-abc" --app com.example.myapp
```

---

## `purchases subscription cancel-v2`

Cancel a subscription using the v2 API. Supports cancellation type parameter.

### Synopsis

```bash
gpc purchases subscription cancel-v2 <token> [options]
```

### Options

| Flag     | Type     | Description                                                                             |
| -------- | -------- | --------------------------------------------------------------------------------------- |
| `--type` | `string` | Cancellation type: `USER_CANCELED`, `SYSTEM_CANCELED`, `DEVELOPER_CANCELED`, `REPLACED` |

### Example

```bash
gpc purchases subscription cancel-v2 "purchase-token-abc" \
  --type DEVELOPER_CANCELED \
  --app com.example.myapp
```

::: tip
The v1 `cancel` command requires both `subscription-id` and `token`. The v2 `cancel-v2` only requires the `token` and supports cancellation types.
:::

---

## `purchases subscription defer-v2`

Defer a subscription renewal using the v2 API. Supports subscriptions with add-ons.

### Synopsis

```bash
gpc purchases subscription defer-v2 <token> --until <date> [options]
```

### Options

| Flag      | Type     | Required | Description                         |
| --------- | -------- | -------- | ----------------------------------- |
| `--until` | `string` | Yes      | Desired expiry time (ISO 8601 date) |

### Example

```bash
gpc purchases subscription defer-v2 "purchase-token-abc" \
  --until 2026-07-01T00:00:00Z \
  --app com.example.myapp
```

---

## `purchases orders get`

Get order details by order ID.

### Synopsis

```bash
gpc purchases orders get <order-id> [options]
```

### Example

```bash
gpc purchases orders get "GPA.1234-5678-9012-34567" --app com.example.myapp
```

---

## `purchases orders batch-get`

Retrieve multiple orders in a single request (up to 1000 order IDs).

### Synopsis

```bash
gpc purchases orders batch-get --ids <order-ids> [options]
```

### Options

| Flag    | Type     | Required | Description                          |
| ------- | -------- | -------- | ------------------------------------ |
| `--ids` | `string` | Yes      | Comma-separated order IDs (max 1000) |

### Example

```bash
gpc purchases orders batch-get \
  --ids "GPA.1234,GPA.5678,GPA.9012" \
  --app com.example.myapp \
  --output json
```

---

## Related

- [subscriptions](./subscriptions) -- Subscription product management
- [one-time-products](./one-time-products) -- One-time product management (alias: `otp`)
- [iap](./iap) -- Legacy in-app product management
- [external-transactions](./external-transactions) -- Alternative billing transactions
- [reports](./reports) -- Financial reports
