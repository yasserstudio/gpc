---
"@gpc-cli/api": patch
"@gpc-cli/core": patch
"@gpc-cli/cli": patch
---

API audit fixes, 16KB preflight scanner, OTP batch operations, system APKs resource.

**Bug fixes:**
- OTP offer URLs now use correct `/purchaseOptions/{id}/offers/` path
- `onetimeproducts.create` uses PATCH + `allowMissing` (official API has no POST create)
- Removed phantom endpoints (`refundSubscriptionV2`, `users.get`, standalone `purchaseOptions`)
- `getUser` now paginates all pages instead of only checking first page
- Manifest parser extracts compiled primitive values for robustness
- AAB reader .so header extraction destroys stream early instead of decompressing full files

**New preflight rules:**
- 16KB page size alignment scanner (ELF LOAD segment check, `pageSizeCompat` severity adjustment)
- Exported-without-permission scanner for components with `exported=true` but no `android:permission`

**New API methods:**
- OTP offer batch operations: `cancelOffer`, `batchGetOffers`, `batchUpdateOffers`, `batchUpdateOfferStates`, `batchDeleteOffers`
- OTP purchase option batch operations: `batchDeletePurchaseOptions`, `batchUpdatePurchaseOptionStates`
- Subscription offers `batch-get` and `batch-update-states` CLI commands
- `edits.testers.patch` and `inappproducts.patch` for partial updates
- `systemApks` resource: `create`, `list`, `get`, `download`
