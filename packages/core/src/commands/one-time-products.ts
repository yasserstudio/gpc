import type {
  PlayApiClient,
  OneTimeProduct,
  OneTimeProductsListResponse,
  OneTimeOffer,
  OneTimeOffersListResponse,
} from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export async function listOneTimeProducts(
  client: PlayApiClient,
  packageName: string,
): Promise<OneTimeProductsListResponse> {
  try {
    return await client.oneTimeProducts.list(packageName);
  } catch (error) {
    throw new GpcError(
      `Failed to list one-time products: ${error instanceof Error ? error.message : String(error)}`,
      "OTP_LIST_FAILED",
      4,
      "Check your package name and API credentials.",
    );
  }
}

export async function getOneTimeProduct(
  client: PlayApiClient,
  packageName: string,
  productId: string,
): Promise<OneTimeProduct> {
  try {
    return await client.oneTimeProducts.get(packageName, productId);
  } catch (error) {
    throw new GpcError(
      `Failed to get one-time product "${productId}": ${error instanceof Error ? error.message : String(error)}`,
      "OTP_GET_FAILED",
      4,
      "Check that the product ID exists.",
    );
  }
}

export async function createOneTimeProduct(
  client: PlayApiClient,
  packageName: string,
  data: OneTimeProduct,
): Promise<OneTimeProduct> {
  try {
    return await client.oneTimeProducts.create(packageName, data);
  } catch (error) {
    throw new GpcError(
      `Failed to create one-time product: ${error instanceof Error ? error.message : String(error)}`,
      "OTP_CREATE_FAILED",
      4,
      "Verify the product data and ensure the product ID is unique.",
    );
  }
}

const OTP_ID_FIELDS = new Set(["productId", "packageName"]);

function deriveOtpUpdateMask(data: Partial<OneTimeProduct>): string {
  return Object.keys(data)
    .filter((k) => !OTP_ID_FIELDS.has(k))
    .join(",");
}

const OTP_OFFER_ID_FIELDS = new Set(["productId", "offerId"]);

function deriveOtpOfferUpdateMask(data: Partial<OneTimeOffer>): string {
  return Object.keys(data)
    .filter((k) => !OTP_OFFER_ID_FIELDS.has(k))
    .join(",");
}

export async function updateOneTimeProduct(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  data: Partial<OneTimeProduct>,
  updateMask?: string,
): Promise<OneTimeProduct> {
  try {
    const mask = updateMask || deriveOtpUpdateMask(data);
    return await client.oneTimeProducts.update(packageName, productId, data, mask);
  } catch (error) {
    throw new GpcError(
      `Failed to update one-time product "${productId}": ${error instanceof Error ? error.message : String(error)}`,
      "OTP_UPDATE_FAILED",
      4,
      "Check that the product ID exists and the data is valid.",
    );
  }
}

export async function deleteOneTimeProduct(
  client: PlayApiClient,
  packageName: string,
  productId: string,
): Promise<void> {
  try {
    await client.oneTimeProducts.delete(packageName, productId);
  } catch (error) {
    throw new GpcError(
      `Failed to delete one-time product "${productId}": ${error instanceof Error ? error.message : String(error)}`,
      "OTP_DELETE_FAILED",
      4,
      "Check that the product ID exists and is not active.",
    );
  }
}

export async function listOneTimeOffers(
  client: PlayApiClient,
  packageName: string,
  productId: string,
): Promise<OneTimeOffersListResponse> {
  try {
    return await client.oneTimeProducts.listOffers(packageName, productId);
  } catch (error) {
    throw new GpcError(
      `Failed to list offers for product "${productId}": ${error instanceof Error ? error.message : String(error)}`,
      "OTP_OFFERS_LIST_FAILED",
      4,
      "Check the product ID and your API credentials.",
    );
  }
}

export async function getOneTimeOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  offerId: string,
): Promise<OneTimeOffer> {
  try {
    return await client.oneTimeProducts.getOffer(packageName, productId, offerId);
  } catch (error) {
    throw new GpcError(
      `Failed to get offer "${offerId}" for product "${productId}": ${error instanceof Error ? error.message : String(error)}`,
      "OTP_OFFER_GET_FAILED",
      4,
      "Check that the product and offer IDs exist.",
    );
  }
}

export async function createOneTimeOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  data: OneTimeOffer,
): Promise<OneTimeOffer> {
  try {
    return await client.oneTimeProducts.createOffer(packageName, productId, data);
  } catch (error) {
    throw new GpcError(
      `Failed to create offer for product "${productId}": ${error instanceof Error ? error.message : String(error)}`,
      "OTP_OFFER_CREATE_FAILED",
      4,
      "Verify the offer data and ensure the offer ID is unique.",
    );
  }
}

export async function updateOneTimeOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  offerId: string,
  data: Partial<OneTimeOffer>,
  updateMask?: string,
): Promise<OneTimeOffer> {
  try {
    const mask = updateMask || deriveOtpOfferUpdateMask(data);
    return await client.oneTimeProducts.updateOffer(packageName, productId, offerId, data, mask);
  } catch (error) {
    throw new GpcError(
      `Failed to update offer "${offerId}" for product "${productId}": ${error instanceof Error ? error.message : String(error)}`,
      "OTP_OFFER_UPDATE_FAILED",
      4,
      "Check that the product and offer IDs exist and the data is valid.",
    );
  }
}

export interface OneTimeProductDiff {
  field: string;
  local: string;
  remote: string;
}

export async function diffOneTimeProduct(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  localData: OneTimeProduct,
): Promise<OneTimeProductDiff[]> {
  const remote = await client.oneTimeProducts.get(packageName, productId);
  const diffs: OneTimeProductDiff[] = [];
  const fieldsToCompare = ["listings", "purchaseType", "taxAndComplianceSettings"];

  for (const field of fieldsToCompare) {
    const localVal = JSON.stringify((localData as unknown as Record<string, unknown>)[field] ?? null);
    const remoteVal = JSON.stringify((remote as unknown as Record<string, unknown>)[field] ?? null);
    if (localVal !== remoteVal) {
      diffs.push({ field, local: localVal, remote: remoteVal });
    }
  }
  return diffs;
}

export async function deleteOneTimeOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  offerId: string,
): Promise<void> {
  try {
    await client.oneTimeProducts.deleteOffer(packageName, productId, offerId);
  } catch (error) {
    throw new GpcError(
      `Failed to delete offer "${offerId}" for product "${productId}": ${error instanceof Error ? error.message : String(error)}`,
      "OTP_OFFER_DELETE_FAILED",
      4,
      "Check that the product and offer IDs exist.",
    );
  }
}
