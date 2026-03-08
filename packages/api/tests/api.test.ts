import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../src/errors";
import { createHttpClient } from "../src/http";
import { createApiClient } from "../src/client";
import { createReportingClient } from "../src/reporting-client";
import { createUsersClient } from "../src/users-client";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-aab-content")),
}));

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

// ---------------------------------------------------------------------------
// Phase 9 – error hierarchy
// ---------------------------------------------------------------------------
describe("error hierarchy", () => {
  it("ApiError has exitCode 4", () => {
    const err = new ApiError("fail", "FAIL_CODE", 500);
    expect(err.exitCode).toBe(4);
  });

  it("ApiError has toJSON() that returns structured error", () => {
    const err = new ApiError("not found", "NOT_FOUND", 404, "Check the resource ID.");
    expect(err.toJSON()).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "not found",
        suggestion: "Check the resource ID.",
      },
    });
  });

  it("ApiError preserves statusCode", () => {
    const err = new ApiError("rate limited", "RATE_LIMIT", 429, "Slow down.");
    expect(err.statusCode).toBe(429);
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

  // --- Phase 3: bundles ---

  describe("bundles", () => {
    it("bundles.list calls GET /{pkg}/edits/{editId}/bundles and returns bundles array", async () => {
      const bundles = [
        { versionCode: 1, sha256: "abc123" },
        { versionCode: 2, sha256: "def456" },
      ];
      mockFetch.mockResolvedValueOnce(mockResponse({ bundles }));

      const client = makeClient();
      const result = await client.bundles.list(PKG, EDIT_ID);

      expect(result).toEqual(bundles);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/bundles`);
      expect(init.method).toBe("GET");
    });

    it("bundles.upload calls POST to upload URL with correct content type and returns bundle", async () => {
      const UPLOAD_BASE_URL =
        "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications";
      const bundle = { versionCode: 3, sha256: "ghi789" };
      mockFetch.mockResolvedValueOnce(mockResponse({ bundle }));

      const client = makeClient();
      const result = await client.bundles.upload(PKG, EDIT_ID, "/tmp/app.aab");

      expect(result).toEqual(bundle);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${UPLOAD_BASE_URL}/${PKG}/edits/${EDIT_ID}/bundles`);
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/octet-stream");
    });
  });

  // --- Phase 3: details.patch ---

  it("details.patch calls PATCH /{packageName}/edits/{editId}/details", async () => {
    const updated = { defaultLanguage: "en-US", title: "My App", contactEmail: "a@b.com" };
    mockFetch.mockResolvedValueOnce(mockResponse(updated));

    const client = makeClient();
    const result = await client.details.patch(PKG, EDIT_ID, { contactEmail: "a@b.com" });

    expect(result).toEqual(updated);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/details`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ contactEmail: "a@b.com" });
  });

  it("details.update calls PUT /{packageName}/edits/{editId}/details", async () => {
    const details = { defaultLanguage: "en-US", title: "My App" };
    mockFetch.mockResolvedValueOnce(mockResponse(details));

    const client = makeClient();
    const result = await client.details.update(PKG, EDIT_ID, details);

    expect(result).toEqual(details);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/details`);
    expect(init.method).toBe("PUT");
  });

  // --- Phase 3: tracks ---

  describe("tracks", () => {
    it("tracks.list calls GET /{pkg}/edits/{editId}/tracks and returns tracks array", async () => {
      const tracks = [
        { track: "production", releases: [] },
        { track: "beta", releases: [] },
      ];
      mockFetch.mockResolvedValueOnce(mockResponse({ tracks }));

      const client = makeClient();
      const result = await client.tracks.list(PKG, EDIT_ID);

      expect(result).toEqual(tracks);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/tracks`);
      expect(init.method).toBe("GET");
    });

    it("tracks.get calls GET /{pkg}/edits/{editId}/tracks/{track} and returns track object", async () => {
      const track = { track: "internal", releases: [{ status: "completed", versionCodes: ["1"] }] };
      mockFetch.mockResolvedValueOnce(mockResponse(track));

      const client = makeClient();
      const result = await client.tracks.get(PKG, EDIT_ID, "internal");

      expect(result).toEqual(track);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/tracks/internal`);
      expect(init.method).toBe("GET");
    });

    it("tracks.update calls PUT /{pkg}/edits/{editId}/tracks/{track} with body and returns track", async () => {
      const release = { status: "completed", versionCodes: ["10"] };
      const trackResponse = { track: "production", releases: [release] };
      mockFetch.mockResolvedValueOnce(mockResponse(trackResponse));

      const client = makeClient();
      const result = await client.tracks.update(PKG, EDIT_ID, "production", release as any);

      expect(result).toEqual(trackResponse);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/tracks/production`);
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body)).toEqual({
        track: "production",
        releases: [release],
      });
    });
  });

  // --- Phase 4: listings ---

  describe("listings", () => {
    it("listings.list calls GET and returns listings array", async () => {
      const listings = [
        { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" },
      ];
      mockFetch.mockResolvedValueOnce(mockResponse({ listings }));

      const client = makeClient();
      const result = await client.listings.list(PKG, EDIT_ID);

      expect(result).toEqual(listings);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings`);
      expect(init.method).toBe("GET");
    });

    it("listings.list returns empty array when no listings", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));

      const client = makeClient();
      const result = await client.listings.list(PKG, EDIT_ID);

      expect(result).toEqual([]);
    });

    it("listings.get calls GET with language", async () => {
      const listing = { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" };
      mockFetch.mockResolvedValueOnce(mockResponse(listing));

      const client = makeClient();
      const result = await client.listings.get(PKG, EDIT_ID, "en-US");

      expect(result).toEqual(listing);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings/en-US`);
    });

    it("listings.update calls PUT with listing body", async () => {
      const listing = { language: "en-US", title: "New", shortDescription: "s", fullDescription: "f" };
      mockFetch.mockResolvedValueOnce(mockResponse(listing));

      const client = makeClient();
      const result = await client.listings.update(PKG, EDIT_ID, "en-US", { title: "New", shortDescription: "s", fullDescription: "f" });

      expect(result).toEqual(listing);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings/en-US`);
      expect(init.method).toBe("PUT");
    });

    it("listings.patch calls PATCH with partial body", async () => {
      const listing = { language: "en-US", title: "Patched", shortDescription: "s", fullDescription: "f" };
      mockFetch.mockResolvedValueOnce(mockResponse(listing));

      const client = makeClient();
      const result = await client.listings.patch(PKG, EDIT_ID, "en-US", { title: "Patched" });

      expect(result).toEqual(listing);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings/en-US`);
      expect(init.method).toBe("PATCH");
    });

    it("listings.delete calls DELETE with language", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));

      const client = makeClient();
      await client.listings.delete(PKG, EDIT_ID, "en-US");

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings/en-US`);
      expect(init.method).toBe("DELETE");
    });

    it("listings.deleteAll calls DELETE on listings root", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));

      const client = makeClient();
      await client.listings.deleteAll(PKG, EDIT_ID);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings`);
      expect(init.method).toBe("DELETE");
    });
  });

  // --- Phase 4: images ---

  describe("images", () => {
    it("images.list calls GET with language and imageType", async () => {
      const images = [{ id: "1", url: "https://example.com/1.png", sha1: "a", sha256: "b" }];
      mockFetch.mockResolvedValueOnce(mockResponse({ images }));

      const client = makeClient();
      const result = await client.images.list(PKG, EDIT_ID, "en-US", "phoneScreenshots");

      expect(result).toEqual(images);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings/en-US/phoneScreenshots`);
    });

    it("images.list returns empty array when no images", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));

      const client = makeClient();
      const result = await client.images.list(PKG, EDIT_ID, "en-US", "icon");

      expect(result).toEqual([]);
    });

    it("images.delete calls DELETE with imageId", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));

      const client = makeClient();
      await client.images.delete(PKG, EDIT_ID, "en-US", "phoneScreenshots", "img-1");

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings/en-US/phoneScreenshots/img-1`);
      expect(init.method).toBe("DELETE");
    });
  });

  // --- Phase 4: countryAvailability ---

  describe("countryAvailability", () => {
    it("countryAvailability.get calls GET with track", async () => {
      const availability = { countryTargeting: { countries: ["US", "GB"], includeRestOfWorld: true } };
      mockFetch.mockResolvedValueOnce(mockResponse(availability));

      const client = makeClient();
      const result = await client.countryAvailability.get(PKG, EDIT_ID, "production");

      expect(result).toEqual(availability);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/countryAvailability/production`);
    });
  });

  // --- Phase 5: reviews ---

  describe("reviews", () => {
    it("reviews.list calls GET /{pkg}/reviews", async () => {
      const response = { reviews: [{ reviewId: "r1", authorName: "User", comments: [] }] };
      mockFetch.mockResolvedValueOnce(mockResponse(response));

      const client = makeClient();
      const result = await client.reviews.list(PKG);

      expect(result).toEqual(response);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/reviews`);
      expect(init.method).toBe("GET");
    });

    it("reviews.list passes query params", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ reviews: [] }));

      const client = makeClient();
      await client.reviews.list(PKG, { translationLanguage: "fr", maxResults: 10 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("translationLanguage=fr");
      expect(url).toContain("maxResults=10");
    });

    it("reviews.get calls GET /{pkg}/reviews/{id}", async () => {
      const review = { reviewId: "r1", authorName: "User", comments: [] };
      mockFetch.mockResolvedValueOnce(mockResponse(review));

      const client = makeClient();
      const result = await client.reviews.get(PKG, "r1");

      expect(result).toEqual(review);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/reviews/r1`);
    });

    it("reviews.get passes translationLanguage param", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ reviewId: "r1", authorName: "U", comments: [] }));

      const client = makeClient();
      await client.reviews.get(PKG, "r1", "ja");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("translationLanguage=ja");
    });

    it("reviews.reply calls POST /{pkg}/reviews/{id}:reply", async () => {
      const replyResponse = { result: { replyText: "Thanks!", lastEdited: { seconds: "123" } } };
      mockFetch.mockResolvedValueOnce(mockResponse(replyResponse));

      const client = makeClient();
      const result = await client.reviews.reply(PKG, "r1", "Thanks!");

      expect(result).toEqual(replyResponse);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/reviews/r1:reply`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ replyText: "Thanks!" });
    });
  });
});

// --- Phase 5: Reporting Client ---

describe("createReportingClient", () => {
  const REPORTING_URL = "https://playdeveloperreporting.googleapis.com/v1beta1";

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const PKG = "com.example.app";

  function makeClient() {
    return createReportingClient({ auth: mockAuth(), maxRetries: 0 });
  }

  it("queryMetricSet calls POST /apps/{pkg}/{metricSet}:query", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ rows: [] }));

    const client = makeClient();
    const result = await client.queryMetricSet(PKG, "vitals.crashrate", { metrics: ["errorReportCount"] });

    expect(result).toEqual({ rows: [] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${REPORTING_URL}/apps/${PKG}/vitals.crashrate:query`);
    expect(init.method).toBe("POST");
  });

  it("getAnomalies calls GET /apps/{pkg}/anomalies", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ anomalies: [] }));

    const client = makeClient();
    const result = await client.getAnomalies(PKG);

    expect(result).toEqual({ anomalies: [] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${REPORTING_URL}/apps/${PKG}/anomalies`);
    expect(init.method).toBe("GET");
  });

  it("searchErrorIssues calls GET with filter params", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ errorIssues: [] }));

    const client = makeClient();
    await client.searchErrorIssues(PKG, "crash", 25);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`/apps/${PKG}/errorIssues:search`);
    expect(url).toContain("filter=crash");
    expect(url).toContain("pageSize=25");
  });

  it("searchErrorReports calls GET with issue name", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ errorReports: [] }));

    const client = makeClient();
    await client.searchErrorReports(PKG, "issue-1", 10);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`/apps/${PKG}/errorIssues/issue-1/reports`);
    expect(url).toContain("pageSize=10");
  });
});

// --- Phase 6: Monetization ---

describe("monetization API endpoints", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const PKG = "com.example.app";

  function makeClient() {
    return createApiClient({ auth: mockAuth(), maxRetries: 0 });
  }

  // --- subscriptions ---

  describe("subscriptions", () => {
    it("list calls GET /{pkg}/monetization/subscriptions", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ subscriptions: [] }));
      const client = makeClient();
      const result = await client.subscriptions.list(PKG);
      expect(result).toEqual({ subscriptions: [] });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions`);
      expect(init.method).toBe("GET");
    });

    it("get calls GET /{pkg}/monetization/subscriptions/{id}", async () => {
      const sub = { productId: "sub1", packageName: PKG };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      const result = await client.subscriptions.get(PKG, "sub1");
      expect(result).toEqual(sub);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions/sub1`);
    });

    it("create calls POST /{pkg}/monetization/subscriptions", async () => {
      const sub = { productId: "sub1", packageName: PKG };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      const result = await client.subscriptions.create(PKG, sub as any);
      expect(result).toEqual(sub);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions`);
      expect(init.method).toBe("POST");
    });

    it("update calls PATCH with updateMask in URL", async () => {
      const sub = { productId: "sub1", packageName: PKG };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      await client.subscriptions.update(PKG, "sub1", sub as any, "listings,basePlans");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain(`/monetization/subscriptions/sub1?updateMask=listings,basePlans`);
      expect(init.method).toBe("PATCH");
    });

    it("delete calls DELETE /{pkg}/monetization/subscriptions/{id}", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.subscriptions.delete(PKG, "sub1");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions/sub1`);
      expect(init.method).toBe("DELETE");
    });

    it("activateBasePlan calls POST .../:activate", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ productId: "sub1" }));
      const client = makeClient();
      await client.subscriptions.activateBasePlan(PKG, "sub1", "bp1");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions/sub1/basePlans/bp1:activate`);
      expect(init.method).toBe("POST");
    });

    it("deactivateBasePlan calls POST .../:deactivate", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ productId: "sub1" }));
      const client = makeClient();
      await client.subscriptions.deactivateBasePlan(PKG, "sub1", "bp1");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions/sub1/basePlans/bp1:deactivate`);
      expect(init.method).toBe("POST");
    });

    it("listOffers calls GET .../offers", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ subscriptionOffers: [] }));
      const client = makeClient();
      const result = await client.subscriptions.listOffers(PKG, "sub1", "bp1");
      expect(result).toEqual({ subscriptionOffers: [] });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions/sub1/basePlans/bp1/offers`);
    });

    it("createOffer calls POST .../offers", async () => {
      const offer = { productId: "sub1", basePlanId: "bp1", offerId: "o1", state: "DRAFT", phases: [] };
      mockFetch.mockResolvedValueOnce(mockResponse(offer));
      const client = makeClient();
      await client.subscriptions.createOffer(PKG, "sub1", "bp1", offer as any);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions/sub1/basePlans/bp1/offers`);
      expect(init.method).toBe("POST");
    });

    it("activateOffer calls POST .../offers/{id}:activate", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ offerId: "o1" }));
      const client = makeClient();
      await client.subscriptions.activateOffer(PKG, "sub1", "bp1", "o1");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/subscriptions/sub1/basePlans/bp1/offers/o1:activate`);
      expect(init.method).toBe("POST");
    });
  });

  // --- inappproducts ---

  describe("inappproducts", () => {
    it("list calls GET /{pkg}/inappproducts", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ inappproduct: [] }));
      const client = makeClient();
      const result = await client.inappproducts.list(PKG);
      expect(result).toEqual({ inappproduct: [] });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/inappproducts`);
      expect(init.method).toBe("GET");
    });

    it("get calls GET /{pkg}/inappproducts/{sku}", async () => {
      const product = { sku: "coins100", status: "active" };
      mockFetch.mockResolvedValueOnce(mockResponse(product));
      const client = makeClient();
      const result = await client.inappproducts.get(PKG, "coins100");
      expect(result).toEqual(product);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/inappproducts/coins100`);
    });

    it("create calls POST /{pkg}/inappproducts", async () => {
      const product = { sku: "coins100", status: "active" };
      mockFetch.mockResolvedValueOnce(mockResponse(product));
      const client = makeClient();
      await client.inappproducts.create(PKG, product as any);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/inappproducts`);
      expect(init.method).toBe("POST");
    });

    it("update calls PUT /{pkg}/inappproducts/{sku}", async () => {
      const product = { sku: "coins100", status: "active" };
      mockFetch.mockResolvedValueOnce(mockResponse(product));
      const client = makeClient();
      await client.inappproducts.update(PKG, "coins100", product as any);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/inappproducts/coins100`);
      expect(init.method).toBe("PUT");
    });

    it("delete calls DELETE /{pkg}/inappproducts/{sku}", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.inappproducts.delete(PKG, "coins100");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/inappproducts/coins100`);
      expect(init.method).toBe("DELETE");
    });
  });

  // --- purchases ---

  describe("purchases", () => {
    it("getProduct calls GET /{pkg}/purchases/products/{id}/tokens/{token}", async () => {
      const purchase = { purchaseState: 0, orderId: "order-1" };
      mockFetch.mockResolvedValueOnce(mockResponse(purchase));
      const client = makeClient();
      const result = await client.purchases.getProduct(PKG, "coins100", "tok123");
      expect(result).toEqual(purchase);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/products/coins100/tokens/tok123`);
    });

    it("acknowledgeProduct calls POST .../:acknowledge", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.purchases.acknowledgeProduct(PKG, "coins100", "tok123");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/products/coins100/tokens/tok123:acknowledge`);
      expect(init.method).toBe("POST");
    });

    it("consumeProduct calls POST .../:consume", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.purchases.consumeProduct(PKG, "coins100", "tok123");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/products/coins100/tokens/tok123:consume`);
      expect(init.method).toBe("POST");
    });

    it("getSubscriptionV2 calls GET /{pkg}/purchases/subscriptionsv2/tokens/{token}", async () => {
      const sub = { kind: "androidpublisher#subscriptionPurchaseV2", subscriptionState: "ACTIVE" };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      const result = await client.purchases.getSubscriptionV2(PKG, "tok456");
      expect(result).toEqual(sub);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/subscriptionsv2/tokens/tok456`);
    });

    it("cancelSubscription calls POST .../:cancel", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.purchases.cancelSubscription(PKG, "sub1", "tok789");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/subscriptions/sub1/tokens/tok789:cancel`);
      expect(init.method).toBe("POST");
    });

    it("deferSubscription calls POST .../:defer with body", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ newExpiryTimeMillis: "999999" }));
      const client = makeClient();
      const body = { deferralInfo: { expectedExpiryTimeMillis: "100", desiredExpiryTimeMillis: "200" } };
      const result = await client.purchases.deferSubscription(PKG, "sub1", "tok789", body);
      expect(result).toEqual({ newExpiryTimeMillis: "999999" });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/subscriptions/sub1/tokens/tok789:defer`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual(body);
    });

    it("revokeSubscriptionV2 calls POST .../:revoke", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.purchases.revokeSubscriptionV2(PKG, "tok456");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/subscriptionsv2/tokens/tok456:revoke`);
      expect(init.method).toBe("POST");
    });

    it("listVoided calls GET /{pkg}/purchases/voidedpurchases", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ voidedPurchases: [] }));
      const client = makeClient();
      const result = await client.purchases.listVoided(PKG);
      expect(result).toEqual({ voidedPurchases: [] });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/voidedpurchases`);
    });
  });

  // --- orders ---

  describe("orders", () => {
    it("refund calls POST /{pkg}/orders/{id}:refund", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.orders.refund(PKG, "GPA.1234");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/orders/GPA.1234:refund`);
      expect(init.method).toBe("POST");
    });
  });

  // --- monetization ---

  describe("monetization", () => {
    it("convertRegionPrices calls POST /{pkg}/monetization/convertRegionPrices", async () => {
      const response = { convertedRegionPrices: { US: { regionCode: "US", price: { currencyCode: "USD", units: "4" }, taxAmount: { currencyCode: "USD" } } } };
      mockFetch.mockResolvedValueOnce(mockResponse(response));
      const client = makeClient();
      const result = await client.monetization.convertRegionPrices(PKG, { price: { currencyCode: "USD", units: "4", nanos: 990000000 } });
      expect(result).toEqual(response);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/monetization/convertRegionPrices`);
      expect(init.method).toBe("POST");
    });
  });

  // --- URL verification ---

  it("subscriptions.list passes pagination params", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ subscriptions: [] }));
    const client = makeClient();
    await client.subscriptions.list(PKG, { pageSize: 10, pageToken: "abc" });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("pageSize=10");
    expect(url).toContain("pageToken=abc");
  });

  // --- Phase 7: reports ---

  describe("reports", () => {
    it("reports.list calls GET /{pkg}/reports/{type}/{year}/{month}", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ reports: [{ bucketId: "b1", uri: "https://storage.googleapis.com/report.csv" }] }));
      const client = makeClient();
      const result = await client.reports.list(PKG, "earnings", 2026, 3);
      expect(result).toEqual({ reports: [{ bucketId: "b1", uri: "https://storage.googleapis.com/report.csv" }] });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/reports/earnings/2026/03`);
      expect(init.method).toBe("GET");
    });

    it("reports.list pads single-digit month", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ reports: [] }));
      const client = makeClient();
      await client.reports.list(PKG, "installs", 2025, 1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/2025/01");
    });
  });

  // --- Phase 7: testers ---

  describe("testers", () => {
    const EDIT_ID = "edit-123";

    it("testers.get calls GET /{pkg}/edits/{editId}/testers/{track}", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ googleGroups: ["g@example.com"], googleGroupsCount: 1 }));
      const client = makeClient();
      const result = await client.testers.get(PKG, EDIT_ID, "internal");
      expect(result).toEqual({ googleGroups: ["g@example.com"], googleGroupsCount: 1 });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/testers/internal`);
      expect(init.method).toBe("GET");
    });

    it("testers.update calls PUT /{pkg}/edits/{editId}/testers/{track}", async () => {
      const updated = { googleGroups: ["a@example.com", "b@example.com"], googleGroupsCount: 2 };
      mockFetch.mockResolvedValueOnce(mockResponse(updated));
      const client = makeClient();
      const result = await client.testers.update(PKG, EDIT_ID, "beta", { googleGroups: ["a@example.com", "b@example.com"] });
      expect(result).toEqual(updated);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/testers/beta`);
      expect(init.method).toBe("PUT");
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 7: UsersApiClient
// ---------------------------------------------------------------------------

describe("createUsersClient", () => {
  const USERS_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/developers";
  const DEV_ID = "12345678";
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeClient() {
    return createUsersClient({ auth: mockAuth(), maxRetries: 0 });
  }

  it("list calls GET /developers/{id}/users", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ users: [{ email: "a@b.com" }] }));
    const client = makeClient();
    const result = await client.list(DEV_ID);
    expect(result).toEqual({ users: [{ email: "a@b.com" }] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${USERS_BASE}/${DEV_ID}/users`);
    expect(init.method).toBe("GET");
  });

  it("list passes pagination params", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ users: [] }));
    const client = makeClient();
    await client.list(DEV_ID, { pageSize: 5, pageToken: "next" });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("pageSize=5");
    expect(url).toContain("pageToken=next");
  });

  it("get calls GET /developers/{id}/users/{userId}", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ email: "a@b.com", name: "Alice" }));
    const client = makeClient();
    const result = await client.get(DEV_ID, "a@b.com");
    expect(result.email).toBe("a@b.com");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${USERS_BASE}/${DEV_ID}/users/a@b.com`);
  });

  it("create calls POST /developers/{id}/users", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ email: "new@b.com" }));
    const client = makeClient();
    const result = await client.create(DEV_ID, { email: "new@b.com" });
    expect(result.email).toBe("new@b.com");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${USERS_BASE}/${DEV_ID}/users`);
    expect(init.method).toBe("POST");
  });

  it("update calls PATCH /developers/{id}/users/{userId}", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ email: "a@b.com" }));
    const client = makeClient();
    await client.update(DEV_ID, "a@b.com", { developerAccountPermission: ["ADMIN"] }, "developerAccountPermission");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${USERS_BASE}/${DEV_ID}/users/a@b.com?updateMask=developerAccountPermission`);
    expect(init.method).toBe("PATCH");
  });

  it("delete calls DELETE /developers/{id}/users/{userId}", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    await client.delete(DEV_ID, "a@b.com");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${USERS_BASE}/${DEV_ID}/users/a@b.com`);
    expect(init.method).toBe("DELETE");
  });
});
