import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PlayApiError } from "../src/errors";
import { createGamesConfigClient } from "../src/games-config-client";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-icon-bytes")),
  stat: vi.fn().mockResolvedValue({ size: 1024 }),
}));

const UPLOAD_BASE_URL = "https://gamesconfiguration.googleapis.com/upload/games/v1configuration";

function mockAuth() {
  return { getAccessToken: vi.fn().mockResolvedValue("test-token") };
}

function client() {
  return createGamesConfigClient({ auth: mockAuth(), maxRetries: 0 });
}

describe("games config images.upload", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads to the games config upload endpoint on success", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ kind: "gamesConfiguration#imageConfiguration" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await client().images.upload(
      "CgkI123",
      "ACHIEVEMENT_ICON",
      "/tmp/icon.png",
      "image/png",
    );

    expect(result).toEqual({ kind: "gamesConfiguration#imageConfiguration" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`${UPLOAD_BASE_URL}/images/CgkI123/imageType/ACHIEVEMENT_ICON`);
  });

  it("maps a route-level 404 to API_ENDPOINT_RETIRED", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 404, status: "NOT_FOUND", message: "Method not found." } }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    const err = await client()
      .images.upload("CgkI123", "ACHIEVEMENT_ICON", "/tmp/icon.png", "image/png")
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(PlayApiError);
    const apiErr = err as PlayApiError;
    expect(apiErr.code).toBe("API_ENDPOINT_RETIRED");
    expect(apiErr.message).toContain("imageConfigurations");
    expect(apiErr.suggestion).toContain("Play Console");
    expect(apiErr.statusCode).toBe(404);
    // Google's own words survive the translation.
    expect(apiErr.message).toContain("Method not found.");
  });

  it("maps an HTML route-not-found body to API_ENDPOINT_RETIRED", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        "<html><body><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p></body></html>",
        { status: 400, headers: { "Content-Type": "text/html" } },
      ),
    );

    const err = await client()
      .images.upload("CgkI123", "LEADERBOARD_ICON", "/tmp/icon.png", "image/png")
      .catch((e: unknown) => e);

    expect((err as PlayApiError).code).toBe("API_ENDPOINT_RETIRED");
  });

  it("leaves an entity-level 404 unmapped", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 404,
            status: "NOT_FOUND",
            message: "Requested entity was not found for achievement id CgkI123.",
          },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    const err = await client()
      .images.upload("CgkI123", "ACHIEVEMENT_ICON", "/tmp/icon.png", "image/png")
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(PlayApiError);
    const apiErr = err as PlayApiError;
    expect(apiErr.code).not.toBe("API_ENDPOINT_RETIRED");
    expect(apiErr.message).toContain("for achievement id");
  });

  it("leaves unrelated failures alone", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 403, status: "PERMISSION_DENIED", message: "The caller does not have" },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    const err = await client()
      .images.upload("CgkI123", "ACHIEVEMENT_ICON", "/tmp/icon.png", "image/png")
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(PlayApiError);
    expect((err as PlayApiError).code).not.toBe("API_ENDPOINT_RETIRED");
  });
});
