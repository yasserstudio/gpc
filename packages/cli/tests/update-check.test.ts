import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFile } from "node:fs/promises";

// Mock @gpc-cli/config before importing the module under test
vi.mock("@gpc-cli/config", () => ({
  getCacheDir: vi.fn().mockReturnValue("/tmp/gpc-test-cache"),
}));

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockRejectedValue(new Error("ENOENT")),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe("checkForUpdate", () => {
  const originalEnv = { ...process.env };
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    vi.resetModules();
    // Default: TTY is true
    originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = true;
    // Clear relevant env vars
    delete process.env["GPC_NO_UPDATE_CHECK"];
    delete process.env["CI"];
  });

  afterEach(() => {
    process.stdout.isTTY = originalIsTTY as true;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns null when GPC_NO_UPDATE_CHECK=1", async () => {
    process.env["GPC_NO_UPDATE_CHECK"] = "1";
    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");
    expect(result).toBeNull();
  });

  it("returns null when CI env is set", async () => {
    process.env["CI"] = "true";
    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");
    expect(result).toBeNull();
  });

  it("returns null when stdout is not a TTY", async () => {
    process.stdout.isTTY = undefined as unknown as true;
    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");
    expect(result).toBeNull();
  });

  it("returns no update when versions match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "0.9.5" }),
      }),
    );

    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");
    expect(result).not.toBeNull();
    expect(result!.updateAvailable).toBe(false);
    expect(result!.current).toBe("0.9.5");
    expect(result!.latest).toBe("0.9.5");
  });

  it("returns update when registry has newer version", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "0.9.6" }),
      }),
    );

    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");
    expect(result).not.toBeNull();
    expect(result!.updateAvailable).toBe(true);
    expect(result!.latest).toBe("0.9.6");
  });

  it("uses cached result when fresh (< 24h)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const cachedData = JSON.stringify({
      latest: "0.9.7",
      checkedAt: Date.now() - 1000, // 1 second ago
    });

    vi.mocked(readFile).mockResolvedValueOnce(cachedData as any);

    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.updateAvailable).toBe(true);
    expect(result!.latest).toBe("0.9.7");
  });

  it("fetches when cache is stale (> 24h)", async () => {
    const staleCache = JSON.stringify({
      latest: "0.9.5",
      checkedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    });

    vi.mocked(readFile).mockResolvedValueOnce(staleCache as any);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "0.9.8" }),
      }),
    );

    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");

    expect(result).not.toBeNull();
    expect(result!.latest).toBe("0.9.8");
    expect(result!.updateAvailable).toBe(true);
  });

  it("handles network errors gracefully (returns null)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );

    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");
    expect(result).toBeNull();
  });

  it("handles malformed registry response (returns null)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: "@gpc-cli/cli" }), // no "version" field
      }),
    );

    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");
    expect(result).toBeNull();
  });

  it("handles fetch timeout (returns null)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new DOMException("The operation was aborted.", "AbortError")), 10);
          }),
      ),
    );

    const { checkForUpdate } = await import("../src/update-check.js");
    const result = await checkForUpdate("0.9.5");
    expect(result).toBeNull();
  });
});

describe("isNewerVersion", () => {
  it("correctly compares semver versions", async () => {
    const { isNewerVersion } = await import("../src/update-check.js");

    // 0.9.6 is newer than 0.9.5
    expect(isNewerVersion("0.9.5", "0.9.6")).toBe(true);

    // 0.10.0 is newer than 0.9.5
    expect(isNewerVersion("0.9.5", "0.10.0")).toBe(true);

    // 1.0.0 is newer than 0.9.99
    expect(isNewerVersion("0.9.99", "1.0.0")).toBe(true);

    // Same version is not newer
    expect(isNewerVersion("0.9.5", "0.9.5")).toBe(false);

    // Older version is not newer
    expect(isNewerVersion("1.0.0", "0.9.5")).toBe(false);
  });
});

describe("formatUpdateNotification", () => {
  it("formats the update notification correctly", async () => {
    const { formatUpdateNotification } = await import("../src/update-check.js");
    const msg = formatUpdateNotification({
      current: "0.9.5",
      latest: "0.9.6",
      updateAvailable: true,
    });
    expect(msg).toContain("0.9.5");
    expect(msg).toContain("0.9.6");
    expect(msg).toContain("Run: gpc update");
    expect(msg).toContain("Update available");
  });
});
