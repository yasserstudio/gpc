import type { PlayApiClient, Bundle } from "@gpc-cli/api";
import { PlayApiError } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export interface BundlesWaitOptions {
  timeout?: number;
  interval?: number;
}

export async function listBundles(client: PlayApiClient, packageName: string): Promise<Bundle[]> {
  const edit = await client.edits.insert(packageName);
  try {
    const bundles = await client.bundles.list(packageName, edit.id);
    await client.edits.delete(packageName, edit.id).catch(() => {});
    return bundles;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function findBundle(
  client: PlayApiClient,
  packageName: string,
  versionCode: number,
): Promise<Bundle | null> {
  const bundles = await listBundles(client, packageName);
  return bundles.find((b) => b.versionCode === versionCode) ?? null;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof PlayApiError)) return false;
  const status = error.statusCode;
  return status === 429 || status === 500 || status === 503 || status === 409;
}

export async function waitForBundle(
  client: PlayApiClient,
  packageName: string,
  versionCode: number,
  options?: BundlesWaitOptions,
): Promise<Bundle> {
  const timeout = options?.timeout ?? 600_000;
  const interval = options?.interval ?? 15_000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const bundles = await listBundles(client, packageName);
      const match = bundles.find((b) => b.versionCode === versionCode);
      if (match) return match;
    } catch (error) {
      if (!isRetryableError(error)) throw error;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(interval, remaining)));
  }

  throw new GpcError(
    `Bundle version code ${versionCode} not found after ${Math.round(timeout / 1000)}s`,
    "BUNDLE_WAIT_TIMEOUT",
    4,
    "The bundle may still be processing. Try again with a longer --timeout, or check the Play Console.",
  );
}
