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

| Command                                                           | Description                          |
| ----------------------------------------------------------------- | ------------------------------------ |
| [`purchases get`](#purchases-get)                                 | Get a product purchase               |
| [`purchases acknowledge`](#purchases-acknowledge)                 | Acknowledge a product purchase       |
| [`purchases consume`](#purchases-consume)                         | Consume a consumable purchase        |
| [`purchases subscription get`](#purchases-subscription-get)       | Get a subscription purchase (v2 API) |
| [`purchases subscription cancel`](#purchases-subscription-cancel) | Cancel a subscription (v1 API)       |
| [`purchases subscription defer`](#purchases-subscription-defer)   | Defer a subscription expiry          |
| [`purchases subscription revoke`](#purchases-subscription-revoke) | Revoke a subscription (v2 API)       |
| [`purchases voided`](#purchases-voided)                           | List voided purchases                |
| [`purchases orders refund`](#purchases-orders-refund)             | Refund an order                      |

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

No command-specific options.

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

| Flag            | Short | Type     | Default | Description                            |
| --------------- | ----- | -------- | ------- | -------------------------------------- |
| `--start-time`  |       | `string` |         | Start time in milliseconds since epoch |
| `--end-time`    |       | `string` |         | End time in milliseconds since epoch   |
| `--max-results` |       | `number` |         | Maximum results per page               |
| `--limit`       |       | `number` |         | Maximum total results                  |
| `--next-page`   |       | `string` |         | Resume from pagination token           |

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

---

## `purchases orders refund`

Refund an order by order ID.

### Synopsis

```bash
gpc purchases orders refund <order-id> [options]
```

### Options

| Flag                | Short | Type      | Default | Description             |
| ------------------- | ----- | --------- | ------- | ----------------------- |
| `--full-refund`     |       | `boolean` | `false` | Issue a full refund     |
| `--prorated-refund` |       | `boolean` | `false` | Issue a prorated refund |

### Example

Full refund:

```bash
gpc purchases orders refund "GPA.1234-5678-9012-34567" \
  --app com.example.myapp \
  --full-refund
```

Prorated refund:

```bash
gpc purchases orders refund "GPA.1234-5678-9012-34567" \
  --app com.example.myapp \
  --prorated-refund
```

Preview without executing:

```bash
gpc purchases orders refund "GPA.1234-5678-9012-34567" \
  --app com.example.myapp \
  --full-refund \
  --dry-run
```

## Related

- [subscriptions](./subscriptions) -- Subscription product management
- [one-time-products](./one-time-products) -- One-time product management (alias: `otp`)
- [iap](./iap) -- Legacy in-app product management
- [external-transactions](./external-transactions) -- Alternative billing transactions
- [reports](./reports) -- Financial reports
