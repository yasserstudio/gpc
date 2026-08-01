---
outline: deep
---

<CommandHeader
  name="gpc reports"
  description="Download financial and statistics reports from Google Play."
  usage="gpc reports <command> [options]"
  :badges="['--json', '--month', '--output-file']"
/>

## Commands

| Command                                                     | Description                  |
| ----------------------------------------------------------- | ---------------------------- |
| [`reports list`](#reports-list)                             | List available report files  |
| [`reports download financial`](#reports-download-financial) | Download a financial report  |
| [`reports download stats`](#reports-download-stats)         | Download a statistics report |

## Access and configuration

Play bulk reports are delivered as CSV files in a Google Cloud Storage bucket linked to your
developer account, not through the Publisher API. `gpc reports` reads that bucket directly
using your service account.

Two prerequisites:

1. **Grant the service account access.** Play does not give a service account access to the
   reports bucket automatically. Enable **"View app information and download bulk reports
   (read-only)"** for the service account under **Play Console -> Users and permissions ->
   the service account -> Account permissions**, then allow a few minutes for it to
   propagate. Without this, downloads fail with `REPORT_ACCESS_DENIED`. See
   [Authentication](../guide/authentication#required-api-scopes).
2. **Bucket name.** By default GPC uses `pubsite_prod_<developerId>`. If your account's
   bucket differs, copy the exact Cloud Storage URI from Play Console -> Download reports and
   set it with `--bucket`, the `reports.bucket` config key, or the `GPC_REPORTS_BUCKET`
   environment variable.

| Setting         | How to set it                                                          |
| --------------- | ---------------------------------------------------------------------- |
| Bucket (flag)   | `--bucket pubsite_prod_1234567890`                                     |
| Bucket (env)    | `GPC_REPORTS_BUCKET=pubsite_prod_1234567890`                           |
| Bucket (config) | `"reports": { "bucket": "pubsite_prod_1234567890" }`                   |
| Developer id    | `developerId` config / `GPC_DEVELOPER_ID` (derives the default bucket) |

## `reports list`

List the report files available in the bucket for a report type, optionally narrowed to one month.

### Synopsis

```bash
gpc reports list <report-type> [--month <YYYY-MM>]
```

### Options

| Flag          | Short | Type     | Default | Description                                             |
| ------------- | ----- | -------- | ------- | ------------------------------------------------------- |
| `--month`     |       | `string` |         | Only reports for this month (format: `YYYY-MM`)         |
| `--bucket`    |       | `string` |         | GCS bucket name (default: `pubsite_prod_<developerId>`) |
| `--limit`     |       | `string` |         | Maximum results to return                               |
| `--next-page` |       | `string` |         | Pagination token from a previous run                    |

Valid report types: `earnings`, `sales`, `estimated_sales`, `play_balance`, `installs`, `crashes`, `ratings`, `reviews`, `store_performance`, `subscriptions`.

For stats report types the listing is narrowed to the configured app; financial reports are
account-level and always cover the whole account.

### Example

List install stats report files for one month:

```bash
gpc reports list installs --app com.example.myapp --month 2026-02 --json
```

```json
{
  "reports": [
    {
      "name": "stats/installs/installs_com.example.myapp_202602_overview.csv",
      "size": 1272,
      "updated": "2026-03-02T04:41:07.836Z"
    },
    {
      "name": "stats/installs/installs_com.example.myapp_202602_country.csv",
      "size": 2158,
      "updated": "2026-03-02T04:41:08.114Z"
    }
  ],
  "nextPageToken": null,
  "meta": { "count": 2 }
}
```

List financial report files:

```bash
gpc reports list earnings --month 2026-02
```

---

## `reports download financial`

Download a financial report as CSV. Supports earnings, sales, estimated sales, and Play balance reports.

### Synopsis

```bash
gpc reports download financial --month <YYYY-MM> [options]
```

### Options

| Flag            | Short | Type     | Default        | Description                                                                   |
| --------------- | ----- | -------- | -------------- | ----------------------------------------------------------------------------- |
| `--month`       |       | `string` | **(required)** | Report month (format: `YYYY-MM`)                                              |
| `--type`        |       | `string` | `earnings`     | Financial report type: `earnings`, `sales`, `estimated_sales`, `play_balance` |
| `--bucket`      |       | `string` |                | GCS bucket name (default: `pubsite_prod_<developerId>`)                       |
| `--output-file` |       | `string` |                | Save to file instead of stdout (a `.zip` path saves the raw archive)          |

Financial reports are account-level (no `--app` needed). Play delivers most of them as ZIP
archives; GPC unwraps a single-CSV archive to plain CSV automatically. If an archive holds
several CSVs, save it whole with `--output-file report.zip` (or use `--json`, which inlines
every entry). `sales` and `estimated_sales` refer to the same Play report (the estimated
sales file under `sales/`) and return identical data.

With `--json`, the download commands emit one of three envelopes:

```json
{ "objectName": "...", "csv": "..." }                          // printed to stdout
{ "objectName": "...", "outputFile": "...", "bytes": 1234 }    // saved to a file
{ "objectName": "...", "entries": [{ "name": "...", "csv": "..." }] }  // multi-CSV archive
```

### Example

Download earnings report to stdout:

```bash
gpc reports download financial --month 2026-02
```

Download and save to file:

```bash
gpc reports download financial \
  --month 2026-02 \
  --type earnings \
  --output-file earnings-2026-02.csv
```

Download Play balance report:

```bash
gpc reports download financial \
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

| Flag            | Short | Type     | Default        | Description                                                                                                             |
| --------------- | ----- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--month`       |       | `string` | **(required)** | Report month (format: `YYYY-MM`)                                                                                        |
| `--type`        |       | `string` | **(required)** | Stats report type: `installs`, `crashes`, `ratings`, `reviews`, `store_performance`, `subscriptions`                    |
| `--dimension`   |       | `string` | `overview`     | Report dimension: `overview`, `country`, `language`, `os_version`, `device`, `app_version`, `carrier`, `traffic_source` |
| `--bucket`      |       | `string` |                | GCS bucket name (default: `pubsite_prod_<developerId>`)                                                                 |
| `--output-file` |       | `string` |                | Save to file instead of stdout                                                                                          |

Play publishes one CSV per dimension per month (reviews reports have no dimension). If the
requested dimension does not exist for that month, the error lists the dimensions that do.

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

::: info Report download process
GPC reads the report CSV directly from the Play-linked Google Cloud Storage bucket using your
service account (see [Access and configuration](#access-and-configuration)). The objects are
gzip-compressed and UTF-16 encoded; GPC decompresses and re-encodes them to UTF-8 text before
printing or saving, so the output is ready to pipe into standard CSV tools.
:::

## Related

- [vitals](./vitals) -- Real-time quality metrics
- [reviews](./reviews) -- User review data
- [purchases](./purchases) -- Purchase and order data
