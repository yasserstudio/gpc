---
outline: deep
---

# pricing

Regional price conversion using Google Play's pricing templates.

## Commands

| Command                               | Description                            |
| ------------------------------------- | -------------------------------------- |
| [`pricing convert`](#pricing-convert) | Convert a price to all regional prices |

## `pricing convert`

Convert a base price in one currency to localized prices for all supported Google Play regions. Uses the Google Play Developer API's `convertRegionPrices` endpoint.

### Synopsis

```bash
gpc pricing convert --from <currency> --amount <number>
```

### Options

| Flag       | Short | Type     | Default        | Description                                                |
| ---------- | ----- | -------- | -------------- | ---------------------------------------------------------- |
| `--from`   |       | `string` | **(required)** | Source currency code (ISO 4217, e.g., `USD`, `EUR`, `GBP`) |
| `--amount` |       | `string` | **(required)** | Price amount (e.g., `9.99`, `4.99`)                        |

### Example

Convert $9.99 USD to all regions:

```bash
gpc pricing convert \
  --app com.example.myapp \
  --from USD \
  --amount 9.99
```

```json
{
  "convertedRegionPrices": {
    "US": { "priceMicros": "9990000", "currencyCode": "USD" },
    "GB": { "priceMicros": "7990000", "currencyCode": "GBP" },
    "JP": { "priceMicros": "1500000000", "currencyCode": "JPY" },
    "EU": { "priceMicros": "9490000", "currencyCode": "EUR" },
    "BR": { "priceMicros": "49990000", "currencyCode": "BRL" },
    "IN": { "priceMicros": "799000000", "currencyCode": "INR" }
  }
}
```

Convert EUR 4.99 and output as YAML:

```bash
gpc pricing convert \
  --app com.example.myapp \
  --from EUR \
  --amount 4.99 \
  --output yaml
```

```yaml
convertedRegionPrices:
  US:
    priceMicros: "5490000"
    currencyCode: USD
  GB:
    priceMicros: "4490000"
    currencyCode: GBP
  JP:
    priceMicros: "800000000"
    currencyCode: JPY
```

Pipe converted prices into a script:

```bash
gpc pricing convert --from USD --amount 9.99 --output json \
  | jq '.convertedRegionPrices | to_entries[] | "\(.key): \(.value.currencyCode) \(.value.priceMicros)"'
```

## Related

- [subscriptions](./subscriptions) -- Subscription pricing and base plans
- [iap](./iap) -- In-app product pricing
