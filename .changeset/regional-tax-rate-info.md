---
"@gpc-cli/api": minor
---

Typed Google's new `eligibleForStreamingServiceTaxRate` tax field (US only). Subscriptions and managed products get a typed `RegionalTaxRateInfo` for `taxRateInfoByRegionCode`. One-time products get `regionalTaxConfigs` (`RegionalTaxConfig[]`), the field Google's schema actually defines for them. The old one-time product `taxRateInfoByRegionCode` is not in Google's schema and is now marked deprecated.
