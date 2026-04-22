import { describe, it, expect, vi } from "vitest";
import { waitForBundleProcessing } from "../src/commands/releases.js";

function mockClient(listResults: number[][]) {
  let callIndex = 0;
  return {
    bundles: {
      list: vi.fn(async () => {
        const result = listResults[callIndex] ?? [];
        callIndex++;
        return result.map((vc) => ({ versionCode: vc, sha1: "a", sha256: "b" }));
      }),
    },
  } as any;
}

describe("waitForBundleProcessing", () => {
  const FAST_BACKOFF = [1, 1, 1, 1, 1];

  it("returns when bundle appears on first poll", async () => {
    const client = mockClient([[42]]);
    await waitForBundleProcessing(client, "com.example", "edit1", 42, FAST_BACKOFF);
    expect(client.bundles.list).toHaveBeenCalledTimes(1);
  });

  it("returns when bundle appears on third poll", async () => {
    const client = mockClient([[], [], [42]]);
    await waitForBundleProcessing(client, "com.example", "edit1", 42, FAST_BACKOFF);
    expect(client.bundles.list).toHaveBeenCalledTimes(3);
  });

  it("throws BUNDLE_PROCESSING_TIMEOUT after all attempts fail", async () => {
    const client = mockClient([[], [], [], [], []]);
    await expect(
      waitForBundleProcessing(client, "com.example", "edit1", 42, FAST_BACKOFF),
    ).rejects.toThrow("not ready after 5 poll attempts");
    expect(client.bundles.list).toHaveBeenCalledTimes(5);
  });

  it("ignores other version codes in the list", async () => {
    const client = mockClient([
      [10, 20],
      [10, 20],
      [10, 20, 42],
    ]);
    await waitForBundleProcessing(client, "com.example", "edit1", 42, FAST_BACKOFF);
    expect(client.bundles.list).toHaveBeenCalledTimes(3);
  });

  it("passes correct packageName and editId", async () => {
    const client = mockClient([[99]]);
    await waitForBundleProcessing(client, "com.my.app", "edit-abc", 99, FAST_BACKOFF);
    expect(client.bundles.list).toHaveBeenCalledWith("com.my.app", "edit-abc");
  });

  it("uses default backoff when none provided", async () => {
    // Bundle not found on first poll, found on second — should wait ~2s (first backoff slot)
    const client = mockClient([[], [7]]);
    const start = Date.now();
    await waitForBundleProcessing(client, "com.example", "edit1", 7);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(1900);
    expect(elapsed).toBeLessThan(4000);
  });

  it("propagates API errors from bundles.list", async () => {
    const client = {
      bundles: {
        list: vi.fn().mockRejectedValue(new Error("500 Internal Server Error")),
      },
    } as any;
    await expect(waitForBundleProcessing(client, "com.example", "edit1", 42, [1])).rejects.toThrow(
      "500 Internal Server Error",
    );
  });
});
