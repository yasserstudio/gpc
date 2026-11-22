import type {
  PlayApiClient,
  ProductPurchase,
  ProductPurchaseV2,
  SubscriptionPurchaseV2,
  SubscriptionDeferResponse,
  SubscriptionsV2DeferResponse,
  RevokeSubscriptionV2Request,
  CancellationType,
  Order,
  ConsumptionUsageEvent,
  RefundPreference,
} from "@gpc-cli/api";
import { PlayApiError } from "@gpc-cli/api";
import { googleErrorText } from "../utils/google-error.js";
import { validatePackageName } from "../utils/validation.js";
import { GpcError } from "../errors.js";
import { parseRfc3339 } from "../utils/rfc3339.js";

export async function getProductPurchase(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  token: string,
): Promise<ProductPurchase> {
  validatePackageName(packageName);
  return client.purchases.getProduct(packageName, productId, token);
}

export async function acknowledgeProductPurchase(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  token: string,
  payload?: string,
): Promise<void> {
  validatePackageName(packageName);
  const body = payload ? { developerPayload: payload } : undefined;
  return client.purchases.acknowledgeProduct(packageName, productId, token, body);
}

export async function consumeProductPurchase(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  token: string,
): Promise<void> {
  validatePackageName(packageName);
  return client.purchases.consumeProduct(packageName, productId, token);
}

export async function getSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  token: string,
): Promise<SubscriptionPurchaseV2> {
  validatePackageName(packageName);
  return client.purchases.getSubscriptionV2(packageName, token);
}

export async function cancelSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  subscriptionId: string,
  token: string,
): Promise<void> {
  validatePackageName(packageName);
  return client.purchases.cancelSubscription(packageName, subscriptionId, token);
}

/**
 * Parse a v1 defer expiry (RFC 3339 with a time zone). Exported so the CLI
 * checks it before a dry run or a confirmation prompt too.
 */
export function parseSubscriptionExpiry(desiredExpiry: string): Date {
  const desired = parseRfc3339(desiredExpiry);
  if (!desired) {
    throw new GpcError(
      `Expiry "${desiredExpiry}" is not a valid date and time with a time zone.`,
      "SUBSCRIPTION_EXPIRY_INVALID",
      2,
      "Use a full RFC 3339 timestamp, for example --expiry 2026-12-31T23:59:59Z.",
    );
  }
  return desired;
}

export async function deferSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  subscriptionId: string,
  token: string,
  desiredExpiry: string,
): Promise<SubscriptionDeferResponse> {
  validatePackageName(packageName);
  const desired = parseSubscriptionExpiry(desiredExpiry);
  // v1 get shuts down Aug 31 2027, a year before v1 defer (Aug 31 2028), so the
  // current expiry comes from the v2 line item for this subscription.
  const sub = await client.purchases.getSubscriptionV2(packageName, token);
  const item = sub.lineItems?.find((li) => li.productId === subscriptionId);
  if (!item) {
    throw new GpcError(
      `This purchase token has no subscription "${subscriptionId}".`,
      "SUBSCRIPTION_LINE_ITEM_NOT_FOUND",
      2,
      `Check the subscription ID. To see the IDs on this token, run gpc purchases subscription get <token> --output json and read lineItems[].productId.`,
    );
  }
  const expiryMs = item.expiryTime ? Date.parse(item.expiryTime) : NaN;
  if (Number.isNaN(expiryMs)) {
    throw new GpcError(
      `Google returned no expiry date for subscription "${subscriptionId}" on this purchase token.`,
      "SUBSCRIPTION_EXPIRY_UNKNOWN",
      4,
      `Check the subscription state with gpc purchases subscription get <token>. To defer without the current expiry, use gpc purchases subscription defer-v2.`,
    );
  }
  return client.purchases.deferSubscription(packageName, subscriptionId, token, {
    deferralInfo: {
      expectedExpiryTimeMillis: String(expiryMs),
      desiredExpiryTimeMillis: String(desired.getTime()),
    },
  });
}

export type RevocationRefundType = "full" | "prorated" | "item";

export async function revokeSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  token: string,
  refundType: RevocationRefundType = "prorated",
  productId?: string,
  etag?: string,
): Promise<void> {
  validatePackageName(packageName);
  const checkedEtag = normalizeSubscriptionEtag(etag);
  let body: RevokeSubscriptionV2Request;
  if (refundType === "item") {
    if (!productId) {
      throw new GpcError(
        "productId is required for item-based refund",
        "REVOKE_MISSING_PRODUCT_ID",
        2,
        "Pass --product-id when using --refund-type item",
      );
    }
    body = { revocationContext: { itemBasedRefund: { productId } } };
  } else if (refundType === "full") {
    body = { revocationContext: { fullRefund: {} } };
  } else {
    body = { revocationContext: { proratedRefund: {} } };
  }
  const request: RevokeSubscriptionV2Request = {
    revocationContext: { ...body.revocationContext, ...(checkedEtag && { etag: checkedEtag }) },
  };
  return withEtagGuard(checkedEtag, () =>
    client.purchases.revokeSubscriptionV2(packageName, token, request),
  );
}

// refundSubscriptionV2 removed: endpoint does not exist in official API.
// Use orders.refund (gpc purchases orders refund <order-id>) instead.

import type { VoidedPurchase } from "@gpc-cli/api";
import { paginateAll } from "@gpc-cli/api";

export interface ListVoidedOptions {
  startTime?: string;
  endTime?: string;
  type?: number;
  includeQuantityBasedPartialRefund?: boolean;
  maxResults?: number;
  limit?: number;
  nextPage?: string;
}

export async function listVoidedPurchases(
  client: PlayApiClient,
  packageName: string,
  options?: ListVoidedOptions,
): Promise<{ voidedPurchases: VoidedPurchase[]; nextPageToken?: string }> {
  validatePackageName(packageName);
  if (options?.limit || options?.nextPage) {
    const result = await paginateAll<VoidedPurchase>(
      async (pageToken) => {
        const resp = await client.purchases.listVoided(packageName, {
          startTime: options?.startTime,
          endTime: options?.endTime,
          type: options?.type,
          includeQuantityBasedPartialRefund: options?.includeQuantityBasedPartialRefund,
          maxResults: options?.maxResults,
          token: pageToken,
        });
        return {
          items: resp.voidedPurchases || [],
          nextPageToken: resp.tokenPagination?.nextPageToken,
        };
      },
      { limit: options.limit, startPageToken: options.nextPage },
    );
    return { voidedPurchases: result.items, nextPageToken: result.nextPageToken };
  }
  // Default (single-page) path: normalize the token to the top level so callers
  // and the CLI envelope surface it consistently with the paginated path.
  const resp = await client.purchases.listVoided(packageName, options);
  return {
    voidedPurchases: resp.voidedPurchases || [],
    nextPageToken: resp.tokenPagination?.nextPageToken,
  };
}

export async function refundOrder(
  client: PlayApiClient,
  packageName: string,
  orderId: string,
  options?: { revoke?: boolean },
): Promise<void> {
  validatePackageName(packageName);
  return client.orders.refund(packageName, orderId, options);
}

// --- Orders API (May 2025) ---

export async function getOrderDetails(
  client: PlayApiClient,
  packageName: string,
  orderId: string,
): Promise<Order> {
  validatePackageName(packageName);
  return client.orders.get(packageName, orderId);
}

export async function batchGetOrders(
  client: PlayApiClient,
  packageName: string,
  orderIds: string[],
): Promise<Order[]> {
  validatePackageName(packageName);
  if (orderIds.length === 0) {
    throw new GpcError(
      "No order IDs provided",
      "ORDERS_BATCH_EMPTY",
      2,
      "Pass at least one order ID with --ids",
    );
  }
  if (orderIds.length > 1000) {
    throw new GpcError(
      `Too many order IDs (${orderIds.length}). Maximum is 1000.`,
      "ORDERS_BATCH_LIMIT",
      2,
      "Split into multiple requests of 1000 or fewer",
    );
  }
  return client.orders.batchGet(packageName, orderIds);
}

// --- ProductPurchaseV2 (Jun 2025) ---

export async function getProductPurchaseV2(
  client: PlayApiClient,
  packageName: string,
  token: string,
): Promise<ProductPurchaseV2> {
  validatePackageName(packageName);
  return client.purchases.getProductV2(packageName, token);
}

// --- SubscriptionsV2 cancel/defer (Sep 2025 / Jan 2026) ---

const CANCELLATION_TYPES = [
  "USER_REQUESTED_STOP_RENEWALS",
  "DEVELOPER_REQUESTED_STOP_PAYMENTS",
] as const;

/**
 * Check a cancel-v2 cancellation type. Leaving it out means
 * USER_REQUESTED_STOP_RENEWALS; a blank value (an empty CI variable) is
 * rejected. Exported so the CLI checks it before a dry run too.
 */
export function normalizeCancellationType(cancellationType: string | undefined): CancellationType {
  if (cancellationType === undefined) return "USER_REQUESTED_STOP_RENEWALS";
  if (!(CANCELLATION_TYPES as readonly string[]).includes(cancellationType)) {
    throw new GpcError(
      `Cancellation type "${cancellationType}" is not one Google accepts.`,
      "CANCELLATION_TYPE_INVALID",
      2,
      `Use one of: ${CANCELLATION_TYPES.join(", ")}. Leave out --type to stop renewals only.`,
    );
  }
  return cancellationType as CancellationType;
}

export async function cancelSubscriptionV2(
  client: PlayApiClient,
  packageName: string,
  token: string,
  cancellationType: string = "USER_REQUESTED_STOP_RENEWALS",
  etag?: string,
): Promise<void> {
  validatePackageName(packageName);
  const checkedType = normalizeCancellationType(cancellationType);
  const checkedEtag = normalizeSubscriptionEtag(etag);
  return withEtagGuard(checkedEtag, () =>
    client.purchases.cancelSubscriptionV2(packageName, token, {
      cancellationContext: {
        cancellationType: checkedType,
        ...(checkedEtag && { etag: checkedEtag }),
      },
    }),
  );
}

// --- Plan transitions (rev 20261119, experimental) ---

/**
 * Trim and require a subscription product id. Exported so the CLI checks it
 * before a dry run too.
 */
export function normalizeProductId(productId: string): string {
  const id = productId.trim();
  if (!id) {
    throw new GpcError(
      "A subscription product id is required.",
      "PRODUCT_ID_REQUIRED",
      2,
      "Pass --product-id <id>: the subscription product of this purchase, as shown by gpc purchases subscription get <token>.",
    );
  }
  return id;
}

/**
 * Cancel a plan transition that is still in progress: a scheduled move to the
 * transition target base plan (`BasePlan.transitionTargetConfig`). Google documents no errors for this
 * method, so only an etag mismatch is mapped; anything else passes through
 * with Google's message. TODO(T11): record real responses.
 */
export async function cancelPlanTransition(
  client: PlayApiClient,
  packageName: string,
  token: string,
  productId: string,
  etag?: string,
): Promise<void> {
  validatePackageName(packageName);
  const id = normalizeProductId(productId);
  const checkedEtag = normalizeSubscriptionEtag(etag);
  return withEtagGuard(checkedEtag, () =>
    client.purchases.cancelPlanTransition(packageName, token, {
      productId: id,
      ...(checkedEtag && { etag: checkedEtag }),
    }),
  );
}

// --- Etag guard (cancel/revoke, Nov 2026) ---
// Google: "If provided, the cancellation [revocation] will only proceed if it
// matches the current server state." Google documents no status or message for
// a mismatch, so the remap applies only when an etag was sent (see
// isEtagMismatch); anything else passes through. TODO(T11): replace the guess
// with the real response from the live smoke.

/**
 * Trim an optional etag. A blank one is refused: dropping it would silently
 * remove the guard. Exported so the CLI checks it before a dry run too.
 */
export function normalizeSubscriptionEtag(etag: string | undefined): string | undefined {
  if (etag === undefined) return undefined;
  const trimmed = etag.trim();
  if (!trimmed) {
    throw new GpcError(
      "The --etag value is blank.",
      "SUBSCRIPTION_ETAG_BLANK",
      2,
      "Pass the etag from: gpc purchases subscription get <token> --output json (field: etag), or omit --etag to act without the guard.",
    );
  }
  return trimmed;
}

async function withEtagGuard(etag: string | undefined, call: () => Promise<void>): Promise<void> {
  try {
    await call();
  } catch (error) {
    if (!etag || !(error instanceof PlayApiError)) throw error;
    const googleText = googleErrorText(error);
    if (isEtagMismatch(error.statusCode, googleText)) {
      throw new PlayApiError(
        "Google rejected this request: the subscription no longer matches the etag you passed.",
        "SUBSCRIPTION_ETAG_MISMATCH",
        error.statusCode,
        "Re-run gpc purchases subscription get <token> and check its state before retrying with the current etag. If an earlier attempt timed out, it may already have been applied.",
        googleText,
      );
    }
    throw error;
  }
}

/**
 * 409/412, or a 400 that is ABORTED (Google's concurrency status) or names the
 * etag. A 400 INVALID_ARGUMENT is a malformed request (e.g. a quoted etag), not
 * a changed subscription, so it passes through with Google's message.
 */
function isEtagMismatch(status: number | undefined, googleText: string): boolean {
  if (status === 409 || status === 412) return true;
  if (status !== 400 || /\bINVALID_ARGUMENT\b/.test(googleText)) return false;
  return /\bABORTED\b/.test(googleText) || /\betag\b/i.test(googleText);
}

export async function deferSubscriptionV2(
  client: PlayApiClient,
  packageName: string,
  token: string,
  deferDuration: string,
  etag?: string,
): Promise<SubscriptionsV2DeferResponse> {
  validatePackageName(packageName);
  const resolvedEtag =
    etag ?? (await client.purchases.getSubscriptionV2(packageName, token)).etag ?? "";
  return client.purchases.deferSubscriptionV2(packageName, token, {
    deferralContext: { etag: resolvedEtag, deferDuration },
  });
}

// --- orders.reviewrefund (chargeback review, Aug 2026) ---

/** CLI-facing refund preference, mapped to the Google Play API enum. */
export type RefundReviewPreference = "approve" | "decline" | "neutral";

const REFUND_PREFERENCES: Record<RefundReviewPreference, RefundPreference> = {
  approve: "APPROVE",
  decline: "DECLINE",
  neutral: "NEUTRAL",
};

/** Google Play rejects usage-event lists longer than this. */
const MAX_CONSUMPTION_USAGE_EVENTS = 1000;

/** consumptionPercentageMilliunits is capped at 100,000 (= 100%). */
const MAX_CONSUMPTION_MILLIUNITS = 100_000;

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export interface ReviewOrderRefundOptions {
  /** Token from the PendingRefundReviewNotification RTDN. */
  pendingRefundToken: string;
  preference: RefundReviewPreference;
  /** Whether a free sample, trial, or functionality info was offered before purchase. */
  sampleContentProvided: boolean;
  consumptionPercentageMilliunits?: number;
  consumptionUsageEvents?: ConsumptionUsageEvent[];
}

export interface ReviewOrderRefundResult {
  packageName: string;
  orderId: string;
  refundPreference: RefundPreference;
  sampleContentProvided: boolean;
  consumptionPercentageMilliunits?: number;
  consumptionUsageEventCount: number;
  submitted: boolean;
}

function invalidReviewRefund(message: string, suggestion: string): GpcError {
  return new GpcError(message, "ORDER_REVIEW_REFUND_INVALID", 2, suggestion);
}

/**
 * Respond to a chargeback review (PendingRefundReviewNotification) with a refund
 * preference and optional purchase-usage evidence. Google Play expects a response
 * within 24 hours of the notification.
 */
export async function reviewOrderRefund(
  client: PlayApiClient,
  packageName: string,
  orderId: string,
  options: ReviewOrderRefundOptions,
): Promise<ReviewOrderRefundResult> {
  validatePackageName(packageName);

  if (!orderId.trim()) {
    throw invalidReviewRefund(
      "orderId is required",
      "Pass the order ID from the pending refund review notification",
    );
  }

  const pendingRefundToken = options.pendingRefundToken.trim();
  if (!pendingRefundToken) {
    throw invalidReviewRefund(
      "pendingRefundToken is required and cannot be empty",
      "Pass --pending-refund-token with the token from the PendingRefundReviewNotification",
    );
  }

  const refundPreference = REFUND_PREFERENCES[options.preference];
  if (!refundPreference) {
    throw invalidReviewRefund(
      `Invalid refund preference "${options.preference}"`,
      "Use --preference with one of: approve, decline, neutral",
    );
  }

  const milliunits = options.consumptionPercentageMilliunits;
  if (milliunits !== undefined) {
    if (
      !Number.isInteger(milliunits) ||
      milliunits < 0 ||
      milliunits > MAX_CONSUMPTION_MILLIUNITS
    ) {
      throw invalidReviewRefund(
        `consumptionPercentageMilliunits must be an integer between 0 and ${MAX_CONSUMPTION_MILLIUNITS}, got ${milliunits}`,
        "Pass --consumption-percent with a value between 0 and 100",
      );
    }
  }

  const events = options.consumptionUsageEvents ?? [];
  if (events.length > MAX_CONSUMPTION_USAGE_EVENTS) {
    throw invalidReviewRefund(
      `consumptionUsageEvents has ${events.length} entries; Google Play rejects lists over ${MAX_CONSUMPTION_USAGE_EVENTS}`,
      `Trim the usage-events file to at most ${MAX_CONSUMPTION_USAGE_EVENTS} events`,
    );
  }

  events.forEach((event, index) => {
    const time = event.consumptionTime;
    if (time !== undefined && (!RFC3339.test(time) || Number.isNaN(Date.parse(time)))) {
      throw invalidReviewRefund(
        `consumptionUsageEvents[${index}].consumptionTime "${time}" is not an RFC 3339 timestamp`,
        "Use a timestamp like 2026-08-30T10:15:00Z",
      );
    }
    if (event.location && !event.location.regionCode?.trim()) {
      throw invalidReviewRefund(
        `consumptionUsageEvents[${index}].location.regionCode is required when a location is supplied`,
        'Set a CLDR region code such as "US" on each location',
      );
    }
  });

  await client.orders.reviewRefund(packageName, orderId, {
    pendingRefundToken,
    refundPreference,
    sampleContentProvided: options.sampleContentProvided,
    ...(milliunits !== undefined ? { consumptionPercentageMilliunits: milliunits } : {}),
    ...(events.length > 0 ? { consumptionUsageEvents: events } : {}),
  });

  return {
    packageName,
    orderId,
    refundPreference,
    sampleContentProvided: options.sampleContentProvided,
    ...(milliunits !== undefined ? { consumptionPercentageMilliunits: milliunits } : {}),
    consumptionUsageEventCount: events.length,
    submitted: true,
  };
}
