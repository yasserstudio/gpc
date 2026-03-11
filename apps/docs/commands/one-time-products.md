# One-Time Products

Manage one-time products using the modern monetization API. Alias: `otp`.

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

Update an existing product.

```bash
gpc otp update premium_upgrade --file updated.json
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

Update an existing offer.

### `gpc otp offers delete <product-id> <offer-id>`

Delete an offer. Requires confirmation.

## Options

| Option     | Type     | Description                |
| ---------- | -------- | -------------------------- |
| `--file`   | `string` | Path to JSON file          |
| `--sort`   | `string` | Sort field for list output |
| `--output` | `string` | Output format              |
| `--app`    | `string` | App package name           |
