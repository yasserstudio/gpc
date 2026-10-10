---
outline: deep
---

# SDK Usage

Use `@gpc-cli/api` and `@gpc-cli/auth` programmatically in your own Node.js applications. Build custom tooling, dashboards, or automation on top of the same typed API client that powers the GPC CLI.

A few helpers used below come from `@gpc-cli/core`, the package that holds GPC's command logic. Install it too if you want the vitals readers and threshold helpers rather than parsing Google's raw responses yourself.

## Installation

```bash
npm install @gpc-cli/api @gpc-cli/auth
```

Both packages are ESM-only and require Node.js 20+. All exports are named; there are no default exports.

## Authentication Setup

Every auth path goes through `resolveAuth`, which returns an `AuthClient`. That is the only shape `@gpc-cli/api` needs.

### Service Account (file path)

```typescript
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({
  serviceAccountPath: "./service-account.json",
});
```

### Service Account (JSON string)

Pass the key contents directly, which is the usual choice for CI secrets.

```typescript
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({
  serviceAccountJson: process.env["GPC_SERVICE_ACCOUNT"],
});
```

### Application Default Credentials (ADC)

Works automatically in Google Cloud environments (Cloud Run, GKE, Cloud Functions) and locally after `gcloud auth application-default login`. ADC is the last fallback, so calling `resolveAuth()` with no options is enough.

```typescript
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth();
```

### Resolution Order

With no explicit option, `resolveAuth` tries, in order:

1. `serviceAccountJson` option (inline JSON)
2. `serviceAccountPath` option (file path)
3. `GPC_SERVICE_ACCOUNT` environment variable (file path or raw JSON)
4. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
5. Application Default Credentials

If none succeeds, `resolveAuth` throws an `AuthError` with code `AUTH_NO_CREDENTIALS`.

### Loading a Key Explicitly

`loadServiceAccountKey` accepts a file path or a raw JSON string and validates the key structure. `createServiceAccountAuth` turns the validated key into an `AuthClient`, which is useful when you want to inspect the key first.

```typescript
import { createServiceAccountAuth, loadServiceAccountKey } from "@gpc-cli/auth";

const key = await loadServiceAccountKey("./service-account.json");
const auth = createServiceAccountAuth(key);

console.log(auth.getClientEmail()); // your-sa@project.iam.gserviceaccount.com
console.log(auth.getProjectId()); // your-gcp-project-id
```

### Getting an Access Token

```typescript
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({ serviceAccountPath: "./sa.json" });
const token = await auth.getAccessToken(); // "ya29.a0..."
```

Tokens are cached per client email and scope set, and refreshed automatically before they expire. Call `clearTokenCache()` to drop the cache.

### Custom Auth

The clients ask for one method only, `getAccessToken()`, so a vault or token broker can be dropped in without touching the rest of your code.

```typescript
import { createApiClient } from "@gpc-cli/api";

async function fetchTokenFromVault(): Promise<string> {
  return "ya29.a0-from-vault";
}

const client = createApiClient({
  auth: {
    async getAccessToken() {
      return fetchTokenFromVault();
    },
  },
});

console.log(typeof client.edits.insert);
```

The full `AuthClient` interface from `@gpc-cli/auth` adds `getProjectId()` and `getClientEmail()`. Those are used for
diagnostics and token cache keys, not by the API clients, so a minimal implementation like the one above is enough.

## Creating an API Client

The package name is not part of client construction. It is the first argument of every call, so one client can serve any number of apps.

```typescript
import { createApiClient } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({ serviceAccountPath: "./service-account.json" });
const client = createApiClient({ auth });

const edit = await client.edits.insert("com.example.myapp");
const tracks = await client.tracks.list("com.example.myapp", edit.id);
await client.edits.delete("com.example.myapp", edit.id);

console.log(tracks.map((t) => t.track));
```

### Client Factories

| Factory                            | Purpose                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `createApiClient(options)`         | Core Play API: edits, releases, listings, monetization, purchases |
| `createReportingClient(options)`   | Play Developer Reporting API: vitals, anomalies, error reports    |
| `createUsersClient(options)`       | Developer account users and permission grants                     |
| `createGamesConfigClient(options)` | Play Games achievement and leaderboard configuration              |
| `createEnterpriseClient(options)`  | Managed Google Play private app publishing                        |
| `createHttpClient(options)`        | Low-level HTTP with auth, retry, and rate limiting                |

Every factory takes the same `ApiClientOptions`. `createGamesClient`, for Play Games runtime data, is available
too.

### Client Options

```typescript
import { createApiClient } from "@gpc-cli/api";
import type { ApiClientOptions } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({ serviceAccountPath: "./sa.json" });

const options: ApiClientOptions = {
  auth,
  maxRetries: 5,
  timeout: 30_000,
  onRetry: (entry) => console.warn(`Retry #${entry.attempt} on ${entry.path}`),
  lifecycleHooks: {
    beforeRequest: (event) => console.log(event.method, event.path),
    afterResponse: (_event, response) => console.log(response.status, response.durationMs),
  },
};

const client = createApiClient(options);
```

| Option           | Type                 | Default  | Description                                      |
| ---------------- | -------------------- | -------- | ------------------------------------------------ |
| `auth`           | `{ getAccessToken }` | required | Anything implementing `AuthClient`               |
| `maxRetries`     | `number`             | `5`      | Retry count for transient errors                 |
| `timeout`        | `number`             | `30000`  | Request timeout in milliseconds                  |
| `uploadTimeout`  | `number`             | auto     | Upload timeout; scales with file size when unset |
| `baseDelay`      | `number`             | `1000`   | Base retry delay in milliseconds                 |
| `maxDelay`       | `number`             | `60000`  | Maximum retry delay in milliseconds              |
| `baseUrl`        | `string`             | Google   | Override the API host (testing, proxies)         |
| `rateLimiter`    | `RateLimiter`        | built-in | Share one limiter across several clients         |
| `onRetry`        | `(entry) => void`    | --       | Called on every retry with a `RetryLogEntry`     |
| `lifecycleHooks` | `ApiLifecycleHooks`  | --       | Observe every transport attempt                  |

`maxRetries`, `timeout`, `uploadTimeout`, `baseDelay`, and `maxDelay` also read the environment variables `GPC_MAX_RETRIES`, `GPC_TIMEOUT`, `GPC_UPLOAD_TIMEOUT`, `GPC_BASE_DELAY`, and `GPC_MAX_DELAY`. An explicit option always wins.

### Request Lifecycle Observers

`lifecycleHooks` sees every transport attempt, including retries, uploads, and downloads. Paths arrive without query strings and with purchase credentials redacted. Observer errors are isolated and never change the result of the API call. When the transport fails before any HTTP response, `afterResponse` receives `status: 0` and `ok: false`.

`setDefaultApiLifecycleHooks()` sets process-wide defaults, used only by clients that pass no hooks of their own. `fetchWithApiLifecycle()` applies the same observer contract to a standalone request.

## Examples

### Upload an AAB

`bundles.upload` takes a file path, not a buffer, and switches to a resumable upload for large files on its own.

```typescript
import { createApiClient } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const packageName = "com.example.myapp";
const auth = await resolveAuth({ serviceAccountPath: "./sa.json" });
const client = createApiClient({ auth });

// Open an edit
const edit = await client.edits.insert(packageName);

// Upload the bundle
const bundle = await client.bundles.upload(packageName, edit.id, "./app-release.aab", {
  onProgress: (event) => console.log(`${event.percent}%`),
});

console.log(`Uploaded version code: ${bundle.versionCode}`);

// Assign to the internal track
await client.tracks.update(packageName, edit.id, "internal", {
  versionCodes: [String(bundle.versionCode)],
  status: "completed",
  releaseNotes: [{ language: "en-US", text: "Bug fixes and improvements" }],
});

// Validate and commit
await client.edits.validate(packageName, edit.id);
await client.edits.commit(packageName, edit.id);

console.log("Release committed successfully");
```

An edit expires after a few minutes and a failed commit leaves it dangling, so delete the edit when you abandon the flow:

```typescript
import { createApiClient, PlayApiError } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const packageName = "com.example.myapp";
const auth = await resolveAuth({ serviceAccountPath: "./sa.json" });
const client = createApiClient({ auth });
const edit = await client.edits.insert(packageName);

try {
  await client.edits.validate(packageName, edit.id);
  await client.edits.commit(packageName, edit.id);
} catch (error) {
  await client.edits.delete(packageName, edit.id).catch(() => {});
  if (error instanceof PlayApiError) {
    console.error(`${error.code}: ${error.message}`);
  }
  throw error;
}
```

### Staged Rollout

A staged rollout is a release with `status: "inProgress"` and a `userFraction` between 0 and 1.

```typescript
import type { PlayApiClient } from "@gpc-cli/api";

declare const client: PlayApiClient;
const packageName = "com.example.myapp";

const edit = await client.edits.insert(packageName);

await client.tracks.update(packageName, edit.id, "production", {
  versionCodes: ["42"],
  status: "inProgress",
  userFraction: 0.1, // 10% of users
});

await client.edits.commit(packageName, edit.id);
```

### List Reviews

```typescript
import type { PlayApiClient } from "@gpc-cli/api";

declare const client: PlayApiClient;

const result = await client.reviews.list("com.example.myapp", { maxResults: 50 });

for (const review of result.reviews) {
  const comment = review.comments[0]?.userComment;
  if (!comment) continue;
  console.log(`[${comment.starRating}] ${comment.text}`);
}
```

### Reply to a Review

```typescript
import type { PlayApiClient } from "@gpc-cli/api";

declare const client: PlayApiClient;

await client.reviews.reply(
  "com.example.myapp",
  "review-id-123",
  "Thank you for your feedback. We are working on a fix.",
);
```

### Get Vitals (Crash Rate)

Vitals live on a different Google API, so they use a separate client. `queryMetricSet` takes the package name, a metric set, and the query.

```typescript
import { createReportingClient } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";
import { latestWorstValue, readMetricValue } from "@gpc-cli/core";

const auth = await resolveAuth({ serviceAccountPath: "./sa.json" });
const reporting = createReportingClient({ auth });

const crashes = await reporting.queryMetricSet("com.example.myapp", "crashRateMetricSet", {
  metrics: ["crashRate", "userPerceivedCrashRate", "distinctUsers"],
  dimensions: ["versionCode"],
  timelineSpec: {
    aggregationPeriod: "DAILY",
    startTime: { year: 2026, month: 3, day: 1 },
    endTime: { year: 2026, month: 3, day: 9 },
  },
});

for (const row of crashes.rows) {
  const rate = readMetricValue(row, "crashRate");
  // Rates are fractions: 0.0241 is 2.41%.
  console.log(rate === undefined ? "no data" : `${(rate * 100).toFixed(2)}%`);
}

// Worst slice of the most recent day, which is what a CI gate should compare.
const worst = latestWorstValue(crashes.rows, "crashRate");
console.log(`Gate value: ${worst}`);
```

::: warning Read metric values with the helpers
Google returns `MetricRow.metrics` as an **array** of `{ metric, decimalValue: { value } }` objects, even though the
TypeScript type describes a name-keyed map. A lookup like `row.metrics.crashRate` therefore reads `undefined` against
the live API. `readMetricValue(row, "crashRate")` and `latestWorstValue(rows, "crashRate")` from `@gpc-cli/core` handle
both shapes and return a `number | undefined`.
:::

Valid dimensions include `versionCode`, `apiLevel`, `countryCode`, `deviceModel`, `deviceType`, `deviceBrand`,
`deviceRamBucket`, `processName`, `appState`, `startType`, and `reportType`. There is no `appVersion` dimension.

### Metric Sets and Required Dimensions

| Metric set                             | Primary metric                                           |
| -------------------------------------- | -------------------------------------------------------- |
| `crashRateMetricSet`                   | `crashRate`, `userPerceivedCrashRate`                    |
| `anrRateMetricSet`                     | `anrRate`, `userPerceivedAnrRate`                        |
| `slowStartRateMetricSet`               | `slowStartRate` (requires the `startType` dimension)     |
| `slowRenderingRateMetricSet`           | `slowRenderingRate` (games only)                         |
| `excessiveWakeupRateMetricSet`         | `excessiveWakeupRate`                                    |
| `stuckBackgroundWakelockRateMetricSet` | `stuckBgWakelockRate`                                    |
| `lmkRateMetricSet`                     | `userPerceivedLmkRate` (DAILY only)                      |
| `anonRssAndSwapMemoryUsageMetricSet`   | `anonRssAndSwapMemoryUsageP90` (DAILY only)              |
| `bitmapMemoryUsageMetricSet`           | `bitmapMemoryUsageP90` (DAILY only)                      |
| `errorCountMetricSet`                  | `errorReportCount` (requires the `reportType` dimension) |

The Reporting API rejects a `slowStartRateMetricSet` query without `startType` and an `errorCountMetricSet` query
without `reportType`, both with `400 Required dimensions [...]`. Either add them yourself or use the `@gpc-cli/core`
wrappers, which add them for you and pin the aggregation period where Google only supports `DAILY`:

```typescript
import type { ReportingApiClient } from "@gpc-cli/api";
import { getVitalsErrorCount, getVitalsStartup, latestWorstValue } from "@gpc-cli/core";

declare const reporting: ReportingApiClient;

const startup = await getVitalsStartup(reporting, "com.example.myapp", { days: 7 });
const errors = await getVitalsErrorCount(reporting, "com.example.myapp", { days: 7 });

console.log(latestWorstValue(startup.rows, "slowStartRate"));
console.log(latestWorstValue(errors.rows, "errorReportCount"));
```

### Anomalies and Error Issues

```typescript
import type { ReportingApiClient } from "@gpc-cli/api";

declare const reporting: ReportingApiClient;

const { anomalies } = await reporting.getAnomalies("com.example.myapp");
for (const anomaly of anomalies) {
  console.log(anomaly.metricSet, anomaly.name);
}

const issues = await reporting.searchErrorIssues("com.example.myapp", undefined, 20);
for (const issue of issues.errorIssues) {
  console.log(`${issue.errorReportCount} reports: ${issue.cause}`);
}
```

### Manage Subscriptions

```typescript
import type { PlayApiClient } from "@gpc-cli/api";

declare const client: PlayApiClient;
const packageName = "com.example.myapp";

// List subscriptions
const { subscriptions } = await client.subscriptions.list(packageName, { pageSize: 50 });

for (const sub of subscriptions) {
  console.log(`${sub.productId}: ${sub.listings?.[0]?.title ?? "(no listing)"}`);
}

// Create a subscription
await client.subscriptions.create(
  packageName,
  {
    packageName,
    productId: "premium_monthly",
    listings: [
      {
        languageCode: "en-US",
        title: "Premium Monthly",
        description: "Unlock all features",
        benefits: ["No ads", "Cloud sync", "Priority support"],
      },
    ],
    basePlans: [
      {
        basePlanId: "monthly",
        autoRenewingBasePlanType: { billingPeriodDuration: "P1M" },
        regionalConfigs: [
          {
            regionCode: "US",
            price: { currencyCode: "USD", units: "9", nanos: 990_000_000 },
          },
        ],
      },
    ],
  },
  "premium_monthly",
);

// A new base plan is created inactive
await client.subscriptions.activateBasePlan(packageName, "premium_monthly", "monthly");
```

### Verify a Purchase

```typescript
import type { PlayApiClient } from "@gpc-cli/api";

declare const client: PlayApiClient;
declare const purchaseToken: string;
const packageName = "com.example.myapp";

// Subscription purchase (v2)
const purchase = await client.purchases.getSubscriptionV2(packageName, purchaseToken);

console.log(`State: ${purchase.subscriptionState}`);
console.log(`Expiry: ${purchase.lineItems[0]?.expiryTime}`);

// One-time product purchase
const product = await client.purchases.getProduct(packageName, "coins_100", purchaseToken);

console.log(`Purchase state: ${product.purchaseState}`); // 0 purchased, 1 canceled, 2 pending
console.log(`Acknowledged: ${product.acknowledgementState}`); // 0 pending, 1 acknowledged

// Acknowledge it (required within 3 days, or Play refunds the order)
await client.purchases.acknowledgeProduct(packageName, "coins_100", purchaseToken);
```

### List Voided Purchases

`startTime` and `endTime` are milliseconds since the epoch, passed as strings.

```typescript
import type { PlayApiClient } from "@gpc-cli/api";

declare const client: PlayApiClient;

const thirtyDaysAgo = String(Date.now() - 30 * 24 * 60 * 60 * 1000);

const voided = await client.purchases.listVoided("com.example.myapp", {
  startTime: thirtyDaysAgo,
  type: 1, // 0 = one-time products only, 1 = one-time products and subscriptions
  maxResults: 100,
});

for (const purchase of voided.voidedPurchases) {
  console.log(`Order: ${purchase.orderId}, Reason: ${purchase.voidedReason}`);
}
```

## Pagination

Google's list endpoints return a continuation token. The shape differs by endpoint: `tokenPagination.nextPageToken` on
the older edits-era endpoints, a flat `nextPageToken` on the newer ones. The pagination helpers take a callback that
normalizes whichever one applies.

### Collect Every Page

```typescript
import { paginateAll } from "@gpc-cli/api";
import type { PlayApiClient, Review } from "@gpc-cli/api";

declare const client: PlayApiClient;

const { items } = await paginateAll<Review>(async (pageToken) => {
  const response = await client.reviews.list("com.example.myapp", {
    token: pageToken,
    maxResults: 100,
  });
  return {
    items: response.reviews,
    nextPageToken: response.tokenPagination?.nextPageToken,
  };
});

console.log(`Total reviews: ${items.length}`);
```

`paginateAll` also accepts `{ limit, startPageToken }` and returns the `nextPageToken` to resume from, which is how
`--limit` plus `--next-page` works in the CLI:

```typescript
import { paginateAll } from "@gpc-cli/api";
import type { PlayApiClient, Review } from "@gpc-cli/api";

declare const client: PlayApiClient;

const page = await paginateAll<Review>(
  async (pageToken) => {
    const response = await client.reviews.list("com.example.myapp", { token: pageToken });
    return {
      items: response.reviews,
      nextPageToken: response.tokenPagination?.nextPageToken,
    };
  },
  { limit: 250 },
);

console.log(page.items.length, page.nextPageToken);
```

### Stream Page by Page

`paginate` is an async generator, so a large listing never has to be held in memory at once.

```typescript
import { paginate } from "@gpc-cli/api";
import type { PlayApiClient, Review } from "@gpc-cli/api";

declare const client: PlayApiClient;

const pages = paginate<Review>(async (pageToken) => {
  const response = await client.reviews.list("com.example.myapp", {
    token: pageToken,
    maxResults: 100,
  });
  return {
    items: response.reviews,
    nextPageToken: response.tokenPagination?.nextPageToken,
  };
});

for await (const batch of pages) {
  console.log(`Processing ${batch.length} reviews`);
}
```

### Parallel Pagination

When you already hold several page tokens, fetch them concurrently. The concurrency limit keeps the burst inside the
rate limiter's budget.

```typescript
import { paginateParallel } from "@gpc-cli/api";
import type { PlayApiClient, Review } from "@gpc-cli/api";

declare const client: PlayApiClient;

const result = await paginateParallel<Review>(
  async (pageToken) => {
    const response = await client.reviews.list("com.example.myapp", {
      token: pageToken,
      maxResults: 100,
    });
    return {
      items: response.reviews,
      nextPageToken: response.tokenPagination?.nextPageToken,
    };
  },
  ["token1", "token2", "token3", "token4"],
  4, // concurrency limit (default: 4)
);

console.log(`Total reviews: ${result.items.length}`);
```

## Rate Limiting

Every client carries a token-bucket rate limiter. The bucket is chosen from the request path, so edits, purchases,
reviews, reporting, and monetization calls never spend each other's quota.

| Bucket         | Budget           | Paths                                                  |
| -------------- | ---------------- | ------------------------------------------------------ |
| `edits`        | 3,000 per minute | `/edits/...`                                           |
| `purchases`    | 3,000 per minute | `/purchases/...`, `/orders...`                         |
| `reviews`      | 3,000 per minute | `/reviews...`                                          |
| `reporting`    | 3,000 per minute | Play Developer Reporting metric sets, anomalies        |
| `monetization` | 3,000 per minute | `/subscriptions`, `/inappproducts`, `/onetimeproducts` |
| `default`      | 3,000 per minute | Everything else                                        |

Google also applies a 200,000 query daily cap across all buckets, which GPC tracks locally rather than in the limiter.

Pass your own limiter to share one budget across several clients, which is what you want when the API client and the
reporting client run in the same process:

```typescript
import { createApiClient, createRateLimiter, createReportingClient } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({ serviceAccountPath: "./sa.json" });
const rateLimiter = createRateLimiter();

const client = createApiClient({ auth, rateLimiter });
const reporting = createReportingClient({ auth, rateLimiter });

console.log(typeof client.edits.insert, typeof reporting.queryMetricSet);
```

`resolveBucket(path)` reports which bucket a path would use, and `RATE_LIMIT_BUCKETS` exposes the bucket definitions.

## Retry Logic

Transient failures are retried with exponential backoff and jitter, up to `maxRetries` (default 5).

```typescript
import { createApiClient } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({ serviceAccountPath: "./sa.json" });

const client = createApiClient({
  auth,
  maxRetries: 3,
  baseDelay: 1_000,
  maxDelay: 60_000,
  onRetry: (entry) => {
    console.warn(`attempt ${entry.attempt} ${entry.method} ${entry.path}: ${entry.error}`);
  },
});

console.log(typeof client.edits.insert);
```

- **401 Unauthorized:** the token is refreshed and the request is retried
- **408 Request Timeout, 429 Too Many Requests, 5xx:** retried with backoff
- **Other 4xx:** not retried, since repeating the call cannot change the answer
- **Network failures and client timeouts:** retried like a 5xx

## Error Handling

API failures throw `PlayApiError`, which carries a stable GPC code, the HTTP status, an actionable suggestion, and
Google's own message verbatim.

```typescript
import { PlayApiError } from "@gpc-cli/api";
import type { PlayApiClient } from "@gpc-cli/api";

declare const client: PlayApiClient;

try {
  await client.reviews.reply("com.example.myapp", "review-id", "Thanks!");
} catch (error) {
  if (error instanceof PlayApiError) {
    console.error(error.code); // "API_NOT_FOUND"
    console.error(error.statusCode); // 404
    console.error(error.suggestion); // actionable fix
    console.error(error.details); // Google's raw message, when present
    console.error(error.toJSON()); // structured error object
  } else {
    throw error;
  }
}
```

### Error Properties

| Property     | Type                  | Description                                    |
| ------------ | --------------------- | ---------------------------------------------- |
| `code`       | `string`              | GPC error code, for example `API_RATE_LIMITED` |
| `message`    | `string`              | Human-readable description                     |
| `statusCode` | `number \| undefined` | HTTP status code                               |
| `suggestion` | `string \| undefined` | Actionable fix                                 |
| `details`    | `string \| undefined` | Google's own message, kept verbatim            |
| `exitCode`   | `4`                   | Exit code the CLI uses for API errors          |

Auth failures throw `AuthError` from `@gpc-cli/auth` with the same shape and codes such as `AUTH_NO_CREDENTIALS`,
`AUTH_INVALID_KEY`, `AUTH_TOKEN_FAILED`, and `AUTH_FILE_NOT_FOUND`.

```typescript
import { AuthError, resolveAuth } from "@gpc-cli/auth";

try {
  await resolveAuth();
} catch (error) {
  if (error instanceof AuthError) {
    console.error(error.code);
    console.error(error.suggestion);
  } else {
    throw error;
  }
}
```

## Related

- [Architecture](/advanced/architecture) -- package graph and dependency flow
- [API coverage](/reference/api-coverage) -- every endpoint the client exposes
- [Error codes](/advanced/error-codes) -- full catalog with exit codes
