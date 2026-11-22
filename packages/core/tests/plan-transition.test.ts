import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiClient, PlayApiError } from "@gpc-cli/api";
import { cancelPlanTransition } from "../src/index.js";

// Driven through the real api client with a stubbed fetch. Request shape from
// discovery rev 20261119 (CancelPlanTransitionRequest: productId required, etag
// optional; empty response). Google documents no errors for this method, so the
// error bodies here are invented; replace them with real ones from the T11 smoke.

const PKG = "com.example.app";
const ETAG = "CgQIARAB";

function googleError(code: number, status: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, status, message } }), {
    status: code,
    headers: { "Content-Type": "application/json" },
  });
}

const mockFetch = vi.fn();

function client() {
  return createApiClient({
    auth: { getAccessToken: vi.fn().mockResolvedValue("t") } as never,
    maxRetries: 0,
  });
}

async function caught(p: Promise<unknown>): Promise<PlayApiError> {
  try {
    await p;
  } catch (e) {
    return e as PlayApiError;
  }
  throw new Error("expected a rejection");
}

describe("cancelPlanTransition", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it("sends the product id and no etag key when none is passed", async () => {
    await expect(cancelPlanTransition(client(), PKG, "tok", " premium ")).resolves.toBeUndefined();
    expect(String(mockFetch.mock.calls[0][0])).toMatch(/tokens\/tok:cancelPlanTransition$/);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ productId: "premium" });
  });

  it("sends the etag when one is passed", async () => {
    await cancelPlanTransition(client(), PKG, "tok", "premium", ETAG);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      productId: "premium",
      etag: ETAG,
    });
  });

  it("refuses a blank product id or etag before calling Google", async () => {
    const err = await caught(cancelPlanTransition(client(), PKG, "tok", "  "));
    expect(err.code).toBe("PRODUCT_ID_REQUIRED");
    expect((err as unknown as { exitCode: number }).exitCode).toBe(2);
    const err2 = await caught(cancelPlanTransition(client(), PKG, "tok", "premium", " "));
    expect(err2.code).toBe("SUBSCRIPTION_ETAG_BLANK");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("maps a stale-etag rejection to SUBSCRIPTION_ETAG_MISMATCH", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(409, "ABORTED", "The provided etag does not match the current state."),
    );
    const err = await caught(cancelPlanTransition(client(), PKG, "tok", "premium", ETAG));
    expect(err.code).toBe("SUBSCRIPTION_ETAG_MISMATCH");
  });

  it("passes any other Google error through with Google's message", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(400, "FAILED_PRECONDITION", "No plan transition is in progress."),
    );
    const err = await caught(cancelPlanTransition(client(), PKG, "tok", "premium"));
    expect(err).toBeInstanceOf(PlayApiError);
    expect(err.code).not.toBe("SUBSCRIPTION_ETAG_MISMATCH");
    expect(`${err.message} ${err.details ?? ""}`).toContain("No plan transition is in progress.");
  });
});
