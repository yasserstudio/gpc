---
outline: deep
---

# external-transactions

Manage external transactions for apps using alternative billing systems. Alias: `ext-txn`.

Under regulations like the EU Digital Markets Act (DMA), apps may offer alternative billing flows outside of Google Play Billing. When a user completes a purchase through an external payment provider, you must report the transaction to Google Play. These commands let you create, query, and refund those external transaction records.

## Commands

| Command                                                               | Description                                    |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| [`external-transactions create`](#external-transactions-create)       | Create an external transaction record          |
| [`external-transactions get`](#external-transactions-get)             | Get details of an external transaction         |
| [`external-transactions refund`](#external-transactions-refund)       | Refund an external transaction                 |

## `external-transactions create`

Report a new external transaction to Google Play. Requires the external transaction token (provided by Google when the user initiates the alternative billing flow), the transaction amount, and the currency.

### Synopsis

```bash
gpc external-transactions create [options]
gpc ext-txn create [options]
```

### Options

| Flag             | Short | Type     | Default        | Description                              |
| ---------------- | ----- | -------- | -------------- | ---------------------------------------- |
| `--token`        |       | `string` | **(required)** | External transaction token from Google   |
| `--amount`       |       | `number` | **(required)** | Transaction amount in major currency units (e.g., 9.99) |
| `--currency`     |       | `string` | **(required)** | ISO 4217 currency code (e.g., EUR, USD)  |
| `--app`          |       | `string` |                | App package name                         |
| `--json`         |       | `flag`   |                | Output as JSON                           |

### Example

Create a transaction record:

```bash
gpc ext-txn create \
  --app com.example.myapp \
  --token ext_txn_tok_1a2b3c4d5e6f \
  --amount 9.99 \
  --currency EUR
```

```
External transaction created
  Transaction ID: ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6
  Amount:         EUR 9.99
  Status:         COMPLETED
  Created:        2026-03-12T10:30:00Z
```

Create with JSON output for CI:

```bash
gpc ext-txn create \
  --app com.example.myapp \
  --token ext_txn_tok_1a2b3c4d5e6f \
  --amount 4.99 \
  --currency USD \
  --json
```

```json
{
  "externalTransactionId": "ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6",
  "originalPreTaxAmount": {
    "priceMicros": "4990000",
    "currency": "USD"
  },
  "originalTaxAmount": {
    "priceMicros": "0",
    "currency": "USD"
  },
  "transactionTime": "2026-03-12T10:30:00Z",
  "transactionState": "TRANSACTION_REPORTED"
}
```

---

## `external-transactions get`

Retrieve details of a previously reported external transaction.

### Synopsis

```bash
gpc external-transactions get <transaction-id> [options]
gpc ext-txn get <transaction-id> [options]
```

### Options

| Flag       | Short | Type     | Default | Description                        |
| ---------- | ----- | -------- | ------- | ---------------------------------- |
| `--app`    |       | `string` |         | App package name                   |
| `--json`   |       | `flag`   |         | Output as JSON                     |

### Example

```bash
gpc ext-txn get ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6 \
  --app com.example.myapp
```

```
External Transaction

  ID:        ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6
  Amount:    EUR 9.99
  Tax:       EUR 0.00
  Status:    TRANSACTION_REPORTED
  Created:   2026-03-12T10:30:00Z
  Refunded:  No
```

```bash
gpc ext-txn get ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6 \
  --app com.example.myapp --json
```

```json
{
  "externalTransactionId": "ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6",
  "originalPreTaxAmount": {
    "priceMicros": "9990000",
    "currency": "EUR"
  },
  "originalTaxAmount": {
    "priceMicros": "0",
    "currency": "EUR"
  },
  "transactionTime": "2026-03-12T10:30:00Z",
  "transactionState": "TRANSACTION_REPORTED"
}
```

---

## `external-transactions refund`

Refund a previously reported external transaction. This notifies Google Play that the user received a refund through the external billing system.

### Synopsis

```bash
gpc external-transactions refund <transaction-id> [options]
gpc ext-txn refund <transaction-id> [options]
```

### Options

| Flag          | Short | Type     | Default        | Description                                  |
| ------------- | ----- | -------- | -------------- | -------------------------------------------- |
| `--amount`    |       | `number` |                | Partial refund amount (omit for full refund)  |
| `--currency`  |       | `string` |                | Currency code (required for partial refunds)  |
| `--app`       |       | `string` |                | App package name                             |
| `--json`      |       | `flag`   |                | Output as JSON                               |

### Example

Full refund:

```bash
gpc ext-txn refund ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6 \
  --app com.example.myapp
```

```
External transaction refunded
  Transaction ID: ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6
  Refund amount:  EUR 9.99 (full)
  Status:         TRANSACTION_REFUNDED
```

Partial refund:

```bash
gpc ext-txn refund ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6 \
  --app com.example.myapp \
  --amount 4.99 \
  --currency EUR
```

```
External transaction partially refunded
  Transaction ID: ext-txn-7f8e9d0c-1a2b-3c4d-5e6f-a1b2c3d4e5f6
  Refund amount:  EUR 4.99 (partial)
  Status:         TRANSACTION_REFUNDED
```

## Errors

| Code | Exit | Description                                                        |
| ---- | ---- | ------------------------------------------------------------------ |
| `INVALID_TOKEN`              | 2 | The external transaction token is invalid or expired  |
| `TRANSACTION_NOT_FOUND`      | 4 | No transaction exists with the specified ID           |
| `ALREADY_REFUNDED`           | 4 | The transaction has already been fully refunded       |
| `ALTERNATIVE_BILLING_DISABLED` | 4 | Alternative billing is not enabled for this app      |

## Related

- [purchases](./purchases) -- Standard Google Play Billing purchases
- [subscriptions](./subscriptions) -- Subscription management
- [one-time-products](./one-time-products) -- One-time product management
