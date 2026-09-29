---
outline: deep
---

<CommandHeader
  name="gpc external-transactions"
  description="Manage external transactions for apps using alternative billing systems."
  usage="gpc external-transactions <subcommand> [options]"
  :badges="['--json']"
/>

When users pay outside Google Play Billing, through alternative billing (for example under the EU Digital Markets Act) or the US external offers and external content links programs, you must report each transaction to Google Play. These commands create, fetch, and refund those reports.

## Commands

| Command                                                         | Description                            |
| --------------------------------------------------------------- | -------------------------------------- |
| [`external-transactions create`](#external-transactions-create) | Report an external transaction         |
| [`external-transactions get`](#external-transactions-get)       | Get details of an external transaction |
| [`external-transactions refund`](#external-transactions-refund) | Refund an external transaction         |

## `external-transactions create`

Report a new external transaction. The transaction body comes from a JSON file and is sent to Google Play unchanged, so every field of Google's [`ExternalTransaction`](https://developers.google.com/android-publisher/api-ref/rest/v3/externaltransactions) resource works.

### Synopsis

```bash
gpc external-transactions create --file <path> --transaction-id <id> [options]
gpc ext-txn create --file <path> --transaction-id <id> [options]
```

### Options

| Flag               | Type     | Default        | Description                                              |
| ------------------ | -------- | -------------- | -------------------------------------------------------- |
| `--file`           | `string` | **(required)** | JSON file with the transaction                           |
| `--transaction-id` | `string` | **(required)** | Your unique ID for the transaction (1-63 characters)     |
| `--app`            | `string` |                | App package name (global option)                         |
| `--dry-run`        | `flag`   |                | Print what would be sent without calling Google (global) |
| `--json`           | `flag`   |                | Output as JSON (global)                                  |

### Example

A one-time purchase made through alternative billing:

```json
{
  "originalPreTaxAmount": { "priceMicros": "9990000", "currency": "EUR" },
  "originalTaxAmount": { "priceMicros": "1900000", "currency": "EUR" },
  "transactionTime": "2026-09-25T10:30:00Z",
  "userTaxAddress": { "regionCode": "DE" },
  "oneTimeTransaction": { "externalTransactionToken": "<token from Play Billing Library>" }
}
```

```bash
gpc ext-txn create --app com.example.app --file txn.json --transaction-id order-1001
```

### External content links (US)

Apps in Google's US [external content links program](https://developer.android.com/google/play/billing/externalcontentlinks) add `externalContentLinkDetails`. This is separate from the older `externalOfferDetails` used by the external offers program.

| Field                 | Values                                                    | When              |
| --------------------- | --------------------------------------------------------- | ----------------- |
| `linkType`            | `LINK_TO_DIGITAL_CONTENT_OFFER`, `LINK_TO_APP_DOWNLOAD`   | Always            |
| `installedAppPackage` | Package name of the downloaded app                        | App installs only |
| `externalAppCategory` | `APP`, `GAME` (must match your Play Console verification) | App installs only |

An app install reported through the program:

```json
{
  "originalPreTaxAmount": { "priceMicros": "0", "currency": "USD" },
  "originalTaxAmount": { "priceMicros": "0", "currency": "USD" },
  "transactionTime": "2026-09-25T10:30:00Z",
  "userTaxAddress": { "regionCode": "US" },
  "oneTimeTransaction": { "externalTransactionToken": "<token from Play Billing Library>" },
  "externalContentLinkDetails": {
    "linkType": "LINK_TO_APP_DOWNLOAD",
    "installedAppPackage": "com.example.game",
    "externalAppCategory": "GAME"
  }
}
```

::: warning Reporting deadlines
Google requires enrolled developers to report purchases made through external content links from October 1, 2026, and app downloads by December 1, 2026. Check the [program requirements](https://support.google.com/googleplay/android-developer/answer/16470497) for the current dates and fees.
:::

---

## `external-transactions get`

Retrieve a previously reported external transaction.

### Synopsis

```bash
gpc external-transactions get <transaction-id> [options]
gpc ext-txn get <transaction-id> [options]
```

### Example

```bash
gpc ext-txn get order-1001 --app com.example.app --json
```

---

## `external-transactions refund`

Report that a previously reported transaction was refunded, fully or in part. You must choose the refund type explicitly. Google requires a refund time on every refund, and GPC sends the current time unless you pass `--refund-time`.

### Synopsis

```bash
gpc external-transactions refund <transaction-id> --full [options]
gpc external-transactions refund <transaction-id> --partial-amount <micros> --currency <code> --refund-id <id> [options]
```

### Options

| Flag               | Type     | Default | Description                                                                                        |
| ------------------ | -------- | ------- | -------------------------------------------------------------------------------------------------- |
| `--full`           | `flag`   |         | Refund the whole transaction                                                                       |
| `--partial-amount` | `string` |         | Pre-tax amount to refund, in micros (`1990000` = 1.99)                                             |
| `--currency`       | `string` |         | ISO 4217 currency code (required with `--partial-amount`)                                          |
| `--refund-id`      | `string` |         | Unique ID for this partial refund (required with `--partial-amount`); Google rejects a repeated ID |
| `--refund-time`    | `string` | now     | When the refund happened, ISO 8601                                                                 |
| `--yes`            | `flag`   |         | Skip the confirmation prompt (global). Required in non-interactive runs (CI, piped stdin)          |
| `--dry-run`        | `flag`   |         | Print the refund request without sending it (global)                                               |

### Example

Full refund:

```bash
gpc ext-txn refund order-1001 --app com.example.app --full
```

Partial refund of 4.99:

```bash
gpc ext-txn refund order-1001 --app com.example.app \
  --partial-amount 4990000 --currency EUR --refund-id order-1001-r1
```

## Errors

| Code                     | Exit | Description                                                            |
| ------------------------ | ---- | ---------------------------------------------------------------------- |
| `EXT_TXN_REFUND_INVALID` | 2    | Refund options are missing or invalid; nothing was sent to Google Play |

Errors returned by Google Play use the standard API codes listed in [Exit codes](../reference/exit-codes).

## Related

- [purchases](./purchases) -- Standard Google Play Billing purchases
- [subscriptions](./subscriptions) -- Subscription management
- [one-time-products](./one-time-products) -- One-time product management
