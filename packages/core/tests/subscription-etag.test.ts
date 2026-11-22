import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiClient, PlayApiError } from "@gpc-cli/api";
import { cancelSubscriptionV2, revokeSubscriptionPurchase } from "../src/index.js";

// Driven through the real api client with a stubbed fetch. The etag field and
// its "only proceeds if it matches the current server state" contract come from
// discovery rev 20261119 (CancellationContext.etag, RevocationContext.etag).
// Google documents no status or message for a mismatch, so these bodies are
// invented; the mapping applies only when an etag was sent. Replace them with
// real bodies from the T11 live smoke.

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

function sentBody(): Record<string, Record<string, unknown>> {
  return JSON.parse(mockFetch.mock.calls[0][1].body);
}

describe("etag guard on cancel-v2 and revoke", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it("cancel sends no etag key when none is passed", async () => {
    await cancelSubscriptionV2(client(), PKG, "tok");
    expect(sentBody().cancellationContext).toEqual({
      cancellationType: "USER_REQUESTED_STOP_RENEWALS",
    });
  });

  it("cancel sends the etag inside cancellationContext", async () => {
    await cancelSubscriptionV2(client(), PKG, "tok", "DEVELOPER_REQUESTED_STOP_PAYMENTS", ETAG);
    expect(sentBody().cancellationContext).toEqual({
      cancellationType: "DEVELOPER_REQUESTED_STOP_PAYMENTS",
      etag: ETAG,
    });
  });

  it("revoke sends no etag key when none is passed", async () => {
    await revokeSubscriptionPurchase(client(), PKG, "tok", "full");
    expect(sentBody().revocationContext).toEqual({ fullRefund: {} });
  });

  it("revoke sends the etag inside revocationContext", async () => {
    await revokeSubscriptionPurchase(client(), PKG, "tok", "prorated", undefined, ETAG);
    expect(sentBody().revocationContext).toEqual({ proratedRefund: {}, etag: ETAG });
  });

  it("a blank etag is a usage error and nothing is sent", async () => {
    const err = await caught(cancelSubscriptionV2(client(), PKG, "tok", undefined, "  "));
    expect(err.code).toBe("SUBSCRIPTION_ETAG_BLANK");
    expect((err as unknown as { exitCode: number }).exitCode).toBe(2);
    expect(err.suggestion).toMatch(/subscription get/);
    const err2 = await caught(
      revokeSubscriptionPurchase(client(), PKG, "tok", "full", undefined, ""),
    );
    expect(err2.code).toBe("SUBSCRIPTION_ETAG_BLANK");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("maps a stale-etag rejection to SUBSCRIPTION_ETAG_MISMATCH", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(
        409,
        "ABORTED",
        "The provided etag does not match the current subscription state.",
      ),
    );
    const err = await caught(cancelSubscriptionV2(client(), PKG, "tok", undefined, ETAG));
    expect(err).toBeInstanceOf(PlayApiError);
    expect(err.code).toBe("SUBSCRIPTION_ETAG_MISMATCH");
    expect(err.exitCode).toBe(4);
    expect(err.suggestion).toMatch(/gpc purchases subscription get/);
    expect(err.details).toContain("etag does not match");
  });

  it("maps a 400 that names the etag on revoke too", async () => {
    mockFetch.mockResolvedValueOnce(googleError(400, "FAILED_PRECONDITION", "Etag mismatch."));
    const err = await caught(
      revokeSubscriptionPurchase(client(), PKG, "tok", "full", undefined, ETAG),
    );
    expect(err.code).toBe("SUBSCRIPTION_ETAG_MISMATCH");
  });

  it("maps a bare 412 when an etag was sent", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(412, "FAILED_PRECONDITION", "Precondition failed."),
    );
    const err = await caught(cancelSubscriptionV2(client(), PKG, "tok", undefined, ETAG));
    expect(err.code).toBe("SUBSCRIPTION_ETAG_MISMATCH");
  });

  it("maps a 400 ABORTED even when Google's text does not name the etag", async () => {
    mockFetch.mockResolvedValueOnce(googleError(400, "ABORTED", "Subscription state has changed."));
    const err = await caught(cancelSubscriptionV2(client(), PKG, "tok", undefined, ETAG));
    expect(err.code).toBe("SUBSCRIPTION_ETAG_MISMATCH");
  });

  it("a malformed etag (400 INVALID_ARGUMENT) keeps Google's error, not a mismatch", async () => {
    mockFetch.mockResolvedValueOnce(googleError(400, "INVALID_ARGUMENT", "Invalid etag."));
    const err = await caught(cancelSubscriptionV2(client(), PKG, "tok", undefined, '"CgQIARAB"'));
    expect(err.code).toBe("API_HTTP_400");
    expect(err.message).toContain("Invalid etag");
  });

  it("the mismatch message does not claim nothing happened (a timed-out retry may have applied)", async () => {
    mockFetch.mockResolvedValueOnce(googleError(409, "ABORTED", "Conflict."));
    const err = await caught(cancelSubscriptionV2(client(), PKG, "tok", undefined, ETAG));
    expect(err.suggestion).toMatch(/may already have been applied/);
    expect(err.message).not.toMatch(/did not apply|nothing was/i);
  });

  it("never claims an etag mismatch when no etag was sent", async () => {
    mockFetch.mockResolvedValueOnce(googleError(400, "FAILED_PRECONDITION", "Etag mismatch."));
    const err = await caught(cancelSubscriptionV2(client(), PKG, "tok"));
    expect(err.code).not.toBe("SUBSCRIPTION_ETAG_MISMATCH");
  });

  it("passes an unrelated 400 through unchanged even with an etag", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(400, "INVALID_ARGUMENT", "The subscription has already expired."),
    );
    const err = await caught(cancelSubscriptionV2(client(), PKG, "tok", undefined, ETAG));
    expect(err.code).toBe("API_HTTP_400");
  });
});
