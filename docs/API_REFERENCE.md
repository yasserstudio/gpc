# Google Play Developer API — Deep Reference

> Compiled from official Google documentation. This is the authoritative reference for GPC implementation.

---

## APIs Overview

GPC interacts with **two separate Google APIs**:

| API | Endpoint | Purpose |
| --- | --- | --- |
| **Android Publisher API v3** | `androidpublisher.googleapis.com` | Publishing, monetization, reviews, purchases, users |
| **Play Developer Reporting API v1beta1** | `playdeveloperreporting.googleapis.com` | Vitals, crash rates, ANR, performance metrics |

Both require separate enablement in Google Cloud Console but share the same service account credentials.

---

## Authentication

### Setup Steps

1. Create a Google Cloud Project
2. Enable both APIs in Google Cloud Console
3. Create a service account (or OAuth client)
4. Invite the service account email in Play Console → Users & Permissions
5. Grant required permissions

### Authentication Methods

| Method | Use Case | Token Lifetime |
| --- | --- | --- |
| **Service Account** (JSON key) | CI/CD, server-to-server, automation | Auto-refreshed |
| **OAuth 2.0** | Interactive CLI usage, user-scoped access | 1h access, refreshable |
| **Application Default Credentials** | GCP-hosted environments | Auto-managed |

### Required Scopes

```
https://www.googleapis.com/auth/androidpublisher
```

For Reporting API:

```
https://www.googleapis.com/auth/playdeveloperreporting
```

### Play Console Permissions (Service Account)

| Permission | Required For |
| --- | --- |
| View app information and download bulk reports | Read-only app data |
| View financial data, orders, and cancellation survey responses | Financial reports, orders, voided purchases |
| Manage orders and subscriptions | Purchase acknowledgment, refunds |
| Manage store presence | Listings, screenshots, metadata |
| Release to production, exclude devices | Production track releases |
| Release apps to testing tracks | Alpha, beta, QA track management |
| Manage testing tracks and edit tester lists | Tester management |
| Reply to reviews | Review replies |
| View app quality information | Vitals, crash data, ANR |

---

## Quotas & Rate Limits

### Android Publisher API

| Quota Bucket | Default Limit | Endpoints |
| --- | --- | --- |
| Publishing, Monetization, Reply to Reviews | 3,000/min | Edits, Listings, Tracks, IAP, Subscriptions, Reviews |
| Subscriptions (reads) | 3,000/min | purchases.subscriptions.get, purchases.subscriptionsv2.get |
| Subscription Updates | 3,000/min | cancel, defer, refund, revoke |
| One-time Purchases | 3,000/min | purchases.products.get, purchases.productsv2.get |
| Orders | 3,000/min | orders.get, orders.refund |
| External Transactions | 3,000/min | externaltransactions.* |

**Key:** Each bucket is independent. Using all 3,000/min on subscriptions does NOT affect publishing quota.

### Reviews API (Separate Limits)

| Operation | Limit |
| --- | --- |
| GET (list/get reviews) | 200/hour |
| POST (reply to reviews) | 2,000/day |

### Voided Purchases API

| Limit | Value |
| --- | --- |
| Daily | 6,000 queries |
| Burst | 30 queries per 30 seconds |

### Reporting API

Separate quotas (documented per metric set). Generally more restrictive than Publisher API.

### Rate Limit Implementation for GPC

```
Rate Limiter Config:
  default_bucket: 50 req/sec (well under 3,000/min)
  reviews_get: 3 req/sec (under 200/hour)
  reviews_post: 1 req/sec (under 2,000/day)
  voided_purchases: 1 req/sec (under 30/30s)

Retry Strategy:
  on 429: exponential backoff with jitter
  base_delay: 1s
  max_delay: 60s
  max_retries: 5
  on 5xx: retry up to 3 times with 1s base delay
```

---

## The Edits System

### Concept

Edits are **transactional containers** for app changes. All publishing modifications (uploads, track assignments, listing updates) happen within an edit that must be explicitly committed.

### Lifecycle

```
Insert Edit → (returns editId)
    │
    ├── Upload APK/AAB
    ├── Update tracks
    ├── Update listings
    ├── Update images
    ├── Update details
    ├── Update testers
    │
    ├── Validate Edit (optional, recommended)
    │
    └── Commit Edit → changes go live (may take hours to propagate)

    OR

    └── Delete Edit → all changes discarded
```

### Critical Rules

1. **One edit per user at a time.** Creating a new edit invalidates any previous open edit.
2. **Console invalidates API edits.** If anyone makes changes via Play Console while an API edit is open, the edit is silently discarded.
3. **Edits are snapshots.** An edit starts as a copy of the current live state. Changes are layered on top.
4. **Commit is not instant.** Changes may take several hours to propagate after commit.
5. **Validate before commit.** `edits.validate` catches errors before committing.

### GPC Implementation Strategy

```
User runs: gpc releases upload app.aab --track beta

Internally:
  1. edits.insert() → get editId
  2. edits.bundles.upload(editId, file) → get versionCode
  3. edits.tracks.update(editId, track, release) → assign to track
  4. edits.validate(editId) → check for errors
  5. edits.commit(editId) → publish

On any failure:
  6. edits.delete(editId) → clean up

Users never see editId. It's managed transparently.
```

---

## Tracks & Releases

### Built-in Tracks

| Track | Purpose | Audience |
| --- | --- | --- |
| `production` | Live to all users | Everyone |
| `beta` | Open testing | Opted-in users |
| `alpha` | Closed testing | Approved testers |
| `qa` | Internal testing | Internal team |

### Form Factor Tracks

| Form Factor | Prefix | Example |
| --- | --- | --- |
| Android Automotive OS | `automotive` | `automotive:production` |
| Wear OS | `wear` | `wear:beta` |
| Android TV | `tv` | `tv:production` |
| Android XR | `android_xr` | `android_xr:qa` |
| Google Play Games on PC | `google_play_games_pc` | `google_play_games_pc:production` |

Custom closed testing tracks: `[prefix]:$customName`

### Release Object

```json
{
  "name": "Release 1.2.3",
  "versionCodes": ["42"],
  "status": "inProgress",
  "userFraction": 0.1,
  "releaseNotes": [
    {
      "language": "en-US",
      "text": "Bug fixes and performance improvements."
    }
  ]
}
```

### Release Statuses

| Status | Meaning | Transitions |
| --- | --- | --- |
| `draft` | Created via API, not live | → commit via Console |
| `inProgress` | Staged rollout active | → completed, halted |
| `completed` | Fully rolled out (100%) | — |
| `halted` | Rollout stopped | → inProgress, completed |

### Staged Rollout Flow

```
Upload AAB
    │
    ▼
Release to 5%  (status: inProgress, userFraction: 0.05)
    │
    ▼ [monitor vitals]
    │
Increase to 20% (userFraction: 0.2)
    │
    ▼ [monitor vitals]
    │
Increase to 50% (userFraction: 0.5)
    │
    ▼ [all clear]
    │
Full rollout (status: completed)

    OR at any point:

Halt rollout (status: halted)
    │
    ▼ [fix issues]
    │
Resume (status: inProgress) or Complete
```

---

## Reviews API

### Constraints

- **Production only** — no access to testing track reviews
- **Last 7 days** — can only retrieve reviews created or modified in the past week
- **Text reviews only** — ratings without comments are excluded
- **Reply limit** — 350 characters max
- **Notification behavior** — users notified only on first reply; editing a reply does NOT re-notify

### Pagination

- Default: 10 results per page (max: 100)
- Uses `tokenPagination.nextPageToken` for subsequent pages

### Translation

Add `translationLanguage` parameter (e.g., `en`) to auto-translate. Original text preserved in `originalText` field.

### Rate Limits (Separate from Publisher API)

| Operation | Limit |
| --- | --- |
| List/Get | 200 requests/hour |
| Reply | 2,000 requests/day |

---

## Monetization Data Model

### Hierarchy

```
App (packageName)
└── Subscription (productId)
    ├── Listings[] (per language: title, description, benefits)
    ├── TaxAndComplianceSettings
    └── BasePlan[] (basePlanId)
        ├── Type: AutoRenewing | Prepaid | Installments
        ├── RegionalConfigs[] (pricing per country)
        ├── OtherRegionsConfig (USD + EUR for future markets)
        └── Offer[] (offerId)
            ├── State: DRAFT | ACTIVE | INACTIVE
            ├── OfferTags[] (max 20)
            ├── Phases[] (1-2 pricing phases)
            │   ├── recurrenceCount
            │   ├── duration (ISO 8601)
            │   └── RegionalConfigs (absolute/relative/free)
            └── TargetingRule
                ├── AcquisitionTargeting (new users)
                └── UpgradeTargeting (existing subscribers)
```

### Base Plan Types

| Type | Auto-renews | Use Case |
| --- | --- | --- |
| `AutoRenewingBasePlanType` | Yes | Standard subscriptions (monthly, yearly) |
| `PrepaidBasePlanType` | No | User must manually renew |
| `InstallmentsBasePlanType` | Depends on renewalType | Commitment plans (12 monthly payments) |

### AutoRenewing Fields

| Field | Description | Constraints |
| --- | --- | --- |
| `billingPeriodDuration` | ISO 8601 (e.g., P1M, P1Y) | Immutable after creation |
| `gracePeriodDuration` | Time after billing failure | P0D to P30D |
| `accountHoldDuration` | Hold before cancellation | P0D to P60D |
| `resubscribeState` | Allow re-subscribe from Play Store | ACTIVE or INACTIVE |
| `prorationMode` | Upgrade pricing behavior | CHARGE_ON_NEXT or CHARGE_FULL |

### Offer Pricing Options (per region, per phase)

| Option | Description |
| --- | --- |
| Absolute price | Fixed price (Money object) |
| Relative discount | Percentage off base plan (0 < fraction < 1) |
| Absolute discount | Fixed amount off base plan |
| Free | No charge for this phase |

### Offer Targeting

| Rule | Meaning | Scope Options |
| --- | --- | --- |
| Acquisition | "User never had this before" | thisSubscription, anySubscriptionInApp, specificSubscription |
| Upgrade | "User currently has this" | Same scope options + billingPeriodDuration + oncePerUser |

---

## Purchases API

### v1 vs v2

| API | Status | Use |
| --- | --- | --- |
| `purchases.subscriptions` (v1) | **Deprecated** (cancel, get, refund, revoke) | Legacy — avoid |
| `purchases.subscriptionsv2` | **Current** | Use for all new implementations |
| `purchases.products` (v1) | Active | One-time product purchases |
| `purchases.productsv2` | Active | One-time product purchases (newer) |

### Voided Purchases

- Returns purchases voided in the last 30 days
- Voiding reasons: user refund, chargeback, developer refund, Google cancellation
- Filtering: `startTime`, `endTime`, `type` (0=IAP only, 1=IAP+subscriptions)
- Max 1,000 results per page with pagination token
- **Quotas:** 6,000/day, 30 per 30 seconds

---

## Users & Grants (Permissions API)

### User Resource

```json
{
  "name": "developers/{developerId}/users/{email}",
  "email": "user@example.com",
  "accessState": "ACCESS_GRANTED",
  "developerAccountPermissions": ["CAN_VIEW_NON_FINANCIAL_DATA_GLOBAL"],
  "grants": [...]
}
```

### Access States

| State | Meaning |
| --- | --- |
| `INVITED` | Pending acceptance |
| `INVITATION_EXPIRED` | Invite expired |
| `ACCESS_GRANTED` | Active access |
| `ACCESS_EXPIRED` | Access lapsed |

### App-Level Permissions (Grants)

| Permission | Allows |
| --- | --- |
| `CAN_VIEW_FINANCIAL_DATA` | Financial data access |
| `CAN_MANAGE_PERMISSIONS` | Admin (all permissions) |
| `CAN_MANAGE_PUBLIC_APKS` | Release to production |
| `CAN_MANAGE_TRACK_APKS` | Release to testing tracks |
| `CAN_MANAGE_PUBLIC_LISTING` | Store presence management |
| `CAN_VIEW_NON_FINANCIAL_DATA` | Read-only app info |
| `CAN_VIEW_APP_QUALITY` | Vitals, crash data |
| `CAN_MANAGE_ORDERS` | Orders and subscriptions |
| `CAN_REPLY_TO_REVIEWS` | Review replies |
| `CAN_MANAGE_DRAFT_APPS` | Draft app management |
| `CAN_MANAGE_DEEPLINKS` | Deep link management |
| `CAN_MANAGE_POLICY` | Policy compliance |

**Note:** Permission changes may take up to 48 hours to propagate.

---

## Play Developer Reporting API

### Separate API

Endpoint: `playdeveloperreporting.googleapis.com` (v1beta1)

This is a **different API** from the Publisher API. It requires separate enablement and has its own quota.

### Resources

| Resource | Methods | Description |
| --- | --- | --- |
| `apps` | search, fetchReleaseFilterOptions | App discovery and filter options |
| `anomalies` | list | Detected anomalies across metrics |
| `vitals.anrRateMetricSet` | get, query | ANR rate data |
| `vitals.crashRateMetricSet` | get, query | Crash rate data |
| `vitals.errorCountMetricSet` | get, query | Error count data |
| `vitals.excessiveWakeupRateMetricSet` | get, query | Battery: excessive wakeups |
| `vitals.stuckBackgroundWakelockRateMetricSet` | get, query | Battery: stuck wakelocks |
| `vitals.slowRenderingRateMetricSet` | get, query | UI: slow frame rendering |
| `vitals.slowStartRateMetricSet` | get, query | Startup: cold/warm start times |
| `vitals.lmkRateMetricSet` | get, query | Low Memory Killer rate |
| `errorIssues` | search | Grouped error clusters |
| `errorReports` | search | Individual error reports |

### Query Pattern

Each metric set supports:
- `get` — describes available metrics and dimensions
- `query` — POST request with filters, dimensions, date range

### Available Dimensions (common across metric sets)

- `appVersion` — version code/name
- `osVersion` — Android version
- `deviceModel` — device model
- `userCohort` — user segment

### Aggregation Periods

- `HOURLY`
- `DAILY`
- `FULL_RANGE`

---

## Undocumented Gotchas & Implementation Notes

### Edit Conflicts
- If a Play Console user makes any change while an API edit is open, the edit is **silently discarded** — no error until commit attempt
- **GPC approach:** Keep edits short-lived. Open, modify, validate, commit in a single operation.

### Upload Size
- AAB/APK uploads go through the edit system
- No documented size limit in the API (Play Console limits: 150MB for APK, 150MB for AAB base module)
- Use resumable upload for large files

### Version Code Uniqueness
- Each uploaded APK/AAB gets a version code
- Version codes must be unique and incrementing across ALL tracks
- Cannot reuse a version code, even if the previous upload was deleted

### Track Update Replaces, Not Merges
- `edits.tracks.update` **replaces** the entire track configuration
- To add a release without removing existing ones, you must include all current releases in the update
- **GPC approach:** Read current track state, merge new release, then update

### Listing Languages
- Deleting a listing in the default language deletes ALL listings
- Always check which language is the default before delete operations

### Review Reply Notifications
- Users are notified only on the **first** reply to a new or modified review
- Editing an existing reply does NOT trigger a new notification
- GPC should warn users about this behavior

### Subscription Archive Deprecated
- `monetization.subscriptions.archive` is deprecated
- Use `delete` instead for removing subscriptions
- GPC should not expose the archive endpoint

### Permission Propagation Delay
- User/grant permission changes can take **up to 48 hours** to take effect
- GPC should warn users after permission modifications

### Two Separate APIs
- Publishing API and Reporting API are separate services
- Different base URLs, different enablement, potentially different quotas
- Same service account can access both if granted appropriate permissions
- **GPC approach:** Single auth, two API clients internally
