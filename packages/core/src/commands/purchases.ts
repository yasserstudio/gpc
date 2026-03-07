import type {
  PlayApiClient,
  ProductPurchase,
  SubscriptionPurchaseV2,
  SubscriptionDeferResponse,
  VoidedPurchasesListResponse,
} from "@gpc/api";

export async function getProductPurchase(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  token: string,
): Promise<ProductPurchase> {
  return client.purchases.getProduct(packageName, productId, token);
}

export async function acknowledgeProductPurchase(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  token: string,
  payload?: string,
): Promise<void> {
  const body = payload ? { developerPayload: payload } : undefined;
  return client.purchases.acknowledgeProduct(packageName, productId, token, body);
}

export async function consumeProductPurchase(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  token: string,
): Promise<void> {
  return client.purchases.consumeProduct(packageName, productId, token);
}

export async function getSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  token: string,
): Promise<SubscriptionPurchaseV2> {
  return client.purchases.getSubscriptionV2(packageName, token);
}

export async function cancelSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  subscriptionId: string,
  token: string,
): Promise<void> {
  return client.purchases.cancelSubscription(packageName, subscriptionId, token);
}

export async function deferSubscriptionPurchase(
  client: PlayApiClient,
  packageName: string,
  subscriptionId: string,
  token: string,
  desiredExpiry: string,
): Promise<SubscriptionDeferResponse> {
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
  return client.purchases.revokeSubscriptionV2(packageName, token);
}

export async function listVoidedPurchases(
  client: PlayApiClient,
  packageName: string,
  options?: { startTime?: string; endTime?: string; maxResults?: number },
): Promise<VoidedPurchasesListResponse> {
  return client.purchases.listVoided(packageName, options);
}

export async function refundOrder(
  client: PlayApiClient,
  packageName: string,
  orderId: string,
  options?: { fullRefund?: boolean; proratedRefund?: boolean },
): Promise<void> {
  return client.orders.refund(packageName, orderId, options);
}
