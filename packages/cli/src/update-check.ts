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
 * Compare two semver strings, including prereleases (`1.0.0-rc.1`).
 * Returns true if `latest` is newer than `current`. A release outranks its own
 * prereleases, so `1.0.0-rc.1` users are offered `1.0.0` (per semver 2.0 §11).
 */
export function isNewerVersion(current: string, latest: string): boolean {
  return compareVersions(latest, current) > 0;
}

function compareVersions(a: string, b: string): number {
  const [aCore = "", aPre] = (a.replace(/^v/, "").split("+", 1)[0] ?? "").split(/-(.*)/s);
  const [bCore = "", bPre] = (b.replace(/^v/, "").split("+", 1)[0] ?? "").split(/-(.*)/s);
  const an = aCore.split(".").map(Number);
  const bn = bCore.split(".").map(Number);
  for (let i = 0; i < Math.max(an.length, bn.length); i++) {
    const diff = (an[i] ?? 0) - (bn[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  if (!aPre && !bPre) return 0;
  if (!aPre) return 1;
  if (!bPre) return -1;
  const ap = aPre.split(".");
  const bp = bPre.split(".");
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const x = ap[i];
    const y = bp[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) return Math.sign(diff);
    } else if (xNum !== yNum) {
      return xNum ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
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
    const response = await fetch(REGISTRY_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

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
  return `Update available: ${result.current} \u2192 ${result.latest}  \u2014  Run: gpc update`;
}
