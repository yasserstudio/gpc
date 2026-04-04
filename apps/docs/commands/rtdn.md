---
outline: deep
---

<CommandHeader
  name="gpc rtdn"
  description="Real-Time Developer Notifications — decode and inspect Pub/Sub messages from Google Play."
  usage="gpc rtdn <subcommand> [options]"
  :badges="['--json', 'no auth required for decode']"
/>

## Commands

| Command                       | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| [`rtdn status`](#rtdn-status) | Check RTDN notification topic configuration          |
| [`rtdn decode`](#rtdn-decode) | Decode a base64-encoded Pub/Sub notification payload |
| [`rtdn test`](#rtdn-test)     | Guidance for testing RTDN setup                      |

## Overview

Google Play sends Real-Time Developer Notifications (RTDN) via Cloud Pub/Sub when subscription and purchase events occur. GPC provides tools to inspect your RTDN configuration and decode notification payloads.

### How RTDN Works

1. You create a Pub/Sub topic in your GCP project
2. You configure the topic in Play Console (Monetization setup)
3. Google Play publishes base64-encoded JSON messages to your topic
4. Your backend subscribes to the topic and processes events

GPC helps with steps 1-2 (checking configuration) and decoding messages for debugging.

---

## `rtdn status`

Check whether RTDN is configured for your app.

### Synopsis

```bash
gpc rtdn status [options]
```

### Example

```bash
gpc rtdn status --app com.example.myapp
```

```
RTDN Status — com.example.myapp
──────────────────────────────────────────────────
Topic:   projects/my-project/topics/play-notifications
Enabled: yes
```

If no topic is configured, GPC shows setup instructions.

---

## `rtdn decode`

Decode a base64-encoded Pub/Sub notification payload into a readable format.

### Synopsis

```bash
gpc rtdn decode <base64-payload>
```

### Example

```bash
gpc rtdn decode "eyJ2ZXJzaW9uIjoiMS4wIiwicGFja2FnZU5hbWUiOiJjb20uZXhhbXBsZSIs..."
```

```
packageName   com.example.myapp
eventTime     2026-03-28T10:00:00.000Z
version       1.0
type          subscription
event         SUBSCRIPTION_PURCHASED
subscriptionId  premium_monthly
purchaseToken   abc123def456...
```

### JSON Output

```bash
gpc rtdn decode <payload> --output json
```

Returns the full decoded notification object including all fields.

### Notification Types

**Subscription events:**

| Code | Event                                 |
| ---- | ------------------------------------- |
| 1    | `SUBSCRIPTION_RECOVERED`              |
| 2    | `SUBSCRIPTION_RENEWED`                |
| 3    | `SUBSCRIPTION_CANCELED`               |
| 4    | `SUBSCRIPTION_PURCHASED`              |
| 5    | `SUBSCRIPTION_ON_HOLD`                |
| 6    | `SUBSCRIPTION_IN_GRACE_PERIOD`        |
| 7    | `SUBSCRIPTION_RESTARTED`              |
| 8    | `SUBSCRIPTION_PRICE_CHANGE_CONFIRMED` |
| 9    | `SUBSCRIPTION_DEFERRED`               |
| 12   | `SUBSCRIPTION_REVOKED`                |
| 13   | `SUBSCRIPTION_EXPIRED`                |

**One-time product events:**

| Code | Event                        |
| ---- | ---------------------------- |
| 1    | `ONE_TIME_PRODUCT_PURCHASED` |
| 2    | `ONE_TIME_PRODUCT_CANCELED`  |

**Other events:** `VOIDED_PURCHASE`, `TEST_NOTIFICATION`

---

## `rtdn test`

Shows instructions for sending a test notification from the Play Console.

```bash
gpc rtdn test
```

### Setup Guide

1. **Create a Pub/Sub topic** in your GCP project:

   ```
   gcloud pubsub topics create play-notifications
   ```

2. **Grant publish access** to Google Play:

   ```
   gcloud pubsub topics add-iam-policy-binding play-notifications \
     --member="serviceAccount:google-play-developer-notifications@system.gserviceaccount.com" \
     --role="roles/pubsub.publisher"
   ```

3. **Configure in Play Console:**
   Go to Monetization setup > Real-time developer notifications > Set your topic name

4. **Send a test notification** from the Play Console to verify the setup

5. **Decode the test message:**
   ```bash
   gpc rtdn decode <base64-payload-from-pubsub>
   ```

## Notes

- RTDN requires a GCP project with Pub/Sub enabled
- The service account used by GPC does not need Pub/Sub permissions — RTDN uses a separate Google-managed service account for publishing
- Test notifications can only be triggered from the Play Console UI
- RTDN is essential for subscription-based apps to track lifecycle events in real time
