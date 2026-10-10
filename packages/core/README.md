# @gpc-cli/core

Business logic and command orchestration for [GPC](https://github.com/yasserstudio/gpc) — the complete CLI for Google Play.

Need to integrate Play operations into your own tools or services? Use `@gpc-cli/core` to call GPC commands programmatically — same logic the CLI uses, no terminal required.

## Install

```bash
npm install @gpc-cli/core
```

## Usage

```typescript
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient, createReportingClient } from "@gpc-cli/api";
import {
  uploadRelease,
  promoteRelease,
  getVitalsCrashes,
  latestWorstValue,
  listReviews,
  analyzeBundle,
  formatOutput,
} from "@gpc-cli/core";

const auth = await resolveAuth({ serviceAccountPath: "./play-sa.json" });
const client = createApiClient({ auth });
const reporting = createReportingClient({ auth });
const app = "com.example.app";

// Upload a release (validateOnly: server-side validation without committing)
await uploadRelease(client, app, "app.aab", { track: "internal", validateOnly: true });

// Promote between tracks at a 10% staged rollout
await promoteRelease(client, app, "internal", "production", { userFraction: 0.1 });

// Gate on vitals: rates are fractions (0.02 = 2%)
const crashes = await getVitalsCrashes(reporting, app, { days: 7 });
const crashRate = latestWorstValue(crashes.rows, "crashRate");
if (crashRate !== undefined && crashRate > 0.02) process.exitCode = 6;

// Recent reviews as a table (also: "json", "csv", "tsv")
const { reviews } = await listReviews(client, app);
console.log(formatOutput(reviews, "table"));

// Analyze bundle size offline
const analysis = await analyzeBundle("./app.aab");
```

## Command Groups

| Group             | Functions                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Releases**      | `uploadRelease`, `promoteRelease`, `updateRollout`, `getReleasesStatus`, `listTracks`                                                                                                      |
| **Listings**      | `getListings`, `updateListing`, `pullListings`, `pushListings`, `diffListings`                                                                                                             |
| **Images**        | `listImages`, `uploadImage`, `deleteImage`                                                                                                                                                 |
| **Reviews**       | `listReviews`, `getReview`, `replyToReview`, `exportReviews`                                                                                                                               |
| **Vitals**        | `getVitalsOverview`, `getVitalsCrashes`, `getVitalsAnr`, `getVitalsStartup`, `compareVitalsTrend`, `checkThreshold`, `latestWorstValue`, `readMetricValue`                                 |
| **Subscriptions** | `listSubscriptions`, `createSubscription`, `updateSubscription`, `deleteSubscription`, `listOffers`, `createOffer`                                                                         |
| **IAP**           | `listInAppProducts`, `createInAppProduct`, `syncInAppProducts`                                                                                                                             |
| **Purchases**     | `getProductPurchase`, `acknowledgeProductPurchase`, `refundOrder`                                                                                                                          |
| **Reports**       | `listReports`, `downloadStatsReport`, `downloadFinancialReport` (Play bulk reports via GCS)                                                                                                |
| **Users**         | `listUsers`, `inviteUser`, `updateUser`, `removeUser`                                                                                                                                      |
| **Testers**       | `listTesters`, `addTesters`, `removeTesters`, `importTestersFromCsv`                                                                                                                       |
| **Bundle**        | `analyzeBundle`, `compareBundles` (zero-dependency AAB/APK size analysis)                                                                                                                  |
| **Publishing**    | `publish` (end-to-end: upload + track + notes + commit; supports `validateOnly` dry-run)                                                                                                   |
| **Changelog**     | `generateChangelog`, `fetchChangelog`, `formatChangelogEntry`, `buildLocaleBundle`, `renderPlayStore`, `renderMarkdown`, `renderJson`, `renderPrompt`, `translateBundle`, `resolveLocales` |
| **Validation**    | `validateUploadFile`, `validateImage`, `validatePreSubmission`                                                                                                                             |

## Utilities

- **Output formatting** - `formatOutput(data, format)` supports `"json"`, `"table"`, `"csv"`, `"tsv"`; plus `detectOutputFormat()`, `redactSensitive()`
- **Error hierarchy** — `GpcError`, `ConfigError`, `ApiError`, `NetworkError` with exit codes
- **Audit logging** — `initAudit()`, `writeAuditLog()` for write operation tracking
- **Path safety** — `safePath()`, `safePathWithin()` for path traversal prevention
- **Plugin management** — `PluginManager`, `discoverPlugins()`, `scaffoldPlugin()`

## Documentation

- [Full documentation](https://yasserstudio.github.io/gpc/)
- [Architecture](https://yasserstudio.github.io/gpc/advanced/architecture)

## Licensing

MIT-licensed open source and free to use. Source code is on GitHub at [yasserstudio/gpc](https://github.com/yasserstudio/gpc).
