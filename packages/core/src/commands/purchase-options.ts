import type { PlayApiClient, PurchaseOption, PurchaseOptionsListResponse } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export async function listPurchaseOptions(
  client: PlayApiClient,
  packageName: string,
): Promise<PurchaseOptionsListResponse> {
  try {
    return await client.purchaseOptions.list(packageName);
  } catch (error) {
    throw new GpcError(
      `Failed to list purchase options: ${error instanceof Error ? error.message : String(error)}`,
      "PURCHASE_OPTIONS_LIST_FAILED",
      4,
      "Check your package name and API permissions.",
    );
  }
}

export async function getPurchaseOption(
  client: PlayApiClient,
  packageName: string,
  purchaseOptionId: string,
): Promise<PurchaseOption> {
  try {
    return await client.purchaseOptions.get(packageName, purchaseOptionId);
  } catch (error) {
    throw new GpcError(
      `Failed to get purchase option "${purchaseOptionId}": ${error instanceof Error ? error.message : String(error)}`,
      "PURCHASE_OPTION_GET_FAILED",
      4,
      "Check that the purchase option ID exists.",
    );
  }
}

export async function createPurchaseOption(
  client: PlayApiClient,
  packageName: string,
  data: PurchaseOption,
): Promise<PurchaseOption> {
  try {
    return await client.purchaseOptions.create(packageName, data);
  } catch (error) {
    throw new GpcError(
      `Failed to create purchase option: ${error instanceof Error ? error.message : String(error)}`,
      "PURCHASE_OPTION_CREATE_FAILED",
      4,
      "Check your purchase option data and API permissions.",
    );
  }
}

export async function activatePurchaseOption(
  client: PlayApiClient,
  packageName: string,
  purchaseOptionId: string,
): Promise<PurchaseOption> {
  try {
    return await client.purchaseOptions.activate(packageName, purchaseOptionId);
  } catch (error) {
    throw new GpcError(
      `Failed to activate purchase option "${purchaseOptionId}": ${error instanceof Error ? error.message : String(error)}`,
      "PURCHASE_OPTION_ACTIVATE_FAILED",
      4,
      "Check that the purchase option exists and is in a valid state for activation.",
    );
  }
}

export async function deactivatePurchaseOption(
  client: PlayApiClient,
  packageName: string,
  purchaseOptionId: string,
): Promise<PurchaseOption> {
  try {
    return await client.purchaseOptions.deactivate(packageName, purchaseOptionId);
  } catch (error) {
    throw new GpcError(
      `Failed to deactivate purchase option "${purchaseOptionId}": ${error instanceof Error ? error.message : String(error)}`,
      "PURCHASE_OPTION_DEACTIVATE_FAILED",
      4,
      "Check that the purchase option exists and is in a valid state for deactivation.",
    );
  }
}
