import { describe, it, expect, vi, beforeEach } from "vitest";
import { listBundles, findBundle, waitForBundle } from "../src/commands/bundles.js";
import type { PlayApiClient, Bundle } from "@gpc-cli/api";

const PKG = "com.example.app";

function mockClient(bundles: Bundle[] = []) {
  return {
    edits: {
      insert: vi.fn().mockResolvedValue({ id: "edit1", expiryTimeSeconds: "9999999999" }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    bundles: {
      list: vi.fn().mockResolvedValue(bundles),
    },
  } as unknown as PlayApiClient;
}

const BUNDLE_42: Bundle = { versionCode: 42, sha1: "abc", sha256: "def" };
const BUNDLE_43: Bundle = { versionCode: 43, sha1: "ghi", sha256: "jkl" };

describe("listBundles", () => {
  it("returns all bundles", async () => {
    const client = mockClient([BUNDLE_42, BUNDLE_43]);
    const result = await listBundles(client, PKG);
    expect(result).toEqual([BUNDLE_42, BUNDLE_43]);
    expect(client.edits.delete).toHaveBeenCalled();
  });

  it("returns empty array when no bundles", async () => {
    const client = mockClient([]);
    const result = await listBundles(client, PKG);
    expect(result).toEqual([]);
  });

  it("cleans up edit on error", async () => {
    const client = mockClient();
    vi.mocked(client.bundles.list).mockRejectedValueOnce(new Error("fail"));
    await expect(listBundles(client, PKG)).rejects.toThrow("fail");
    expect(client.edits.delete).toHaveBeenCalled();
  });
});

describe("findBundle", () => {
  it("returns matching bundle", async () => {
    const client = mockClient([BUNDLE_42, BUNDLE_43]);
    const result = await findBundle(client, PKG, 42);
    expect(result).toEqual(BUNDLE_42);
  });

  it("returns null when not found", async () => {
    const client = mockClient([BUNDLE_42]);
    const result = await findBundle(client, PKG, 99);
    expect(result).toBeNull();
  });
});

describe("waitForBundle", () => {
  it("returns when bundle appears", async () => {
    const client = mockClient();
    vi.mocked(client.bundles.list).mockResolvedValueOnce([]).mockResolvedValueOnce([BUNDLE_42]);

    const result = await waitForBundle(client, PKG, 42, {
      timeout: 5000,
      interval: 10,
    });
    expect(result).toEqual(BUNDLE_42);
  });

  it("throws BUNDLE_WAIT_TIMEOUT when bundle never appears", async () => {
    const client = mockClient([]);
    await expect(waitForBundle(client, PKG, 42, { timeout: 50, interval: 10 })).rejects.toThrow(
      "not found after",
    );
  });

  it("cleans up edit on each poll", async () => {
    const client = mockClient();
    vi.mocked(client.bundles.list).mockResolvedValueOnce([]).mockResolvedValueOnce([BUNDLE_42]);

    await waitForBundle(client, PKG, 42, { timeout: 5000, interval: 10 });
    expect(client.edits.delete).toHaveBeenCalledTimes(2);
  });

  it("uses default timeout and interval", async () => {
    const client = mockClient([BUNDLE_42]);
    const result = await waitForBundle(client, PKG, 42);
    expect(result).toEqual(BUNDLE_42);
  });

  it("retries on 429/500/503 but throws auth errors immediately", async () => {
    const { PlayApiError } = await import("@gpc-cli/api");
    const client = mockClient();
    const authError = new PlayApiError("unauthorized", "API_AUTH_ERROR", 401);
    vi.mocked(client.bundles.list).mockRejectedValueOnce(authError);

    await expect(waitForBundle(client, PKG, 42, { timeout: 5000, interval: 10 })).rejects.toThrow(
      "unauthorized",
    );
  });

  it("retries on 503 and eventually succeeds", async () => {
    const { PlayApiError } = await import("@gpc-cli/api");
    const client = mockClient();
    vi.mocked(client.bundles.list)
      .mockRejectedValueOnce(new PlayApiError("unavailable", "API_UNAVAILABLE", 503))
      .mockResolvedValueOnce([BUNDLE_42]);

    const result = await waitForBundle(client, PKG, 42, { timeout: 5000, interval: 10 });
    expect(result).toEqual(BUNDLE_42);
  });
});

describe("findBundle error propagation", () => {
  it("propagates errors from listBundles", async () => {
    const client = mockClient();
    vi.mocked(client.bundles.list).mockRejectedValueOnce(new Error("api down"));
    await expect(findBundle(client, PKG, 42)).rejects.toThrow("api down");
  });
});
