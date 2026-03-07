import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../src/errors";
import { createHttpClient } from "../src/http";
import { createApiClient } from "../src/client";
import { createReportingClient } from "../src/reporting-client";

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
