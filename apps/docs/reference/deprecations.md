---
outline: deep
head:
  - - meta
    - name: robots
      content: noindex, follow
---

# Google Play API Deprecations

This page tracks Google Play Developer API deprecations that affect GPC commands and types. Two deprecation waves are active, each with its own shutdown timeline.

## May 2026 Deprecation Wave

Deprecated as of **May 19, 2026**. Shutdown on **August 31, 2028** (extension available to November 1, 2028).

::: warning Timeline

- **May 19, 2026** -- Deprecation begins
- **July 1, 2027** -- New client libraries no longer include these APIs
- **August 31, 2028** -- Shutdown (APIs stop working)
- **November 1, 2028** -- Extension deadline (if requested)
  :::

### Deprecated subscription APIs

| API                              | GPC Warning Code | Replacement              |
| -------------------------------- | ---------------- | ------------------------ |
| `purchases.subscriptions:cancel` | `GPC_DEP002`     | `subscriptionsv2.cancel` |
| `purchases.subscriptions:defer`  | `GPC_DEP003`     | `subscriptionsv2.defer`  |

GPC emits deprecation warnings on both methods. `cancelSubscriptionV2` and `deferSubscriptionV2` are the v2 replacements.

### Deprecated Order field

| Field                                             | Replacement                                               |
| ------------------------------------------------- | --------------------------------------------------------- |
| `Order.lineItems.subscriptionDetails.offer_phase` | `Order.lineItems.subscriptionDetails.offer_phase_details` |

### NOT deprecated in this wave

`purchases.subscriptions:acknowledge` is **not deprecated**. It remains active with no announced deprecation date.

---

## May 2025 Deprecation Wave

Deprecated as of **May 21, 2025**. Shutdown on **August 31, 2027** (extension available to November 1, 2027).

::: warning Timeline

- **May 21, 2025** -- Deprecation begins
- **July 1, 2026** -- New client libraries no longer include these APIs
- **August 31, 2027** -- Shutdown (APIs stop working)
- **November 1, 2027** -- Extension deadline (if requested)
  :::

### `purchases.subscriptions.get` (v1)

**Status:** Deprecated -- use `subscriptionsv2.get` instead.

| Before                                                     | After                                    |
| ---------------------------------------------------------- | ---------------------------------------- |
| `gpc purchases subscription get <subscription-id> <token>` | `gpc purchases subscription get <token>` |

GPC's `getSubscriptionV2` (used by `gpc purchases subscription get`) already uses the v2 endpoint. The v1 `getSubscriptionV1` method emits a deprecation warning (`GPC_DEP001`).

### `purchases.subscriptions.refund` (v1)

**Status:** Deprecated -- use `subscriptionsv2.get` + `Orders.refund` instead.

| Before                            | After                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Refund via `subscriptions.refund` | 1. `gpc purchases subscription get <token>` to find `latestSuccessfulOrderId` |
|                                   | 2. `gpc purchases orders refund <order-id>` to refund the order               |

Google's recommended flow is to look up the subscription via v2, extract the order ID from `lineItems[].latestSuccessfulOrderId`, then refund via the Orders API.

### `purchases.subscriptions.revoke` (v1)

**Status:** Deprecated -- use `subscriptionsv2.revoke` instead.

GPC already uses the v2 revoke endpoint internally. No command change needed.

### `SubscriptionPurchaseV2.latestOrderId`

**Status:** Deprecated -- use `SubscriptionPurchaseLineItem.latestSuccessfulOrderId` instead.

GPC's `SubscriptionPurchaseV2` type already includes `latestSuccessfulOrderId` on the line item level.

### `SubscriptionNotification.subscriptionId`

**Status:** Deprecated -- no replacement. Real-time developer notifications will no longer include the `subscriptionId` field in `SubscriptionNotification`.

### `SUBSCRIPTION_PRICE_CHANGE_CONFIRMED` notification type

**Status:** Deprecated -- use `SUBSCRIPTION_PRICE_CHANGE_UPDATED` instead.

## V2 Field Mapping

How fields from the legacy `SubscriptionPurchase` (v1) map to `SubscriptionPurchaseV2` (v2):

| V1 Field                                                             | V2 Field                                                                                                                                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `countryCode`                                                        | `regionCode`                                                                                                                                                                            |
| `orderId`                                                            | `lineItems[].latestSuccessfulOrderId`. Pending order ID available via `inGracePeriodStateContext.renewalDeclined.pendingOrderId` or `onHoldStateContext.renewalDeclined.pendingOrderId` |
| `startTimeMillis`                                                    | `startTime`                                                                                                                                                                             |
| `expiryTimeMillis`                                                   | `lineItems[].expiryTime` (each subscription in the purchase has its own `expiryTime`)                                                                                                   |
| `autoResumeTimeMillis`                                               | `pausedStateContext.autoResumeTime`                                                                                                                                                     |
| `autoRenewing`                                                       | `lineItems[].autoRenewingPlan.autoRenewEnabled`                                                                                                                                         |
| `priceCurrencyCode` / `priceAmountMicros`                            | `lineItems[].autoRenewingPlan.recurringPrice`                                                                                                                                           |
| `introductoryPriceInfo`                                              | `lineItems[].offerPhase.introductoryPrice`                                                                                                                                              |
| `priceChange`                                                        | `lineItems[].autoRenewingPlan.priceChangeDetails`                                                                                                                                       |
| `paymentState`                                                       | Inferred from `subscriptionState` (see below)                                                                                                                                           |
| `cancelReason` / `userCancellationTimeMillis` / `cancelSurveyResult` | `canceledStateContext`                                                                                                                                                                  |
| `linkedPurchaseToken`                                                | `linkedPurchaseToken` (no change)                                                                                                                                                       |
| `acknowledgementState`                                               | `acknowledgementState` (no change)                                                                                                                                                      |
| `profileName` / `emailAddress` / etc.                                | `subscribeWithGoogleInfo`                                                                                                                                                               |
| `promotionType` / `promotionCode`                                    | `signupPromotion`                                                                                                                                                                       |
| `externalAccountId` / `obfuscatedExternalAccountId`                  | `externalAccountIdentifiers`                                                                                                                                                            |
| `purchaseType` (test)                                                | `testPurchase`                                                                                                                                                                          |
| `purchaseType` (promo)                                               | `signupPromotion`                                                                                                                                                                       |
| `developerPayload`                                                   | No replacement (deprecated)                                                                                                                                                             |

### Inferring `paymentState` from V2

| Condition                      | V2 equivalent                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| Payment pending (new purchase) | `subscriptionState` = `SUBSCRIPTION_STATE_PENDING`                                         |
| Payment pending (renewal)      | `subscriptionState` = `SUBSCRIPTION_STATE_IN_GRACE_PERIOD` or `SUBSCRIPTION_STATE_ON_HOLD` |
| Payment received               | `subscriptionState` = `SUBSCRIPTION_STATE_ACTIVE`                                          |
| Free trial                     | `lineItems[].offerPhase.freeTrial`                                                         |
| Deferred upgrade/downgrade     | `lineItems[].deferredItemReplacement`                                                      |

### New V2-only fields (no v1 equivalent)

| Field                                 | Description                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `subscriptionState`                   | Current subscription state enum                                                                         |
| `lineItems`                           | List of products acquired in the purchase                                                               |
| `lineItems[].offerPhase`              | Current phase: free trial, intro price, proration, base price                                           |
| `lineItems[].offerDetails.basePlanId` | Base plan identifier                                                                                    |
| `lineItems[].offerDetails.offerId`    | Offer identifier                                                                                        |
| `lineItems[].offerDetails.offerTags`  | Tags attached to the offer                                                                              |
| `lineItems[].deferredItemReplacement` | Present during deferred upgrade/downgrade                                                               |
| `pausedStateContext`                  | Present when `SUBSCRIPTION_STATE_PAUSED`                                                                |
| `canceledStateContext`                | Present when `SUBSCRIPTION_STATE_CANCELED`                                                              |
| `onHoldStateContext`                  | Present when `SUBSCRIPTION_STATE_ON_HOLD` (May 2026). Contains `renewalDeclined.pendingOrderId`         |
| `inGracePeriodStateContext`           | Present when `SUBSCRIPTION_STATE_IN_GRACE_PERIOD` (May 2026). Contains `renewalDeclined.pendingOrderId` |
| `testPurchase`                        | Present for licensed tester purchases                                                                   |

## What GPC Users Should Do

1. **No immediate action required.** All GPC commands continue to work. The v1 endpoints emit deprecation warnings but function normally until their shutdown dates.

2. **For new integrations**, prefer the v2 commands:
   - Use `gpc purchases subscription get <token>` (v2, no subscription-id needed)
   - Use `gpc purchases orders refund <order-id>` instead of subscription-level refund

3. **Before August 2027** (May 2025 wave), ensure your workflows don't depend on:
   - `subscriptions.get` (v1) response format
   - `subscriptions.refund` or `subscriptions.revoke` (v1)
   - `SubscriptionNotification.subscriptionId` in RTDN payloads
   - `SubscriptionPurchaseV2.latestOrderId` (use `lineItems[].latestSuccessfulOrderId`)

4. **Before August 2028** (May 2026 wave), ensure your workflows don't depend on:
   - `subscriptions.cancel` or `subscriptions.defer` (v1)
   - `Order.lineItems.subscriptionDetails.offer_phase` (use `offer_phase_details`)

## Source

[Google Play Developer API Deprecations](https://developer.android.com/google/play/billing/compatibility) -- official deprecation timeline and field mapping.
