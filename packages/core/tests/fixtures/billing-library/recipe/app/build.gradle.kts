// One code-free app, one product flavor per preflight fixture. Only the merged
// base manifest of each bundle is kept (see build-fixtures.sh).
plugins {
    id("com.android.application")
}

android {
    namespace = "com.example.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    flavorDimensions += "billing"
    productFlavors {
        create("billing7") { dimension = "billing" }
        create("billingKtx8") { dimension = "billing" }
        create("billing9") { dimension = "billing" }
        create("billing8NoMeta") { dimension = "billing" }
        create("noBilling") { dimension = "billing" }
    }
}

dependencies {
    "billing7Implementation"("com.android.billingclient:billing:7.1.1")
    "billingKtx8Implementation"("com.android.billingclient:billing-ktx:8.3.0")
    "billing9Implementation"("com.android.billingclient:billing:9.1.0")
    "billing8NoMetaImplementation"("com.android.billingclient:billing:8.3.0")
}
