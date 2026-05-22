import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitForBundleProcessing, retryOnUploadNotComplete } from "../src/commands/releases.js";
import { PlayApiError } from "@gpc-cli/api";

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
  const FAST_BACKOFF = [1, 1, 1, 1, 1, 1, 1];

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
    const client = mockClient([[], [], [], [], [], [], []]);
    await expect(
      waitForBundleProcessing(client, "com.example", "edit1", 42, FAST_BACKOFF),
    ).rejects.toThrow("not ready after 7 poll attempts");
    expect(client.bundles.list).toHaveBeenCalledTimes(7);
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

describe("retryOnUploadNotComplete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns immediately when fn succeeds", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await retryOnUploadNotComplete(fn)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on first 'uploads are not completed yet' error", async () => {
    const err = new PlayApiError(
      "Invalid request - Some of the Android App Bundle uploads are not completed yet.",
      "INVALID_ARGUMENT",
      400,
    );
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue("ok");
    const p = retryOnUploadNotComplete(fn);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await p).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries up to 3 times with increasing delays", async () => {
    const err = new PlayApiError(
      "Some of the Android App Bundle uploads are not completed yet.",
      "INVALID_ARGUMENT",
      400,
    );
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue("ok");
    const p = retryOnUploadNotComplete(fn);
    await vi.advanceTimersByTimeAsync(15_000); // first retry after 15s
    await vi.advanceTimersByTimeAsync(30_000); // second retry after 30s
    expect(await p).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("rethrows non-upload errors without retry", async () => {
    const err = new PlayApiError("Forbidden", "PERMISSION_DENIED", 403);
    const fn = vi.fn().mockRejectedValue(err);
    await expect(retryOnUploadNotComplete(fn)).rejects.toThrow("Forbidden");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-PlayApiError without retry", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(retryOnUploadNotComplete(fn)).rejects.toThrow("network down");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rethrows after all 3 retries exhausted", async () => {
    const err = new PlayApiError(
      "Some of the Android App Bundle uploads are not completed yet.",
      "INVALID_ARGUMENT",
      400,
    );
    const fn = vi.fn().mockRejectedValue(err);
    const p = retryOnUploadNotComplete(fn).catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(15_000);
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(45_000);
    const result = await p;
    expect(result).toBeInstanceOf(PlayApiError);
    expect((result as Error).message).toMatch("uploads are not completed");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
