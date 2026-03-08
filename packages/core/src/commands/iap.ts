import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  PlayApiClient,
  InAppProduct,
  InAppProductsListResponse,
} from "@gpc/api";
import { paginateAll } from "@gpc/api";

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
        const resp = await client.inappproducts.list(packageName, { token: pageToken, maxResults: options?.maxResults });
        return { items: resp.inappproduct || [], nextPageToken: resp.tokenPagination?.nextPageToken };
      },
      { limit: options.limit, startPageToken: options.nextPage },
    );
    return { inappproduct: result.items, nextPageToken: result.nextPageToken };
  }
  return client.inappproducts.list(packageName, { token: options?.token, maxResults: options?.maxResults });
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
  const files = await readdir(dir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) {
    return { created: 0, updated: 0, unchanged: 0, skus: [] };
  }

  const localProducts: InAppProduct[] = [];
  for (const file of jsonFiles) {
    const content = await readFile(join(dir, file), "utf-8");
    localProducts.push(JSON.parse(content) as InAppProduct);
  }

  const response = await client.inappproducts.list(packageName);
  const remoteSkus = new Set((response.inappproduct || []).map((p) => p.sku));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const skus: string[] = [];

  for (const product of localProducts) {
    skus.push(product.sku);
    if (remoteSkus.has(product.sku)) {
      if (!options?.dryRun) {
        await client.inappproducts.update(packageName, product.sku, product);
      }
      updated++;
    } else {
      if (!options?.dryRun) {
        await client.inappproducts.create(packageName, product);
      }
      created++;
    }
  }

  return { created, updated, unchanged, skus };
}
