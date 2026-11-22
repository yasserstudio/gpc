import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiClient, PlayApiError } from "@gpc-cli/api";
import { targetSubscriptionOffer, untargetSubscriptionOffer } from "../src/index.js";

// Driven through the real api client with a stubbed fetch, so the errors these
// functions translate have exactly the shape http.ts produces. Error bodies use
// Google's error envelope; the statuses and conditions come from the
// retention-offers guide ("Handle targeting errors"). Google does not document
// the message text and publishes no error bodies. One body is real: the bad
// token case, copied from the v1.2.0 live smoke (2026-11-22). The offer errors
// still need a real purchase token to capture, so their messages are invented;
// the mapping keys on the status plus a narrow keyword, and anything else must
// pass through.

const PKG = "com.example.app";
const OFFER = "retention-peruser-30off";

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

describe("targetSubscriptionOffer / untargetSubscriptionOffer", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it("targets the offer and resolves on Google's 204", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(targetSubscriptionOffer(client(), PKG, "tok", OFFER)).resolves.toBeUndefined();
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ offerId: OFFER });
  });

  it("untargets the offer and resolves on Google's 204", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(untargetSubscriptionOffer(client(), PKG, "tok", OFFER)).resolves.toBeUndefined();
    expect(String(mockFetch.mock.calls[0][0])).toMatch(/:deactivateOfferTargeting$/);
  });

  it("rejects a blank offer id before calling Google", async () => {
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", "  "));
    expect(err.code).toBe("OFFER_ID_REQUIRED");
    expect((err as unknown as { exitCode: number }).exitCode).toBe(2);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid package name before calling Google", async () => {
    await expect(
      targetSubscriptionOffer(client(), "not a package", "tok", OFFER),
    ).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("maps FAILED_PRECONDITION on a non-per-user offer to OFFER_NOT_PER_USER", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(400, "FAILED_PRECONDITION", "Offer targeting is not retentionPerUserRule."),
    );
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err).toBeInstanceOf(PlayApiError);
    expect(err.code).toBe("OFFER_NOT_PER_USER");
    expect(err.exitCode).toBe(4);
    expect(err.message).toContain(OFFER);
    expect(err.suggestion).toMatch(/retentionPerUserRule/);
    expect(err.details).toContain("not retentionPerUserRule");
  });

  it("maps FAILED_PRECONDITION on an expired subscription to SUBSCRIPTION_EXPIRED", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(400, "FAILED_PRECONDITION", "The subscription has already expired."),
    );
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("SUBSCRIPTION_EXPIRED");
    expect(err.suggestion).toMatch(/subscription get/);
    expect(err.details).toContain("already expired");
  });

  it("does not blame the subscription when the sentence names both and the offer expired", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(
        400,
        "FAILED_PRECONDITION",
        "Offer cannot be targeted at this subscription: the offer has expired.",
      ),
    );
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).not.toBe("SUBSCRIPTION_EXPIRED");
  });

  it("does not blame the subscription when Google says the offer has expired", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(400, "FAILED_PRECONDITION", "The offer has expired."),
    );
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).not.toBe("SUBSCRIPTION_EXPIRED");
    expect(err.message).toContain("The offer has expired.");
  });

  it("maps INVALID_ARGUMENT to OFFER_NEVER_ACTIVATED, naming both of Google's causes", async () => {
    mockFetch.mockResolvedValueOnce(googleError(400, "INVALID_ARGUMENT", "Invalid offer id."));
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("OFFER_NEVER_ACTIVATED");
    expect(err.message).toMatch(/base plan/);
    expect(err.message).toMatch(/never been activated/);
    expect(err.suggestion).toMatch(/offers activate/);
  });

  it("keeps the not-found code on 404 and points at the purchase token", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(404, "NOT_FOUND", "The purchase token was not found."),
    );
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("API_NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.suggestion).toMatch(/purchase token/);
    expect(err.suggestion).toMatch(/offer ID/);
  });

  it("leaves an app-not-found 404 alone (the token is not the problem)", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(404, "NOT_FOUND", "No application was found for the given package name."),
    );
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("API_APP_NOT_FOUND");
    expect(err.suggestion ?? "").not.toMatch(/purchase token/);
  });

  it("passes an unrecognised FAILED_PRECONDITION through unchanged", async () => {
    mockFetch.mockResolvedValueOnce(googleError(400, "FAILED_PRECONDITION", "Something new."));
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("API_HTTP_400");
    expect(err.message).toContain("Something new.");
  });

  it("passes Google's bad-token answer through (it does not blame the offer)", async () => {
    // Real body for an unknown token, on both target and untarget.
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 400,
            message: "Invalid Value",
            errors: [{ message: "Invalid Value", domain: "global", reason: "invalid" }],
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("API_HTTP_400");
  });

  it("does not read every 'targeting' precondition as a non-per-user offer", async () => {
    mockFetch.mockResolvedValueOnce(
      googleError(400, "FAILED_PRECONDITION", "Offer targeting is not allowed right now."),
    );
    const err = await caught(targetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("API_HTTP_400");
  });

  it("does not apply activate-only mappings to untarget", async () => {
    mockFetch.mockResolvedValueOnce(googleError(400, "INVALID_ARGUMENT", "Invalid offer id."));
    const err = await caught(untargetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("API_HTTP_400");
  });

  it("maps 404 on untarget to the not-found code with the token suggestion", async () => {
    mockFetch.mockResolvedValueOnce(googleError(404, "NOT_FOUND", "Not found."));
    const err = await caught(untargetSubscriptionOffer(client(), PKG, "tok", OFFER));
    expect(err.code).toBe("API_NOT_FOUND");
    expect(err.suggestion).toMatch(/purchase token/);
  });
});
