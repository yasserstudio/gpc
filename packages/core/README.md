# @gpc-cli/core

Business logic and command orchestration for GPC. Contains all command implementations, validation, output formatting, and plugin management.

## Install

```bash
npm install @gpc-cli/core
```

## Usage

```typescript
import {
  uploadRelease,
  promoteRelease,
  getVitalsOverview,
  listReviews,
  formatOutput,
} from "@gpc-cli/core";

// Upload a release
const result = await uploadRelease(context, {
  file: "app.aab",
  track: "internal",
});

// Promote between tracks
await promoteRelease(context, {
  from: "internal",
  to: "production",
  rollout: 0.1,
});

// Check vitals
const vitals = await getVitalsOverview(context);

// Format output
console.log(formatOutput(vitals, "table"));
```

## Command Groups

| Group             | Functions                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Releases**      | `uploadRelease`, `promoteRelease`, `updateRollout`, `getReleasesStatus`, `listTracks`                               |
| **Listings**      | `getListings`, `updateListing`, `pullListings`, `pushListings`, `diffListings`                                      |
| **Images**        | `listImages`, `uploadImage`, `deleteImage`                                                                          |
| **Reviews**       | `listReviews`, `getReview`, `replyToReview`, `exportReviews`                                                        |
| **Vitals**        | `getVitalsOverview`, `getVitalsCrashes`, `getVitalsAnr`, `getVitalsStartup`, `compareVitalsTrend`, `checkThreshold` |
| **Subscriptions** | `listSubscriptions`, `createSubscription`, `updateSubscription`, `deleteSubscription`, `listOffers`, `createOffer`  |
| **IAP**           | `listInAppProducts`, `createInAppProduct`, `syncInAppProducts`                                                      |
| **Purchases**     | `getProductPurchase`, `acknowledgeProductPurchase`, `refundOrder`                                                   |
| **Reports**       | `listReports`, `downloadReport`                                                                                     |
| **Users**         | `listUsers`, `inviteUser`, `updateUser`, `removeUser`                                                               |
| **Testers**       | `listTesters`, `addTesters`, `removeTesters`, `importTestersFromCsv`                                                |
| **Publishing**    | `publish` (end-to-end: upload + track + notes + commit)                                                             |
| **Validation**    | `validateUploadFile`, `validateImage`, `validatePreSubmission`                                                      |

## Utilities

- **Output formatting** — `formatOutput()`, `detectOutputFormat()`, `redactSensitive()`
- **Error hierarchy** — `GpcError`, `ConfigError`, `ApiError`, `NetworkError` with exit codes
- **Audit logging** — `initAudit()`, `writeAuditLog()` for write operation tracking
- **Path safety** — `safePath()`, `safePathWithin()` for path traversal prevention
- **Plugin management** — `PluginManager`, `discoverPlugins()`, `scaffoldPlugin()`

## Part of the GPC Monorepo

This is the core logic layer for [GPC](https://github.com/yasserstudio/gpc). The CLI calls into core; core calls into api, auth, and config.

## License

MIT
