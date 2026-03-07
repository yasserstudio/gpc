import type {
  PlayApiClient,
  Subscription,
  SubscriptionsListResponse,
  BasePlanMigratePricesRequest,
  SubscriptionOffer,
  OffersListResponse,
} from "@gpc/api";

export async function listSubscriptions(
  client: PlayApiClient,
  packageName: string,
  options?: { pageToken?: string; pageSize?: number },
): Promise<SubscriptionsListResponse> {
  return client.subscriptions.list(packageName, options);
}

export async function getSubscription(
  client: PlayApiClient,
  packageName: string,
  productId: string,
): Promise<Subscription> {
  return client.subscriptions.get(packageName, productId);
}

export async function createSubscription(
  client: PlayApiClient,
  packageName: string,
  data: Subscription,
): Promise<Subscription> {
  return client.subscriptions.create(packageName, data);
}

export async function updateSubscription(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  data: Subscription,
  updateMask?: string,
): Promise<Subscription> {
  return client.subscriptions.update(packageName, productId, data, updateMask);
}

export async function deleteSubscription(
  client: PlayApiClient,
  packageName: string,
  productId: string,
): Promise<void> {
  return client.subscriptions.delete(packageName, productId);
}

export async function activateBasePlan(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<Subscription> {
  return client.subscriptions.activateBasePlan(packageName, productId, basePlanId);
}

export async function deactivateBasePlan(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<Subscription> {
  return client.subscriptions.deactivateBasePlan(packageName, productId, basePlanId);
}

export async function deleteBasePlan(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<void> {
  return client.subscriptions.deleteBasePlan(packageName, productId, basePlanId);
}

export async function migratePrices(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  data: BasePlanMigratePricesRequest,
): Promise<Subscription> {
  return client.subscriptions.migratePrices(packageName, productId, basePlanId, data);
}

export async function listOffers(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<OffersListResponse> {
  return client.subscriptions.listOffers(packageName, productId, basePlanId);
}

export async function getOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
): Promise<SubscriptionOffer> {
  return client.subscriptions.getOffer(packageName, productId, basePlanId, offerId);
}

export async function createOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  data: SubscriptionOffer,
): Promise<SubscriptionOffer> {
  return client.subscriptions.createOffer(packageName, productId, basePlanId, data);
}

export async function updateOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
  data: SubscriptionOffer,
  updateMask?: string,
): Promise<SubscriptionOffer> {
  return client.subscriptions.updateOffer(packageName, productId, basePlanId, offerId, data, updateMask);
}

export async function deleteOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
): Promise<void> {
  return client.subscriptions.deleteOffer(packageName, productId, basePlanId, offerId);
}

export async function activateOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
): Promise<SubscriptionOffer> {
  return client.subscriptions.activateOffer(packageName, productId, basePlanId, offerId);
}

export async function deactivateOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
): Promise<SubscriptionOffer> {
  return client.subscriptions.deactivateOffer(packageName, productId, basePlanId, offerId);
}
