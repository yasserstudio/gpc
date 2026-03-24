import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  stat: vi.fn(),
  open: vi.fn(),
}));

import { stat, open } from "node:fs/promises";
import { resumableUpload, RESUMABLE_THRESHOLD } from "../src/resumable-upload";

const mockStat = stat as unknown as ReturnType<typeof vi.fn>;
const mockOpen = open as unknown as ReturnType<typeof vi.fn>;

function mockCtx(tokenOverride?: string) {
  return {
    getAccessToken: vi.fn().mockResolvedValue(tokenOverride ?? "test-token"),
    maxRetries: 3,
    baseDelay: 10,
    maxDelay: 100,
    onRetry: vi.fn(),
  };
}

// Helper: create a mock file handle that returns predictable data
function createMockFileHandle(totalBytes: number) {
  let readCalls = 0;
  return {
    read: vi
      .fn()
      .mockImplementation((buf: Buffer, _offset: number, length: number, position: number) => {
        const remaining = Math.max(0, totalBytes - position);
        const bytesRead = Math.min(length, remaining);
        // Fill buffer with dummy data
        if (bytesRead > 0) buf.fill(0x41, 0, bytesRead);
        readCalls++;
        return Promise.resolve({ bytesRead });
      }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe("resumableUpload", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initiates session and uploads a single chunk for small files", async () => {
    const fileSize = 1024 * 1024; // 1 MB
    const sessionUri = "https://upload.example.com/session/abc123";

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // 1. Initiate session → return Location header
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 200, headers: { Location: sessionUri } }),
    );

    // 2. Upload single chunk → complete
    const bundle = { versionCode: 42, sha256: "abc" };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(bundle), { status: 200 }));

    const ctx = mockCtx();
    const result = await resumableUpload(
      "https://upload.example.com/bundles",
      "/tmp/app.aab",
      "application/octet-stream",
      ctx,
      { chunkSize: 8 * 1024 * 1024 }, // 8 MB chunk > 1 MB file
    );

    expect(result.data).toEqual(bundle);
    expect(result.status).toBe(200);

    // Verify initiation request
    const [initUrl, initOpts] = mockFetch.mock.calls[0];
    expect(initUrl).toContain("uploadType=resumable");
    expect(initOpts.method).toBe("POST");
    expect(initOpts.headers["X-Upload-Content-Type"]).toBe("application/octet-stream");
    expect(initOpts.headers["X-Upload-Content-Length"]).toBe(String(fileSize));

    // Verify chunk upload
    const [chunkUrl, chunkOpts] = mockFetch.mock.calls[1];
    expect(chunkUrl).toBe(sessionUri);
    expect(chunkOpts.method).toBe("PUT");
    expect(chunkOpts.headers["Content-Range"]).toBe(`bytes 0-${fileSize - 1}/${fileSize}`);
  });

  it("streams file in multiple chunks with correct Content-Range headers", async () => {
    const chunkSize = 256 * 1024; // 256 KB (minimum alignment)
    const fileSize = chunkSize * 3 + 100; // 3.something chunks
    const sessionUri = "https://upload.example.com/session/multi";

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // Initiate
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 200, headers: { Location: sessionUri } }),
    );

    // Chunks 1-3: 308 Resume Incomplete
    for (let i = 0; i < 3; i++) {
      mockFetch.mockResolvedValueOnce(new Response("", { status: 308 }));
    }

    // Chunk 4 (final, partial): 200 OK
    const bundle = { versionCode: 1 };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(bundle), { status: 200 }));

    const progressEvents: { percent: number; bytesUploaded: number }[] = [];
    const result = await resumableUpload(
      "https://upload.example.com/bundles",
      "/tmp/big.aab",
      "application/octet-stream",
      mockCtx(),
      {
        chunkSize,
        onProgress: (event) => {
          progressEvents.push({ percent: event.percent, bytesUploaded: event.bytesUploaded });
        },
      },
    );

    expect(result.data).toEqual(bundle);

    // Verify we got 4 progress events (one per chunk)
    expect(progressEvents.length).toBe(4);
    expect(progressEvents[progressEvents.length - 1]!.bytesUploaded).toBe(fileSize);
    expect(progressEvents[progressEvents.length - 1]!.percent).toBe(100);

    // Verify Content-Range headers
    // Chunk 1: bytes 0-(chunkSize-1)/total
    const chunk1 = mockFetch.mock.calls[1][1];
    expect(chunk1.headers["Content-Range"]).toBe(`bytes 0-${chunkSize - 1}/${fileSize}`);
    // Chunk 2: bytes chunkSize-(2*chunkSize-1)/total
    const chunk2 = mockFetch.mock.calls[2][1];
    expect(chunk2.headers["Content-Range"]).toBe(
      `bytes ${chunkSize}-${2 * chunkSize - 1}/${fileSize}`,
    );
  });

  it("throws UPLOAD_SESSION_NOT_FOUND on 404 from chunk upload", async () => {
    const fileSize = 512 * 1024;
    const sessionUri = "https://upload.example.com/session/expired";

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // Initiate
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 200, headers: { Location: sessionUri } }),
    );

    // Chunk: 404 Not Found
    mockFetch.mockResolvedValueOnce(new Response("", { status: 404 }));

    await expect(
      resumableUpload(
        "https://upload.example.com/bundles",
        "/tmp/app.aab",
        "application/octet-stream",
        mockCtx(),
        {
          chunkSize: 8 * 1024 * 1024,
        },
      ),
    ).rejects.toThrow(/session.*not found/i);
  });

  it("throws UPLOAD_SESSION_EXPIRED on 410 from chunk upload", async () => {
    const fileSize = 512 * 1024;
    const sessionUri = "https://upload.example.com/session/gone";

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // Initiate
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 200, headers: { Location: sessionUri } }),
    );

    // Chunk: 410 Gone
    mockFetch.mockResolvedValueOnce(new Response("", { status: 410 }));

    await expect(
      resumableUpload(
        "https://upload.example.com/bundles",
        "/tmp/app.aab",
        "application/octet-stream",
        mockCtx(),
        {
          chunkSize: 8 * 1024 * 1024,
        },
      ),
    ).rejects.toThrow(/session.*expired/i);
  });

  it("retries on 5xx and resumes from server-reported offset", async () => {
    const chunkSize = 256 * 1024;
    const fileSize = chunkSize * 2;
    const sessionUri = "https://upload.example.com/session/retry";

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // Initiate
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 200, headers: { Location: sessionUri } }),
    );

    // Chunk 1: 308 (success)
    mockFetch.mockResolvedValueOnce(new Response("", { status: 308 }));

    // Chunk 2: 500 (server error → retry)
    mockFetch.mockResolvedValueOnce(new Response("", { status: 500 }));

    // Resume query: 308 with Range indicating chunk 1 received
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 308, headers: { Range: `bytes=0-${chunkSize - 1}` } }),
    );

    // Chunk 2 retry: 200 (complete)
    const bundle = { versionCode: 99 };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(bundle), { status: 200 }));

    const ctx = mockCtx();
    const result = await resumableUpload(
      "https://upload.example.com/bundles",
      "/tmp/app.aab",
      "application/octet-stream",
      ctx,
      { chunkSize },
    );

    expect(result.data).toEqual(bundle);
    expect(ctx.onRetry).toHaveBeenCalled();
  });

  it("throws UPLOAD_INITIATE_FAILED when session initiation fails", async () => {
    mockStat.mockResolvedValue({ size: 1024 * 1024 });
    mockOpen.mockResolvedValue(createMockFileHandle(1024 * 1024));

    mockFetch.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    await expect(
      resumableUpload(
        "https://upload.example.com/bundles",
        "/tmp/app.aab",
        "application/octet-stream",
        mockCtx(),
        {
          chunkSize: 8 * 1024 * 1024,
        },
      ),
    ).rejects.toThrow(/initiate resumable upload/i);
  });

  it("throws UPLOAD_NO_SESSION_URI when Location header is missing", async () => {
    mockStat.mockResolvedValue({ size: 1024 * 1024 });
    mockOpen.mockResolvedValue(createMockFileHandle(1024 * 1024));

    // 200 OK but no Location header
    mockFetch.mockResolvedValueOnce(new Response("", { status: 200 }));

    await expect(
      resumableUpload(
        "https://upload.example.com/bundles",
        "/tmp/app.aab",
        "application/octet-stream",
        mockCtx(),
        {
          chunkSize: 8 * 1024 * 1024,
        },
      ),
    ).rejects.toThrow(/session URI/i);
  });

  it("throws UPLOAD_INVALID_CHUNK_SIZE for non-aligned chunk sizes", async () => {
    mockStat.mockResolvedValue({ size: 1024 * 1024 });
    mockOpen.mockResolvedValue(createMockFileHandle(1024 * 1024));

    await expect(
      resumableUpload(
        "https://upload.example.com/bundles",
        "/tmp/app.aab",
        "application/octet-stream",
        mockCtx(),
        {
          chunkSize: 300000, // Not a multiple of 256 KB
        },
      ),
    ).rejects.toThrow(/multiple of 256 KB/i);
  });

  it("resumes from existing session URI without re-initiating", async () => {
    const fileSize = 256 * 1024;
    const sessionUri = "https://upload.example.com/session/existing";

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // Resume query: server has 0 bytes → start from beginning
    mockFetch.mockResolvedValueOnce(new Response("", { status: 308 }));

    // Upload chunk: complete
    const bundle = { versionCode: 7 };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(bundle), { status: 200 }));

    const result = await resumableUpload(
      "https://upload.example.com/bundles",
      "/tmp/app.aab",
      "application/octet-stream",
      mockCtx(),
      { chunkSize: 8 * 1024 * 1024, resumeSessionUri: sessionUri },
    );

    expect(result.data).toEqual(bundle);

    // First call should be resume query, NOT initiation
    const [queryUrl, queryOpts] = mockFetch.mock.calls[0];
    expect(queryUrl).toBe(sessionUri);
    expect(queryOpts.headers["Content-Range"]).toBe(`bytes */${fileSize}`);
  });

  it("RESUMABLE_THRESHOLD is 5 MB", () => {
    expect(RESUMABLE_THRESHOLD).toBe(5 * 1024 * 1024);
  });

  it("fires onProgress with throughput and ETA", async () => {
    const chunkSize = 256 * 1024;
    const fileSize = chunkSize * 2;
    const sessionUri = "https://upload.example.com/session/progress";

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // Initiate
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 200, headers: { Location: sessionUri } }),
    );
    // Chunk 1: 308
    mockFetch.mockResolvedValueOnce(new Response("", { status: 308 }));
    // Chunk 2: 200
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ versionCode: 1 }), { status: 200 }),
    );

    const events: { percent: number; bytesPerSecond: number; etaSeconds: number }[] = [];
    await resumableUpload(
      "https://upload.example.com/bundles",
      "/tmp/app.aab",
      "application/octet-stream",
      mockCtx(),
      {
        chunkSize,
        onProgress: (e) =>
          events.push({
            percent: e.percent,
            bytesPerSecond: e.bytesPerSecond,
            etaSeconds: e.etaSeconds,
          }),
      },
    );

    expect(events.length).toBe(2);
    expect(events[0]!.percent).toBe(50);
    expect(events[1]!.percent).toBe(100);
    // Throughput is a non-negative number (may be 0 if test runs too fast)
    expect(events[0]!.bytesPerSecond).toBeGreaterThanOrEqual(0);
    // ETA for second event (100%) should be 0 (no bytes remaining)
    expect(events[1]!.etaSeconds).toBeLessThanOrEqual(0);
  });

  it("recovers when final chunk times out but server has all bytes", async () => {
    const chunkSize = 256 * 1024;
    const fileSize = chunkSize + 128 * 1024; // 1.5 chunks — final chunk is partial
    const sessionUri = "https://upload.example.com/session/final-chunk-timeout";
    const bundle = { versionCode: 142, sha256: "abc123" };

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // Initiate
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 200, headers: { Location: sessionUri } }),
    );

    // Chunk 1: 308 (accepted)
    mockFetch.mockResolvedValueOnce(new Response("", { status: 308 }));

    // Chunk 2 (final, partial): network timeout → returns undefined
    mockFetch.mockRejectedValueOnce(new Error("network timeout"));

    // Retry: query progress → 200 (server has all bytes, upload complete)
    mockFetch.mockResolvedValueOnce(new Response("", { status: 200 }));

    // fetchCompletionResponse → 200 with bundle data
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(bundle), { status: 200 }),
    );

    const ctx = mockCtx();
    const result = await resumableUpload(
      "https://upload.example.com/bundles",
      "/tmp/app.aab",
      "application/octet-stream",
      ctx,
      { chunkSize },
    );

    expect(result.data).toEqual(bundle);
    expect(result.status).toBe(200);
  });

  it("recovers via post-loop query when all bytes sent but no completion captured", async () => {
    const chunkSize = 256 * 1024;
    const fileSize = chunkSize; // exactly one chunk
    const sessionUri = "https://upload.example.com/session/post-loop-recovery";
    const bundle = { versionCode: 200 };

    mockStat.mockResolvedValue({ size: fileSize });
    mockOpen.mockResolvedValue(createMockFileHandle(fileSize));

    // Initiate
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 200, headers: { Location: sessionUri } }),
    );

    // Chunk 1: 308 (accepted, not final — but it IS the last chunk)
    // This simulates a race where server returns 308 instead of 200 on the final chunk
    mockFetch.mockResolvedValueOnce(new Response("", { status: 308 }));

    // Post-loop: queryProgress → 200 (server confirms complete)
    mockFetch.mockResolvedValueOnce(new Response("", { status: 200 }));

    // Post-loop: fetchCompletionResponse → 200 with bundle
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(bundle), { status: 200 }),
    );

    const ctx = mockCtx();
    const result = await resumableUpload(
      "https://upload.example.com/bundles",
      "/tmp/app.aab",
      "application/octet-stream",
      ctx,
      { chunkSize },
    );

    expect(result.data).toEqual(bundle);
    expect(result.status).toBe(200);
  });
});
