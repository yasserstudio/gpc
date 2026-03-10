import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getCachedToken,
  setCachedToken,
  clearTokenCache,
  acquireToken,
  _resetMemoryCache,
} from "../src/token-cache";
import { mkdir, rm, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("token-cache", () => {
  const cacheDir = join(tmpdir(), "gpc-test-token-cache");

  beforeEach(async () => {
    _resetMemoryCache();
    await mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
    _resetMemoryCache();
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("returns null for missing cache", async () => {
    const token = await getCachedToken(cacheDir, "test@example.com");
    expect(token).toBeNull();
  });

  it("round-trips token write and read", async () => {
    await setCachedToken(cacheDir, "test@example.com", "ya29.abc", 3600);
    const token = await getCachedToken(cacheDir, "test@example.com");
    expect(token).toBe("ya29.abc");
  });

  it("returns null for expired token", async () => {
    await setCachedToken(cacheDir, "test@example.com", "ya29.old", 0);
    const token = await getCachedToken(cacheDir, "test@example.com");
    expect(token).toBeNull();
  });

  it("returns null when token is within safety margin (< 5 min left)", async () => {
    // Set token that expires in 4 minutes (within 5-min safety margin)
    await setCachedToken(cacheDir, "test@example.com", "ya29.expiring", 240);
    const token = await getCachedToken(cacheDir, "test@example.com");
    expect(token).toBeNull();
  });

  it("returns token when more than 5 minutes remain", async () => {
    await setCachedToken(cacheDir, "test@example.com", "ya29.valid", 600);
    const token = await getCachedToken(cacheDir, "test@example.com");
    expect(token).toBe("ya29.valid");
  });

  it("stores multiple accounts independently", async () => {
    await setCachedToken(cacheDir, "a@example.com", "token-a", 3600);
    await setCachedToken(cacheDir, "b@example.com", "token-b", 3600);

    expect(await getCachedToken(cacheDir, "a@example.com")).toBe("token-a");
    expect(await getCachedToken(cacheDir, "b@example.com")).toBe("token-b");
  });

  it("clears single account", async () => {
    await setCachedToken(cacheDir, "a@example.com", "token-a", 3600);
    await setCachedToken(cacheDir, "b@example.com", "token-b", 3600);

    await clearTokenCache(cacheDir, "a@example.com");

    expect(await getCachedToken(cacheDir, "a@example.com")).toBeNull();
    expect(await getCachedToken(cacheDir, "b@example.com")).toBe("token-b");
  });

  it("clears all accounts", async () => {
    await setCachedToken(cacheDir, "a@example.com", "token-a", 3600);
    await setCachedToken(cacheDir, "b@example.com", "token-b", 3600);

    await clearTokenCache(cacheDir);

    expect(await getCachedToken(cacheDir, "a@example.com")).toBeNull();
    expect(await getCachedToken(cacheDir, "b@example.com")).toBeNull();
  });

  it("handles corrupt cache file gracefully", async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(cacheDir, "token-cache.json"), "not json");

    const token = await getCachedToken(cacheDir, "test@example.com");
    expect(token).toBeNull();
  });

  it("sets file permissions to 0o600", async () => {
    await setCachedToken(cacheDir, "test@example.com", "ya29.secret", 3600);

    const stats = await stat(join(cacheDir, "token-cache.json"));
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("clearTokenCache on nonexistent file does not throw", async () => {
    await expect(clearTokenCache(cacheDir)).resolves.toBeUndefined();
  });

  describe("in-memory cache", () => {
    it("serves from memory on second read without disk I/O", async () => {
      await setCachedToken(cacheDir, "mem@example.com", "ya29.mem", 3600);

      // Delete the file — memory cache should still serve
      await rm(join(cacheDir, "token-cache.json"), { force: true });

      const token = await getCachedToken(cacheDir, "mem@example.com");
      expect(token).toBe("ya29.mem");
    });

    it("clears memory cache on clearTokenCache with email", async () => {
      await setCachedToken(cacheDir, "mem@example.com", "ya29.mem", 3600);
      await clearTokenCache(cacheDir, "mem@example.com");

      // Delete file to prove we're not reading from disk
      await rm(join(cacheDir, "token-cache.json"), { force: true }).catch(() => {});

      const token = await getCachedToken(cacheDir, "mem@example.com");
      expect(token).toBeNull();
    });

    it("clears all memory cache on clearTokenCache without email", async () => {
      await setCachedToken(cacheDir, "a@example.com", "token-a", 3600);
      await setCachedToken(cacheDir, "b@example.com", "token-b", 3600);

      await clearTokenCache(cacheDir);

      const tokenA = await getCachedToken(cacheDir, "a@example.com");
      const tokenB = await getCachedToken(cacheDir, "b@example.com");
      expect(tokenA).toBeNull();
      expect(tokenB).toBeNull();
    });
  });

  describe("acquireToken", () => {
    it("calls refresh when no cached token exists", async () => {
      const refresh = async () => ({ token: "ya29.fresh", expiresInSeconds: 3600 });
      const token = await acquireToken("new@example.com", cacheDir, refresh);
      expect(token).toBe("ya29.fresh");
    });

    it("returns cached token without calling refresh", async () => {
      await setCachedToken(cacheDir, "cached@example.com", "ya29.cached", 3600);

      let refreshCalled = false;
      const refresh = async () => {
        refreshCalled = true;
        return { token: "ya29.shouldnt-be-used", expiresInSeconds: 3600 };
      };

      const token = await acquireToken("cached@example.com", cacheDir, refresh);
      expect(token).toBe("ya29.cached");
      expect(refreshCalled).toBe(false);
    });

    it("deduplicates concurrent refresh calls for the same email", async () => {
      let refreshCount = 0;
      const refresh = async () => {
        refreshCount++;
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 50));
        return { token: "ya29.deduped", expiresInSeconds: 3600 };
      };

      // Fire 5 concurrent acquireToken calls for the same email
      const results = await Promise.all([
        acquireToken("race@example.com", cacheDir, refresh),
        acquireToken("race@example.com", cacheDir, refresh),
        acquireToken("race@example.com", cacheDir, refresh),
        acquireToken("race@example.com", cacheDir, refresh),
        acquireToken("race@example.com", cacheDir, refresh),
      ]);

      // All should get the same token
      expect(results).toEqual(Array(5).fill("ya29.deduped"));
      // Refresh should have been called only once
      expect(refreshCount).toBe(1);
    });

    it("allows independent refresh for different emails", async () => {
      let refreshCount = 0;
      const refreshA = async () => {
        refreshCount++;
        await new Promise((r) => setTimeout(r, 10));
        return { token: "ya29.token-a", expiresInSeconds: 3600 };
      };
      const refreshB = async () => {
        refreshCount++;
        await new Promise((r) => setTimeout(r, 10));
        return { token: "ya29.token-b", expiresInSeconds: 3600 };
      };

      const [tokenA, tokenB] = await Promise.all([
        acquireToken("a@example.com", cacheDir, refreshA),
        acquireToken("b@example.com", cacheDir, refreshB),
      ]);

      // Each email should trigger its own refresh
      expect(refreshCount).toBe(2);
      expect(tokenA).toBe("ya29.token-a");
      expect(tokenB).toBe("ya29.token-b");
    });

    it("works without cacheDir (no disk persistence)", async () => {
      const refresh = async () => ({ token: "ya29.no-disk", expiresInSeconds: 3600 });
      const token = await acquireToken("nodisk@example.com", undefined, refresh);
      expect(token).toBe("ya29.no-disk");
    });

    it("cleans up inflight promise after refresh failure", async () => {
      let callCount = 0;
      const failingRefresh = async () => {
        callCount++;
        if (callCount === 1) throw new Error("network error");
        return { token: "ya29.retry-ok", expiresInSeconds: 3600 };
      };

      // First call should fail
      await expect(acquireToken("fail@example.com", cacheDir, failingRefresh)).rejects.toThrow(
        "network error",
      );

      // Second call should succeed (inflight promise was cleaned up)
      const token = await acquireToken("fail@example.com", cacheDir, failingRefresh);
      expect(token).toBe("ya29.retry-ok");
      expect(callCount).toBe(2);
    });
  });
});
