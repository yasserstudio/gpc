# Billing Library fixtures

Real AAB manifests for the `billing-library-*` preflight rules. Each `.aab` (kebab-case of its Gradle flavor) is a
bundle built by Gradle and stripped to its single `base/manifest/AndroidManifest.xml`
entry (compiled protobuf XML, unchanged). Never hand-write these bytes.

| Fixture                 | Dependency                                       | Merged manifest                                 |
| ----------------------- | ------------------------------------------------ | ----------------------------------------------- |
| `billing-7.aab`         | `com.android.billingclient:billing:7.1.1`        | `BILLING` permission, version meta-data `7.1.1` |
| `billing-ktx-8.aab`     | `com.android.billingclient:billing-ktx:8.3.0`    | `BILLING` permission, version meta-data `8.3.0` |
| `billing-9.aab`         | `com.android.billingclient:billing:9.1.0`        | `BILLING` permission, version meta-data `9.1.0` |
| `billing-8-no-meta.aab` | `billing:8.3.0` + `tools:node="remove"` override | `BILLING` permission, no version meta-data      |
| `no-billing.aab`        | none                                             | no `BILLING` permission                         |

## Regenerate

```sh
./build-fixtures.sh
```

Built with Gradle 9.4.1 (wrapper in `recipe/`), Android Gradle Plugin 9.2.1,
compileSdk 36, JDK 21. The app has no code; `applicationId` is `com.example.app`.
The meta-data override lives in `recipe/app/src/billing8NoMeta/AndroidManifest.xml`.
