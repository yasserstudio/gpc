# External Transactions

Manage external transactions for apps using alternative billing. Alias: `ext-txn`.

## Commands

### `gpc external-transactions create`

Create an external transaction record.

```bash
gpc ext-txn create --token <purchase-token> --amount 9.99 --currency USD
```

### `gpc external-transactions get <id>`

Get details of an external transaction.

```bash
gpc ext-txn get <transaction-id>
gpc ext-txn get <transaction-id> --output json
```

### `gpc external-transactions refund <id>`

Refund an external transaction.

```bash
gpc ext-txn refund <transaction-id>
```

## Options

| Option       | Type     | Description               |
| ------------ | -------- | ------------------------- |
| `--token`    | `string` | Purchase token            |
| `--amount`   | `number` | Transaction amount        |
| `--currency` | `string` | Currency code (e.g., USD) |
| `--output`   | `string` | Output format             |
| `--app`      | `string` | App package name          |
