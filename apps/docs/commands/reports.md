---
outline: deep
---

# reports

Download financial and statistics reports from Google Play. Reports are delivered as CSV files via signed Google Cloud Storage URIs.

## Commands

| Command | Description |
|---------|-------------|
| [`reports list`](#reports-list) | List available report buckets for a month |
| [`reports download financial`](#reports-download-financial) | Download a financial report |
| [`reports download stats`](#reports-download-stats) | Download a statistics report |

## `reports list`

List available report files for a given report type and month.

### Synopsis

```bash
gpc reports list <report-type> --month <YYYY-MM>
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--month` | | `string` | **(required)** | Report month (format: `YYYY-MM`) |

Valid report types: `earnings`, `sales`, `estimated_sales`, `play_balance`, `installs`, `crashes`, `ratings`, `reviews`, `store_performance`, `subscriptions`.

### Example

List financial report files:

```bash
gpc reports list earnings --app com.example.myapp --month 2026-02
```

```json
{
  "reports": [
    {
      "bucketId": "pubsite_prod_rev_12345678901234567890",
      "reportType": "earnings",
      "month": "2026-02"
    }
  ]
}
```

List install stats:

```bash
gpc reports list installs --app com.example.myapp --month 2026-02
```

---

## `reports download financial`

Download a financial report as CSV. Supports earnings, sales, estimated sales, and Play balance reports.

### Synopsis

```bash
gpc reports download financial --month <YYYY-MM> [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--month` | | `string` | **(required)** | Report month (format: `YYYY-MM`) |
| `--type` | | `string` | `earnings` | Financial report type: `earnings`, `sales`, `estimated_sales`, `play_balance` |
| `--output-file` | | `string` | | Save to file instead of stdout |

### Example

Download earnings report to stdout:

```bash
gpc reports download financial \
  --app com.example.myapp \
  --month 2026-02
```

Download and save to file:

```bash
gpc reports download financial \
  --app com.example.myapp \
  --month 2026-02 \
  --type earnings \
  --output-file earnings-2026-02.csv
```

Download Play balance report:

```bash
gpc reports download financial \
  --app com.example.myapp \
  --month 2026-02 \
  --type play_balance \
  --output-file balance-2026-02.csv
```

Download and pipe to analysis tool:

```bash
gpc reports download financial --month 2026-02 --type sales \
  | csvstat --mean "Buyer Currency"
```

---

## `reports download stats`

Download a statistics report as CSV. Supports installs, crashes, ratings, reviews, store performance, and subscription reports.

### Synopsis

```bash
gpc reports download stats --month <YYYY-MM> --type <report-type> [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--month` | | `string` | **(required)** | Report month (format: `YYYY-MM`) |
| `--type` | | `string` | **(required)** | Stats report type: `installs`, `crashes`, `ratings`, `reviews`, `store_performance`, `subscriptions` |
| `--output-file` | | `string` | | Save to file instead of stdout |

### Example

Download install stats:

```bash
gpc reports download stats \
  --app com.example.myapp \
  --month 2026-02 \
  --type installs
```

Download crash report to file:

```bash
gpc reports download stats \
  --app com.example.myapp \
  --month 2026-02 \
  --type crashes \
  --output-file crashes-2026-02.csv
```

Download subscription stats:

```bash
gpc reports download stats \
  --app com.example.myapp \
  --month 2026-02 \
  --type subscriptions \
  --output-file subs-2026-02.csv
```

::: info Report Download Process
Report download is a two-step process: the API returns a signed Google Cloud Storage URI, then the CSV content is fetched from that URI. This is handled transparently by the CLI.
:::

## Related

- [vitals](./vitals) -- Real-time quality metrics
- [reviews](./reviews) -- User review data
- [purchases](./purchases) -- Purchase and order data
