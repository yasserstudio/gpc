# Google Play Developer API v3 — Coverage Map

Maps every Google Play Developer API v3 endpoint to a GPC CLI command.

Reference: https://developers.google.com/android-publisher/api-ref/rest

---

## Edits

The Edits resource is the transactional wrapper for most write operations. An edit must be created, modified, then committed or deleted.

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.insert` | POST | (internal — auto-managed) | 2 |
| `edits.get` | GET | (internal) | 2 |
| `edits.commit` | POST | (internal — auto on success) | 2 |
| `edits.validate` | POST | (internal — pre-commit check) | 2 |
| `edits.delete` | DELETE | (internal — auto on failure) | 2 |

> Edits are managed internally by `@gpc-cli/api`. Users never interact with edits directly — the CLI creates, uses, and commits/deletes them transparently.

## Edits: Bundles

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.bundles.list` | GET | `gpc releases list --type bundle` | 2 |
| `edits.bundles.upload` | POST | `gpc releases upload <file.aab>` | 2 |

## Edits: APKs

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.apks.list` | GET | `gpc releases list --type apk` | 2 |
| `edits.apks.upload` | POST | `gpc releases upload <file.apk>` | 2 |
| `edits.apks.addexternallyhosted` | POST | `gpc releases upload --externally-hosted` | 2 |

## Edits: Tracks

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.tracks.list` | GET | `gpc tracks list` | 2 |
| `edits.tracks.get` | GET | `gpc tracks get <track>` | 2 |
| `edits.tracks.update` | PUT | `gpc tracks update <track>` | 2 |
| `edits.tracks.create` | POST | `gpc tracks create <name>` | 2 |

## Edits: Deobfuscationfiles

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.deobfuscationfiles.upload` | POST | `gpc releases upload --mapping <file>` | 2 |

## Edits: Expansion Files

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.expansionfiles.get` | GET | `gpc releases expansion get` | 2 |
| `edits.expansionfiles.update` | PUT | `gpc releases expansion update` | 2 |
| `edits.expansionfiles.upload` | POST | `gpc releases expansion upload` | 2 |

## Edits: Listings

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.listings.list` | GET | `gpc listings get --all-languages` | 4 |
| `edits.listings.get` | GET | `gpc listings get --lang <lang>` | 4 |
| `edits.listings.update` | PUT | `gpc listings update --lang <lang>` | 4 |
| `edits.listings.delete` | DELETE | `gpc listings delete --lang <lang>` | 4 |
| `edits.listings.deleteall` | DELETE | `gpc listings delete --all` | 4 |
| `edits.listings.patch` | PATCH | `gpc listings update --lang <lang> --patch` | 4 |

## Edits: Images

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.images.list` | GET | `gpc listings images list` | 4 |
| `edits.images.upload` | POST | `gpc listings images upload` | 4 |
| `edits.images.delete` | DELETE | `gpc listings images delete` | 4 |
| `edits.images.deleteall` | DELETE | `gpc listings images delete --all` | 4 |

## Edits: Details

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.details.get` | GET | `gpc apps info <package>` | 2 |
| `edits.details.update` | PUT | `gpc apps update <package>` | 4 |
| `edits.details.patch` | PATCH | `gpc apps update <package> --patch` | 4 |

## Edits: Country Availability

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.countryavailability.get` | GET | `gpc listings availability` | 4 |

## Edits: Testers

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `edits.testers.get` | GET | `gpc testers list --track <track>` | 7 |
| `edits.testers.update` | PUT | `gpc testers add/remove` | 7 |
| `edits.testers.patch` | PATCH | `gpc testers update` | 7 |

---

## Reviews

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `reviews.list` | GET | `gpc reviews list` | 5 |
| `reviews.get` | GET | `gpc reviews get <id>` | 5 |
| `reviews.reply` | POST | `gpc reviews reply <id>` | 5 |

---

## In-App Products

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `inappproducts.list` | GET | `gpc iap list` | 6 |
| `inappproducts.get` | GET | `gpc iap get <sku>` | 6 |
| `inappproducts.insert` | POST | `gpc iap create` | 6 |
| `inappproducts.update` | PUT | `gpc iap update <sku>` | 6 |
| `inappproducts.delete` | DELETE | `gpc iap delete <sku>` | 6 |
| `inappproducts.patch` | PATCH | `gpc iap update <sku> --patch` | 6 |
| `inappproducts.batch` | POST | `gpc iap sync` | 6 |

---

## Monetization: Subscriptions

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `monetization.subscriptions.list` | GET | `gpc subscriptions list` | 6 |
| `monetization.subscriptions.get` | GET | `gpc subscriptions get <id>` | 6 |
| `monetization.subscriptions.create` | POST | `gpc subscriptions create` | 6 |
| `monetization.subscriptions.patch` | PATCH | `gpc subscriptions update <id>` | 6 |
| `monetization.subscriptions.delete` | DELETE | `gpc subscriptions delete <id>` | 6 |
| `monetization.subscriptions.archive` | POST | `gpc subscriptions archive <id>` | 6 |

## Monetization: Base Plans

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `monetization.subscriptions.basePlans.activate` | POST | `gpc subscriptions base-plans activate` | 6 |
| `monetization.subscriptions.basePlans.deactivate` | POST | `gpc subscriptions base-plans deactivate` | 6 |
| `monetization.subscriptions.basePlans.delete` | DELETE | `gpc subscriptions base-plans delete` | 6 |
| `monetization.subscriptions.basePlans.migratePrices` | POST | `gpc subscriptions base-plans migrate-prices` | 6 |
| `monetization.subscriptions.basePlans.batchUpdate` | POST | `gpc subscriptions base-plans sync` | 6 |
| `monetization.subscriptions.basePlans.batchMigratePrices` | POST | `gpc subscriptions base-plans migrate-prices --batch` | 6 |

## Monetization: Offers

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `monetization.subscriptions.basePlans.offers.list` | GET | `gpc subscriptions offers list` | 6 |
| `monetization.subscriptions.basePlans.offers.get` | GET | `gpc subscriptions offers get` | 6 |
| `monetization.subscriptions.basePlans.offers.create` | POST | `gpc subscriptions offers create` | 6 |
| `monetization.subscriptions.basePlans.offers.patch` | PATCH | `gpc subscriptions offers update` | 6 |
| `monetization.subscriptions.basePlans.offers.delete` | DELETE | `gpc subscriptions offers delete` | 6 |
| `monetization.subscriptions.basePlans.offers.activate` | POST | `gpc subscriptions offers activate` | 6 |
| `monetization.subscriptions.basePlans.offers.deactivate` | POST | `gpc subscriptions offers deactivate` | 6 |
| `monetization.subscriptions.basePlans.offers.batchUpdate` | POST | `gpc subscriptions offers sync` | 6 |
| `monetization.subscriptions.basePlans.offers.batchGet` | POST | `gpc subscriptions offers get --batch` | 6 |

---

## Purchases

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `purchases.products.get` | GET | `gpc purchases get <token>` | 6 |
| `purchases.products.acknowledge` | POST | `gpc purchases acknowledge <token>` | 6 |
| `purchases.products.consume` | POST | `gpc purchases consume <token>` | 6 |
| `purchases.subscriptions.get` | GET | `gpc purchases subscription get <token>` | 6 |
| `purchases.subscriptions.acknowledge` | POST | `gpc purchases subscription acknowledge <token>` | 6 |
| `purchases.subscriptions.cancel` | POST | `gpc purchases subscription cancel <token>` | 6 |
| `purchases.subscriptions.defer` | POST | `gpc purchases subscription defer <token>` | 6 |
| `purchases.subscriptions.refund` | POST | `gpc purchases subscription refund <token>` | 6 |
| `purchases.subscriptions.revoke` | POST | `gpc purchases subscription revoke <token>` | 6 |
| `purchases.subscriptionsv2.get` | GET | `gpc purchases subscription get <token> --v2` | 6 |
| `purchases.subscriptionsv2.revoke` | POST | `gpc purchases subscription revoke <token> --v2` | 6 |
| `purchases.voidedpurchases.list` | GET | `gpc purchases voided list` | 6 |

---

## Orders

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `orders.refund` | POST | `gpc orders refund <order-id>` | 6 |
| `orders.batchRefund` | POST | `gpc orders refund --batch --file orders.csv` | 6 |

---

## Grants (User Permissions)

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `grants.create` | POST | `gpc users invite` | 7 |
| `grants.patch` | PATCH | `gpc users update` | 7 |
| `grants.delete` | DELETE | `gpc users remove` | 7 |

## Users

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `users.list` | GET | `gpc users list` | 7 |
| `users.get` | GET | `gpc users get` | 7 |
| `users.create` | POST | `gpc users invite` | 7 |
| `users.patch` | PATCH | `gpc users update` | 7 |
| `users.delete` | DELETE | `gpc users remove` | 7 |

---

## App Recovery

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `apprecovery.create` | POST | `gpc recovery create` | 8 |
| `apprecovery.list` | GET | `gpc recovery list` | 8 |
| `apprecovery.cancel` | POST | `gpc recovery cancel` | 8 |
| `apprecovery.deploy` | POST | `gpc recovery deploy` | 8 |
| `apprecovery.addTargeting` | POST | `gpc recovery targeting add` | 8 |

---

## Device Tier Config

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `devicetierconfigs.list` | GET | `gpc device-tiers list` | 8 |
| `devicetierconfigs.get` | GET | `gpc device-tiers get` | 8 |
| `devicetierconfigs.create` | POST | `gpc device-tiers create` | 8 |

---

## Generatedapks

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `generatedapks.list` | GET | `gpc releases generated-apks list` | 2 |
| `generatedapks.download` | GET | `gpc releases generated-apks download` | 2 |

---

## Systemapks

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `systemapks.variants.list` | GET | `gpc releases system-apks list` | 8 |
| `systemapks.variants.get` | GET | `gpc releases system-apks get` | 8 |
| `systemapks.variants.create` | POST | `gpc releases system-apks create` | 8 |
| `systemapks.variants.download` | GET | `gpc releases system-apks download` | 8 |

---

## Externaltransactions

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `externaltransactions.createexternaltransaction` | POST | `gpc external-transactions create` | 8 |
| `externaltransactions.getexternaltransaction` | GET | `gpc external-transactions get` | 8 |
| `externaltransactions.refundexternaltransaction` | POST | `gpc external-transactions refund` | 8 |

---

## Reporting (Play Vitals)

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `vitals.anrrate.get` | GET | `gpc vitals anr` | 5 |
| `vitals.anrrate.query` | POST | `gpc vitals anr --query` | 5 |
| `vitals.crashrate.get` | GET | `gpc vitals crashes` | 5 |
| `vitals.crashrate.query` | POST | `gpc vitals crashes --query` | 5 |
| `vitals.excessivewakeuprate.get` | GET | `gpc vitals battery` | 5 |
| `vitals.excessivewakeuprate.query` | POST | `gpc vitals battery --query` | 5 |
| `vitals.stuckbackgroundwakelockrate.get` | GET | `gpc vitals battery --wakelocks` | 5 |
| `vitals.stuckbackgroundwakelockrate.query` | POST | `gpc vitals battery --wakelocks --query` | 5 |
| `vitals.slowrenderingrate.get` | GET | `gpc vitals rendering` | 5 |
| `vitals.slowrenderingrate.query` | POST | `gpc vitals rendering --query` | 5 |
| `vitals.slowstartrate.get` | GET | `gpc vitals startup` | 5 |
| `vitals.slowstartrate.query` | POST | `gpc vitals startup --query` | 5 |
| `vitals.errors.counts.query` | POST | `gpc vitals errors` | 5 |
| `vitals.errors.issues.search` | GET | `gpc vitals errors search` | 5 |
| `vitals.errors.reports.search` | GET | `gpc vitals errors reports` | 5 |

---

## Reports (Financial / Stats)

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `reports.list` (sales) | GET | `gpc reports list` | 7 |
| `reports.download` (sales) | GET | `gpc reports download financial` | 7 |
| `reports.download` (stats) | GET | `gpc reports download stats` | 7 |

---

## Newly Discovered Endpoints (from API deep dive)

### applications

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `applications.dataSafety` | POST | `gpc apps data-safety update` | 8 |

### monetization.onetimeproducts (NEW — separate from inappproducts)

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `monetization.onetimeproducts.list` | GET | `gpc iap list --one-time` | 6 |
| `monetization.onetimeproducts.get` | GET | `gpc iap get <id> --one-time` | 6 |
| `monetization.onetimeproducts.patch` | PATCH | `gpc iap update <id> --one-time` | 6 |
| `monetization.onetimeproducts.delete` | DELETE | `gpc iap delete <id> --one-time` | 6 |
| `monetization.onetimeproducts.batchGet` | GET | `gpc iap get --batch --one-time` | 6 |
| `monetization.onetimeproducts.batchUpdate` | POST | `gpc iap sync --one-time` | 6 |
| `monetization.onetimeproducts.batchDelete` | POST | `gpc iap delete --batch --one-time` | 6 |
| `monetization.onetimeproducts.purchaseOptions.batchDelete` | POST | (internal) | 6 |
| `monetization.onetimeproducts.purchaseOptions.batchUpdateStates` | POST | (internal) | 6 |
| `monetization.onetimeproducts.purchaseOptions.offers.*` | Various | `gpc iap offers *` | 6 |

### monetization

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `monetization.convertRegionPrices` | POST | `gpc pricing convert --from USD --amount 9.99` | 6 |

### internalappsharingartifacts

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `internalappsharingartifacts.uploadapk` | POST | `gpc releases upload <file.apk> --internal-sharing` | 2 |
| `internalappsharingartifacts.uploadbundle` | POST | `gpc releases upload <file.aab> --internal-sharing` | 2 |

### purchases.productsv2

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `purchases.productsv2.getproductpurchasev2` | GET | `gpc purchases get <token> --v2` | 6 |

### Reporting API (separate service: playdeveloperreporting.googleapis.com)

| API Endpoint | Method | GPC Command | Phase |
|-------------|--------|-------------|-------|
| `apps.search` | GET | (internal — app discovery) | 5 |
| `apps.fetchReleaseFilterOptions` | GET | (internal — filter options) | 5 |
| `anomalies.list` | GET | `gpc vitals anomalies` | 5 |
| `vitals.lmkRateMetricSet.get` | GET | `gpc vitals memory` | 5 |
| `vitals.lmkRateMetricSet.query` | POST | `gpc vitals memory --query` | 5 |

---

## Coverage Summary (Updated)

| Domain | Endpoints | Phase | API |
|--------|-----------|-------|-----|
| Edits (bundles, APKs, tracks) | 15 | 2 | Publisher |
| Edits (listings, images, details) | 14 | 4 | Publisher |
| Edits (testers, country, expansion) | 8 | 4/7 | Publisher |
| Reviews | 3 | 5 | Publisher |
| Vitals + Anomalies | 19 | 5 | Reporting |
| Error Issues + Reports | 2 | 5 | Reporting |
| In-App Products (legacy) | 9 | 6 | Publisher |
| One-Time Products (new) | 17 | 6 | Publisher |
| Subscriptions + Base Plans + Offers | 25 | 6 | Publisher |
| Purchases (v1 + v2) | 15 | 6 | Publisher |
| Orders | 3 | 6 | Publisher |
| Monetization (pricing) | 1 | 6 | Publisher |
| Users + Grants | 8 | 7 | Publisher |
| Reports | 3 | 7 | Publisher |
| Internal App Sharing | 2 | 2 | Publisher |
| App Recovery | 5 | 8 | Publisher |
| Device Tiers | 3 | 8 | Publisher |
| System APKs | 4 | 8 | Publisher |
| External Transactions | 3 | 8 | Publisher |
| Generated APKs | 2 | 2 | Publisher |
| Applications (data safety) | 1 | 8 | Publisher |
| **Total** | **~162** | | |

> Note: Actual count is ~162 endpoints across 2 APIs, higher than our initial ~127 estimate.
> The difference comes from the Reporting API (separate service), one-time products
> (newer resource), and batch operation variants discovered in the deep dive.
