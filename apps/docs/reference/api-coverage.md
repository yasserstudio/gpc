---
outline: deep
pageClass: wide-page
---

# API Coverage Map

Maps every Google Play Developer API v3 endpoint to a GPC CLI command.

GPC interacts with two separate Google APIs:

| API                                  | Base URL                                | Purpose                                             |
| ------------------------------------ | --------------------------------------- | --------------------------------------------------- |
| Android Publisher API v3             | `androidpublisher.googleapis.com`       | Publishing, monetization, reviews, purchases, users |
| Play Developer Reporting API v1beta1 | `playdeveloperreporting.googleapis.com` | Vitals, crash rates, ANR, performance metrics       |

## Edits

The Edits resource is the transactional wrapper for most write operations. Edits are managed internally — users never interact with them directly.

| API Endpoint     | Method | GPC Command                   |
| ---------------- | ------ | ----------------------------- |
| `edits.insert`   | POST   | (internal — auto-managed)     |
| `edits.get`      | GET    | (internal)                    |
| `edits.commit`   | POST   | (internal — auto on success)  |
| `edits.validate` | POST   | (internal — pre-commit check) |
| `edits.delete`   | DELETE | (internal — auto on failure)  |

## Edits: Bundles

| API Endpoint           | Method | GPC Command                       |
| ---------------------- | ------ | --------------------------------- |
| `edits.bundles.list`   | GET    | `gpc releases list --type bundle` |
| `edits.bundles.upload` | POST   | `gpc releases upload <file.aab>`  |

## Edits: APKs

| API Endpoint        | Method | GPC Command                      |
| ------------------- | ------ | -------------------------------- |
| `edits.apks.list`   | GET    | `gpc releases list --type apk`   |
| `edits.apks.upload` | POST   | `gpc releases upload <file.apk>` |

## Edits: Tracks

| API Endpoint          | Method | GPC Command                         |
| --------------------- | ------ | ----------------------------------- |
| `edits.tracks.list`   | GET    | `gpc tracks list`                   |
| `edits.tracks.get`    | GET    | `gpc tracks get <track>`            |
| `edits.tracks.update` | PUT    | `gpc tracks update <track>`         |
| `edits.tracks.patch`  | PATCH  | `gpc tracks update <track> --patch` |
| `edits.tracks.create` | POST   | `gpc tracks create <name>`          |

## Release Lifecycle

| API Endpoint                        | Method | GPC Command                     |
| ----------------------------------- | ------ | ------------------------------- |
| `applications.tracks.releases.list` | GET    | `gpc releases list --lifecycle` |

## Edits: Deobfuscation Files

| API Endpoint                      | Method | GPC Command                            |
| --------------------------------- | ------ | -------------------------------------- |
| `edits.deobfuscationfiles.upload` | POST   | `gpc releases upload --mapping <file>` |

## Edits: Listings

| API Endpoint               | Method | GPC Command                                 |
| -------------------------- | ------ | ------------------------------------------- |
| `edits.listings.list`      | GET    | `gpc listings get --all-languages`          |
| `edits.listings.get`       | GET    | `gpc listings get --lang <lang>`            |
| `edits.listings.update`    | PUT    | `gpc listings update --lang <lang>`         |
| `edits.listings.delete`    | DELETE | `gpc listings delete --lang <lang>`         |
| `edits.listings.deleteall` | DELETE | `gpc listings delete --all`                 |
| `edits.listings.patch`     | PATCH  | `gpc listings update --lang <lang> --patch` |

## Edits: Images

| API Endpoint             | Method | GPC Command                        |
| ------------------------ | ------ | ---------------------------------- |
| `edits.images.list`      | GET    | `gpc listings images list`         |
| `edits.images.upload`    | POST   | `gpc listings images upload`       |
| `edits.images.delete`    | DELETE | `gpc listings images delete`       |
| `edits.images.deleteall` | DELETE | `gpc listings images delete --all` |

## Edits: Details

| API Endpoint           | Method | GPC Command                         |
| ---------------------- | ------ | ----------------------------------- |
| `edits.details.get`    | GET    | `gpc apps info <package>`           |
| `edits.details.update` | PUT    | `gpc apps update <package>`         |
| `edits.details.patch`  | PATCH  | `gpc apps update <package> --patch` |

## Edits: Country Availability

| API Endpoint                    | Method | GPC Command                 |
| ------------------------------- | ------ | --------------------------- |
| `edits.countryavailability.get` | GET    | `gpc listings availability` |

## Edits: Testers

| API Endpoint           | Method | GPC Command                        |
| ---------------------- | ------ | ---------------------------------- |
| `edits.testers.get`    | GET    | `gpc testers list --track <track>` |
| `edits.testers.update` | PUT    | `gpc testers add / remove`         |
| `edits.testers.patch`  | PATCH  | `gpc testers update`               |

## Reviews

| API Endpoint    | Method | GPC Command              |
| --------------- | ------ | ------------------------ |
| `reviews.list`  | GET    | `gpc reviews list`       |
| `reviews.get`   | GET    | `gpc reviews get <id>`   |
| `reviews.reply` | POST   | `gpc reviews reply <id>` |

## In-App Products

| API Endpoint                | Method | GPC Command                    |
| --------------------------- | ------ | ------------------------------ |
| `inappproducts.list`        | GET    | `gpc iap list`                 |
| `inappproducts.get`         | GET    | `gpc iap get <sku>`            |
| `inappproducts.insert`      | POST   | `gpc iap create`               |
| `inappproducts.update`      | PUT    | `gpc iap update <sku>`         |
| `inappproducts.delete`      | DELETE | `gpc iap delete <sku>`         |
| `inappproducts.patch`       | PATCH  | `gpc iap update <sku> --patch` |
| `inappproducts.batch`       | POST   | `gpc iap sync`                 |
| `inappproducts.batchDelete` | POST   | `gpc iap batch-delete`         |

## Monetization: Subscriptions

| API Endpoint                             | Method | GPC Command                      |
| ---------------------------------------- | ------ | -------------------------------- |
| `monetization.subscriptions.list`        | GET    | `gpc subscriptions list`         |
| `monetization.subscriptions.get`         | GET    | `gpc subscriptions get <id>`     |
| `monetization.subscriptions.create`      | POST   | `gpc subscriptions create`       |
| `monetization.subscriptions.patch`       | PATCH  | `gpc subscriptions update <id>`  |
| `monetization.subscriptions.delete`      | DELETE | `gpc subscriptions delete <id>`  |
| `monetization.subscriptions.batchGet`    | GET    | `gpc subscriptions batch-get`    |
| `monetization.subscriptions.batchUpdate` | POST   | `gpc subscriptions batch-update` |

## Monetization: Base Plans

| API Endpoint              | Method | GPC Command                                   |
| ------------------------- | ------ | --------------------------------------------- |
| `basePlans.activate`      | POST   | `gpc subscriptions base-plans activate`       |
| `basePlans.deactivate`    | POST   | `gpc subscriptions base-plans deactivate`     |
| `basePlans.delete`        | DELETE | `gpc subscriptions base-plans delete`         |
| `basePlans.migratePrices` | POST   | `gpc subscriptions base-plans migrate-prices` |

## Monetization: Offers

| API Endpoint        | Method | GPC Command                           |
| ------------------- | ------ | ------------------------------------- |
| `offers.list`       | GET    | `gpc subscriptions offers list`       |
| `offers.get`        | GET    | `gpc subscriptions offers get`        |
| `offers.create`     | POST   | `gpc subscriptions offers create`     |
| `offers.patch`      | PATCH  | `gpc subscriptions offers update`     |
| `offers.delete`     | DELETE | `gpc subscriptions offers delete`     |
| `offers.activate`   | POST   | `gpc subscriptions offers activate`   |
| `offers.deactivate` | POST   | `gpc subscriptions offers deactivate` |

## Purchases

| API Endpoint                          | Method | GPC Command                                      |
| ------------------------------------- | ------ | ------------------------------------------------ |
| `purchases.products.acknowledge`      | POST   | `gpc purchases acknowledge <token>`              |
| `purchases.products.consume`          | POST   | `gpc purchases consume <token>`                  |
| `purchases.subscriptions.acknowledge` | POST   | `gpc purchases subscription acknowledge <token>` |
| `purchases.subscriptions.cancel`      | POST   | `gpc purchases subscription cancel <token>`      |
| `purchases.subscriptions.defer`       | POST   | `gpc purchases subscription defer <token>`       |
| `purchases.subscriptionsv2.get`       | GET    | `gpc purchases subscription get <token> --v2`    |
| `purchases.subscriptionsv2.revoke`    | POST   | `gpc purchases subscription revoke <token> --v2` |
| `purchases.subscriptionsv2.cancel`    | POST   | `gpc purchases subscription cancel-v2 <token>`   |
| `purchases.subscriptionsv2.defer`     | POST   | `gpc purchases subscription defer-v2 <token>`    |
| `purchases.productsv2.get`            | GET    | `gpc purchases product get-v2 <id> <token>`      |
| `purchases.voidedpurchases.list`      | GET    | `gpc purchases voided list`                      |

## Orders

| API Endpoint      | Method | GPC Command                        |
| ----------------- | ------ | ---------------------------------- |
| `orders.get`      | GET    | `gpc orders get <order-id>`        |
| `orders.batchGet` | POST   | `gpc orders batch-get --ids <csv>` |
| `orders.refund`   | POST   | `gpc orders refund <order-id>`     |

## Monetization: Pricing

| API Endpoint                       | Method | GPC Command                                    |
| ---------------------------------- | ------ | ---------------------------------------------- |
| `monetization.convertRegionPrices` | POST   | `gpc pricing convert --from USD --amount 9.99` |

## Users & Grants

| API Endpoint    | Method | GPC Command                |
| --------------- | ------ | -------------------------- |
| `users.list`    | GET    | `gpc users list`           |
| `users.create`  | POST   | `gpc users invite`         |
| `users.patch`   | PATCH  | `gpc users update`         |
| `users.delete`  | DELETE | `gpc users remove`         |
| `grants.create` | POST   | `gpc users invite --grant` |
| `grants.patch`  | PATCH  | `gpc users update --grant` |
| `grants.delete` | DELETE | `gpc users remove`         |

## Reports

| API Endpoint                   | Method | GPC Command                      |
| ------------------------------ | ------ | -------------------------------- |
| `reports.list`                 | GET    | `gpc reports list`               |
| `reports.download` (financial) | GET    | `gpc reports download financial` |
| `reports.download` (stats)     | GET    | `gpc reports download stats`     |

## Play Developer Reporting API (Vitals)

| API Endpoint                                 | Method | GPC Command                 |
| -------------------------------------------- | ------ | --------------------------- |
| `crashRateMetricSet.query`                   | POST   | `gpc vitals crashes`        |
| `anrRateMetricSet.query`                     | POST   | `gpc vitals anr`            |
| `slowStartRateMetricSet.query`               | POST   | `gpc vitals startup`        |
| `slowRenderingRateMetricSet.query`           | POST   | `gpc vitals rendering`      |
| `excessiveWakeupRateMetricSet.query`         | POST   | `gpc vitals battery`        |
| `stuckBackgroundWakelockRateMetricSet.query` | POST   | `gpc vitals memory`         |
| `anomalies.list`                             | GET    | `gpc vitals anomalies`      |
| `errorIssues.search`                         | GET    | `gpc vitals errors search`  |
| `errorReports.search`                        | GET    | `gpc vitals errors reports` |

## App Recovery Actions

| API Endpoint         | Method | GPC Command           |
| -------------------- | ------ | --------------------- |
| `apprecovery.list`   | GET    | `gpc recovery list`   |
| `apprecovery.cancel` | POST   | `gpc recovery cancel` |
| `apprecovery.deploy` | POST   | `gpc recovery deploy` |

## Data Safety

| API Endpoint        | Method | GPC Command              |
| ------------------- | ------ | ------------------------ |
| `dataSafety.get`    | GET    | `gpc data-safety get`    |
| `dataSafety.update` | PUT    | `gpc data-safety update` |

## External Transactions

| API Endpoint                                     | Method | GPC Command          |
| ------------------------------------------------ | ------ | -------------------- |
| `externaltransactions.createExternalTransaction` | POST   | `gpc ext-txn create` |
| `externaltransactions.getExternalTransaction`    | GET    | `gpc ext-txn get`    |
| `externaltransactions.refundExternalTransaction` | POST   | `gpc ext-txn refund` |

## Device Tiers

| API Endpoint               | Method | GPC Command                        |
| -------------------------- | ------ | ---------------------------------- |
| `deviceTierConfigs.list`   | GET    | `gpc device-tiers list`            |
| `deviceTierConfigs.get`    | GET    | `gpc device-tiers get <config-id>` |
| `deviceTierConfigs.create` | POST   | `gpc device-tiers create --file`   |

## Internal App Sharing

| API Endpoint                                | Method | GPC Command                          |
| ------------------------------------------- | ------ | ------------------------------------ |
| `internalappsharing.artifacts.uploadbundle` | POST   | `gpc internal-sharing upload <file>` |
| `internalappsharing.artifacts.uploadapk`    | POST   | `gpc internal-sharing upload <file>` |

## Managed Google Play (Play Custom App Publishing API)

Private app publishing for enterprise customers. This is a separate Google API (`playcustomapp.googleapis.com`) from the standard Android Publisher API — GPC is the first publishing CLI to support it. See the [Enterprise publishing guide](../guide/enterprise-publishing.md) for details.

| API Endpoint                  | Method | GPC Command                                    |
| ----------------------------- | ------ | ---------------------------------------------- |
| `accounts.customApps.create` | POST   | `gpc enterprise publish <bundle>` or `gpc enterprise create` |

## Generated APKs

| API Endpoint             | Method | GPC Command                                 |
| ------------------------ | ------ | ------------------------------------------- |
| `generatedapks.list`     | GET    | `gpc generated-apks list <version-code>`    |
| `generatedapks.download` | GET    | `gpc generated-apks download <vc> <apk-id>` |

## One-Time Products

| API Endpoint                          | Method | GPC Command             |
| ------------------------------------- | ------ | ----------------------- |
| `monetization.oneTimeProducts.list`   | GET    | `gpc otp list`          |
| `monetization.oneTimeProducts.get`    | GET    | `gpc otp get <id>`      |
| `monetization.oneTimeProducts.create` | POST   | `gpc otp create`        |
| `monetization.oneTimeProducts.patch`  | PATCH  | `gpc otp update <id>`   |
| `monetization.oneTimeProducts.delete` | DELETE | `gpc otp delete <id>`   |
| `oneTimeProducts.offers.list`         | GET    | `gpc otp offers list`   |
| `oneTimeProducts.offers.get`          | GET    | `gpc otp offers get`    |
| `oneTimeProducts.offers.create`       | POST   | `gpc otp offers create` |
| `oneTimeProducts.offers.patch`        | PATCH  | `gpc otp offers update` |
| `oneTimeProducts.offers.delete`       | DELETE | `gpc otp offers delete` |

## Purchase Options

| API Endpoint                 | Method | GPC Command                            |
| ---------------------------- | ------ | -------------------------------------- |
| `purchaseOptions.list`       | GET    | `gpc purchase-options list`            |
| `purchaseOptions.get`        | GET    | `gpc purchase-options get <id>`        |
| `purchaseOptions.create`     | POST   | `gpc purchase-options create`          |
| `purchaseOptions.activate`   | POST   | `gpc purchase-options activate <id>`   |
| `purchaseOptions.deactivate` | POST   | `gpc purchase-options deactivate <id>` |

## Coverage Summary

| Domain                              | Endpoints | API       |
| ----------------------------------- | --------- | --------- |
| Edits (bundles, APKs, tracks)       | 16        | Publisher |
| Edits (listings, images, details)   | 14        | Publisher |
| Edits (testers, country, expansion) | 8         | Publisher |
| Reviews                             | 3         | Publisher |
| Vitals + Anomalies                  | 19        | Reporting |
| In-App Products                     | 10        | Publisher |
| Subscriptions + Base Plans + Offers | 27        | Publisher |
| Purchases (v1 + v2)                 | 16        | Publisher |
| Orders                              | 3         | Publisher |
| Monetization (pricing)              | 1         | Publisher |
| Users + Grants                      | 8         | Publisher |
| Reports                             | 3         | Publisher |
| App Recovery                        | 3         | Publisher |
| Data Safety                         | 2         | Publisher |
| External Transactions               | 3         | Publisher |
| Device Tiers                        | 3         | Publisher |
| Internal App Sharing                | 2         | Publisher |
| Generated APKs                      | 2         | Publisher |
| One-Time Products + Offers          | 10        | Publisher |
| Purchase Options                    | 5         | Publisher |
| Other (system APKs)                 | 3         | Publisher |
| Error Issues + Reports              | 2         | Reporting |
| Release Lifecycle                   | 1         | Publisher |
| **Total**                           | **~215**  |           |
