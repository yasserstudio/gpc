# @gpc-cli/api

Typed Google Play Developer API v3 client for TypeScript. Part of [GPC](https://github.com/yasserstudio/gpc).

215 endpoints across edits, releases, tracks, listings, subscriptions, in-app products, purchases, reviews, vitals, reports, users, and testers. Built-in rate limiting, retry logic, and pagination.

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

const edit = await client.edits.insert("com.example.app");
const tracks = await client.tracks.list("com.example.app", edit.id);
console.log(tracks);
await client.edits.delete("com.example.app", edit.id);
```

## Client Factories

| Factory                          | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `createApiClient(options)`       | Core Play API: apps, releases, listings, monetization, purchases |
| `createReportingClient(options)` | Vitals, crash rates, ANR, error reporting                        |
| `createUsersClient(options)`     | Developer account users and permission grants                    |
| `createHttpClient(options)`      | Low-level HTTP with auth, retry, and rate limiting               |

```typescript
const options: ApiClientOptions = {
  auth, // Required: { getAccessToken(): Promise<string> }
  maxRetries: 3, // Default retry count
  timeout: 30_000, // Request timeout in ms
  onRetry: (entry) => console.warn(`Retry #${entry.attempt}`),
};
```

## Common Workflows

### Upload and release

```typescript
const edit = await client.edits.insert("com.example.app");
await client.bundles.upload("com.example.app", edit.id, "./app.aab");
await client.tracks.update("com.example.app", edit.id, "beta", {
  versionCodes: ["42"],
  status: "completed",
  releaseNotes: [{ language: "en-US", text: "Bug fixes" }],
});
await client.edits.commit("com.example.app", edit.id);
```

### Query crash rates

```typescript
import { createReportingClient } from "@gpc-cli/api";

const reporting = createReportingClient({ auth });
const crashes = await reporting.queryMetricSet("com.example.app", "crashRateMetricSet", {
  metrics: ["crashRate", "userPerceivedCrashRate"],
  timelineSpec: {
    aggregationPeriod: "DAILY",
    startTime: { year: 2026, month: 1, day: 1 },
    endTime: { year: 2026, month: 3, day: 1 },
  },
});
```

### Manage subscriptions

```typescript
const { subscriptions } = await client.subscriptions.list("com.example.app");
await client.subscriptions.activateBasePlan("com.example.app", "premium_monthly", "p1m");
```

### Verify purchases

```typescript
const purchase = await client.purchases.getProduct("com.example.app", "coins_100", token);
await client.purchases.acknowledgeProduct("com.example.app", "coins_100", token);
```

## All API Modules

| Module                        | Methods                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `client.edits`                | insert, get, validate, commit, delete                                                     |
| `client.bundles`              | upload, list                                                                              |
| `client.tracks`               | list, get, update                                                                         |
| `client.listings`             | list, get, update, delete, deleteAll                                                      |
| `client.images`               | list, upload, delete, deleteAll                                                           |
| `client.subscriptions`        | list, get, create, patch, archive, activate/deactivate base plans and offers              |
| `client.inappproducts`        | list, get, create, update, delete, batchGet, batchUpdate, batchDelete                     |
| `client.oneTimeProducts`      | list, get, create, patch, delete, batchGet, batchUpdate, batchDelete                      |
| `client.purchases`            | getProduct, acknowledgeProduct, getSubscriptionV2, revokeSubscription, refund, listVoided |
| `client.reviews`              | list, get, reply                                                                          |
| `client.testers`              | get, update                                                                               |
| `client.reports`              | list                                                                                      |
| `client.monetization`         | convertRegionPrices                                                                       |
| `client.deobfuscation`        | upload                                                                                    |
| `client.expansionFiles`       | get, update, patch, upload                                                                |
| `client.dataSafety`           | get, update                                                                               |
| `client.deviceTiers`          | list, get, create                                                                         |
| `client.internalSharing`      | uploadBundle, uploadApk                                                                   |
| `client.generatedApks`        | list, download                                                                            |
| `client.externalTransactions` | create, get, refund                                                                       |
| `client.appRecovery`          | create, deploy, cancel, list                                                              |
| `reporting.*`                 | queryMetricSet, getAnomalies, searchErrorIssues, searchErrorReports                       |
| `users.*`                     | list, get, create, patch, delete, listGrants, createGrant, patchGrant, deleteGrant        |

## Pagination

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

## Error Handling

API errors throw `ApiError` with a code, HTTP status, and actionable suggestion. Retries are automatic for 429 and 5xx with exponential backoff and jitter.

```typescript
import { ApiError } from "@gpc-cli/api";

try {
  await client.tracks.get("com.example.app", editId, "production");
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.code); // "API_NOT_FOUND"
    console.error(error.statusCode); // 404
    console.error(error.suggestion); // actionable fix
  }
}
```

## Type Exports

All Google Play API types are exported:

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

## Documentation

- [Full documentation](https://yasserstudio.github.io/gpc/)
- [SDK usage guide](https://yasserstudio.github.io/gpc/advanced/sdk-usage)
- [API coverage map](https://yasserstudio.github.io/gpc/reference/api-coverage)

## License

MIT
