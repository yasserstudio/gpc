---
outline: deep
---

# API Coverage Map

Maps every Google Play Developer API v3 endpoint to a GPC CLI command.

GPC interacts with two separate Google APIs:

| API | Base URL | Purpose |
|-----|----------|---------|
| Android Publisher API v3 | `androidpublisher.googleapis.com` | Publishing, monetization, reviews, purchases, users |
| Play Developer Reporting API v1beta1 | `playdeveloperreporting.googleapis.com` | Vitals, crash rates, ANR, performance metrics |

## Edits

The Edits resource is the transactional wrapper for most write operations. Edits are managed internally — users never interact with them directly.

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.insert` | POST | (internal — auto-managed) |
| `edits.get` | GET | (internal) |
| `edits.commit` | POST | (internal — auto on success) |
| `edits.validate` | POST | (internal — pre-commit check) |
| `edits.delete` | DELETE | (internal — auto on failure) |

## Edits: Bundles

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.bundles.list` | GET | `gpc releases list --type bundle` |
| `edits.bundles.upload` | POST | `gpc releases upload <file.aab>` |

## Edits: APKs

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.apks.list` | GET | `gpc releases list --type apk` |
| `edits.apks.upload` | POST | `gpc releases upload <file.apk>` |
| `edits.apks.addexternallyhosted` | POST | `gpc releases upload --externally-hosted` |

## Edits: Tracks

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.tracks.list` | GET | `gpc tracks list` |
| `edits.tracks.get` | GET | `gpc tracks get <track>` |
| `edits.tracks.update` | PUT | `gpc tracks update <track>` |
| `edits.tracks.create` | POST | `gpc tracks create <name>` |

## Edits: Deobfuscation Files

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.deobfuscationfiles.upload` | POST | `gpc releases upload --mapping <file>` |

## Edits: Listings

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.listings.list` | GET | `gpc listings get --all-languages` |
| `edits.listings.get` | GET | `gpc listings get --lang <lang>` |
| `edits.listings.update` | PUT | `gpc listings update --lang <lang>` |
| `edits.listings.delete` | DELETE | `gpc listings delete --lang <lang>` |
| `edits.listings.deleteall` | DELETE | `gpc listings delete --all` |
| `edits.listings.patch` | PATCH | `gpc listings update --lang <lang> --patch` |

## Edits: Images

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.images.list` | GET | `gpc listings images list` |
| `edits.images.upload` | POST | `gpc listings images upload` |
| `edits.images.delete` | DELETE | `gpc listings images delete` |
| `edits.images.deleteall` | DELETE | `gpc listings images delete --all` |

## Edits: Details

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.details.get` | GET | `gpc apps info <package>` |
| `edits.details.update` | PUT | `gpc apps update <package>` |
| `edits.details.patch` | PATCH | `gpc apps update <package> --patch` |

## Edits: Country Availability

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.countryavailability.get` | GET | `gpc listings availability` |

## Edits: Testers

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `edits.testers.get` | GET | `gpc testers list --track <track>` |
| `edits.testers.update` | PUT | `gpc testers add / remove` |
| `edits.testers.patch` | PATCH | `gpc testers update` |

## Reviews

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `reviews.list` | GET | `gpc reviews list` |
| `reviews.get` | GET | `gpc reviews get <id>` |
| `reviews.reply` | POST | `gpc reviews reply <id>` |

## In-App Products

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `inappproducts.list` | GET | `gpc iap list` |
| `inappproducts.get` | GET | `gpc iap get <sku>` |
| `inappproducts.insert` | POST | `gpc iap create` |
| `inappproducts.update` | PUT | `gpc iap update <sku>` |
| `inappproducts.delete` | DELETE | `gpc iap delete <sku>` |
| `inappproducts.patch` | PATCH | `gpc iap update <sku> --patch` |
| `inappproducts.batch` | POST | `gpc iap sync` |

## Monetization: Subscriptions

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `monetization.subscriptions.list` | GET | `gpc subscriptions list` |
| `monetization.subscriptions.get` | GET | `gpc subscriptions get <id>` |
| `monetization.subscriptions.create` | POST | `gpc subscriptions create` |
| `monetization.subscriptions.patch` | PATCH | `gpc subscriptions update <id>` |
| `monetization.subscriptions.delete` | DELETE | `gpc subscriptions delete <id>` |

## Monetization: Base Plans

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `basePlans.activate` | POST | `gpc subscriptions base-plans activate` |
| `basePlans.deactivate` | POST | `gpc subscriptions base-plans deactivate` |
| `basePlans.delete` | DELETE | `gpc subscriptions base-plans delete` |
| `basePlans.migratePrices` | POST | `gpc subscriptions base-plans migrate-prices` |

## Monetization: Offers

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `offers.list` | GET | `gpc subscriptions offers list` |
| `offers.get` | GET | `gpc subscriptions offers get` |
| `offers.create` | POST | `gpc subscriptions offers create` |
| `offers.patch` | PATCH | `gpc subscriptions offers update` |
| `offers.delete` | DELETE | `gpc subscriptions offers delete` |
| `offers.activate` | POST | `gpc subscriptions offers activate` |
| `offers.deactivate` | POST | `gpc subscriptions offers deactivate` |

## Purchases

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `purchases.products.get` | GET | `gpc purchases get <token>` |
| `purchases.products.acknowledge` | POST | `gpc purchases acknowledge <token>` |
| `purchases.products.consume` | POST | `gpc purchases consume <token>` |
| `purchases.subscriptions.get` | GET | `gpc purchases subscription get <token>` |
| `purchases.subscriptions.cancel` | POST | `gpc purchases subscription cancel <token>` |
| `purchases.subscriptions.defer` | POST | `gpc purchases subscription defer <token>` |
| `purchases.subscriptions.revoke` | POST | `gpc purchases subscription revoke <token>` |
| `purchases.subscriptionsv2.get` | GET | `gpc purchases subscription get <token> --v2` |
| `purchases.subscriptionsv2.revoke` | POST | `gpc purchases subscription revoke <token> --v2` |
| `purchases.voidedpurchases.list` | GET | `gpc purchases voided list` |

## Orders

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `orders.refund` | POST | `gpc orders refund <order-id>` |

## Monetization: Pricing

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `monetization.convertRegionPrices` | POST | `gpc pricing convert --from USD --amount 9.99` |

## Users & Grants

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `users.list` | GET | `gpc users list` |
| `users.create` | POST | `gpc users invite` |
| `users.patch` | PATCH | `gpc users update` |
| `users.delete` | DELETE | `gpc users remove` |
| `grants.create` | POST | `gpc users invite --grant` |
| `grants.patch` | PATCH | `gpc users update --grant` |
| `grants.delete` | DELETE | `gpc users remove` |

## Reports

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `reports.list` | GET | `gpc reports list` |
| `reports.download` (financial) | GET | `gpc reports download financial` |
| `reports.download` (stats) | GET | `gpc reports download stats` |

## Play Developer Reporting API (Vitals)

| API Endpoint | Method | GPC Command |
|-------------|--------|-------------|
| `vitals.crashrate.get` | GET | `gpc vitals crashes` |
| `vitals.crashrate.query` | POST | `gpc vitals crashes --query` |
| `vitals.anrrate.get` | GET | `gpc vitals anr` |
| `vitals.anrrate.query` | POST | `gpc vitals anr --query` |
| `vitals.slowstartrate.get` | GET | `gpc vitals startup` |
| `vitals.slowstartrate.query` | POST | `gpc vitals startup --query` |
| `vitals.slowrenderingrate.get` | GET | `gpc vitals rendering` |
| `vitals.excessivewakeuprate.get` | GET | `gpc vitals battery` |
| `vitals.stuckbackgroundwakelockrate.get` | GET | `gpc vitals battery --wakelocks` |
| `vitals.lmkRateMetricSet.get` | GET | `gpc vitals memory` |
| `anomalies.list` | GET | `gpc vitals anomalies` |
| `errorIssues.search` | GET | `gpc vitals errors search` |
| `errorReports.search` | GET | `gpc vitals errors reports` |

## Coverage Summary

| Domain | Endpoints | API |
|--------|-----------|-----|
| Edits (bundles, APKs, tracks) | 15 | Publisher |
| Edits (listings, images, details) | 14 | Publisher |
| Edits (testers, country, expansion) | 8 | Publisher |
| Reviews | 3 | Publisher |
| Vitals + Anomalies | 19 | Reporting |
| In-App Products | 9 | Publisher |
| Subscriptions + Base Plans + Offers | 25 | Publisher |
| Purchases (v1 + v2) | 15 | Publisher |
| Orders | 3 | Publisher |
| Monetization (pricing) | 1 | Publisher |
| Users + Grants | 8 | Publisher |
| Reports | 3 | Publisher |
| Other (recovery, device tiers, system APKs) | 14 | Publisher |
| Error Issues + Reports | 2 | Reporting |
| **Total** | **~162** | |
