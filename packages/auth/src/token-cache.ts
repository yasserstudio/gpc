import { chmod, mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { dirname, join, isAbsolute } from "node:path";
import { AuthError } from "./errors.js";

export interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

export type TokenCache = Record<string, TokenCacheEntry>;

const CACHE_FILE = "token-cache.json";
const SAFETY_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

// Email must look like a service account email — no path separators or special chars
const SAFE_CACHE_KEY = /^[a-zA-Z0-9._%+@-]+$/;

// In-memory cache layer — avoids filesystem I/O on every token request
const memoryCache = new Map<string, TokenCacheEntry>();

// Mutex: one in-flight token refresh per email, deduplicates concurrent callers
const inflightRefresh = new Map<string, Promise<string>>();

function getCachePath(cacheDir: string): string {
  if (!isAbsolute(cacheDir)) {
    throw new AuthError(
      "Cache directory must be an absolute path",
      "AUTH_CACHE_INVALID",
      "Provide an absolute path for the token cache directory (e.g., /home/user/.cache/gpc).",
    );
  }
  return join(cacheDir, CACHE_FILE);
}

function validateCacheKey(email: string): void {
  if (!SAFE_CACHE_KEY.test(email)) {
    throw new AuthError(
      "Invalid cache key: must be a valid email address",
      "AUTH_CACHE_INVALID",
      "The cache key must be a valid service account email address (e.g., my-sa@project.iam.gserviceaccount.com).",
    );
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

function isEntryValid(entry: TokenCacheEntry): boolean {
  return Date.now() < entry.expiresAt - SAFETY_MARGIN_MS;
}

export async function getCachedToken(cacheDir: string, email: string): Promise<string | null> {
  validateCacheKey(email);

  // Check in-memory cache first — no I/O
  const memEntry = memoryCache.get(email);
  if (memEntry && isEntryValid(memEntry)) {
    return memEntry.token;
  }

  // Fall back to filesystem cache
  const cache = await readCache(cacheDir);
  const entry = cache[email];

  if (!entry) return null;

  if (!isEntryValid(entry)) {
    return null;
  }

  // Populate in-memory cache from disk
  memoryCache.set(email, entry);
  return entry.token;
}

export async function setCachedToken(
  cacheDir: string,
  email: string,
  token: string,
  expiresInSeconds: number,
): Promise<void> {
  validateCacheKey(email);
  const entry: TokenCacheEntry = {
    token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };

  // Update in-memory cache immediately
  memoryCache.set(email, entry);

  // Persist to disk
  const cache = await readCache(cacheDir);
  cache[email] = entry;
  await writeCache(cacheDir, cache);
}

export async function clearTokenCache(cacheDir: string, email?: string): Promise<void> {
  if (email) {
    memoryCache.delete(email);
    const cache = await readCache(cacheDir);
    const updated = Object.fromEntries(Object.entries(cache).filter(([key]) => key !== email));
    await writeCache(cacheDir, updated);
  } else {
    memoryCache.clear();
    try {
      await unlink(getCachePath(cacheDir));
    } catch {
      // File doesn't exist — nothing to clear
    }
  }
}

/**
 * Acquire a token with mutex protection.
 * If another caller is already refreshing for this email, waits for that result
 * instead of starting a duplicate refresh.
 */
export async function acquireToken(
  email: string,
  cacheDir: string | undefined,
  refresh: () => Promise<{ token: string; expiresInSeconds: number }>,
): Promise<string> {
  // Fast path: in-memory hit
  const memEntry = memoryCache.get(email);
  if (memEntry && isEntryValid(memEntry)) {
    return memEntry.token;
  }

  // Disk cache check (only if cacheDir provided)
  if (cacheDir) {
    const cached = await getCachedToken(cacheDir, email);
    if (cached) return cached;
  }

  // Deduplicate concurrent refreshes for the same email
  const inflight = inflightRefresh.get(email);
  if (inflight) return inflight;

  const refreshPromise = (async () => {
    const { token, expiresInSeconds } = await refresh();

    // Update both memory and disk caches
    const entry: TokenCacheEntry = {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };
    memoryCache.set(email, entry);

    if (cacheDir) {
      await setCachedToken(cacheDir, email, token, expiresInSeconds).catch(() => {});
    }

    return token;
  })();

  inflightRefresh.set(email, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    inflightRefresh.delete(email);
  }
}

/** Reset in-memory state. Exported for testing only. */
export function _resetMemoryCache(): void {
  memoryCache.clear();
  inflightRefresh.clear();
}
