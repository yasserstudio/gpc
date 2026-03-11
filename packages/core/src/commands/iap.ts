import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PlayApiClient, InAppProduct, InAppProductsBatchUpdateRequest } from "@gpc-cli/api";
import { paginateAll } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export interface ListIapOptions {
  token?: string;
  maxResults?: number;
  limit?: number;
  nextPage?: string;
}

export async function listInAppProducts(
  client: PlayApiClient,
  packageName: string,
  options?: ListIapOptions,
): Promise<{ inappproduct: InAppProduct[]; nextPageToken?: string }> {
  if (options?.limit || options?.nextPage) {
    const result = await paginateAll<InAppProduct>(
      async (pageToken) => {
        const resp = await client.inappproducts.list(packageName, {
          token: pageToken,
          maxResults: options?.maxResults,
        });
        return {
          items: resp.inappproduct || [],
          nextPageToken: resp.tokenPagination?.nextPageToken,
        };
      },
      { limit: options.limit, startPageToken: options.nextPage },
    );
    return { inappproduct: result.items, nextPageToken: result.nextPageToken };
  }
  return client.inappproducts.list(packageName, {
    token: options?.token,
    maxResults: options?.maxResults,
  });
}

export async function getInAppProduct(
  client: PlayApiClient,
  packageName: string,
  sku: string,
): Promise<InAppProduct> {
  return client.inappproducts.get(packageName, sku);
}

export async function createInAppProduct(
  client: PlayApiClient,
  packageName: string,
  data: InAppProduct,
): Promise<InAppProduct> {
  return client.inappproducts.create(packageName, data);
}

export async function updateInAppProduct(
  client: PlayApiClient,
  packageName: string,
  sku: string,
  data: InAppProduct,
): Promise<InAppProduct> {
  return client.inappproducts.update(packageName, sku, data);
}

export async function deleteInAppProduct(
  client: PlayApiClient,
  packageName: string,
  sku: string,
): Promise<void> {
  return client.inappproducts.delete(packageName, sku);
}

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  skus: string[];
}

export async function syncInAppProducts(
  client: PlayApiClient,
  packageName: string,
  dir: string,
  options?: { dryRun?: boolean },
): Promise<SyncResult> {
  const localProducts = await readProductsFromDir(dir);

  if (localProducts.length === 0) {
    return { created: 0, updated: 0, unchanged: 0, skus: [] };
  }

  const response = await client.inappproducts.list(packageName);
  const remoteSkus = new Set((response.inappproduct || []).map((p) => p.sku));

  const toUpdate = localProducts.filter((p) => remoteSkus.has(p.sku));
  const toCreate = localProducts.filter((p) => !remoteSkus.has(p.sku));
  const skus = localProducts.map((p) => p.sku);

  if (options?.dryRun) {
    return { created: toCreate.length, updated: toUpdate.length, unchanged: 0, skus };
  }

  // Attempt batch update for products that need updating (multiple items)
  if (toUpdate.length > 1) {
    try {
      await batchUpdateProducts(client, packageName, toUpdate);
    } catch {
      // Fallback to serial updates
      for (const product of toUpdate) {
        await client.inappproducts.update(packageName, product.sku, product);
      }
    }
  } else {
    for (const product of toUpdate) {
      await client.inappproducts.update(packageName, product.sku, product);
    }
  }

  for (const product of toCreate) {
    await client.inappproducts.create(packageName, product);
  }

  return { created: toCreate.length, updated: toUpdate.length, unchanged: 0, skus };
}

const BATCH_CHUNK_SIZE = 100;

async function batchUpdateProducts(
  client: PlayApiClient,
  packageName: string,
  products: InAppProduct[],
): Promise<InAppProduct[]> {
  const results: InAppProduct[] = [];
  for (let i = 0; i < products.length; i += BATCH_CHUNK_SIZE) {
    const chunk = products.slice(i, i + BATCH_CHUNK_SIZE);
    const request: InAppProductsBatchUpdateRequest = {
      requests: chunk.map((p) => ({
        inappproduct: p,
        packageName,
        sku: p.sku,
      })),
    };
    const response = await client.inappproducts.batchUpdate(packageName, request);
    results.push(...(response.inappproducts || []));
  }
  return results;
}

async function readProductsFromDir(dir: string): Promise<InAppProduct[]> {
  const files = await readdir(dir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));
  const localProducts: InAppProduct[] = [];
  for (const file of jsonFiles) {
    const content = await readFile(join(dir, file), "utf-8");
    try {
      localProducts.push(JSON.parse(content) as InAppProduct);
    } catch {
      throw new GpcError(
        `Failed to parse ${file}: invalid JSON`,
        "IAP_INVALID_JSON",
        1,
        `Check that "${file}" contains valid JSON. You can validate it with: cat "${file}" | jq .`,
      );
    }
  }
  return localProducts;
}

export interface BatchSyncResult extends SyncResult {
  batchUsed: boolean;
  batchErrors: number;
}

export async function batchSyncInAppProducts(
  client: PlayApiClient,
  packageName: string,
  dir: string,
  options?: { dryRun?: boolean },
): Promise<BatchSyncResult> {
  const localProducts = await readProductsFromDir(dir);

  if (localProducts.length === 0) {
    return { created: 0, updated: 0, unchanged: 0, skus: [], batchUsed: false, batchErrors: 0 };
  }

  const response = await client.inappproducts.list(packageName);
  const remoteSkus = new Set((response.inappproduct || []).map((p) => p.sku));

  const toUpdate = localProducts.filter((p) => remoteSkus.has(p.sku));
  const toCreate = localProducts.filter((p) => !remoteSkus.has(p.sku));
  const skus = localProducts.map((p) => p.sku);

  if (options?.dryRun) {
    return {
      created: toCreate.length,
      updated: toUpdate.length,
      unchanged: 0,
      skus,
      batchUsed: toUpdate.length > 1,
      batchErrors: 0,
    };
  }

  let batchUsed = false;
  let batchErrors = 0;

  if (toUpdate.length > 1) {
    batchUsed = true;
    try {
      await batchUpdateProducts(client, packageName, toUpdate);
    } catch {
      batchErrors++;
      // Fallback to serial updates
      for (const product of toUpdate) {
        await client.inappproducts.update(packageName, product.sku, product);
      }
    }
  } else {
    for (const product of toUpdate) {
      await client.inappproducts.update(packageName, product.sku, product);
    }
  }

  for (const product of toCreate) {
    await client.inappproducts.create(packageName, product);
  }

  return {
    created: toCreate.length,
    updated: toUpdate.length,
    unchanged: 0,
    skus,
    batchUsed,
    batchErrors,
  };
}
