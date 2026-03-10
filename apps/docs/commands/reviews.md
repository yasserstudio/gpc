---
outline: deep
---

# reviews

Manage user reviews and ratings. List, filter, reply to, and export reviews.

## Commands

| Command                             | Description                    |
| ----------------------------------- | ------------------------------ |
| [`reviews list`](#reviews-list)     | List user reviews with filters |
| [`reviews get`](#reviews-get)       | Get a single review by ID      |
| [`reviews reply`](#reviews-reply)   | Reply to a review              |
| [`reviews export`](#reviews-export) | Export reviews to JSON or CSV  |

## `reviews list`

List user reviews with optional filters for star rating, language, and date.

### Synopsis

```bash
gpc reviews list [options]
```

### Options

| Flag             | Short | Type     | Default | Description                          |
| ---------------- | ----- | -------- | ------- | ------------------------------------ |
| `--stars`        |       | `number` |         | Filter by star rating (1-5)          |
| `--lang`         |       | `string` |         | Filter by reviewer language code     |
| `--since`        |       | `string` |         | Filter reviews after date (ISO 8601) |
| `--translate-to` |       | `string` |         | Translate reviews to this language   |
| `--max`          |       | `number` |         | Maximum results per page             |
| `--limit`        |       | `number` |         | Maximum total results                |
| `--next-page`    |       | `string` |         | Resume from pagination token         |

### Example

List all recent reviews:

```bash
gpc reviews list --app com.example.myapp
```

List 1-star reviews:

```bash
gpc reviews list --app com.example.myapp --stars 1
```

List reviews from the last 7 days in English:

```bash
gpc reviews list \
  --app com.example.myapp \
  --since 2026-03-02T00:00:00Z \
  --lang en
```

```json
{
  "reviews": [
    {
      "reviewId": "gp:AOqpT...",
      "authorName": "User",
      "comments": [
        {
          "userComment": {
            "text": "Great app!",
            "lastModified": { "seconds": "1741046400" },
            "starRating": 5,
            "device": "Pixel 8",
            "androidOsVersion": 34,
            "appVersionCode": 42,
            "reviewerLanguage": "en"
          }
        }
      ]
    }
  ],
  "tokenPagination": {
    "nextPageToken": "abc123"
  }
}
```

Paginate through results:

```bash
gpc reviews list --app com.example.myapp --max 10 --next-page abc123
```

---

## `reviews get`

Get full details for a single review.

### Synopsis

```bash
gpc reviews get <review-id> [options]
```

### Options

| Flag             | Short | Type     | Default | Description                       |
| ---------------- | ----- | -------- | ------- | --------------------------------- |
| `--translate-to` |       | `string` |         | Translate review to this language |

### Example

```bash
gpc reviews get "gp:AOqpTOF..." --app com.example.myapp
```

Get a review with translation:

```bash
gpc reviews get "gp:AOqpTOF..." \
  --app com.example.myapp \
  --translate-to en
```

---

## `reviews reply`

Reply to a user review. Google Play limits replies to 350 characters. The user receives a notification about the reply.

### Synopsis

```bash
gpc reviews reply <review-id> --text <text>
```

### Options

| Flag     | Short | Type     | Default        | Description                     |
| -------- | ----- | -------- | -------------- | ------------------------------- |
| `--text` |       | `string` | **(required)** | Reply text (max 350 characters) |

### Example

```bash
gpc reviews reply "gp:AOqpTOF..." \
  --app com.example.myapp \
  --text "Thank you for your feedback! We have fixed this issue in version 2.1."
```

Preview a reply without sending:

```bash
gpc reviews reply "gp:AOqpTOF..." \
  --app com.example.myapp \
  --text "Thank you for your feedback!" \
  --dry-run
```

---

## `reviews export`

Export reviews to JSON or CSV format. Optionally write to a file.

### Synopsis

```bash
gpc reviews export [options]
```

### Options

| Flag             | Short | Type     | Default | Description                            |
| ---------------- | ----- | -------- | ------- | -------------------------------------- |
| `--format`       |       | `string` | `json`  | Export format: `json` or `csv`         |
| `--stars`        |       | `number` |         | Filter by star rating (1-5)            |
| `--lang`         |       | `string` |         | Filter by reviewer language code       |
| `--since`        |       | `string` |         | Filter reviews after date (ISO 8601)   |
| `--translate-to` |       | `string` |         | Translate reviews to this language     |
| `--output`       |       | `string` |         | Write output to file instead of stdout |

### Example

Export all reviews as JSON:

```bash
gpc reviews export --app com.example.myapp
```

Export 1-star and 2-star reviews to CSV:

```bash
gpc reviews export \
  --app com.example.myapp \
  --format csv \
  --stars 1 \
  --output negative-reviews.csv
```

Export recent reviews to a file:

```bash
gpc reviews export \
  --app com.example.myapp \
  --format json \
  --since 2026-03-01T00:00:00Z \
  --output reviews-march.json
```

## Related

- [vitals](./vitals) -- App quality metrics
- [CI/CD Vitals Gates](/ci-cd/vitals-gates) -- Automated quality gates
