import type {
  PlayApiClient,
  Subscription,
  BasePlanMigratePricesRequest,
  SubscriptionOffer,
  OffersListResponse,
} from "@gpc-cli/api";
import { paginateAll } from "@gpc-cli/api";
import { validatePackageName, validateSku } from "../utils/validation.js";

export interface ListSubscriptionsOptions {
  pageToken?: string;
  pageSize?: number;
  limit?: number;
  nextPage?: string;
}

export async function listSubscriptions(
  client: PlayApiClient,
  packageName: string,
  options?: ListSubscriptionsOptions,
): Promise<{ subscriptions: Subscription[]; nextPageToken?: string }> {
  validatePackageName(packageName);
  if (options?.limit || options?.nextPage) {
    const result = await paginateAll<Subscription>(
      async (pageToken) => {
        const resp = await client.subscriptions.list(packageName, {
          pageToken,
          pageSize: options?.pageSize,
        });
        return { items: resp.subscriptions || [], nextPageToken: resp.nextPageToken };
      },
      { limit: options.limit, startPageToken: options.nextPage },
    );
    return { subscriptions: result.items, nextPageToken: result.nextPageToken };
  }
  return client.subscriptions.list(packageName, {
    pageToken: options?.pageToken,
    pageSize: options?.pageSize,
  });
}

export async function getSubscription(
  client: PlayApiClient,
  packageName: string,
  productId: string,
): Promise<Subscription> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.get(packageName, productId);
}

export async function createSubscription(
  client: PlayApiClient,
  packageName: string,
  data: Subscription,
): Promise<Subscription> {
  validatePackageName(packageName);
  return client.subscriptions.create(packageName, data);
}

export async function updateSubscription(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  data: Subscription,
  updateMask?: string,
): Promise<Subscription> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.update(packageName, productId, data, updateMask);
}

export async function deleteSubscription(
  client: PlayApiClient,
  packageName: string,
  productId: string,
): Promise<void> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.delete(packageName, productId);
}

export async function activateBasePlan(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<Subscription> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.activateBasePlan(packageName, productId, basePlanId);
}

export async function deactivateBasePlan(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<Subscription> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.deactivateBasePlan(packageName, productId, basePlanId);
}

export async function deleteBasePlan(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<void> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.deleteBasePlan(packageName, productId, basePlanId);
}

export async function migratePrices(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  data: BasePlanMigratePricesRequest,
): Promise<Subscription> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.migratePrices(packageName, productId, basePlanId, data);
}

export async function listOffers(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<OffersListResponse> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.listOffers(packageName, productId, basePlanId);
}

export async function getOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
): Promise<SubscriptionOffer> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.getOffer(packageName, productId, basePlanId, offerId);
}

export async function createOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  data: SubscriptionOffer,
): Promise<SubscriptionOffer> {
  validatePackageName(packageName);
  validateSku(productId);
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
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.updateOffer(
    packageName,
    productId,
    basePlanId,
    offerId,
    data,
    updateMask,
  );
}

export async function deleteOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
): Promise<void> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.deleteOffer(packageName, productId, basePlanId, offerId);
}

export async function activateOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
): Promise<SubscriptionOffer> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.activateOffer(packageName, productId, basePlanId, offerId);
}

export async function deactivateOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
): Promise<SubscriptionOffer> {
  validatePackageName(packageName);
  validateSku(productId);
  return client.subscriptions.deactivateOffer(packageName, productId, basePlanId, offerId);
}
