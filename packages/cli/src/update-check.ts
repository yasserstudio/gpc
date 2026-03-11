import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getCacheDir } from "@gpc-cli/config";

export interface UpdateCheckResult {
  current: string;
  latest: string;
  updateAvailable: boolean;
}

interface CacheData {
  latest: string;
  checkedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 3000;
const REGISTRY_URL = "https://registry.npmjs.org/@gpc-cli/cli/latest";

function getCacheFilePath(): string {
  return join(getCacheDir(), "update-check.json");
}

/**
 * Compare two semver strings numerically.
 * Returns true if `b` is newer than `a`.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const a = current.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (bv > av) return true;
    if (bv < av) return false;
  }
  return false;
}

async function readCache(): Promise<CacheData | null> {
  try {
    const raw = await readFile(getCacheFilePath(), "utf-8");
    const data = JSON.parse(raw) as CacheData;
    if (typeof data.latest === "string" && typeof data.checkedAt === "number") {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache(data: CacheData): void {
  const filePath = getCacheFilePath();
  const dir = join(filePath, "..");
  // Fire-and-forget: ignore write errors
  mkdir(dir, { recursive: true })
    .then(() => writeFile(filePath, JSON.stringify(data), "utf-8"))
    .catch(() => {});
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(REGISTRY_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const body = (await response.json()) as { version?: string };
    if (typeof body.version !== "string") return null;

    return body.version;
  } catch {
    return null;
  }
}

/**
 * Check for a newer version of @gpc-cli/cli on npm.
 * Returns null if the check is skipped or fails.
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult | null> {
  // Skip in non-interactive or CI environments
  if (process.env["GPC_NO_UPDATE_CHECK"] === "1") return null;
  if (process.env["CI"]) return null;
  if (!process.stdout.isTTY) return null;

  // Check cache first
  const cache = await readCache();
  if (cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
    return {
      current: currentVersion,
      latest: cache.latest,
      updateAvailable: isNewerVersion(currentVersion, cache.latest),
    };
  }

  // Fetch from registry
  const latest = await fetchLatestVersion();
  if (!latest) return null;

  // Write cache (fire-and-forget)
  writeCache({ latest, checkedAt: Date.now() });

  return {
    current: currentVersion,
    latest,
    updateAvailable: isNewerVersion(currentVersion, latest),
  };
}

/**
 * Format a user-facing update notification string.
 */
export function formatUpdateNotification(result: UpdateCheckResult): string {
  return `Update available: ${result.current} \u2192 ${result.latest}  \u2014  npm install -g @gpc-cli/cli`;
}
