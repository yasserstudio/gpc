---
outline: deep
---

# Rate Limits

How GPC handles Google Play Developer API rate limits, and how to monitor your quota usage.

## Google Play API limits

Google imposes per-project quotas on the Play Developer API. Every request your service account makes counts against two independent limits:

| Quota type | Typical default |
| ---------- | --------------- |
| Daily       | 200,000 requests/day (resets at midnight Pacific) |
| Per-minute  | Varies by endpoint category |

Exact limits depend on your Google Cloud project configuration and the specific API endpoint. Some write-heavy endpoints (edits, uploads) have stricter per-minute caps than read-only endpoints.

You can view your current quota allocation in the [Google Cloud Console](https://console.cloud.google.com/apis/api/androidpublisher.googleapis.com/quotas).

## How GPC handles rate limiting

The `@gpc-cli/api` package includes a built-in 6-bucket rate limiter that distributes requests across endpoint categories to stay within per-minute limits.

**Automatic protections:**

- Requests are queued per bucket and dispatched within safe per-minute thresholds
- On HTTP `429 Too Many Requests`, GPC retries automatically with exponential backoff
- Retry delays increase progressively to avoid further throttling
- If retries are exhausted, GPC exits with code `4` (API error). See [Exit Codes](/reference/exit-codes) for the full list.

**The 6 buckets** map to Google Play API endpoint categories. Each bucket tracks its own request count and cooldown independently, so a burst of listing reads will not block an upload in a different bucket.

## Checking your quota

Use `gpc quota` to check your current API usage and remaining capacity:

```bash
gpc quota
```

The [`gpc doctor`](/commands/utility) command includes a quota proximity check (added in v0.9.71) that warns when usage exceeds 80% of your daily or per-minute allocation:

```bash
gpc doctor
```

Both commands query the Google Cloud quota API and report usage as a percentage of your limit.

## Best practices

- **Use `--dry-run` during development.** Dry-run mode validates inputs and prints what would happen without making API calls, preserving your quota for real operations.
- **Batch operations where possible.** Commands like `gpc listings push` send multiple locale updates within a single edit session rather than opening separate edits.
- **Check quota before bulk operations.** Run `gpc quota` before large migrations, multi-locale metadata pushes, or batch image uploads to confirm you have headroom.
- **Add a quota pre-step in CI/CD.** In your pipeline, run `gpc quota --json` before publish steps and fail early if remaining capacity is too low.
- **Spread large jobs across time.** If you manage many apps, stagger per-app operations rather than running them all in parallel.

## Rate limit errors

| Error | Meaning | What to do |
| ----- | ------- | ---------- |
| HTTP `429` Too Many Requests | Per-minute quota exceeded | GPC retries automatically. If retries fail, wait a few minutes and try again. |
| HTTP `403` with `rateLimitExceeded` | Daily quota exhausted | Wait until midnight Pacific for the quota to reset. No amount of retrying will help until then. |
| HTTP `403` with `userRateLimitExceeded` | Per-user rate limit hit | Reduce concurrency or spread requests over a longer window. |

Run [`gpc doctor`](/commands/utility) to see quota proximity warnings before you hit these errors. The [`gpc quota`](/commands/quota) command gives a detailed breakdown of usage by endpoint category.
