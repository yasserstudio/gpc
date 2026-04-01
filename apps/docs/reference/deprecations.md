---
outline: deep
head:
  - - meta
    - name: robots
      content: noindex, follow
---

# Google Play API Deprecations

Google deprecated several subscription-related APIs on **May 21, 2025**, with shutdown on **August 31, 2027** (extension available to November 1, 2027). This page documents which GPC commands are affected and what to use instead.

::: warning Timeline
- **May 21, 2025** — Deprecation begins
- **November 1, 2025** — New client libraries no longer include deprecated APIs
- **August 31, 2027** — Shutdown (APIs stop working)
- **November 1, 2027** — Extension deadline (if requested)
:::

## Deprecated APIs

### `purchases.subscriptions.get` (v1)

**Status:** Deprecated — use `subscriptionsv2.get` instead.

| Before | After |
|--------|-------|
| `gpc purchases subscription get <subscription-id> <token>` | `gpc purchases subscription get <token>` |

GPC's `getSubscriptionV2` (used by `gpc purchases subscription get`) already uses the v2 endpoint. The v1 `getSubscriptionV1` method emits a deprecation warning.

### `purchases.subscriptions.refund` (v1)

**Status:** Deprecated — use `subscriptionsv2.get` + `Orders.refund` instead.

| Before | After |
|--------|-------|
| Refund via `subscriptions.refund` | 1. `gpc purchases subscription get <token>` to find `latestSuccessfulOrderId` |
| | 2. `gpc purchases orders refund <order-id>` to refund the order |

Google's recommended flow is to look up the subscription via v2, extract the order ID from `lineItems[].latestSuccessfulOrderId`, then refund via the Orders API.

### `purchases.subscriptions.revoke` (v1)

**Status:** Deprecated — use `subscriptionsv2.revoke` instead.

GPC already uses the v2 revoke endpoint internally. No command change needed.

### `SubscriptionPurchaseV2.latestOrderId`

**Status:** Deprecated — use `SubscriptionPurchaseLineItem.latestSuccessfulOrderId` instead.

GPC's `SubscriptionPurchaseV2` type already includes `latestSuccessfulOrderId` on the line item level.

### `SubscriptionNotification.subscriptionId`

**Status:** Deprecated — no replacement. Real-time developer notifications will no longer include the `subscriptionId` field in `SubscriptionNotification`.

### `SUBSCRIPTION_PRICE_CHANGE_CONFIRMED` notification type

**Status:** Deprecated — use `SUBSCRIPTION_PRICE_CHANGE_UPDATED` instead.

## NOT Deprecated

The following v1 subscription management APIs are **not deprecated** and continue to work:

| API | GPC Command | Status |
|-----|-------------|--------|
| `purchases.subscriptions:acknowledge` | `gpc purchases subscription acknowledge` | Active |
| `purchases.subscriptions:cancel` | `gpc purchases subscription cancel` | Active |
| `purchases.subscriptions:defer` | `gpc purchases subscription defer` | Active |

These remain on the `purchases.subscriptions` endpoint. Google has not announced deprecation dates for these methods.

## V2 Field Mapping

Key field changes between `SubscriptionPurchase` (v1) and `SubscriptionPurchaseV2` (v2):

| V1 Field | V2 Field |
|----------|----------|
| `countryCode` | `regionCode` |
| `orderId` | `lineItems[].latestSuccessfulOrderId` |
| `startTimeMillis` | `startTime` |
| `expiryTimeMillis` | `lineItems[].expiryTime` |
| `autoRenewing` | `lineItems[].autoRenewingPlan.autoRenewEnabled` |
| `priceCurrencyCode` / `priceAmountMicros` | `lineItems[].autoRenewingPlan.recurringPrice` |
| `introductoryPriceInfo` | `lineItems[].offerPhase.introductoryPrice` |
| `paymentState` | Inferred from `subscriptionState` |
| `cancelReason` / `userCancellationTimeMillis` | `canceledStateContext` |
| `autoResumeTimeMillis` | `pausedStateContext.autoResumeTime` |
| `profileName` / `emailAddress` / etc. | `subscribeWithGoogleInfo` |
| `promotionType` / `promotionCode` | `signupPromotion` |
| `externalAccountId` / `obfuscatedExternalAccountId` | `externalAccountIdentifiers` |
| `purchaseType` (test) | `testPurchase` |
| `purchaseType` (promo) | `signupPromotion` |
| `developerPayload` | No replacement (deprecated) |

### New V2-only fields (no v1 equivalent)

| Field | Description |
|-------|-------------|
| `subscriptionState` | Current subscription state enum |
| `lineItems` | List of products acquired in the purchase |
| `lineItems[].offerPhase` | Current phase: free trial, intro price, proration, base price |
| `lineItems[].offerDetails.basePlanId` | Base plan identifier |
| `lineItems[].offerDetails.offerId` | Offer identifier |
| `lineItems[].offerDetails.offerTags` | Tags attached to the offer |
| `pausedStateContext` | Present when `SUBSCRIPTION_STATE_PAUSED` |
| `canceledStateContext` | Present when `SUBSCRIPTION_STATE_CANCELED` |
| `testPurchase` | Present for licensed tester purchases |

## What GPC Users Should Do

1. **No immediate action required.** All GPC commands continue to work. The v1 `get` endpoint emits a deprecation warning but functions normally until August 2027.

2. **For new integrations**, prefer the v2 commands:
   - Use `gpc purchases subscription get <token>` (v2, no subscription-id needed)
   - Use `gpc purchases orders refund <order-id>` instead of subscription-level refund

3. **Before August 2027**, ensure your workflows don't depend on:
   - `subscriptions.get` (v1) response format
   - `subscriptions.refund` or `subscriptions.revoke` (v1)
   - `SubscriptionNotification.subscriptionId` in RTDN payloads
   - `SubscriptionPurchaseV2.latestOrderId` (use `lineItems[].latestSuccessfulOrderId`)

## Source

[Google Play Developer API Deprecations](https://developer.android.com/google/play/billing/compatibility) — official deprecation timeline and field mapping.
