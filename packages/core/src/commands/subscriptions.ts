import type {
  PlayApiClient,
  Subscription,
  BasePlanMigratePricesRequest,
  SubscriptionOffer,
  OffersListResponse,
  Money,
} from "@gpc-cli/api";
import { paginateAll } from "@gpc-cli/api";
import { validatePackageName, validateSku } from "../utils/validation.js";
import { GpcError } from "../errors.js";

export interface ListSubscriptionsOptions {
  pageToken?: string;
  pageSize?: number;
  limit?: number;
  nextPage?: string;
}

// --- Sanitization: strip output-only fields, coerce types ---

function coerceMoneyUnits(money: Money): Money {
  if (money.units !== undefined && typeof money.units !== "string") {
    return { ...money, units: String(money.units) };
  }
  return money;
}

function sanitizeSubscription(data: Subscription): Subscription {
  const { ...cleaned } = data;
  // Strip output-only fields from top level
  delete (cleaned as Record<string, unknown>)["state"];
  delete (cleaned as Record<string, unknown>)["archived"];

  if (cleaned.basePlans) {
    cleaned.basePlans = cleaned.basePlans.map((bp) => {
      const { state: _state, archived: _archived, ...cleanBp } = bp;
      void _state;
      void _archived;
      // Coerce Money.units to string in regional configs
      if (cleanBp.regionalConfigs) {
        cleanBp.regionalConfigs = cleanBp.regionalConfigs.map((rc) => ({
          ...rc,
          price: coerceMoneyUnits(rc.price),
        }));
      }
      return cleanBp;
    });
  }
  return cleaned;
}

function sanitizeOffer(data: SubscriptionOffer): SubscriptionOffer {
  const { state: _state2, ...cleaned } = data;
  void _state2;
  delete (cleaned as Record<string, unknown>)["archived"];
  return cleaned as SubscriptionOffer;
}

// --- Client-side validation ---

function parseDuration(iso: string): number {
  const match = iso.match(/^P(\d+)D$/);
  return match?.[1] ? parseInt(match[1], 10) : 0;
}

const PRORATION_MODE_PREFIX = "SUBSCRIPTION_PRORATION_MODE_";
const VALID_PRORATION_MODES = [
  "SUBSCRIPTION_PRORATION_MODE_CHARGE_ON_NEXT_BILLING_DATE",
  "SUBSCRIPTION_PRORATION_MODE_CHARGE_FULL_PRICE_IMMEDIATELY",
];

function autoFixProrationMode(data: Subscription): void {
  if (!data.basePlans) return;
  for (const bp of data.basePlans) {
    const mode = bp.autoRenewingBasePlanType?.prorationMode;
    if (mode && !mode.startsWith(PRORATION_MODE_PREFIX)) {
      if (bp.autoRenewingBasePlanType)
        bp.autoRenewingBasePlanType.prorationMode = `${PRORATION_MODE_PREFIX}${mode}`;
    }
    if (bp.autoRenewingBasePlanType?.prorationMode) {
      const fullMode = bp.autoRenewingBasePlanType.prorationMode;
      if (!VALID_PRORATION_MODES.includes(fullMode)) {
        throw new GpcError(
          `Invalid prorationMode: "${fullMode}"`,
          "INVALID_SUBSCRIPTION_DATA",
          2,
          `Valid values: ${VALID_PRORATION_MODES.join(", ")}`,
        );
      }
    }
  }
}

function validateSubscriptionData(data: Subscription): void {
  // Auto-fix prorationMode prefix
  autoFixProrationMode(data);

  // Validate listings
  if (data.listings) {
    for (const [lang, listing] of Object.entries(data.listings)) {
      if (listing.benefits && listing.benefits.length > 4) {
        throw new GpcError(
          `Listing "${lang}" has ${listing.benefits.length} benefits (max 4)`,
          "INVALID_SUBSCRIPTION_DATA",
          2,
          "Google Play allows a maximum of 4 benefits per subscription listing",
        );
      }
      if (listing.description && listing.description.length > 80) {
        throw new GpcError(
          `Listing "${lang}" description is ${listing.description.length} chars (max 80)`,
          "INVALID_SUBSCRIPTION_DATA",
          2,
          "Google Play limits subscription descriptions to 80 characters",
        );
      }
    }
  }

  // Validate base plan durations
  if (data.basePlans) {
    for (const bp of data.basePlans) {
      const autoType = bp.autoRenewingBasePlanType;
      if (autoType?.gracePeriodDuration && autoType?.accountHoldDuration) {
        const grace = parseDuration(autoType.gracePeriodDuration);
        const hold = parseDuration(autoType.accountHoldDuration);
        const sum = grace + hold;
        if (sum < 30 || sum > 60) {
          throw new GpcError(
            `Base plan "${bp.basePlanId}": gracePeriodDuration (${grace}d) + accountHoldDuration (${hold}d) = ${sum}d (must be 30-60)`,
            "INVALID_SUBSCRIPTION_DATA",
            2,
            "gracePeriodDuration + accountHoldDuration must sum to between P30D and P60D",
          );
        }
      }
    }
  }
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
  validateSubscriptionData(data);
  const sanitized = sanitizeSubscription(data);
  return client.subscriptions.create(packageName, sanitized, data.productId);
}

const SUBSCRIPTION_ID_FIELDS = new Set(["productId", "packageName"]);

function deriveSubscriptionUpdateMask(data: Subscription): string {
  return Object.keys(data)
    .filter((k) => !SUBSCRIPTION_ID_FIELDS.has(k))
    .join(",");
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
  validateSubscriptionData(data);
  const sanitized = sanitizeSubscription(data);
  const mask = updateMask || deriveSubscriptionUpdateMask(data);
  return client.subscriptions.update(packageName, productId, sanitized, mask);
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
  const sanitized = sanitizeOffer(data);
  return client.subscriptions.createOffer(
    packageName,
    productId,
    basePlanId,
    sanitized,
    data.offerId,
  );
}

const OFFER_ID_FIELDS = new Set(["productId", "basePlanId", "offerId"]);

function deriveOfferUpdateMask(data: SubscriptionOffer): string {
  return Object.keys(data)
    .filter((k) => !OFFER_ID_FIELDS.has(k))
    .join(",");
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
  const sanitized = sanitizeOffer(data);
  const mask = updateMask || deriveOfferUpdateMask(data);
  return client.subscriptions.updateOffer(
    packageName,
    productId,
    basePlanId,
    offerId,
    sanitized,
    mask,
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

export interface SubscriptionDiff {
  field: string;
  local: string;
  remote: string;
}

export async function diffSubscription(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  localData: Subscription,
): Promise<SubscriptionDiff[]> {
  validatePackageName(packageName);
  validateSku(productId);
  const remote = await client.subscriptions.get(packageName, productId);
  const diffs: SubscriptionDiff[] = [];
  const fieldsToCompare = ["listings", "basePlans", "taxAndComplianceSettings"];

  for (const field of fieldsToCompare) {
    const localVal = JSON.stringify(
      (localData as unknown as Record<string, unknown>)[field] ?? null,
    );
    const remoteVal = JSON.stringify((remote as unknown as Record<string, unknown>)[field] ?? null);
    if (localVal !== remoteVal) {
      diffs.push({ field, local: localVal, remote: remoteVal });
    }
  }
  return diffs;
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

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeCount: number;
  activeBasePlans: number;
  trialBasePlans: number;
  pausedBasePlans: number;
  canceledBasePlans: number;
  offerCount: number;
  byProductId: Array<{
    productId: string;
    state: string;
    basePlanCount: number;
    offerCount: number;
  }>;
}

/** Aggregate subscription catalog analytics from the Play API. */
export async function getSubscriptionAnalytics(
  client: PlayApiClient,
  packageName: string,
): Promise<SubscriptionAnalytics> {
  validatePackageName(packageName);

  const { items: subs } = await paginateAll<Subscription>(async (pageToken) => {
    const response = await client.subscriptions.list(packageName, {
      pageToken,
      pageSize: 100,
    });
    return {
      items: response.subscriptions || [],
      nextPageToken: response.nextPageToken,
    };
  });

  let activeCount = 0;
  let activeBasePlans = 0;
  let trialBasePlans = 0;
  let pausedBasePlans = 0;
  let canceledBasePlans = 0;
  let totalOffers = 0;

  const byProductId: SubscriptionAnalytics["byProductId"] = [];

  for (const sub of subs) {
    const state = (sub as unknown as Record<string, unknown>)["state"] as string | undefined;
    if (state === "ACTIVE") activeCount++;

    const basePlans = sub.basePlans ?? [];
    let subOfferCount = 0;

    for (const bp of basePlans) {
      const bpState = (bp as unknown as Record<string, unknown>)["state"] as string | undefined;
      if (bpState === "ACTIVE") activeBasePlans++;
      else if (bpState === "DRAFT") trialBasePlans++;
      else if (bpState === "INACTIVE") pausedBasePlans++;
      else if (bpState === "PREPUBLISHED") canceledBasePlans++;
    }

    // Count offers across all base plans
    for (const bp of basePlans) {
      try {
        const offersResp = await client.subscriptions.listOffers(
          packageName,
          sub.productId,
          bp.basePlanId,
        );
        const offers = offersResp.subscriptionOffers ?? [];
        subOfferCount += offers.length;
        totalOffers += offers.length;
      } catch {
        // offers may not be accessible for all base plans
      }
    }

    byProductId.push({
      productId: sub.productId,
      state: ((sub as unknown as Record<string, unknown>)["state"] as string) ?? "UNKNOWN",
      basePlanCount: basePlans.length,
      offerCount: subOfferCount,
    });
  }

  return {
    totalSubscriptions: subs.length,
    activeCount,
    activeBasePlans,
    trialBasePlans,
    pausedBasePlans,
    canceledBasePlans,
    offerCount: totalOffers,
    byProductId,
  };
}
