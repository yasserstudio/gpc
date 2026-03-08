import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCachedToken, setCachedToken, clearTokenCache } from "../src/token-cache";
import { mkdir, rm, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("token-cache", () => {
  const cacheDir = join(tmpdir(), "gpc-test-token-cache");

  beforeEach(async () => {
    await mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
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
});
