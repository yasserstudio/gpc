---
outline: deep
---

# SDK Usage

Use `@gpc-cli/api` and `@gpc-cli/auth` programmatically in your own Node.js applications. Build custom tooling, dashboards, or automation on top of the same typed API client that powers the GPC CLI.

## Installation

```bash
npm install @gpc-cli/api @gpc-cli/auth
```

Both packages are ESM-only and require Node.js 20+.

## Authentication Setup

### Service Account

```typescript
import { ServiceAccountAuth } from "@gpc-cli/auth";

const auth = new ServiceAccountAuth({
  keyFile: "./service-account.json",
});

// Or from environment variable
const auth = new ServiceAccountAuth({
  keyFile: process.env.GPC_SERVICE_ACCOUNT,
});

// Or from JSON string
const auth = new ServiceAccountAuth({
  credentials: JSON.parse(process.env.GPC_SERVICE_ACCOUNT!),
});
```

### Application Default Credentials (ADC)

Works automatically in Google Cloud environments (Cloud Run, GKE, Cloud Functions).

```typescript
import { AdcAuth } from "@gpc-cli/auth";

const auth = new AdcAuth();
```

### Getting an Access Token

All auth strategies implement the same interface:

```typescript
const token = await auth.getAccessToken();
// Returns: { token: "ya29.a0...", expiresAt: Date }
```

Tokens are cached and automatically refreshed on expiry.

## Creating an API Client

```typescript
import { PlayApiClient } from "@gpc-cli/api";
import { ServiceAccountAuth } from "@gpc-cli/auth";

const auth = new ServiceAccountAuth({
  keyFile: "./service-account.json",
});

const client = new PlayApiClient({
  auth,
  packageName: "com.example.myapp",
});
```

### Client Options

| Option        | Type           | Default  | Description                         |
| ------------- | -------------- | -------- | ----------------------------------- |
| `auth`        | `AuthStrategy` | required | Authentication provider             |
| `packageName` | `string`       | required | Android package name                |
| `rateLimit`   | `number`       | `50`     | Requests per second                 |
| `maxRetries`  | `number`       | `3`      | Retry count for transient errors    |
| `timeout`     | `number`       | `30000`  | Request timeout in milliseconds     |
| `baseDelay`   | `number`       | `1000`   | Base retry delay in milliseconds    |
| `maxDelay`    | `number`       | `60000`  | Maximum retry delay in milliseconds |
| `proxy`       | `string`       | --       | HTTPS proxy URL                     |
| `caCert`      | `string`       | --       | Custom CA certificate path          |

## Examples

### Upload an AAB

```typescript
import { PlayApiClient } from "@gpc-cli/api";
import { ServiceAccountAuth } from "@gpc-cli/auth";
import { readFileSync } from "node:fs";

const auth = new ServiceAccountAuth({ keyFile: "./sa.json" });
const client = new PlayApiClient({ auth, packageName: "com.example.myapp" });

// Open an edit
const edit = await client.edits.insert();

// Upload the bundle
const bundle = await client.edits.bundles.upload(edit.id, {
  file: readFileSync("./app-release.aab"),
});

console.log(`Uploaded version code: ${bundle.versionCode}`);

// Assign to internal track
await client.edits.tracks.update(edit.id, "internal", {
  releases: [
    {
      versionCodes: [bundle.versionCode],
      status: "completed",
      releaseNotes: [{ language: "en-US", text: "Bug fixes and improvements" }],
    },
  ],
});

// Validate and commit
await client.edits.validate(edit.id);
await client.edits.commit(edit.id);

console.log("Release committed successfully");
```

### List Reviews

```typescript
const reviews = await client.reviews.list({
  maxResults: 50,
});

for (const review of reviews.reviews) {
  const comment = review.comments[0].userComment;
  console.log(`[${comment.starRating}] ${comment.text}`);
}
```

### Reply to a Review

```typescript
await client.reviews.reply("review-id-123", {
  replyText: "Thank you for your feedback! We are working on a fix.",
});
```

### Get Vitals (Crash Rate)

The Reporting API uses a separate client:

```typescript
import { ReportingApiClient } from "@gpc-cli/api";
import { ServiceAccountAuth } from "@gpc-cli/auth";

const auth = new ServiceAccountAuth({ keyFile: "./sa.json" });
const reporting = new ReportingApiClient({ auth, packageName: "com.example.myapp" });

const crashes = await reporting.vitals.crashRate.query({
  dimensions: ["appVersion"],
  metrics: ["crashRate", "userPerceivedCrashRate"],
  timelineSpec: {
    aggregationPeriod: "DAILY",
    startTime: { year: 2026, month: 3, day: 1 },
    endTime: { year: 2026, month: 3, day: 9 },
  },
});

for (const row of crashes.rows) {
  console.log(`Version ${row.dimensions.appVersion}: ${row.metrics.crashRate}%`);
}
```

### Manage Subscriptions

```typescript
// List subscriptions
const subs = await client.monetization.subscriptions.list();

for (const sub of subs.subscriptions) {
  console.log(`${sub.productId}: ${sub.listings[0]?.title}`);
}

// Create a subscription
await client.monetization.subscriptions.create({
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
      autoRenewingBasePlanType: {
        billingPeriodDuration: "P1M",
      },
      regionalConfigs: [
        {
          regionCode: "US",
          price: { currencyCode: "USD", units: "9", nanos: 990000000 },
        },
      ],
    },
  ],
});
```

### Verify a Purchase

```typescript
// Verify a subscription purchase (v2 API)
const purchase = await client.purchases.subscriptionsV2.get(purchaseToken);

console.log(`Status: ${purchase.subscriptionState}`);
console.log(`Expiry: ${purchase.lineItems[0].expiryTime}`);

// Verify a one-time product purchase
const product = await client.purchases.products.get(purchaseToken);

console.log(`State: ${product.purchaseState}`);
console.log(`Acknowledged: ${product.acknowledgementState}`);

// Acknowledge a purchase
await client.purchases.products.acknowledge(purchaseToken);
```

### List Voided Purchases

```typescript
const voided = await client.purchases.voidedPurchases.list({
  startTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
  type: 1, // 0 = IAP only, 1 = IAP + subscriptions
});

for (const purchase of voided.voidedPurchases) {
  console.log(`Token: ${purchase.purchaseToken}, Reason: ${purchase.voidedReason}`);
}
```

## Pagination

API methods that return lists support pagination via `nextPageToken`:

```typescript
let pageToken: string | undefined;
const allReviews = [];

do {
  const page = await client.reviews.list({
    maxResults: 100,
    token: pageToken,
  });
  allReviews.push(...page.reviews);
  pageToken = page.tokenPagination?.nextPageToken;
} while (pageToken);

console.log(`Total reviews: ${allReviews.length}`);
```

### Pagination Helper

Use the built-in pagination helper for automatic iteration:

```typescript
import { paginate } from "@gpc-cli/api";

const allReviews = await paginate((token) => client.reviews.list({ maxResults: 100, token }));

console.log(`Total reviews: ${allReviews.length}`);
```

## Rate Limiting

The API client includes a built-in rate limiter. By default, requests are limited to 50 per second (well under Google's 3,000/minute quota).

```typescript
const client = new PlayApiClient({
  auth,
  packageName: "com.example.myapp",
  rateLimit: 20, // 20 requests per second
});
```

Rate limits are applied per client instance. If you need different limits for different API endpoints, create separate client instances.

### Quota Buckets

Google Play API quotas are per-bucket:

| Bucket                            | Limit             | Endpoints                                   |
| --------------------------------- | ----------------- | ------------------------------------------- |
| Publishing, Monetization, Reviews | 3,000/min         | Edits, Listings, Tracks, IAP, Subscriptions |
| Reviews (GET)                     | 200/hour          | `reviews.list`, `reviews.get`               |
| Reviews (POST)                    | 2,000/day         | `reviews.reply`                             |
| Voided Purchases                  | 6,000/day, 30/30s | `voidedPurchases.list`                      |

The API client automatically applies appropriate rate limits per endpoint category.

## Retry Logic

Transient errors (HTTP 429, 5xx) are automatically retried with exponential backoff and jitter.

```typescript
const client = new PlayApiClient({
  auth,
  packageName: "com.example.myapp",
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 60000,
});
```

- **429 (Rate Limited):** Retried with exponential backoff, respecting `Retry-After` headers
- **5xx (Server Error):** Retried up to `maxRetries` times
- **4xx (Client Error):** Not retried (except 429)

## Error Handling

API errors are thrown as typed exceptions:

```typescript
import { ApiError, RateLimitError, NotFoundError } from "@gpc-cli/api";

try {
  await client.reviews.reply("review-id", { replyText: "Thanks!" });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter}s`);
  } else if (error instanceof NotFoundError) {
    console.log("Review not found");
  } else if (error instanceof ApiError) {
    console.log(`API error ${error.status}: ${error.message}`);
  } else {
    throw error;
  }
}
```

### Error Properties

| Property     | Type     | Description                           |
| ------------ | -------- | ------------------------------------- |
| `code`       | `string` | Error code (e.g., `API_RATE_LIMITED`) |
| `message`    | `string` | Human-readable description            |
| `status`     | `number` | HTTP status code                      |
| `suggestion` | `string` | Actionable fix                        |
| `retryAfter` | `number` | Seconds to wait (rate limit errors)   |
