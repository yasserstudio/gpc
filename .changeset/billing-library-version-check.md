---
"@gpc-cli/core": minor
"@gpc-cli/cli": minor
---

**CI impact:** `gpc preflight` now fails the default `failOn: "error"` for an AAB built on Google Play Billing Library 7 or older. This matches Google Play, which stopped accepting new apps and app updates on Billing Library 7 after its November 1, 2026 extension deadline, so the fix is to move to Billing Library 8 or later. For a pipeline that never uploads to Google Play, `"disabledRules": ["billing-library-deprecated"]` turns the check off.

New Google Play Billing Library version check in the policy scanner. When an app holds `com.android.vending.BILLING`, preflight reads the library version from the manifest and rates it against Google's deprecation deadlines on the day of the scan: error after the extension deadline, warning after the update deadline, info in the 12 months before it. A billing app whose version cannot be read gets a `billing-library-version-unknown` info finding. AAB only.
