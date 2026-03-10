# @gpc-cli/api

Typed client for Google Play Developer API v3. Covers 162 endpoints with built-in rate limiting, retry logic, and pagination.

## Install

```bash
npm install @gpc-cli/api @gpc-cli/auth
```

## Usage

```typescript
import { createApiClient, createReportingClient } from "@gpc-cli/api";
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({
  serviceAccount: "./service-account.json",
});

const client = createApiClient({ auth });

// List apps
const apps = await client.apps.list();

// Get tracks
const tracks = await client.tracks.list("com.example.app");

// Upload a bundle
const edit = await client.edits.insert("com.example.app");
const upload = await client.edits.bundles.upload("com.example.app", edit.id, buffer);
await client.edits.commit("com.example.app", edit.id);
```

## Clients

| Factory                   | Base URL                                | Purpose                                                |
| ------------------------- | --------------------------------------- | ------------------------------------------------------ |
| `createApiClient()`       | `androidpublisher.googleapis.com`       | Core Play API (apps, releases, listings, monetization) |
| `createReportingClient()` | `playdeveloperreporting.googleapis.com` | Vitals, crashes, ANR, errors                           |
| `createUsersClient()`     | `androidpublisher.googleapis.com`       | Developer account users and grants                     |
| `createHttpClient()`      | Custom                                  | Low-level HTTP with auth, retry, rate limiting         |

## Features

- **Rate limiting** — per-bucket token bucket respecting Google's quota buckets
- **Retry logic** — exponential backoff with jitter on 429/5xx
- **Pagination** — `paginate()` and `paginateAll()` helpers for auto-following `nextPageToken`
- **Edit lifecycle** — insert, modify, validate, commit/delete
- **80+ TypeScript types** — fully typed requests and responses

## Types

All Google Play API types are exported:

```typescript
import type {
  Track,
  Release,
  Listing,
  Subscription,
  InAppProduct,
  Review,
  AppDetails,
} from "@gpc-cli/api";
```

## Part of the GPC Monorepo

This is the API layer for [GPC](https://github.com/yasserstudio/gpc). Use it standalone in your own tools, or use the full CLI.

## License

MIT
