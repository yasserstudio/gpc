---
outline: deep
---

<CommandHeader
  name="gpc pricing"
  description="Regional price conversion using Google Play's pricing templates."
  usage="gpc pricing <subcommand> [options]"
  :badges="['--json', '--regions']"
/>

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

## Supported Currencies

Google Play supports the following ISO 4217 currencies for regional pricing. This is a reference of the most common codes:

| Code  | Currency                | Regions                  |
| ----- | ----------------------- | ------------------------ |
| `USD` | US Dollar               | US, EC, SV, PA, PR       |
| `EUR` | Euro                    | DE, FR, ES, IT, NL + 15  |
| `GBP` | British Pound           | GB                       |
| `JPY` | Japanese Yen            | JP                       |
| `KRW` | South Korean Won        | KR                       |
| `BRL` | Brazilian Real          | BR                       |
| `INR` | Indian Rupee            | IN                       |
| `RUB` | Russian Ruble           | RU                       |
| `TRY` | Turkish Lira            | TR                       |
| `AUD` | Australian Dollar       | AU                       |
| `CAD` | Canadian Dollar         | CA                       |
| `MXN` | Mexican Peso            | MX                       |
| `IDR` | Indonesian Rupiah       | ID                       |
| `PLN` | Polish Zloty            | PL                       |
| `ZAR` | South African Rand      | ZA                       |
| `SEK` | Swedish Krona           | SE                       |
| `SGD` | Singapore Dollar        | SG                       |
| `HKD` | Hong Kong Dollar        | HK                       |
| `TWD` | New Taiwan Dollar       | TW                       |
| `SAR` | Saudi Riyal             | SA                       |

For the full list of supported regions and currencies, see the [Google Play Console help center](https://support.google.com/googleplay/android-developer/answer/9306917).

## More Conversion Examples

Convert from Japanese Yen (zero-decimal currency):

```bash
gpc pricing convert --app com.example.myapp --from JPY --amount 1500
```

Convert from British Pounds and save to a file for use in offer payloads:

```bash
gpc pricing convert --app com.example.myapp --from GBP --amount 6.99 --output json > regional-prices.json
```

Use in CI to validate regional pricing stays within a range:

```bash
PRICES=$(gpc pricing convert --from USD --amount 9.99 --output json)
JP_PRICE=$(echo "$PRICES" | jq -r '.convertedRegionPrices.JP.priceMicros')
if [ "$JP_PRICE" -gt 2000000000 ]; then
  echo "Warning: JP price exceeds 2000 JPY"
  exit 1
fi
```

## Related

- [subscriptions](./subscriptions) -- Subscription pricing and base plans
- [iap](./iap) -- In-app product pricing
