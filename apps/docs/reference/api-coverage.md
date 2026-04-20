---
outline: deep
pageClass: wide-page
---

# API Coverage Map

Maps every Google Play Developer API endpoint that GPC implements to a CLI command.

GPC interacts with three separate Google APIs:

| API                                  | Base URL                                | Purpose                                             |
| ------------------------------------ | --------------------------------------- | --------------------------------------------------- |
| Android Publisher API v3             | `androidpublisher.googleapis.com`       | Publishing, monetization, reviews, purchases, users |
| Play Developer Reporting API v1beta1 | `playdeveloperreporting.googleapis.com` | Vitals, crash rates, ANR, performance metrics       |
| Play Custom App Publishing API v1    | `playcustomapp.googleapis.com`          | Managed Google Play private app publishing          |

## Edits

The Edits resource is the transactional wrapper for most write operations. Edits are managed internally; users never interact with them directly.

| API Endpoint     | Method | GPC Command                  |
| ---------------- | ------ | ---------------------------- |
| `edits.insert`   | POST   | (internal, auto-managed)     |
| `edits.get`      | GET    | (internal)                   |
| `edits.commit`   | POST   | (internal, auto on success)  |
| `edits.validate` | POST   | (internal, pre-commit check) |
| `edits.delete`   | DELETE | (internal, auto on failure)  |

## Edits: Bundles

| API Endpoint           | Method | GPC Command                       |
| ---------------------- | ------ | --------------------------------- |
| `edits.bundles.list`   | GET    | `gpc releases list --type bundle` |
| `edits.bundles.upload` | POST   | `gpc releases upload <file.aab>`  |

## Edits: APKs

| API Endpoint                     | Method | GPC Command                      |
| -------------------------------- | ------ | -------------------------------- |
| `edits.apks.list`                | GET    | `gpc releases list --type apk`   |
| `edits.apks.upload`              | POST   | `gpc releases upload <file.apk>` |
| `edits.apks.addExternallyHosted` | POST   | (via SDK)                        |

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

## Edits: Expansion Files

| API Endpoint                  | Method | GPC Command |
| ----------------------------- | ------ | ----------- |
| `edits.expansionfiles.get`    | GET    | (via SDK)   |
| `edits.expansionfiles.update` | PUT    | (via SDK)   |
| `edits.expansionfiles.patch`  | PATCH  | (via SDK)   |
| `edits.expansionfiles.upload` | POST   | (via SDK)   |

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
| `inappproducts.batchGet`    | POST   | `gpc iap batch-get`            |
| `inappproducts.batchUpdate` | POST   | `gpc iap sync`                 |
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

| API Endpoint                   | Method | GPC Command                                         |
| ------------------------------ | ------ | --------------------------------------------------- |
| `basePlans.activate`           | POST   | `gpc subscriptions base-plans activate`             |
| `basePlans.deactivate`         | POST   | `gpc subscriptions base-plans deactivate`           |
| `basePlans.delete`             | DELETE | `gpc subscriptions base-plans delete`               |
| `basePlans.migratePrices`      | POST   | `gpc subscriptions base-plans migrate-prices`       |
| `basePlans.batchMigratePrices` | POST   | `gpc subscriptions base-plans batch-migrate-prices` |

## Monetization: Subscription Offers

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
| `purchases.products.get`              | GET    | `gpc purchases get <product-id> <token>`         |
| `purchases.products.acknowledge`      | POST   | `gpc purchases acknowledge <token>`              |
| `purchases.products.consume`          | POST   | `gpc purchases consume <token>`                  |
| `purchases.subscriptions.get`         | GET    | `gpc purchases subscription get <token>`         |
| `purchases.subscriptions.acknowledge` | POST   | (via SDK)                                        |
| `purchases.subscriptions.cancel`      | POST   | `gpc purchases subscription cancel <token>`      |
| `purchases.subscriptions.defer`       | POST   | `gpc purchases subscription defer <token>`       |
| `purchases.subscriptionsv2.get`       | GET    | `gpc purchases subscription get <token> --v2`    |
| `purchases.subscriptionsv2.revoke`    | POST   | `gpc purchases subscription revoke <token> --v2` |
| `purchases.subscriptionsv2.cancel`    | POST   | `gpc purchases subscription cancel-v2 <token>`   |
| `purchases.subscriptionsv2.defer`     | POST   | `gpc purchases subscription defer-v2 <token>`    |
| `purchases.productsv2.get`            | GET    | `gpc purchases product get-v2 <id> <token>`      |
| `purchases.voidedpurchases.list`      | GET    | `gpc purchases voided list`                      |

## Orders

| API Endpoint      | Method | GPC Command                              |
| ----------------- | ------ | ---------------------------------------- |
| `orders.get`      | GET    | `gpc purchases orders get <order-id>`    |
| `orders.batchGet` | POST   | `gpc purchases orders batch-get --ids`   |
| `orders.refund`   | POST   | `gpc purchases orders refund <order-id>` |

## Monetization: Pricing

| API Endpoint                       | Method | GPC Command                                    |
| ---------------------------------- | ------ | ---------------------------------------------- |
| `monetization.convertRegionPrices` | POST   | `gpc pricing convert --from USD --amount 9.99` |

## Users

Developer-account user management lives at a separate base URL (`androidpublisher.googleapis.com/androidpublisher/v3/developers/{developerId}`) and is exposed through `UsersApiClient`.

| API Endpoint   | Method | GPC Command        |
| -------------- | ------ | ------------------ |
| `users.list`   | GET    | `gpc users list`   |
| `users.create` | POST   | `gpc users invite` |
| `users.patch`  | PATCH  | `gpc users update` |
| `users.delete` | DELETE | `gpc users remove` |

## Grants

| API Endpoint    | Method | GPC Command         |
| --------------- | ------ | ------------------- |
| `grants.list`   | GET    | `gpc grants list`   |
| `grants.create` | POST   | `gpc grants create` |
| `grants.patch`  | PATCH  | `gpc grants update` |
| `grants.delete` | DELETE | `gpc grants delete` |

## Reports

| API Endpoint                   | Method | GPC Command                      |
| ------------------------------ | ------ | -------------------------------- |
| `reports.list`                 | GET    | `gpc reports list`               |
| `reports.download` (financial) | GET    | `gpc reports download financial` |
| `reports.download` (stats)     | GET    | `gpc reports download stats`     |

## Play Developer Reporting API: Vitals

| API Endpoint                                 | Method | GPC Command                                                               |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `crashRateMetricSet.query`                   | POST   | `gpc vitals crashes`                                                      |
| `anrRateMetricSet.query`                     | POST   | `gpc vitals anr`                                                          |
| `slowStartRateMetricSet.query`               | POST   | `gpc vitals startup`                                                      |
| `slowRenderingRateMetricSet.query`           | POST   | `gpc vitals rendering`                                                    |
| `excessiveWakeupRateMetricSet.query`         | POST   | `gpc vitals battery` / `gpc vitals wakeup`                                |
| `stuckBackgroundWakelockRateMetricSet.query` | POST   | `gpc vitals memory`                                                       |
| `lmkRateMetricSet.query`                     | POST   | `gpc vitals lmk`                                                          |
| `errorCountMetricSet.query`                  | POST   | `gpc vitals error-count`                                                  |
| `anomalies.list`                             | GET    | `gpc vitals anomalies`                                                    |
| `errorIssues.search`                         | GET    | `gpc vitals errors search`                                                |
| `errorReports.search`                        | GET    | `gpc vitals errors reports` _(see [Planned coverage](#planned-coverage))_ |

## App Recovery Actions

| API Endpoint                 | Method | GPC Command                  |
| ---------------------------- | ------ | ---------------------------- |
| `appRecoveries.list`         | GET    | `gpc recovery list`          |
| `appRecoveries.create`       | POST   | `gpc recovery create`        |
| `appRecoveries.cancel`       | POST   | `gpc recovery cancel`        |
| `appRecoveries.deploy`       | POST   | `gpc recovery deploy`        |
| `appRecoveries.addTargeting` | POST   | `gpc recovery add-targeting` |

## Data Safety

| API Endpoint        | Method | GPC Command              |
| ------------------- | ------ | ------------------------ |
| `dataSafety.update` | POST   | `gpc data-safety update` |

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

## Generated APKs

| API Endpoint             | Method | GPC Command                                 |
| ------------------------ | ------ | ------------------------------------------- |
| `generatedapks.list`     | GET    | `gpc generated-apks list <version-code>`    |
| `generatedapks.download` | GET    | `gpc generated-apks download <vc> <apk-id>` |

## System APKs

System APKs are bundled, unsigned variants produced for a specific version. Used by OEMs and enterprise deployments.

| API Endpoint          | Method | GPC Command                          |
| --------------------- | ------ | ------------------------------------ |
| `systemApks.list`     | GET    | `gpc system-apks list <version>`     |
| `systemApks.get`      | GET    | `gpc system-apks get <version> <id>` |
| `systemApks.create`   | POST   | `gpc system-apks create <version>`   |
| `systemApks.download` | GET    | `gpc system-apks download <id>`      |

## One-Time Products

| API Endpoint                                        | Method | GPC Command                                    |
| --------------------------------------------------- | ------ | ---------------------------------------------- |
| `monetization.oneTimeProducts.list`                 | GET    | `gpc otp list`                                 |
| `monetization.oneTimeProducts.get`                  | GET    | `gpc otp get <id>`                             |
| `monetization.oneTimeProducts.create`               | POST   | `gpc otp create`                               |
| `monetization.oneTimeProducts.patch`                | PATCH  | `gpc otp update <id>`                          |
| `monetization.oneTimeProducts.delete`               | DELETE | `gpc otp delete <id>`                          |
| `oneTimeProducts.offers.list`                       | GET    | `gpc otp offers list`                          |
| `oneTimeProducts.offers.get`                        | GET    | `gpc otp offers get`                           |
| `oneTimeProducts.offers.create`                     | POST   | `gpc otp offers create`                        |
| `oneTimeProducts.offers.patch`                      | PATCH  | `gpc otp offers update`                        |
| `oneTimeProducts.offers.delete`                     | DELETE | `gpc otp offers delete`                        |
| `oneTimeProducts.offers.activate`                   | POST   | `gpc otp offers activate`                      |
| `oneTimeProducts.offers.deactivate`                 | POST   | `gpc otp offers deactivate`                    |
| `oneTimeProducts.offers.cancel`                     | POST   | `gpc otp offers cancel`                        |
| `oneTimeProducts.offers.batchGet`                   | POST   | `gpc otp offers batch-get`                     |
| `oneTimeProducts.offers.batchUpdate`                | POST   | `gpc otp offers batch-update`                  |
| `oneTimeProducts.offers.batchUpdateStates`          | POST   | `gpc otp offers batch-update-states`           |
| `oneTimeProducts.offers.batchDelete`                | POST   | `gpc otp offers batch-delete`                  |
| `oneTimeProducts.purchaseOptions.batchDelete`       | POST   | `gpc otp purchase-options batch-delete`        |
| `oneTimeProducts.purchaseOptions.batchUpdateStates` | POST   | `gpc otp purchase-options batch-update-states` |

## Managed Google Play (Play Custom App Publishing API)

Private app publishing for enterprise customers. Separate Google API (`playcustomapp.googleapis.com`). GPC is the first publishing CLI to support it. See the [Enterprise publishing guide](../guide/enterprise-publishing.md).

| API Endpoint                 | Method | GPC Command                                                  |
| ---------------------------- | ------ | ------------------------------------------------------------ |
| `accounts.customApps.create` | POST   | `gpc enterprise publish <bundle>` or `gpc enterprise create` |

## Coverage Summary

| Domain                              | Endpoints | API        |
| ----------------------------------- | --------- | ---------- |
| Edits (internal transactional ops)  | 5         | Publisher  |
| Edits: Bundles + APKs               | 5         | Publisher  |
| Edits: Tracks + Release Lifecycle   | 6         | Publisher  |
| Edits: Deobfuscation + Expansion    | 5         | Publisher  |
| Edits: Listings + Images            | 10        | Publisher  |
| Edits: Details                      | 3         | Publisher  |
| Edits: Country Availability         | 1         | Publisher  |
| Edits: Testers                      | 3         | Publisher  |
| Reviews                             | 3         | Publisher  |
| In-App Products                     | 9         | Publisher  |
| Subscriptions + Base Plans + Offers | 19        | Publisher  |
| Purchases                           | 13        | Publisher  |
| Orders                              | 3         | Publisher  |
| Monetization (pricing)              | 1         | Publisher  |
| Users + Grants                      | 8         | Publisher  |
| Reports                             | 3         | Publisher  |
| Vitals (metric sets + metadata)     | 11        | Reporting  |
| App Recovery                        | 5         | Publisher  |
| Data Safety                         | 1         | Publisher  |
| External Transactions               | 3         | Publisher  |
| Device Tiers                        | 3         | Publisher  |
| Internal App Sharing                | 2         | Publisher  |
| Generated APKs                      | 2         | Publisher  |
| System APKs                         | 4         | Publisher  |
| One-Time Products + Offers          | 19        | Publisher  |
| Managed Google Play (Custom Apps)   | 1         | Custom App |
| **Total**                           | **~217**  |            |

Numbers are approximate: several endpoints overload a single Google URL (for example, `reports.download` serves both financial and stats buckets via query parameters).

## Planned coverage

Tracked against the live discovery docs audited 2026-04-16:

- `androidpublisher v3`, revision `20260416`: **134 / 137** methods covered (3 intentional gaps: `monetization.subscriptions.archive` plus two hard-deprecated v1 subscription methods)
- `playdeveloperreporting v1beta1`, revision `20260415`: see gaps below
- `playcustomapp v1`, revision `20260415`: **1 / 1** methods covered
- `games*` APIs: see strategic direction below

### Play Developer Reporting API: planned additions

| Endpoint                               | Use-case                                                                                      | Target |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| `apps.search`                          | `gpc apps list --source reporting`: list service-account-visible apps via Reporting ACL       | Future |
| `apps.fetchReleaseFilterOptions`       | Validate `--version-code` / `--track` filters, power shell completion for vitals queries      | Future |
| `errorIssues.search` (extended params) | Add `orderBy`, `sampleErrorReportLimit`, `interval.*` windowing to `gpc vitals errors search` | Future |

::: warning Known issue: `vitals errors reports`
The current `gpc vitals errors reports` command calls a path (`/apps/{pkg}/errorIssues/{name}/reports`) that does not exist in Google's discovery doc. The correct endpoint is `GET /apps/{pkg}/errorReports:search` with an `errorIssueId` filter. Scheduled for a future release alongside the other Reporting additions above.
:::

### Managed Google Play (playcustomapp): minor polish

| Item                                | Notes                                                                |
| ----------------------------------- | -------------------------------------------------------------------- |
| Accept BCP 47 hyphen form (`en-US`) | Currently only `en_US` is documented; both work, hyphen is canonical |
| Pre-validate 10 GiB upload cap      | Clearer error than mid-stream upload failure                         |

No spec-driven changes needed: `accounts.customApps.create` is the entire API surface (1 method). Google has not added methods since v0.9.56 shipped (2026-04-11).

### Games APIs: strategic direction

GPC's current `games` command wraps the runtime `games v1` API (leaderboards, achievements, events, player-facing). This is off-mission for a publisher CLI and requires player OAuth rather than publisher credentials.

The publisher-facing surface is `gamesconfiguration v1configuration` (10 methods, CRUD on achievement and leaderboard **definitions** from CI/CD):

| Resource                    | Methods (5 each)                            |
| --------------------------- | ------------------------------------------- |
| `achievementConfigurations` | `list`, `get`, `insert`, `update`, `delete` |
| `leaderboardConfigurations` | `list`, `get`, `insert`, `update`, `delete` |

Planned replacement:

| Current (runtime)        | Planned (publisher config)                               |
| ------------------------ | -------------------------------------------------------- |
| `gpc games leaderboards` | `gpc games leaderboards {list,get,create,update,delete}` |
| `gpc games achievements` | `gpc games achievements {list,get,create,update,delete}` |
| `gpc games events`       | _(removed, runtime-only, no publisher equivalent)_       |

`games v1` and `gamesmanagement v1management` will not be expanded; they are runtime/QA-reset surfaces outside GPC's publisher-CLI mission.

### Deprecation watch

- **Developer Verification API (2026 rollout)**: not yet present in `androidpublisher v3` discovery as of revision `20260416`. Monitoring for a new discovery doc (likely `playdeveloperverification`-style) or Console-only feature. See [Developer Verification guide](../guide/developer-verification.md) for current posture.
- **Soft-deprecated signals**: Google's discovery doesn't flag these but their descriptions point callers at v2 equivalents:
  - `purchases.subscriptions.{acknowledge, cancel, defer}` → prefer `subscriptionsv2.*`
  - `inappproducts.*` (for subscriptions only) → prefer `monetization.subscriptions.*`

GPC currently emits a deprecation warning only on `purchases.subscriptions.get`. Expanding warning coverage to the soft-deprecated surfaces above is a candidate for a future release.
