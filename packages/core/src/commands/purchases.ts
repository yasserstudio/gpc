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
import { validatePackageName } from "../utils/validation.js";
import { GpcError } from "../errors.js";

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

export async function deferSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  subscriptionId: string,
  token: string,
  desiredExpiry: string,
): Promise<SubscriptionDeferResponse> {
  validatePackageName(packageName);
  const sub = await client.purchases.getSubscriptionV1(packageName, subscriptionId, token);
  return client.purchases.deferSubscription(packageName, subscriptionId, token, {
    deferralInfo: {
      expectedExpiryTimeMillis: sub.expiryTimeMillis,
      desiredExpiryTimeMillis: String(new Date(desiredExpiry).getTime()),
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
): Promise<void> {
  validatePackageName(packageName);
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
  return client.purchases.revokeSubscriptionV2(packageName, token, body);
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

export async function cancelSubscriptionV2(
  client: PlayApiClient,
  packageName: string,
  token: string,
  cancellationType: string = "USER_REQUESTED_STOP_RENEWALS",
): Promise<void> {
  validatePackageName(packageName);
  return client.purchases.cancelSubscriptionV2(packageName, token, {
    cancellationContext: { cancellationType: cancellationType as CancellationType },
  });
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
