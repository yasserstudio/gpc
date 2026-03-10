import { chmod, mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { dirname, join, isAbsolute } from "node:path";

export interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

export type TokenCache = Record<string, TokenCacheEntry>;

const CACHE_FILE = "token-cache.json";
const SAFETY_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

// Email must look like a service account email — no path separators or special chars
const SAFE_CACHE_KEY = /^[a-zA-Z0-9._%+@-]+$/;

function getCachePath(cacheDir: string): string {
  if (!isAbsolute(cacheDir)) {
    throw new Error("Cache directory must be an absolute path");
  }
  return join(cacheDir, CACHE_FILE);
}

function validateCacheKey(email: string): void {
  if (!SAFE_CACHE_KEY.test(email)) {
    throw new Error("Invalid cache key: must be a valid email address");
  }
}

async function readCache(cacheDir: string): Promise<TokenCache> {
  try {
    const content = await readFile(getCachePath(cacheDir), "utf-8");
    return JSON.parse(content) as TokenCache;
  } catch {
    return {};
  }
}

async function writeCache(cacheDir: string, cache: TokenCache): Promise<void> {
  const cachePath = getCachePath(cacheDir);
  const tmpPath = cachePath + ".tmp";

  const cacheParent = dirname(cachePath);
  await mkdir(cacheParent, { recursive: true });
  // Restrict cache directory to owner-only (0o700)
  await chmod(cacheParent, 0o700).catch(() => {});
  await writeFile(tmpPath, JSON.stringify(cache, null, 2) + "\n", {
    encoding: "utf-8",
    mode: 0o600,
  });
  await rename(tmpPath, cachePath);
}

export async function getCachedToken(
  cacheDir: string,
  email: string,
): Promise<string | null> {
  validateCacheKey(email);
  const cache = await readCache(cacheDir);
  const entry = cache[email];

  if (!entry) return null;

  // Check expiry with safety margin
  if (Date.now() >= entry.expiresAt - SAFETY_MARGIN_MS) {
    return null;
  }

  return entry.token;
}

export async function setCachedToken(
  cacheDir: string,
  email: string,
  token: string,
  expiresInSeconds: number,
): Promise<void> {
  validateCacheKey(email);
  const cache = await readCache(cacheDir);
  cache[email] = {
    token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
  await writeCache(cacheDir, cache);
}

export async function clearTokenCache(
  cacheDir: string,
  email?: string,
): Promise<void> {
  if (email) {
    const cache = await readCache(cacheDir);
    const updated = Object.fromEntries(
      Object.entries(cache).filter(([key]) => key !== email),
    );
    await writeCache(cacheDir, updated);
  } else {
    try {
      await unlink(getCachePath(cacheDir));
    } catch {
      // File doesn't exist — nothing to clear
    }
  }
}
