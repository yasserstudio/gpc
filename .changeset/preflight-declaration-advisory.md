---
"@gpc-cli/core": patch
---

Warn before uploading when an App content declaration is likely required. `gpc preflight` now emits an informational `policy-app-content-declaration` finding whenever the AAB requests a `FOREGROUND_SERVICE*` permission, reminding you to complete the "Foreground service permissions" declaration in Play Console before releasing.

This is the preventive half of the GH #101 fix. The declaration is stored in Play Console and cannot be read from the AAB, so the rule advises rather than fails, and it is distinct from the existing `foreground-service-type-missing` manifest rule: an app can declare `android:foregroundServiceType` perfectly and still be blocked by the missing Console declaration, which only surfaces as a 403 after the upload completes.
