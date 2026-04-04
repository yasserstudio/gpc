import type {
  PlayApiClient,
  ProductPurchase,
  ProductPurchaseV2,
  SubscriptionPurchaseV2,
  SubscriptionDeferResponse,
  SubscriptionsV2DeferResponse,
  Order,
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

export async function revokeSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  token: string,
): Promise<void> {
  validatePackageName(packageName);
  return client.purchases.revokeSubscriptionV2(packageName, token);
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
  return client.purchases.listVoided(packageName, options);
}

export async function refundOrder(
  client: PlayApiClient,
  packageName: string,
  orderId: string,
  options?: { fullRefund?: boolean; proratedRefund?: boolean },
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
  cancellationType?: string,
): Promise<void> {
  validatePackageName(packageName);
  const body = cancellationType ? { cancellationType } : undefined;
  return client.purchases.cancelSubscriptionV2(packageName, token, body);
}

export async function deferSubscriptionV2(
  client: PlayApiClient,
  packageName: string,
  token: string,
  desiredExpiryTime: string,
): Promise<SubscriptionsV2DeferResponse> {
  validatePackageName(packageName);
  return client.purchases.deferSubscriptionV2(packageName, token, {
    deferralInfo: { desiredExpiryTime },
  });
}
