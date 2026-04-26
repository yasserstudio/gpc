# @gpc-cli/core

Business logic and command orchestration for [GPC](https://github.com/yasserstudio/gpc) — the complete CLI for Google Play.

Need to integrate Play operations into your own tools or services? Use `@gpc-cli/core` to call GPC commands programmatically — same logic the CLI uses, no terminal required.

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
  analyzeBundle,
  formatOutput,
} from "@gpc-cli/core";

// Upload a release
const result = await uploadRelease(context, {
  file: "app.aab",
  track: "internal",
  validateOnly: true, // dry-run: server-side validation without committing
});

// Promote between tracks
await promoteRelease(context, {
  from: "internal",
  to: "production",
  rollout: 0.1,
});

// Check vitals
const vitals = await getVitalsOverview(context);
console.log(formatOutput(vitals, "table")); // also: "json", "csv", "tsv"

// Analyze bundle size
const analysis = await analyzeBundle("./app.aab");
```

## Command Groups

| Group             | Functions                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Releases**      | `uploadRelease`, `promoteRelease`, `updateRollout`, `getReleasesStatus`, `listTracks`                                                                                                      |
| **Listings**      | `getListings`, `updateListing`, `pullListings`, `pushListings`, `diffListings`                                                                                                             |
| **Images**        | `listImages`, `uploadImage`, `deleteImage`                                                                                                                                                 |
| **Reviews**       | `listReviews`, `getReview`, `replyToReview`, `exportReviews`                                                                                                                               |
| **Vitals**        | `getVitalsOverview`, `getVitalsCrashes`, `getVitalsAnr`, `getVitalsStartup`, `compareVitalsTrend`, `checkThreshold`                                                                        |
| **Subscriptions** | `listSubscriptions`, `createSubscription`, `updateSubscription`, `deleteSubscription`, `listOffers`, `createOffer`                                                                         |
| **IAP**           | `listInAppProducts`, `createInAppProduct`, `syncInAppProducts`                                                                                                                             |
| **Purchases**     | `getProductPurchase`, `acknowledgeProductPurchase`, `refundOrder`                                                                                                                          |
| **Reports**       | `listReports`, `downloadReport`                                                                                                                                                            |
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

Free to use. Source code is on GitHub at [yasserstudio/gpc](https://github.com/yasserstudio/gpc).
