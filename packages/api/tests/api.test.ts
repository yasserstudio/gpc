import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../src/errors";
import { createHttpClient } from "../src/http";
import { createApiClient } from "../src/client";

const BASE_URL =
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

function mockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockAuth() {
  return { getAccessToken: vi.fn().mockResolvedValue("test-token") };
}

describe("ApiError", () => {
  it("has correct name, code, statusCode, message, and suggestion", () => {
    const err = new ApiError("something broke", "API_UNAUTHORIZED", 401, "Check your token.");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe("ApiError");
    expect(err.code).toBe("API_UNAUTHORIZED");
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("something broke");
    expect(err.suggestion).toBe("Check your token.");
  });
});

describe("createHttpClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET request sends correct URL, headers, and bearer token", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });
    await client.get("/com.example.app/edits");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/com.example.app/edits`);
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("POST request sends JSON body", async () => {
    const body = { name: "test-edit" };
    mockFetch.mockResolvedValueOnce(mockResponse({ id: "1" }));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });
    await client.post("/com.example.app/edits", body);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(body));
  });

  it("returns parsed JSON response", async () => {
    const payload = { id: "edit-123", expiryTimeSeconds: "9999" };
    mockFetch.mockResolvedValueOnce(mockResponse(payload));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });
    const result = await client.get("/com.example.app/edits/edit-123");

    expect(result).toEqual({ data: payload, status: 200 });
  });

  it("retries on 429 with backoff then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: "rate limited" }, 429))
      .mockResolvedValueOnce(mockResponse({ ok: true }));

    const client = createHttpClient({
      auth: mockAuth(),
      maxRetries: 1,
      baseDelay: 10,
      maxDelay: 50,
    });
    const result = await client.get("/com.example.app/edits");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: { ok: true }, status: 200 });
  });

  it("retries on 500 then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: "server error" }, 500))
      .mockResolvedValueOnce(mockResponse({ ok: true }));

    const client = createHttpClient({
      auth: mockAuth(),
      maxRetries: 1,
      baseDelay: 10,
      maxDelay: 50,
    });
    const result = await client.get("/com.example.app/edits");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: { ok: true }, status: 200 });
  });

  it("throws ApiError with API_UNAUTHORIZED on 401", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "unauthorized" }, 401));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });

    await expect(client.get("/com.example.app/edits")).rejects.toThrow(ApiError);
    await expect(client.get("/com.example.app/edits")).rejects.toBeDefined();

    // Re-mock for a clean assertion
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "unauthorized" }, 401));
    try {
      await client.get("/com.example.app/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("API_UNAUTHORIZED");
      expect((err as ApiError).statusCode).toBe(401);
    }
  });

  it("throws ApiError with API_FORBIDDEN on 403", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "forbidden" }, 403));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });

    try {
      await client.get("/com.example.app/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("API_FORBIDDEN");
      expect((err as ApiError).statusCode).toBe(403);
    }
  });

  it("throws ApiError with API_NOT_FOUND on 404", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "not found" }, 404));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });

    try {
      await client.get("/com.example.app/edits/bad-id");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("API_NOT_FOUND");
      expect((err as ApiError).statusCode).toBe(404);
    }
  });

  it("throws ApiError with API_RATE_LIMITED after max retries on 429", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: "rate limited" }, 429))
      .mockResolvedValueOnce(mockResponse({ error: "rate limited" }, 429))
      .mockResolvedValueOnce(mockResponse({ error: "rate limited" }, 429));

    const client = createHttpClient({
      auth: mockAuth(),
      maxRetries: 2,
      baseDelay: 10,
      maxDelay: 50,
    });

    try {
      await client.get("/com.example.app/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("API_RATE_LIMITED");
      expect((err as ApiError).statusCode).toBe(429);
    }

    // 1 initial + 2 retries = 3 total
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("respects maxRetries option set to 0 (no retries)", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "server error" }, 500));

    const client = createHttpClient({
      auth: mockAuth(),
      maxRetries: 0,
      baseDelay: 10,
    });

    try {
      await client.get("/com.example.app/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles timeout when fetch never resolves", async () => {
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );

    const client = createHttpClient({
      auth: mockAuth(),
      maxRetries: 0,
      timeout: 100,
    });

    try {
      await client.get("/com.example.app/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("API_TIMEOUT");
    }
  });
});

describe("createApiClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const PKG = "com.example.app";
  const EDIT_ID = "edit-123";

  function makeClient() {
    return createApiClient({ auth: mockAuth(), maxRetries: 0 });
  }

  it("edits.insert calls POST /{packageName}/edits", async () => {
    const edit = { id: EDIT_ID, expiryTimeSeconds: "9999" };
    mockFetch.mockResolvedValueOnce(mockResponse(edit));

    const client = makeClient();
    const result = await client.edits.insert(PKG);

    expect(result).toEqual(edit);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits`);
    expect(init.method).toBe("POST");
  });

  it("edits.get calls GET /{packageName}/edits/{editId}", async () => {
    const edit = { id: EDIT_ID, expiryTimeSeconds: "9999" };
    mockFetch.mockResolvedValueOnce(mockResponse(edit));

    const client = makeClient();
    const result = await client.edits.get(PKG, EDIT_ID);

    expect(result).toEqual(edit);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}`);
    expect(init.method).toBe("GET");
  });

  it("edits.validate calls POST /{packageName}/edits/{editId}:validate", async () => {
    const edit = { id: EDIT_ID, expiryTimeSeconds: "9999" };
    mockFetch.mockResolvedValueOnce(mockResponse(edit));

    const client = makeClient();
    const result = await client.edits.validate(PKG, EDIT_ID);

    expect(result).toEqual(edit);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}:validate`);
    expect(init.method).toBe("POST");
  });

  it("edits.commit calls POST /{packageName}/edits/{editId}:commit", async () => {
    const edit = { id: EDIT_ID, expiryTimeSeconds: "9999" };
    mockFetch.mockResolvedValueOnce(mockResponse(edit));

    const client = makeClient();
    const result = await client.edits.commit(PKG, EDIT_ID);

    expect(result).toEqual(edit);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}:commit`);
    expect(init.method).toBe("POST");
  });

  it("edits.delete calls DELETE /{packageName}/edits/{editId}", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = makeClient();
    await client.edits.delete(PKG, EDIT_ID);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}`);
    expect(init.method).toBe("DELETE");
  });

  it("details.get calls GET /{packageName}/edits/{editId}/details", async () => {
    const details = { defaultLanguage: "en-US", title: "My App" };
    mockFetch.mockResolvedValueOnce(mockResponse(details));

    const client = makeClient();
    const result = await client.details.get(PKG, EDIT_ID);

    expect(result).toEqual(details);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/details`);
    expect(init.method).toBe("GET");
  });
});
