import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PlayApiError } from "../src/errors";
import { createHttpClient } from "../src/http";
import { createApiClient } from "../src/client";
import { createReportingClient } from "../src/reporting-client";
import { createUsersClient } from "../src/users-client";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-aab-content")),
  stat: vi.fn().mockResolvedValue({ size: 1024 }), // Small file → falls through to simple upload
  open: vi.fn().mockResolvedValue({
    read: vi.fn().mockResolvedValue({ bytesRead: 4 }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
}));

const BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

function mockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockAuth() {
  return { getAccessToken: vi.fn().mockResolvedValue("test-token") };
}

describe("PlayApiError", () => {
  it("has correct name, code, statusCode, message, and suggestion", () => {
    const err = new PlayApiError("something broke", "API_UNAUTHORIZED", 401, "Check your token.");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PlayApiError);
    expect(err.name).toBe("PlayApiError");
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
  it("PlayApiError has exitCode 4", () => {
    const err = new PlayApiError("fail", "FAIL_CODE", 500);
    expect(err.exitCode).toBe(4);
  });

  it("PlayApiError has toJSON() that returns structured error", () => {
    const err = new PlayApiError("not found", "NOT_FOUND", 404, "Check the resource ID.");
    expect(err.toJSON()).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "not found",
        suggestion: "Check the resource ID.",
      },
    });
  });

  it("PlayApiError preserves statusCode", () => {
    const err = new PlayApiError("rate limited", "RATE_LIMIT", 429, "Slow down.");
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

  it("throws PlayApiError with API_UNAUTHORIZED on 401", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "unauthorized" }, 401));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });

    await expect(client.get("/com.example.app/edits")).rejects.toThrow(PlayApiError);
    await expect(client.get("/com.example.app/edits")).rejects.toBeDefined();

    // Re-mock for a clean assertion
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "unauthorized" }, 401));
    try {
      await client.get("/com.example.app/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).code).toBe("API_UNAUTHORIZED");
      expect((err as PlayApiError).statusCode).toBe(401);
    }
  });

  it("throws PlayApiError with API_FORBIDDEN on 403", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "forbidden" }, 403));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });

    try {
      await client.get("/com.example.app/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).code).toBe("API_FORBIDDEN");
      expect((err as PlayApiError).statusCode).toBe(403);
    }
  });

  it("throws PlayApiError with API_NOT_FOUND on 404", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "not found" }, 404));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });

    try {
      await client.get("/com.example.app/edits/bad-id");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).code).toBe("API_NOT_FOUND");
      expect((err as PlayApiError).statusCode).toBe(404);
    }
  });

  it("strips HTML from error body on 404", async () => {
    const htmlBody =
      "<!DOCTYPE html><html><body><h1>Not Found</h1><p>The requested URL was not found.</p></body></html>";
    mockFetch.mockResolvedValueOnce(
      new Response(htmlBody, { status: 404, headers: { "Content-Type": "text/html" } }),
    );

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });

    try {
      await client.get("/com.example.app/dataSafety");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).message).not.toContain("<html>");
      expect((err as PlayApiError).message).not.toContain("<body>");
      expect((err as PlayApiError).message).toContain("Not Found");
    }
  });

  it("throws PlayApiError with API_RATE_LIMITED after max retries on 429", async () => {
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
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).code).toBe("API_RATE_LIMITED");
      expect((err as PlayApiError).statusCode).toBe(429);
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
      expect(err).toBeInstanceOf(PlayApiError);
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
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).code).toBe("API_TIMEOUT");
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
      mockFetch.mockResolvedValueOnce(mockResponse(bundle));

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
      const listing = {
        language: "en-US",
        title: "App",
        shortDescription: "s",
        fullDescription: "f",
      };
      mockFetch.mockResolvedValueOnce(mockResponse(listing));

      const client = makeClient();
      const result = await client.listings.get(PKG, EDIT_ID, "en-US");

      expect(result).toEqual(listing);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings/en-US`);
    });

    it("listings.update calls PUT with listing body", async () => {
      const listing = {
        language: "en-US",
        title: "New",
        shortDescription: "s",
        fullDescription: "f",
      };
      mockFetch.mockResolvedValueOnce(mockResponse(listing));

      const client = makeClient();
      const result = await client.listings.update(PKG, EDIT_ID, "en-US", {
        title: "New",
        shortDescription: "s",
        fullDescription: "f",
      });

      expect(result).toEqual(listing);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/listings/en-US`);
      expect(init.method).toBe("PUT");
    });

    it("listings.patch calls PATCH with partial body", async () => {
      const listing = {
        language: "en-US",
        title: "Patched",
        shortDescription: "s",
        fullDescription: "f",
      };
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
      const availability = {
        countryTargeting: { countries: ["US", "GB"], includeRestOfWorld: true },
      };
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
      mockFetch.mockResolvedValueOnce(
        mockResponse({ reviewId: "r1", authorName: "U", comments: [] }),
      );

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
    const result = await client.queryMetricSet(PKG, "crashRateMetricSet", {
      metrics: ["errorReportCount"],
    });

    expect(result).toEqual({ rows: [] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${REPORTING_URL}/apps/${PKG}/crashRateMetricSet:query`);
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
    it("list calls GET /{pkg}/subscriptions", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ subscriptions: [] }));
      const client = makeClient();
      const result = await client.subscriptions.list(PKG);
      expect(result).toEqual({ subscriptions: [] });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions`);
      expect(init.method).toBe("GET");
    });

    it("get calls GET /{pkg}/subscriptions/{id}", async () => {
      const sub = { productId: "sub1", packageName: PKG };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      const result = await client.subscriptions.get(PKG, "sub1");
      expect(result).toEqual(sub);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1`);
    });

    it("create calls POST /{pkg}/subscriptions with regionsVersion", async () => {
      const sub = { productId: "sub1", packageName: PKG };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      const result = await client.subscriptions.create(PKG, sub as any);
      expect(result).toEqual(sub);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain(`${BASE_URL}/${PKG}/subscriptions`);
      expect(url).toContain("regionsVersion.version=2022%2F02");
      expect(init.method).toBe("POST");
    });

    it("create passes productId as query param", async () => {
      const sub = { productId: "sub1", packageName: PKG };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      await client.subscriptions.create(PKG, sub as any, "sub1");
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("productId=sub1");
    });

    it("update calls PATCH with updateMask in URL", async () => {
      const sub = { productId: "sub1", packageName: PKG };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      await client.subscriptions.update(PKG, "sub1", sub as any, "listings,basePlans");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain(`/subscriptions/sub1?updateMask=listings%2CbasePlans`);
      expect(url).toContain("regionsVersion.version=2022%2F02");
      expect(init.method).toBe("PATCH");
    });

    it("update passes explicit regionsVersion as query param", async () => {
      const sub = { productId: "sub1", packageName: PKG };
      mockFetch.mockResolvedValueOnce(mockResponse(sub));
      const client = makeClient();
      await client.subscriptions.update(PKG, "sub1", sub as any, undefined, "2023.1");
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("regionsVersion.version=2023.1");
    });

    it("delete calls DELETE /{pkg}/subscriptions/{id}", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.subscriptions.delete(PKG, "sub1");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1`);
      expect(init.method).toBe("DELETE");
    });

    it("activateBasePlan calls POST .../:activate", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ productId: "sub1" }));
      const client = makeClient();
      await client.subscriptions.activateBasePlan(PKG, "sub1", "bp1");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1:activate`);
      expect(init.method).toBe("POST");
    });

    it("deactivateBasePlan calls POST .../:deactivate", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ productId: "sub1" }));
      const client = makeClient();
      await client.subscriptions.deactivateBasePlan(PKG, "sub1", "bp1");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1:deactivate`);
      expect(init.method).toBe("POST");
    });

    it("listOffers calls GET .../offers", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ subscriptionOffers: [] }));
      const client = makeClient();
      const result = await client.subscriptions.listOffers(PKG, "sub1", "bp1");
      expect(result).toEqual({ subscriptionOffers: [] });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1/offers`);
    });

    it("createOffer calls POST .../offers with regionsVersion", async () => {
      const offer = {
        productId: "sub1",
        basePlanId: "bp1",
        offerId: "o1",
        state: "DRAFT",
        phases: [],
      };
      mockFetch.mockResolvedValueOnce(mockResponse(offer));
      const client = makeClient();
      await client.subscriptions.createOffer(PKG, "sub1", "bp1", offer as any);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1/offers`);
      expect(url).toContain("regionsVersion.version=2022%2F02");
      expect(init.method).toBe("POST");
    });

    it("createOffer passes offerId as query param", async () => {
      const offer = {
        productId: "sub1",
        basePlanId: "bp1",
        offerId: "o1",
        state: "DRAFT",
        phases: [],
      };
      mockFetch.mockResolvedValueOnce(mockResponse(offer));
      const client = makeClient();
      await client.subscriptions.createOffer(PKG, "sub1", "bp1", offer as any, "o1");
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("offerId=o1");
    });

    it("activateOffer calls POST .../offers/{id}:activate", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ offerId: "o1" }));
      const client = makeClient();
      await client.subscriptions.activateOffer(PKG, "sub1", "bp1", "o1");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1/offers/o1:activate`);
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

    it("create passes autoConvertMissingPrices as query param", async () => {
      const product = { sku: "coins100", status: "active" };
      mockFetch.mockResolvedValueOnce(mockResponse(product));
      const client = makeClient();
      await client.inappproducts.create(PKG, product as any, { autoConvertMissingPrices: true });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("autoConvertMissingPrices=true");
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

    it("update passes autoConvertMissingPrices and allowMissing as query params", async () => {
      const product = { sku: "coins100", status: "active" };
      mockFetch.mockResolvedValueOnce(mockResponse(product));
      const client = makeClient();
      await client.inappproducts.update(PKG, "coins100", product as any, {
        autoConvertMissingPrices: true,
        allowMissing: true,
      });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("autoConvertMissingPrices=true");
      expect(url).toContain("allowMissing=true");
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
      const body = {
        deferralInfo: { expectedExpiryTimeMillis: "100", desiredExpiryTimeMillis: "200" },
      };
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

    it("get calls GET /{pkg}/orders/{id}", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ orderId: "GPA.1234", state: "PROCESSED" }));
      const client = makeClient();
      const order = await client.orders.get(PKG, "GPA.1234");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/orders/GPA.1234`);
      expect(init.method).toBe("GET");
      expect(order.orderId).toBe("GPA.1234");
      expect(order.state).toBe("PROCESSED");
    });

    it("batchGet calls POST /{pkg}/orders:batchGet", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ orders: [{ orderId: "GPA.1" }, { orderId: "GPA.2" }] }));
      const client = makeClient();
      const orders = await client.orders.batchGet(PKG, ["GPA.1", "GPA.2"]);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/orders:batchGet`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ orderIds: ["GPA.1", "GPA.2"] });
      expect(orders).toHaveLength(2);
    });

    it("batchGet returns empty array when no orders in response", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      const orders = await client.orders.batchGet(PKG, ["GPA.999"]);
      expect(orders).toEqual([]);
    });
  });

  describe("purchases v2 endpoints", () => {
    it("getProductV2 calls GET /{pkg}/purchases/productsv2/tokens/{token}", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ orderId: "O1", purchaseStateContext: { state: "PURCHASED" } }));
      const client = makeClient();
      const result = await client.purchases.getProductV2(PKG, "tok123");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/productsv2/tokens/tok123`);
      expect(init.method).toBe("GET");
      expect(result.orderId).toBe("O1");
    });

    it("cancelSubscriptionV2 calls POST /{pkg}/purchases/subscriptionsv2/tokens/{token}:cancel", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.purchases.cancelSubscriptionV2(PKG, "tok123", { cancellationType: "DEVELOPER_CANCELED" });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/subscriptionsv2/tokens/tok123:cancel`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ cancellationType: "DEVELOPER_CANCELED" });
    });

    it("cancelSubscriptionV2 works without body", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      await client.purchases.cancelSubscriptionV2(PKG, "tok123");
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("subscriptionsv2/tokens/tok123:cancel");
    });

    it("deferSubscriptionV2 calls POST /{pkg}/purchases/subscriptionsv2/tokens/{token}:defer", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ newExpiryTime: "2026-07-01T00:00:00Z" }));
      const client = makeClient();
      const result = await client.purchases.deferSubscriptionV2(PKG, "tok123", {
        deferralInfo: { desiredExpiryTime: "2026-07-01T00:00:00Z" },
      });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/purchases/subscriptionsv2/tokens/tok123:defer`);
      expect(init.method).toBe("POST");
      expect(result.newExpiryTime).toBe("2026-07-01T00:00:00Z");
    });
  });

  // --- monetization ---

  describe("monetization", () => {
    it("convertRegionPrices calls POST /{pkg}/pricing:convertRegionPrices", async () => {
      const response = {
        convertedRegionPrices: {
          US: {
            regionCode: "US",
            price: { currencyCode: "USD", units: "4" },
            taxAmount: { currencyCode: "USD" },
          },
        },
      };
      mockFetch.mockResolvedValueOnce(mockResponse(response));
      const client = makeClient();
      const result = await client.monetization.convertRegionPrices(PKG, {
        price: { currencyCode: "USD", units: "4", nanos: 990000000 },
      });
      expect(result).toEqual(response);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/pricing:convertRegionPrices`);
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
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          reports: [{ bucketId: "b1", uri: "https://storage.googleapis.com/report.csv" }],
        }),
      );
      const client = makeClient();
      const result = await client.reports.list(PKG, "earnings", 2026, 3);
      expect(result).toEqual({
        reports: [{ bucketId: "b1", uri: "https://storage.googleapis.com/report.csv" }],
      });
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
      mockFetch.mockResolvedValueOnce(
        mockResponse({ googleGroups: ["g@example.com"], googleGroupsCount: 1 }),
      );
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
      const result = await client.testers.update(PKG, EDIT_ID, "beta", {
        googleGroups: ["a@example.com", "b@example.com"],
      });
      expect(result).toEqual(updated);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/testers/beta`);
      expect(init.method).toBe("PUT");
    });
  });

  // --- Device Tiers ---

  describe("deviceTiers", () => {
    it("deviceTiers.list calls GET /{pkg}/deviceTierConfigs", async () => {
      const configs = {
        deviceTierConfigs: [
          { deviceTierConfigId: "tier-1", deviceGroups: [{ name: "high", deviceSelectors: [] }] },
        ],
      };
      mockFetch.mockResolvedValueOnce(mockResponse(configs));
      const client = makeClient();
      const result = await client.deviceTiers.list(PKG);
      expect(result).toEqual(configs.deviceTierConfigs);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/deviceTierConfigs`);
      expect(init.method).toBe("GET");
    });

    it("deviceTiers.list returns empty array when no configs", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      const client = makeClient();
      const result = await client.deviceTiers.list(PKG);
      expect(result).toEqual([]);
    });

    it("deviceTiers.get calls GET /{pkg}/deviceTierConfigs/{configId}", async () => {
      const config = {
        deviceTierConfigId: "tier-1",
        deviceGroups: [{ name: "high", deviceSelectors: [] }],
      };
      mockFetch.mockResolvedValueOnce(mockResponse(config));
      const client = makeClient();
      const result = await client.deviceTiers.get(PKG, "tier-1");
      expect(result).toEqual(config);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/deviceTierConfigs/tier-1`);
      expect(init.method).toBe("GET");
    });

    it("deviceTiers.create calls POST /{pkg}/deviceTierConfigs", async () => {
      const config = {
        deviceTierConfigId: "tier-new",
        deviceGroups: [
          { name: "mid", deviceSelectors: [{ deviceRam: { minBytes: "4000000000" } }] },
        ],
      };
      mockFetch.mockResolvedValueOnce(mockResponse(config));
      const client = makeClient();
      const result = await client.deviceTiers.create(PKG, config);
      expect(result).toEqual(config);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/${PKG}/deviceTierConfigs`);
      expect(init.method).toBe("POST");
    });
  });
});

// ---------------------------------------------------------------------------
// v0.9.7: appRecovery, dataSafety, externalTransactions
// ---------------------------------------------------------------------------

describe("appRecovery API endpoints", () => {
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

  it("appRecovery.list calls GET /{pkg}/appRecoveries", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ recoveryActions: [{ id: "r1" }] }));
    const client = makeClient();
    const result = await client.appRecovery.list(PKG);
    expect(result).toEqual([{ id: "r1" }]);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/appRecoveries`);
    expect(init.method).toBe("GET");
  });

  it("appRecovery.list passes versionCode as query param", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ recoveryActions: [] }));
    const client = makeClient();
    await client.appRecovery.list(PKG, 22);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("versionCode=22");
  });

  it("appRecovery.cancel calls POST /{pkg}/appRecovery/{id}:cancel", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    await client.appRecovery.cancel(PKG, "r1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/appRecovery/r1:cancel`);
    expect(init.method).toBe("POST");
  });

  it("appRecovery.deploy calls POST /{pkg}/appRecovery/{id}:deploy", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    await client.appRecovery.deploy(PKG, "r1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/appRecovery/r1:deploy`);
    expect(init.method).toBe("POST");
  });
});

describe("dataSafety API endpoints", () => {
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

  it("dataSafety.get calls GET /{pkg}/dataSafety", async () => {
    const safety = { dataTypes: [], purposes: [] };
    mockFetch.mockResolvedValueOnce(mockResponse(safety));
    const client = makeClient();
    const result = await client.dataSafety.get(PKG);
    expect(result).toEqual(safety);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/dataSafety`);
    expect(init.method).toBe("GET");
  });

  it("dataSafety.update calls PUT /{pkg}/dataSafety", async () => {
    const safety = { dataTypes: ["location"], purposes: ["app_functionality"] };
    mockFetch.mockResolvedValueOnce(mockResponse(safety));
    const client = makeClient();
    const result = await client.dataSafety.update(PKG, safety as any);
    expect(result).toEqual(safety);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/dataSafety`);
    expect(init.method).toBe("PUT");
  });
});

describe("externalTransactions API endpoints", () => {
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

  it("externalTransactions.create calls POST /{pkg}/externalTransactions", async () => {
    const txn = { externalTransactionId: "txn1", originalPreTaxAmount: {} };
    mockFetch.mockResolvedValueOnce(mockResponse(txn));
    const client = makeClient();
    const result = await client.externalTransactions.create(PKG, txn as any);
    expect(result).toEqual(txn);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/externalTransactions`);
    expect(init.method).toBe("POST");
  });

  it("externalTransactions.get calls GET /{pkg}/externalTransactions/{id}", async () => {
    const txn = { externalTransactionId: "txn1", transactionState: "COMPLETED" };
    mockFetch.mockResolvedValueOnce(mockResponse(txn));
    const client = makeClient();
    const result = await client.externalTransactions.get(PKG, "txn1");
    expect(result).toEqual(txn);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/externalTransactions/txn1`);
    expect(init.method).toBe("GET");
  });

  it("externalTransactions.refund calls POST /{pkg}/externalTransactions/{id}:refund", async () => {
    const refundResult = { externalTransactionId: "txn1", transactionState: "REFUNDED" };
    mockFetch.mockResolvedValueOnce(mockResponse(refundResult));
    const client = makeClient();
    const result = await client.externalTransactions.refund(PKG, "txn1", {
      partialRefund: {},
    } as any);
    expect(result).toEqual(refundResult);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/externalTransactions/txn1:refund`);
    expect(init.method).toBe("POST");
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
    await client.update(
      DEV_ID,
      "a@b.com",
      { developerAccountPermission: ["ADMIN"] },
      "developerAccountPermission",
    );
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

// ---------------------------------------------------------------------------
// Coverage boost: HTTP error paths, methods, upload edge cases, client gaps
// ---------------------------------------------------------------------------

describe("HTTP error paths and methods", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeHttp(overrides?: Record<string, unknown>) {
    return createHttpClient({ auth: mockAuth(), maxRetries: 0, ...overrides });
  }

  // 1. HTTP 409 → API_EDIT_CONFLICT
  it("maps 409 to API_EDIT_CONFLICT with suggestion", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("conflict", { status: 409, headers: { "Content-Type": "text/plain" } }),
    );
    const http = makeHttp();
    await expect(http.get("/com.example/edits")).rejects.toThrow(PlayApiError);
    try {
      await http.get("/com.example/edits");
    } catch {
      // already asserted above
    }
    // re-test to inspect properties
    mockFetch.mockResolvedValueOnce(
      new Response("conflict", { status: 409, headers: { "Content-Type": "text/plain" } }),
    );
    const http2 = makeHttp();
    try {
      await http2.get("/com.example/edits");
    } catch (err: any) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect(err.code).toBe("API_EDIT_CONFLICT");
      expect(err.statusCode).toBe(409);
      expect(err.suggestion).toContain("another process");
    }
  });

  // 2. Generic HTTP error (422) → API_HTTP_422
  it("maps non-standard status 422 to API_HTTP_422", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("unprocessable", { status: 422, headers: { "Content-Type": "text/plain" } }),
    );
    const http = makeHttp();
    try {
      await http.post("/com.example/edits", { bad: true });
    } catch (err: any) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect(err.code).toBe("API_HTTP_422");
      expect(err.statusCode).toBe(422);
      expect(err.suggestion).toBeUndefined();
    }
  });

  // 3. Network error (TypeError) → API_NETWORK_ERROR
  it("maps TypeError to API_NETWORK_ERROR", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    const http = makeHttp();
    try {
      await http.get("/com.example/edits");
    } catch (err: any) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect(err.code).toBe("API_NETWORK_ERROR");
      expect(err.message).toContain("fetch failed");
      expect(err.suggestion).toContain("network error");
    }
  });

  // 4. Upload retry on 500
  it("upload retries on 500 and succeeds on third attempt", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("error", { status: 500 }))
      .mockResolvedValueOnce(new Response("error", { status: 500 }))
      .mockResolvedValueOnce(mockResponse({ bundle: { versionCode: 42 } }));
    const http = createHttpClient({ auth: mockAuth(), maxRetries: 2, baseDelay: 1, maxDelay: 1 });
    const result = await http.upload(
      "/com.example/edits/1/bundles",
      "/fake/path.aab",
      "application/octet-stream",
    );
    expect(result.data).toEqual({ bundle: { versionCode: 42 } });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  // 5. Upload timeout (AbortError)
  it("upload throws API_TIMEOUT on AbortError with file size in message", async () => {
    const abortErr = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abortErr);
    const http = makeHttp();
    try {
      await http.upload(
        "/com.example/edits/1/bundles",
        "/fake/path.aab",
        "application/octet-stream",
      );
    } catch (err: any) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect(err.code).toBe("API_TIMEOUT");
      expect(err.message).toContain("timed out");
      expect(err.message).toContain("MB");
      expect(err.suggestion).toContain("GPC_UPLOAD_TIMEOUT");
    }
  });

  it("upload uses explicit uploadTimeout when provided", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ bundle: { versionCode: 1 } }));
    const http = createHttpClient({
      auth: mockAuth(),
      maxRetries: 0,
      uploadTimeout: 600_000,
    });
    const result = await http.upload(
      "/com.example/edits/1/bundles",
      "/fake/path.aab",
      "application/octet-stream",
    );
    expect(result.data).toEqual({ bundle: { versionCode: 1 } });
  });

  // 6. Upload network error (TypeError)
  it("upload throws API_NETWORK_ERROR on TypeError", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("network down"));
    const http = makeHttp();
    try {
      await http.upload(
        "/com.example/edits/1/bundles",
        "/fake/path.aab",
        "application/octet-stream",
      );
    } catch (err: any) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect(err.code).toBe("API_NETWORK_ERROR");
      expect(err.message).toContain("network down");
    }
  });

  // 6b. Upload timeout retries then succeeds
  it("upload retries on timeout then succeeds", async () => {
    const abortErr = new DOMException("The operation was aborted", "AbortError");
    mockFetch
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce(mockResponse({ bundle: { versionCode: 1 } }));
    const http = createHttpClient({ auth: mockAuth(), maxRetries: 1, baseDelay: 1, maxDelay: 1 });
    const result = await http.upload(
      "/com.example/edits/1/bundles",
      "/fake/path.aab",
      "application/octet-stream",
    );
    expect(result.data).toEqual({ bundle: { versionCode: 1 } });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // 6c. Upload network error retries then succeeds
  it("upload retries on network error then succeeds", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(mockResponse({ bundle: { versionCode: 2 } }));
    const http = createHttpClient({ auth: mockAuth(), maxRetries: 1, baseDelay: 1, maxDelay: 1 });
    const result = await http.upload(
      "/com.example/edits/1/bundles",
      "/fake/path.aab",
      "application/octet-stream",
    );
    expect(result.data).toEqual({ bundle: { versionCode: 2 } });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // 7. PUT method
  it("put sends PUT request with body", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ updated: true }));
    const http = makeHttp();
    const result = await http.put("/com.example/edits/1/details", { title: "New" });
    expect(result.data).toEqual({ updated: true });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/com.example/edits/1/details");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ title: "New" });
  });

  // 8. PATCH method
  it("patch sends PATCH request with body", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ patched: true }));
    const http = makeHttp();
    const result = await http.patch("/com.example/edits/1/details", { title: "Patched" });
    expect(result.data).toEqual({ patched: true });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/com.example/edits/1/details");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ title: "Patched" });
  });
});

// ---------------------------------------------------------------------------
// Coverage boost: client methods — deactivateOffer, getSubscriptionV1, listVoided with options
// ---------------------------------------------------------------------------

describe("client coverage gaps", () => {
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

  // 9. deactivateOffer
  it("deactivateOffer calls POST .../offers/{id}:deactivate", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ offerId: "o1", state: "INACTIVE" }));
    const client = makeClient();
    const result = await client.subscriptions.deactivateOffer(PKG, "sub1", "bp1", "o1");
    expect(result).toEqual({ offerId: "o1", state: "INACTIVE" });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1/offers/o1:deactivate`);
    expect(init.method).toBe("POST");
  });

  // 10. getSubscriptionV1
  it("getSubscriptionV1 calls GET /{pkg}/purchases/subscriptions/{id}/tokens/{token}", async () => {
    const sub = {
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: "1000",
      expiryTimeMillis: "2000",
    };
    mockFetch.mockResolvedValueOnce(mockResponse(sub));
    const client = makeClient();
    const result = await client.purchases.getSubscriptionV1(PKG, "sub1", "tok999");
    expect(result).toEqual(sub);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/purchases/subscriptions/sub1/tokens/tok999`);
    expect(init.method).toBe("GET");
  });

  // 11a. getOffer
  it("getOffer calls GET .../offers/{id}", async () => {
    const offer = { offerId: "o1", state: "ACTIVE" };
    mockFetch.mockResolvedValueOnce(mockResponse(offer));
    const client = makeClient();
    const result = await client.subscriptions.getOffer(PKG, "sub1", "bp1", "o1");
    expect(result).toEqual(offer);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1/offers/o1`);
    expect(init.method).toBe("GET");
  });

  // 11b. updateOffer with updateMask
  it("updateOffer calls PATCH with updateMask", async () => {
    const offer = { offerId: "o1", state: "ACTIVE" };
    mockFetch.mockResolvedValueOnce(mockResponse(offer));
    const client = makeClient();
    await client.subscriptions.updateOffer(PKG, "sub1", "bp1", "o1", offer as any, "phases");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/offers/o1?updateMask=phases");
    expect(url).toContain("regionsVersion.version=2022%2F02");
    expect(init.method).toBe("PATCH");
  });

  it("updateOffer passes explicit regionsVersion as query param", async () => {
    const offer = { offerId: "o1", state: "ACTIVE" };
    mockFetch.mockResolvedValueOnce(mockResponse(offer));
    const client = makeClient();
    await client.subscriptions.updateOffer(
      PKG,
      "sub1",
      "bp1",
      "o1",
      offer as any,
      undefined,
      "2023.1",
    );
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("regionsVersion.version=2023.1");
  });

  // 11c. deleteOffer
  it("deleteOffer calls DELETE .../offers/{id}", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    await client.subscriptions.deleteOffer(PKG, "sub1", "bp1", "o1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1/offers/o1`);
    expect(init.method).toBe("DELETE");
  });

  // 11d. deleteBasePlan
  it("deleteBasePlan calls DELETE .../basePlans/{id}", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    await client.subscriptions.deleteBasePlan(PKG, "sub1", "bp1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions/sub1/basePlans/bp1`);
    expect(init.method).toBe("DELETE");
  });

  // 12. listVoided with options
  it("listVoided passes startTime, endTime, maxResults, token as query params", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ voidedPurchases: [{ orderId: "o1" }] }));
    const client = makeClient();
    const result = await client.purchases.listVoided(PKG, {
      startTime: "1609459200000",
      endTime: "1612137600000",
      maxResults: 50,
      token: "page2",
    });
    expect(result).toEqual({ voidedPurchases: [{ orderId: "o1" }] });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("startTime=1609459200000");
    expect(url).toContain("endTime=1612137600000");
    expect(url).toContain("maxResults=50");
    expect(url).toContain("token=page2");
  });

  // 13. appRecovery.create
  it("appRecovery.create calls POST /{packageName}/appRecoveries with body", async () => {
    const created = { appRecoveryId: "rec-new", status: "DRAFT" };
    mockFetch.mockResolvedValueOnce(mockResponse(created));
    const client = makeClient();
    const request = { remoteInAppUpdateData: {}, appRecoveryAction: { status: "DRAFT" } };
    const result = await client.appRecovery.create(PKG, request);
    expect(result).toEqual(created);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/appRecoveries`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(request);
  });

  // 14. appRecovery.addTargeting
  it("appRecovery.addTargeting calls POST /{packageName}/appRecoveries/{id}:addTargeting", async () => {
    const updated = {
      appRecoveryId: "rec1",
      targeting: { versionList: { versionCodes: ["100"] } },
    };
    mockFetch.mockResolvedValueOnce(mockResponse(updated));
    const client = makeClient();
    const targeting = { versionList: { versionCodes: ["100"] } };
    const result = await client.appRecovery.addTargeting(PKG, "rec1", targeting);
    expect(result).toEqual(updated);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/appRecoveries/rec1:addTargeting`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(targeting);
  });
});

// ---------------------------------------------------------------------------
// Rate limiter edge cases
// ---------------------------------------------------------------------------

import { createRateLimiter, RATE_LIMIT_BUCKETS } from "../src/rate-limiter";

describe("createRateLimiter", () => {
  it("acquire on unknown bucket resolves immediately", async () => {
    const limiter = createRateLimiter([]);
    // Should not throw or hang
    await limiter.acquire("nonexistent");
  });

  it("acquire without any buckets configured resolves immediately", async () => {
    const limiter = createRateLimiter();
    await limiter.acquire("default");
  });

  it("depletes tokens and waits on exhaustion", async () => {
    const bucket = { name: "tiny", maxTokens: 2, refillRate: 2, refillIntervalMs: 100 };
    const limiter = createRateLimiter([bucket]);

    // First two should be instant
    await limiter.acquire("tiny");
    await limiter.acquire("tiny");

    // Third should wait for refill
    const start = Date.now();
    await limiter.acquire("tiny");
    const elapsed = Date.now() - start;
    // Should have waited approximately 50ms (1/2 * 100ms)
    expect(elapsed).toBeGreaterThanOrEqual(10);
  });

  it("tokens refill over time", async () => {
    const bucket = { name: "refill", maxTokens: 1, refillRate: 1, refillIntervalMs: 50 };
    const limiter = createRateLimiter([bucket]);

    // Consume the single token
    await limiter.acquire("refill");

    // Wait for refill
    await new Promise((r) => setTimeout(r, 60));

    // Should be available now without waiting
    const start = Date.now();
    await limiter.acquire("refill");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(30);
  });

  it("tokens do not exceed maxTokens after long idle", async () => {
    const bucket = { name: "capped", maxTokens: 3, refillRate: 100, refillIntervalMs: 100 };
    const limiter = createRateLimiter([bucket]);

    // Wait a long time (would produce many tokens if uncapped)
    await new Promise((r) => setTimeout(r, 50));

    // Should be able to acquire maxTokens times instantly
    await limiter.acquire("capped");
    await limiter.acquire("capped");
    await limiter.acquire("capped");
    // Fourth should need to wait
    const start = Date.now();
    await limiter.acquire("capped");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("RATE_LIMIT_BUCKETS has expected bucket names", () => {
    expect(RATE_LIMIT_BUCKETS).toHaveProperty("default");
    expect(RATE_LIMIT_BUCKETS).toHaveProperty("reviewsGet");
    expect(RATE_LIMIT_BUCKETS).toHaveProperty("reviewsPost");
    expect(RATE_LIMIT_BUCKETS).toHaveProperty("voidedBurst");
    expect(RATE_LIMIT_BUCKETS).toHaveProperty("voidedDaily");
  });
});

// ---------------------------------------------------------------------------
// Error handling edge cases
// ---------------------------------------------------------------------------
describe("PlayApiError – edge cases", () => {
  it("PlayApiError without statusCode has undefined statusCode", () => {
    const err = new PlayApiError("generic error", "GENERIC");
    expect(err.statusCode).toBeUndefined();
    expect(err.suggestion).toBeUndefined();
    expect(err.exitCode).toBe(4);
  });

  it("PlayApiError without suggestion has undefined suggestion", () => {
    const err = new PlayApiError("no suggestion", "NO_SUGGEST", 500);
    expect(err.suggestion).toBeUndefined();
  });

  it("PlayApiError toJSON omits suggestion when not provided", () => {
    const err = new PlayApiError("test", "TEST_CODE", 400);
    const json = err.toJSON();
    expect(json.error.suggestion).toBeUndefined();
  });

  it("PlayApiError is instanceof Error", () => {
    const err = new PlayApiError("test", "T", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PlayApiError");
  });

  it("PlayApiError preserves stack trace", () => {
    const err = new PlayApiError("trace test", "TRACE", 500);
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("trace test");
  });
});

// ---------------------------------------------------------------------------
// HTTP error response edge cases
// ---------------------------------------------------------------------------
describe("HTTP error response edge cases", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles non-JSON error response body", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Internal Server Error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });
    try {
      await client.get("/com.example/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).statusCode).toBe(500);
      expect((err as PlayApiError).code).toBe("API_SERVER_ERROR");
    }
  });

  it("handles empty error response body", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });
    try {
      await client.get("/com.example/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).statusCode).toBe(400);
    }
  });

  it("handles network error when fetch throws TypeError", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });
    try {
      await client.get("/com.example/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).code).toBe("API_NETWORK_ERROR");
      expect((err as PlayApiError).message).toContain("Failed to fetch");
    }
  });

  it("429 response triggers retries and eventually throws API_RATE_LIMITED", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: "rate limited" }, 429))
      .mockResolvedValueOnce(mockResponse({ error: "rate limited" }, 429));

    const client = createHttpClient({
      auth: mockAuth(),
      maxRetries: 1,
      baseDelay: 1,
      maxDelay: 5,
    });

    try {
      await client.get("/com.example/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).code).toBe("API_RATE_LIMITED");
      expect((err as PlayApiError).statusCode).toBe(429);
    }
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("handles JSON error response with error.message field", async () => {
    const errorBody = {
      error: {
        code: 403,
        message: "The caller does not have permission",
        status: "PERMISSION_DENIED",
      },
    };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createHttpClient({ auth: mockAuth(), maxRetries: 0 });
    try {
      await client.get("/com.example/edits");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlayApiError);
      expect((err as PlayApiError).code).toBe("API_INSUFFICIENT_PERMISSIONS");
      expect((err as PlayApiError).statusCode).toBe(403);
      expect((err as PlayApiError).suggestion).toContain("Users and permissions");
    }
  });
});

// ---------------------------------------------------------------------------
// One-Time Products (OTP)
// ---------------------------------------------------------------------------
describe("oneTimeProducts", () => {
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

  it("list calls GET /{pkg}/oneTimeProducts", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ oneTimeProducts: [] }));
    const client = makeClient();
    const result = await client.oneTimeProducts.list(PKG);
    expect(result).toEqual({ oneTimeProducts: [] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/oneTimeProducts`);
    expect(init.method).toBe("GET");
  });

  it("get calls GET /{pkg}/oneTimeProducts/{id}", async () => {
    const product = { productId: "otp1", packageName: PKG };
    mockFetch.mockResolvedValueOnce(mockResponse(product));
    const client = makeClient();
    const result = await client.oneTimeProducts.get(PKG, "otp1");
    expect(result).toEqual(product);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/oneTimeProducts/otp1`);
  });

  it("create calls POST /{pkg}/oneTimeProducts with regionsVersion", async () => {
    const product = { productId: "otp1", packageName: PKG };
    mockFetch.mockResolvedValueOnce(mockResponse(product));
    const client = makeClient();
    const result = await client.oneTimeProducts.create(PKG, product as any);
    expect(result).toEqual(product);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain(`${BASE_URL}/${PKG}/oneTimeProducts`);
    expect(url).toContain("regionsVersion.version=2022%2F02");
    expect(init.method).toBe("POST");
  });

  it("update calls PATCH /{pkg}/oneTimeProducts/{id} with regionsVersion", async () => {
    const product = { productId: "otp1", packageName: PKG };
    mockFetch.mockResolvedValueOnce(mockResponse(product));
    const client = makeClient();
    await client.oneTimeProducts.update(PKG, "otp1", product as any);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain(`${BASE_URL}/${PKG}/oneTimeProducts/otp1`);
    expect(url).toContain("regionsVersion.version=2022%2F02");
    expect(init.method).toBe("PATCH");
  });

  it("update passes updateMask when provided", async () => {
    const product = { productId: "otp1", packageName: PKG };
    mockFetch.mockResolvedValueOnce(mockResponse(product));
    const client = makeClient();
    await client.oneTimeProducts.update(PKG, "otp1", product as any, "listings");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("updateMask=listings");
  });

  it("updateOffer passes regionsVersion and updateMask", async () => {
    const offer = { productId: "otp1", offerId: "offer1" };
    mockFetch.mockResolvedValueOnce(mockResponse(offer));
    const client = makeClient();
    await client.oneTimeProducts.updateOffer(PKG, "otp1", "offer1", offer as any, "pricing");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("updateMask=pricing");
    expect(url).toContain("regionsVersion.version=2022%2F02");
    expect(init.method).toBe("PATCH");
  });

  it("delete calls DELETE /{pkg}/oneTimeProducts/{id}", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    await client.oneTimeProducts.delete(PKG, "otp1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/oneTimeProducts/otp1`);
    expect(init.method).toBe("DELETE");
  });

  it("listOffers calls GET /{pkg}/oneTimeProducts/{id}/offers", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ oneTimeOffers: [] }));
    const client = makeClient();
    const result = await client.oneTimeProducts.listOffers(PKG, "otp1");
    expect(result).toEqual({ oneTimeOffers: [] });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/oneTimeProducts/otp1/offers`);
  });

  it("createOffer calls POST /{pkg}/oneTimeProducts/{id}/offers", async () => {
    const offer = { productId: "otp1", offerId: "offer1" };
    mockFetch.mockResolvedValueOnce(mockResponse(offer));
    const client = makeClient();
    await client.oneTimeProducts.createOffer(PKG, "otp1", offer as any);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/oneTimeProducts/otp1/offers`);
    expect(init.method).toBe("POST");
  });

  it("deleteOffer calls DELETE /{pkg}/oneTimeProducts/{id}/offers/{offerId}", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    await client.oneTimeProducts.deleteOffer(PKG, "otp1", "offer1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/oneTimeProducts/otp1/offers/offer1`);
    expect(init.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// Internal App Sharing
// ---------------------------------------------------------------------------
const INTERNAL_UPLOAD_BASE =
  "https://androidpublisher.googleapis.com/upload/internalappsharing/v3/applications";

describe("internalAppSharing", () => {
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

  it("uploadBundle calls POST to internal sharing bundle endpoint", async () => {
    const artifact = {
      certificateFingerprint: "AA:BB:CC",
      downloadUrl: "https://play.google.com/apps/test/com.example.app/1",
      sha256: "abc123",
    };
    mockFetch.mockResolvedValueOnce(mockResponse(artifact));
    const client = makeClient();
    const result = await client.internalAppSharing.uploadBundle(PKG, "/path/to/app.aab");
    expect(result).toEqual(artifact);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${INTERNAL_UPLOAD_BASE}/${PKG}/artifacts/bundle`);
    expect(init.method).toBe("POST");
  });

  it("uploadApk calls POST to internal sharing APK endpoint", async () => {
    const artifact = {
      certificateFingerprint: "DD:EE:FF",
      downloadUrl: "https://play.google.com/apps/test/com.example.app/2",
      sha256: "def456",
    };
    mockFetch.mockResolvedValueOnce(mockResponse(artifact));
    const client = makeClient();
    const result = await client.internalAppSharing.uploadApk(PKG, "/path/to/app.apk");
    expect(result).toEqual(artifact);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${INTERNAL_UPLOAD_BASE}/${PKG}/artifacts/apk`);
    expect(init.method).toBe("POST");
  });

  it("uploadBundle sends application/octet-stream content type", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ certificateFingerprint: "", downloadUrl: "", sha256: "" }),
    );
    const client = makeClient();
    await client.internalAppSharing.uploadBundle(PKG, "/path/to/app.aab");
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/octet-stream");
  });
});

// ---------------------------------------------------------------------------
// Generated APKs
// ---------------------------------------------------------------------------
describe("generatedApks", () => {
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

  it("list calls GET /{pkg}/generatedApks/{versionCode}", async () => {
    const apks = [
      {
        generatedApkId: "apk-1",
        variantId: 1,
        moduleName: "base",
        certificateSha256Fingerprint: "AA",
      },
    ];
    mockFetch.mockResolvedValueOnce(mockResponse({ generatedApks: apks }));
    const client = makeClient();
    const result = await client.generatedApks.list(PKG, 42);
    expect(result).toEqual(apks);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/generatedApks/42`);
    expect(init.method).toBe("GET");
  });

  it("list returns empty array when generatedApks is absent", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    const result = await client.generatedApks.list(PKG, 100);
    expect(result).toEqual([]);
  });

  it("download calls GET /{pkg}/generatedApks/{versionCode}/download/{id}", async () => {
    const buffer = new ArrayBuffer(512);
    mockFetch.mockResolvedValueOnce(
      new Response(buffer, {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );
    const client = makeClient();
    const result = await client.generatedApks.download(PKG, 42, "apk-1");
    expect(result).toBeInstanceOf(ArrayBuffer);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/generatedApks/42/download/apk-1`);
    expect(init.method).toBe("GET");
  });
});

// ---------------------------------------------------------------------------
// Purchase Options
// ---------------------------------------------------------------------------
describe("purchaseOptions", () => {
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

  it("list calls GET /{pkg}/purchaseOptions", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ purchaseOptions: [] }));
    const client = makeClient();
    const result = await client.purchaseOptions.list(PKG);
    expect(result).toEqual({ purchaseOptions: [] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/purchaseOptions`);
    expect(init.method).toBe("GET");
  });

  it("get calls GET /{pkg}/purchaseOptions/{id}", async () => {
    const option = { purchaseOptionId: "po-1", packageName: PKG, productId: "prod1" };
    mockFetch.mockResolvedValueOnce(mockResponse(option));
    const client = makeClient();
    const result = await client.purchaseOptions.get(PKG, "po-1");
    expect(result).toEqual(option);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/purchaseOptions/po-1`);
  });

  it("create calls POST /{pkg}/purchaseOptions", async () => {
    const option = { purchaseOptionId: "po-1", packageName: PKG, productId: "prod1" };
    mockFetch.mockResolvedValueOnce(mockResponse(option));
    const client = makeClient();
    await client.purchaseOptions.create(PKG, option as any);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/purchaseOptions`);
    expect(init.method).toBe("POST");
  });

  it("activate calls POST /{pkg}/purchaseOptions/{id}:activate", async () => {
    const option = { purchaseOptionId: "po-1", packageName: PKG, productId: "prod1" };
    mockFetch.mockResolvedValueOnce(mockResponse(option));
    const client = makeClient();
    await client.purchaseOptions.activate(PKG, "po-1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/purchaseOptions/po-1:activate`);
    expect(init.method).toBe("POST");
  });

  it("deactivate calls POST /{pkg}/purchaseOptions/{id}:deactivate", async () => {
    const option = { purchaseOptionId: "po-1", packageName: PKG, productId: "prod1" };
    mockFetch.mockResolvedValueOnce(mockResponse(option));
    const client = makeClient();
    await client.purchaseOptions.deactivate(PKG, "po-1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/purchaseOptions/po-1:deactivate`);
    expect(init.method).toBe("POST");
  });
});

// ---------------------------------------------------------------------------
// IAP Batch Operations
// ---------------------------------------------------------------------------
describe("inappproducts batch", () => {
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

  it("batchUpdate calls POST /{pkg}/inappproducts:batchUpdate", async () => {
    const response = { inappproducts: [{ sku: "coins100" }] };
    mockFetch.mockResolvedValueOnce(mockResponse(response));
    const client = makeClient();
    const result = await client.inappproducts.batchUpdate(PKG, {
      requests: [{ inappproduct: { sku: "coins100" } as any, packageName: PKG, sku: "coins100" }],
    });
    expect(result).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/inappproducts:batchUpdate`);
    expect(init.method).toBe("POST");
  });

  it("batchGet calls GET /{pkg}/inappproducts:batchGet", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ inappproduct: [{ sku: "coins100" }] }));
    const client = makeClient();
    const result = await client.inappproducts.batchGet(PKG, ["coins100"]);
    expect(result).toEqual([{ sku: "coins100" }]);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain(`${BASE_URL}/${PKG}/inappproducts:batchGet`);
    expect(init.method).toBe("GET");
  });

  it("batchGet returns empty array when no products", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const client = makeClient();
    const result = await client.inappproducts.batchGet(PKG, ["coins100"]);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Track create
// ---------------------------------------------------------------------------
describe("tracks.create", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const PKG = "com.example.app";
  const EDIT_ID = "edit-abc";

  function makeClient() {
    return createApiClient({ auth: mockAuth(), maxRetries: 0 });
  }

  it("tracks.create calls POST /{pkg}/edits/{editId}/tracks with track name", async () => {
    const track = { track: "my-qa-track", releases: [] };
    mockFetch.mockResolvedValueOnce(mockResponse(track));
    const client = makeClient();
    const result = await client.tracks.create(PKG, EDIT_ID, "my-qa-track");
    expect(result).toEqual(track);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/tracks`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ track: "my-qa-track" });
  });
});

// ---------------------------------------------------------------------------
// Externally hosted APKs
// ---------------------------------------------------------------------------
describe("apks.addExternallyHosted", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const PKG = "com.example.app";
  const EDIT_ID = "edit-abc";

  function makeClient() {
    return createApiClient({ auth: mockAuth(), maxRetries: 0 });
  }

  it("addExternallyHosted calls POST /{pkg}/edits/{editId}/apks/externallyHosted", async () => {
    const apkData = {
      applicationLabel: "Test",
      externallyHostedUrl: "https://cdn.example.com/app.apk",
      fileSha256Base64: "abc",
      fileSize: "1024",
      certificateBase64s: ["cert"],
      minimumSdk: 21,
      packageName: PKG,
      versionCode: 1,
      versionName: "1.0",
    };
    const responseData = { externallyHostedApk: apkData };
    mockFetch.mockResolvedValueOnce(mockResponse(responseData));
    const client = makeClient();
    const result = await client.apks.addExternallyHosted(PKG, EDIT_ID, apkData);
    expect(result).toEqual(responseData);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/apks/externallyHosted`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ externallyHostedApk: apkData });
  });
});

// ---------------------------------------------------------------------------
// tracks.patch
// ---------------------------------------------------------------------------
describe("tracks.patch", () => {
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

  it("tracks.patch calls PATCH /{pkg}/edits/{editId}/tracks/{track} with track+releases body", async () => {
    const release = { status: "inProgress", versionCodes: ["20"], userFraction: 0.1 };
    const trackResponse = { track: "production", releases: [release] };
    mockFetch.mockResolvedValueOnce(mockResponse(trackResponse));

    const client = makeClient();
    const result = await client.tracks.patch(PKG, EDIT_ID, "production", release as any);

    expect(result).toEqual(trackResponse);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/edits/${EDIT_ID}/tracks/production`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      track: "production",
      releases: [release],
    });
  });
});

// ---------------------------------------------------------------------------
// releases.list
// ---------------------------------------------------------------------------
describe("releases.list", () => {
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

  it("releases.list calls GET /{pkg}/tracks/{track}/releases", async () => {
    const releases = [
      { name: "1.0", versionCodes: ["1"], status: "completed" },
      { name: "2.0", versionCodes: ["2"], status: "draft" },
    ];
    mockFetch.mockResolvedValueOnce(mockResponse({ releases }));

    const client = makeClient();
    const result = await client.releases.list(PKG, "production");

    expect(result).toEqual(releases);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/tracks/production/releases`);
    expect(init.method).toBe("GET");
  });

  it("releases.list returns empty array when no releases", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = makeClient();
    const result = await client.releases.list(PKG, "beta");

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// subscriptions.batchGet
// ---------------------------------------------------------------------------
describe("subscriptions.batchGet", () => {
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

  it("subscriptions.batchGet calls GET /{pkg}/subscriptions:batchGet with productIds query params", async () => {
    const subscriptions = [{ productId: "sub_monthly" }, { productId: "sub_yearly" }];
    mockFetch.mockResolvedValueOnce(mockResponse({ subscriptions }));

    const client = makeClient();
    const result = await client.subscriptions.batchGet(PKG, ["sub_monthly", "sub_yearly"]);

    expect(result).toEqual(subscriptions);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      `${BASE_URL}/${PKG}/subscriptions:batchGet?productIds=sub_monthly&productIds=sub_yearly`,
    );
    expect(init.method).toBe("GET");
  });

  it("subscriptions.batchGet returns empty array when no subscriptions", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = makeClient();
    const result = await client.subscriptions.batchGet(PKG, ["sub_monthly"]);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// subscriptions.batchUpdate
// ---------------------------------------------------------------------------
describe("subscriptions.batchUpdate", () => {
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

  it("subscriptions.batchUpdate calls POST /{pkg}/subscriptions:batchUpdate with body", async () => {
    const requestBody = {
      requests: [
        {
          subscription: { productId: "sub_monthly" },
          updateMask: "listings",
          regionsVersion: { version: "2022/02" },
        },
      ],
    };
    const response = {
      subscriptions: [{ productId: "sub_monthly" }],
    };
    mockFetch.mockResolvedValueOnce(mockResponse(response));

    const client = makeClient();
    const result = await client.subscriptions.batchUpdate(PKG, requestBody as any);

    expect(result).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/subscriptions:batchUpdate`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(requestBody);
  });
});

// ---------------------------------------------------------------------------
// purchases.acknowledgeSubscription
// ---------------------------------------------------------------------------
describe("purchases.acknowledgeSubscription", () => {
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

  it("purchases.acknowledgeSubscription calls POST /{pkg}/purchases/subscriptions/{subId}/tokens/{token}:acknowledge", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = makeClient();
    await client.purchases.acknowledgeSubscription(PKG, "sub_monthly", "purchase-token-abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      `${BASE_URL}/${PKG}/purchases/subscriptions/sub_monthly/tokens/purchase-token-abc:acknowledge`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// inappproducts.batchDelete
// ---------------------------------------------------------------------------
describe("inappproducts.batchDelete", () => {
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

  it("inappproducts.batchDelete calls POST /{pkg}/inappproducts:batchDelete with sku requests", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = makeClient();
    await client.inappproducts.batchDelete(PKG, ["coins100", "gems500"]);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/inappproducts:batchDelete`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      requests: [
        { packageName: PKG, sku: "coins100" },
        { packageName: PKG, sku: "gems500" },
      ],
    });
  });
});
