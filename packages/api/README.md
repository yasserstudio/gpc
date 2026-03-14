# @gpc-cli/api

Typed Google Play Developer API v3 client for TypeScript. Part of [GPC](https://github.com/yasserstudio/gpc).

187 API endpoints — edits, releases, tracks, listings, images, subscriptions, in-app products, purchases, reviews, vitals, reports, users, and testers. Built-in rate limiting, retry logic, and pagination.

## Install

```bash
npm install @gpc-cli/api @gpc-cli/auth
```

## Quick Start

```typescript
import { createApiClient } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({
  serviceAccountPath: "./service-account.json",
});

const client = createApiClient({ auth });

// List all tracks
const edit = await client.edits.insert("com.example.app");
const tracks = await client.tracks.list("com.example.app", edit.id);
console.log(tracks);

await client.edits.delete("com.example.app", edit.id);
```

## Client Factories

| Factory | Purpose |
| --- | --- |
| `createApiClient(options)` | Core Play API -- apps, releases, listings, monetization, purchases |
| `createReportingClient(options)` | Vitals, crash rates, ANR, error reporting |
| `createUsersClient(options)` | Developer account users and permission grants |
| `createHttpClient(options)` | Low-level HTTP with auth, retry, and rate limiting |

All factories accept `ApiClientOptions`:

```typescript
import type { ApiClientOptions } from "@gpc-cli/api";

const options: ApiClientOptions = {
  auth,                    // Required: { getAccessToken(): Promise<string> }
  maxRetries: 3,           // Default retry count
  timeout: 30_000,         // Request timeout in ms
  rateLimiter: undefined,  // Optional custom rate limiter
  onRetry: (entry) => console.warn(`Retry #${entry.attempt}: ${entry.error}`),
};
```

## API Modules

### Edits

Every modification to app metadata, tracks, or listings requires an edit session.

```typescript
const edit = await client.edits.insert("com.example.app");

// ... make changes within the edit ...

await client.edits.validate("com.example.app", edit.id);
await client.edits.commit("com.example.app", edit.id);
```

### Bundles

```typescript
const edit = await client.edits.insert("com.example.app");
const bundle = await client.bundles.upload("com.example.app", edit.id, "./app.aab");
const bundles = await client.bundles.list("com.example.app", edit.id);
await client.edits.commit("com.example.app", edit.id);
```

### Tracks & Releases

```typescript
const edit = await client.edits.insert("com.example.app");

const tracks = await client.tracks.list("com.example.app", edit.id);
const production = await client.tracks.get("com.example.app", edit.id, "production");

await client.tracks.update("com.example.app", edit.id, "production", {
  versionCodes: ["42"],
  status: "inProgress",
  userFraction: 0.1,
  releaseNotes: [{ language: "en-US", text: "Bug fixes" }],
});

await client.edits.commit("com.example.app", edit.id);
```

### Listings

```typescript
const edit = await client.edits.insert("com.example.app");

const listings = await client.listings.list("com.example.app", edit.id);
const en = await client.listings.get("com.example.app", edit.id, "en-US");

await client.listings.update("com.example.app", edit.id, "en-US", {
  title: "My App",
  shortDescription: "A great app",
  fullDescription: "Full description here...",
});

await client.edits.commit("com.example.app", edit.id);
```

### Images

```typescript
const edit = await client.edits.insert("com.example.app");

const screenshots = await client.images.list(
  "com.example.app", edit.id, "en-US", "phoneScreenshots",
);

await client.images.upload(
  "com.example.app", edit.id, "en-US", "featureGraphic", "./feature.png",
);

await client.images.deleteAll("com.example.app", edit.id, "en-US", "phoneScreenshots");
await client.edits.commit("com.example.app", edit.id);
```

Image types: `phoneScreenshots`, `sevenInchScreenshots`, `tenInchScreenshots`, `tvScreenshots`, `wearScreenshots`, `icon`, `featureGraphic`, `tvBanner`.

### Subscriptions

```typescript
const { subscriptions } = await client.subscriptions.list("com.example.app");
const sub = await client.subscriptions.get("com.example.app", "premium_monthly");

await client.subscriptions.activateBasePlan("com.example.app", "premium_monthly", "p1m");
await client.subscriptions.deactivateBasePlan("com.example.app", "premium_monthly", "p1m");
```

### Subscription Offers

```typescript
const { subscriptionOffers } = await client.subscriptions.listOffers(
  "com.example.app", "premium_monthly", "p1m",
);

const offer = await client.subscriptions.getOffer(
  "com.example.app", "premium_monthly", "p1m", "intro_offer",
);

await client.subscriptions.activateOffer(
  "com.example.app", "premium_monthly", "p1m", "intro_offer",
);
```

### In-App Products

```typescript
const { inappproduct } = await client.inappproducts.list("com.example.app");
const product = await client.inappproducts.get("com.example.app", "coins_100");

await client.inappproducts.create("com.example.app", {
  sku: "coins_500",
  status: "active",
  purchaseType: "managedUser",
  defaultPrice: { currencyCode: "USD", units: "4", nanos: 990_000_000 },
});
```

### Purchases

```typescript
// Verify a product purchase
const purchase = await client.purchases.getProduct(
  "com.example.app", "coins_100", purchaseToken,
);

// Acknowledge it
await client.purchases.acknowledgeProduct("com.example.app", "coins_100", purchaseToken);

// Verify a subscription (v2)
const sub = await client.purchases.getSubscriptionV2("com.example.app", purchaseToken);

// List voided purchases
const { voidedPurchases } = await client.purchases.listVoided("com.example.app", {
  startTime: "1700000000000",
  maxResults: 100,
});
```

### Reviews

```typescript
const { reviews } = await client.reviews.list("com.example.app", { maxResults: 50 });
const review = await client.reviews.get("com.example.app", reviewId);
await client.reviews.reply("com.example.app", reviewId, "Thanks for the feedback!");
```

### Vitals & Error Reporting

Uses a separate client that targets the Play Developer Reporting API.

```typescript
import { createReportingClient } from "@gpc-cli/api";

const reporting = createReportingClient({ auth });

// Query crash rate
const crashes = await reporting.queryMetricSet("com.example.app", "crashRateMetricSet", {
  metrics: ["crashRate", "userPerceivedCrashRate"],
  timelineSpec: {
    aggregationPeriod: "DAILY",
    startTime: { year: 2026, month: 1, day: 1 },
    endTime: { year: 2026, month: 3, day: 1 },
  },
});

// Detect anomalies
const { anomalies } = await reporting.getAnomalies("com.example.app");

// Search error issues
const { errorIssues } = await reporting.searchErrorIssues("com.example.app");
```

Available metric sets: `crashRateMetricSet`, `anrRateMetricSet`, `excessiveWakeupRateMetricSet`, `stuckBackgroundWakelockRateMetricSet`, `slowStartRateMetricSet`, `slowRenderingRateMetricSet`, `errorCountMetricSet`.

### Reports

```typescript
const { reports } = await client.reports.list("com.example.app", "earnings", 2026, 2);
```

Report types: `earnings`, `sales`, `estimated_sales`, `installs`, `crashes`, `ratings`, `reviews`, `store_performance`, `subscriptions`, `play_balance`.

### Users & Grants

Uses a separate client for developer account management.

```typescript
import { createUsersClient } from "@gpc-cli/api";

const users = createUsersClient({ auth });

const { users: devUsers } = await users.list(developerId);
const user = await users.get(developerId, userId);

await users.create(developerId, {
  email: "dev@example.com",
  developerAccountPermission: ["CAN_MANAGE_PUBLIC_APKS", "CAN_REPLY_TO_REVIEWS"],
});
```

### Testers

```typescript
const edit = await client.edits.insert("com.example.app");
const testers = await client.testers.get("com.example.app", edit.id, "internal");

await client.testers.update("com.example.app", edit.id, "internal", {
  googleGroups: ["testers@example.com"],
});

await client.edits.commit("com.example.app", edit.id);
```

### Monetization

```typescript
const { convertedRegionPrices } = await client.monetization.convertRegionPrices(
  "com.example.app",
  { price: { currencyCode: "USD", units: "9", nanos: 990_000_000 } },
);
```

### Deobfuscation

```typescript
const edit = await client.edits.insert("com.example.app");
await client.deobfuscation.upload("com.example.app", edit.id, 42, "./mapping.txt");
await client.edits.commit("com.example.app", edit.id);
```

## Pagination

Built-in helpers for paginated endpoints:

```typescript
import { paginateAll } from "@gpc-cli/api";

const allReviews = await paginateAll(async (pageToken) => {
  const response = await client.reviews.list("com.example.app", {
    token: pageToken,
    maxResults: 100,
  });
  return {
    items: response.reviews,
    nextPageToken: response.tokenPagination?.nextPageToken,
  };
});
```

## Type Exports

All Google Play API types are exported for use in your own code:

```typescript
import type {
  PlayApiClient,
  ReportingApiClient,
  UsersApiClient,
  ApiClientOptions,
  Track,
  Release,
  ReleaseStatus,
  Bundle,
  Listing,
  Subscription,
  BasePlan,
  SubscriptionOffer,
  InAppProduct,
  Review,
  ProductPurchase,
  SubscriptionPurchaseV2,
  VoidedPurchase,
  MetricSetQuery,
  MetricSetResponse,
  ErrorIssue,
  User,
  Grant,
  ImageType,
  Money,
} from "@gpc-cli/api";
```

## Error Handling

API errors throw `ApiError` with a code, HTTP status, and actionable suggestion:

```typescript
import { ApiError } from "@gpc-cli/api";

try {
  await client.tracks.get("com.example.app", editId, "production");
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.code);       // e.g. "API_NOT_FOUND"
    console.error(error.statusCode);  // e.g. 404
    console.error(error.suggestion);  // actionable fix
    console.error(error.toJSON());    // structured error object
  }
}
```

Retries are automatic for 429 (rate limit) and 5xx errors with exponential backoff and jitter.

## Documentation

- [Full documentation](https://yasserstudio.github.io/gpc/)
- [SDK usage guide](https://yasserstudio.github.io/gpc/advanced/sdk-usage.html)

## License

MIT
