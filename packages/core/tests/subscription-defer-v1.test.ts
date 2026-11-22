import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiClient } from "@gpc-cli/api";
import { deferSubscriptionPurchase } from "../src/index.js";

// Driven through the real api client with a stubbed fetch. Google's "Deprecated
// APIs" page (read 2026-11-22): v1 subscriptions.get shuts down Aug 31 2027,
// v1 subscriptions.defer on Aug 31 2028. v1 defer must therefore read the
// current expiry through v2 get, or it dies a year before its own shutdown.

const PKG = "com.example.app";
const SUB = "premium_monthly";
const TOKEN = "tok-1";
const EXPIRY = "2026-12-01T10:00:00.123Z";

const mockFetch = vi.fn();

function client() {
  return createApiClient({
    auth: { getAccessToken: vi.fn().mockResolvedValue("t") } as never,
    maxRetries: 0,
  });
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function urls(): string[] {
  return mockFetch.mock.calls.map((c) => String(c[0]));
}

describe("v1 subscription defer reads the expiry through v2 get", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockImplementation(async (url: string) => {
      if (String(url).includes("/subscriptionsv2/tokens/")) {
        return json({
          lineItems: [
            { productId: "other_sub", expiryTime: "2030-01-01T00:00:00Z" },
            { productId: SUB, expiryTime: EXPIRY },
          ],
        });
      }
      return json({ newExpiryTimeMillis: "1767225600000" });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it("sends the matching line item's expiry and never calls v1 get", async () => {
    const result = await deferSubscriptionPurchase(
      client(),
      PKG,
      SUB,
      TOKEN,
      "2027-01-01T00:00:00Z",
    );
    expect(result.newExpiryTimeMillis).toBe("1767225600000");

    const called = urls();
    expect(called.some((u) => u.includes(`/purchases/subscriptionsv2/tokens/${TOKEN}`))).toBe(true);
    const v1 = called.filter((u) => u.includes(`/purchases/subscriptions/${SUB}/tokens/`));
    expect(v1).toHaveLength(1);
    expect(v1[0]).toMatch(/:defer$/);

    const deferCall = mockFetch.mock.calls.find((c) => String(c[0]).endsWith(":defer"))!;
    expect(JSON.parse(deferCall[1].body).deferralInfo).toEqual({
      expectedExpiryTimeMillis: "1796119200123",
      desiredExpiryTimeMillis: "1798761600000",
    });
  });

  it("fails before deferring when the token has no line item for that subscription", async () => {
    const err = await deferSubscriptionPurchase(
      client(),
      PKG,
      "missing_sub",
      TOKEN,
      "2027-01-01T00:00:00Z",
    ).then(
      () => undefined,
      (e: { code?: string; exitCode?: number; suggestion?: string }) => e,
    );
    expect(err?.code).toBe("SUBSCRIPTION_LINE_ITEM_NOT_FOUND");
    expect(err?.exitCode).toBe(2);
    expect(err?.suggestion).toContain("lineItems[].productId");
    expect(urls().some((u) => u.endsWith(":defer"))).toBe(false);
  });

  it("names the missing expiry, not a wrong ID, when the line item has no expiryTime", async () => {
    mockFetch.mockImplementation(async () => json({ lineItems: [{ productId: SUB }] }));
    const err = await deferSubscriptionPurchase(
      client(),
      PKG,
      SUB,
      TOKEN,
      "2027-01-01T00:00:00Z",
    ).then(
      () => undefined,
      (e: { code?: string; exitCode?: number; suggestion?: string }) => e,
    );
    expect(err?.code).toBe("SUBSCRIPTION_EXPIRY_UNKNOWN");
    expect(err?.exitCode).toBe(4);
    expect(err?.suggestion).toContain("defer-v2");
    expect(urls().some((u) => u.endsWith(":defer"))).toBe(false);
  });
});
