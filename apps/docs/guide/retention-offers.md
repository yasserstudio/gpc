# Retention Offers

A retention offer is a discount Google Play shows to a subscriber who starts to cancel. GPC creates these offers, checks them against Google's rules before anything is sent, targets them at single subscribers, and reads what happens after a subscriber accepts one.

Your app needs no change. Google Play shows the offer in its own subscription management, and your backend learns about it through Real-Time Developer Notifications (RTDN).

## Before you start

- The offer goes on an **auto-renewing** base plan. Prepaid and installment base plans cannot have one.
- Set up [RTDN](../commands/rtdn.md) with a backend that reads the subscription after each notification.

## Cohort or per-user

There are two kinds of retention offer. An offer is one kind or the other.

|                   | Cohort                                          | Per-user                                                      |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Targeting in JSON | `retentionRule`                                 | `retentionPerUserRule` (empty object)                         |
| Who sees it       | Every subscriber who meets the rules you set    | Only subscribers your backend targets, one purchase at a time |
| Rules you set     | Days subscribed, repeat claims, days in between | None; your backend decides                                    |
| GPC flag          | `--retention cohort`                            | `--retention per-user`                                        |
| Extra step        | None                                            | `gpc purchases subscription target-offer` for each subscriber |

Use a cohort offer for a standing rule, such as "50% off for two months for anyone subscribed 90 days or more". Use a per-user offer when your own data picks the subscribers, such as a churn score.

## Create a cohort offer

```bash
gpc subscriptions offers create premium_monthly p1m \
  --app com.example.app \
  --retention cohort --offer-id winback-50 \
  --discount 0.5 --periods 2 --min-duration 90d
```

GPC reads the base plan, copies its billing period and regions into the offer, and checks the result. The offer is created as a draft. Activate it when you are ready:

```bash
gpc subscriptions offers activate premium_monthly p1m winback-50 --app com.example.app
```

If Google answers that a region "is not billable at the specified regions version", the base plan sells in a region that Google added after the version GPC sends by default (`2022/02`). Add `--regions-version` with a newer version, such as the latest one in [Google's list](https://support.google.com/googleplay/android-developer/answer/10532353).

To let a subscriber claim the offer again later, add `--multiple-claims --cooldown 180d`. The cooldown counts from the end of the last discount. Add `--start` and `--end` (RFC 3339 times) to run the offer for a limited time.

Prefer a file? Start from the template, edit it, and create the offer from it. GPC runs the same checks on the file:

```bash
gpc subscriptions offers template retention > offer.json
gpc subscriptions offers create premium_monthly p1m --app com.example.app --file offer.json
```

See [`subscriptions offers create`](../commands/subscriptions.md#subscriptions-offers-create) for every flag.

## Create a per-user offer and target it

```bash
gpc subscriptions offers create premium_monthly p1m \
  --app com.example.app \
  --retention per-user --offer-id save-30 --discount 0.3 --activate

gpc purchases subscription target-offer "<purchase-token>" \
  --offer save-30 --app com.example.app
```

Google stores the targeting, so you do not need to call it again when the subscriber opens the cancellation flow. The targeting lasts until you remove it with `gpc purchases subscription untarget-offer`, or until 60 days after the subscription expires. It does not carry over to a new purchase token. Both commands are safe to repeat.

The offer must have been activated at least once before you can target it. A deactivated per-user offer still accepts targeting, but Google Play does not show it.

## Stop an offer

Google Play deletes only draft offers. Once an offer has been activated, deactivate it instead:

```bash
gpc subscriptions offers deactivate premium_monthly p1m winback-50 --app com.example.app
```

## Rules Google enforces

GPC checks these before it sends anything and lists every problem at once (exit code 2):

- The discount is a fraction between 0 and 1: `--discount 0.5` is 50% off. Fixed prices, amounts off and free periods are not allowed.
- The offer has one pricing phase that lasts 1 to 52 billing periods.
- Days subscribed (`--min-duration`) is 0 to 1826 days. Google does not accept months.
- A cooldown is required when repeat claims are on, and not allowed when they are off.
- The end time is in the future and after the start time.

Google adds rules about the subscriber. A subscription can see a retention offer at any time before its next renewal when it:

- is active and auto-renewing (not in a grace period, on account hold or paused);
- has no add-ons and is not on an installment base plan;
- renews at the regular base plan price (during a free trial or introductory price, only in its last billing period);
- is not already in the discount period of an accepted retention offer;
- has no pending plan change or unconfirmed price change;
- would pay no more with the offer than at the next renewal.

Meeting these rules does not guarantee that Google shows the offer. Google also runs its own checks, such as regional compliance.

## Which offer a subscriber sees

Google Play shows one offer per cancellation. When several apply, it picks in this order:

1. A per-user offer, even when a cohort offer has a bigger discount.
2. The highest discount percentage.
3. The lowest discounted price.
4. The offer ID that comes last in alphabetical order.

## Where subscribers see it

Only in Google Play subscription management, in the Play Store app and on the web. The offer is not returned by `queryProductDetailsAsync()` and cannot be sold through `launchBillingFlow()`. To bring subscribers there from your app, link to the Play subscriptions center.

## After a subscriber accepts

1. Google sends RTDN `SUBSCRIPTION_PLAN_TRANSITION_UPDATED` (type 21). The purchase token stays the same: this is not a new purchase, so there is nothing to acknowledge. Keep access in place.
2. Decode the notification and read the subscription:

   ```bash
   gpc rtdn decode "<base64-payload>"
   gpc purchases subscription get "<purchase-token>" --app com.example.app
   ```

   The table output shows a `planTransition` row, for example `IN_PROGRESS winback-50 at 2026-12-15T10:00:00Z`. In JSON it is `lineItems[].autoRenewingPlan.planTransitionDetails`.

3. The discount starts at the next renewal, not when the subscriber accepts. Google then sends `SUBSCRIPTION_RENEWED` (type 2), the transition row disappears, and the line item's offer is the retention offer.

Google keeps the transition pending if the subscriber defers the renewal, cancels after accepting, or the first discounted payment fails and later recovers. A plan change before the renewal, or expiry without restore, cancels it. Changing or deactivating the offer does not affect subscribers who already accepted it.

To cancel a pending transition yourself, `gpc purchases subscription cancel-transition` is available as an [experimental](../reference/stability.md) command.

## Test it

Add a license tester in Play Console under **Settings > License testing**. After you activate an offer, wait 10 to 15 minutes and clear the Play Store cache before you open the cancellation flow. Test subscriptions renew fast (a monthly plan renews every 5 minutes), so you can watch the transition finish.

## Related

- [`subscriptions offers`](../commands/subscriptions.md#subscriptions-offers-create): create, update, activate and template
- [`purchases subscription`](../commands/purchases.md#purchases-subscription-target-offer): target, untarget, get, cancel a transition
- [`rtdn decode`](../commands/rtdn.md#rtdn-decode): read notifications
- Google's guide: [Retain subscribers with retention offers](https://developer.android.com/google/play/billing/retention-offers)
