---
"@gpc-cli/api": patch
"@gpc-cli/cli": patch
"@gpc-cli/core": patch
"@gpc-cli/auth": patch
"@gpc-cli/config": patch
"@gpc-cli/plugin-sdk": patch
"@gpc-cli/plugin-ci": patch
---

API freshness audit (synced with Jan 2026 Google Play API release notes) and a multi-profile CLI fix.

- fix(api): correct `offerPhase` shape — union object on `SubscriptionPurchaseLineItem`, not a string, and not on the V2 root
- feat(api): type `revokeSubscriptionV2` request body with `revocationContext` union (`fullRefund`, `proratedRefund`, `itemBasedRefund`)
- feat(api): type `acknowledgeSubscription` body with optional `externalAccountId`
- docs(api): clarify `subscriptionsv2.defer` add-ons behavior
- fix(cli): `--profile` / `-p` global flag now actually switches profiles. Previously silently ignored — all commands used the default profile
