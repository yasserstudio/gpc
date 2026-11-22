import { describe, it, expect, vi } from "vitest";
import type { BasePlan, PlayApiClient, SubscriptionOffer } from "@gpc-cli/api";
import {
  buildRetentionOffer,
  createOffer,
  parseRetentionFlags,
  prepareRetentionOffer,
  prepareRetentionOfferUpdate,
} from "../src/index.js";

// Base plan shape copied from Google's monetization.subscriptions.get response
// (rev 20261119): regionalConfigs carry a price, otherRegionsConfig USD/EUR prices.
const monthly: BasePlan = {
  basePlanId: "monthly",
  state: "ACTIVE",
  autoRenewingBasePlanType: {
    billingPeriodDuration: "P1M",
    resubscribeState: "RESUBSCRIBE_STATE_ACTIVE",
  },
  regionalConfigs: [
    {
      regionCode: "US",
      price: { currencyCode: "USD", units: "9", nanos: 990000000 },
      newSubscriberAvailability: true,
    },
    {
      regionCode: "GB",
      price: { currencyCode: "GBP", units: "8", nanos: 990000000 },
      newSubscriberAvailability: true,
    },
  ],
  otherRegionsConfig: {
    usdPrice: { currencyCode: "USD", units: "9", nanos: 990000000 },
    eurPrice: { currencyCode: "EUR", units: "9", nanos: 990000000 },
    newSubscriberAvailability: true,
  },
};

const NOW = new Date("2026-11-22T12:00:00Z");

function usageError(fn: () => unknown): {
  code?: string;
  exitCode?: number;
  message: string;
  suggestion?: string;
} {
  try {
    fn();
  } catch (e) {
    return e as { code?: string; exitCode?: number; message: string; suggestion?: string };
  }
  throw new Error("expected a throw");
}

describe("parseRetentionFlags", () => {
  it("accepts 90d and P90D for durations", () => {
    const a = parseRetentionFlags({
      kind: "cohort",
      offerId: "o",
      discount: "0.5",
      minDuration: "90d",
    });
    const b = parseRetentionFlags({
      kind: "cohort",
      offerId: "o",
      discount: "0.5",
      minDuration: "P90D",
    });
    expect(a.minDuration).toBe("P90D");
    expect(b.minDuration).toBe("P90D");
  });

  it("rejects months and names the days form", () => {
    const err = usageError(() =>
      parseRetentionFlags({ kind: "cohort", offerId: "o", discount: "0.5", minDuration: "3m" }),
    );
    expect(err.code).toBe("RETENTION_FLAG_INVALID");
    expect(err.exitCode).toBe(2);
    expect(err.message).toContain("--min-duration");
    expect(err.suggestion).toContain("90d");
  });

  it.each([
    ["50", "0.5"],
    ["50%", "0.5"],
    ["25%", "0.25"],
  ])("rejects --discount %s and names %s", (raw, fraction) => {
    const err = usageError(() =>
      parseRetentionFlags({ kind: "cohort", offerId: "o", discount: raw }),
    );
    expect(err.code).toBe("RETENTION_FLAG_INVALID");
    expect(err.exitCode).toBe(2);
    expect(err.suggestion).toContain(`--discount ${fraction}`);
  });

  it.each(["0", "1", "-0.2", "half", ""])("rejects --discount %j", (raw) => {
    const err = usageError(() =>
      parseRetentionFlags({ kind: "cohort", offerId: "o", discount: raw }),
    );
    expect(err.code).toBe("RETENTION_FLAG_INVALID");
  });

  it("refuses cohort-only flags on a per-user offer", () => {
    const err = usageError(() =>
      parseRetentionFlags({ kind: "per-user", offerId: "o", discount: "0.3", minDuration: "90d" }),
    );
    expect(err.code).toBe("RETENTION_FLAG_INVALID");
    expect(err.message).toContain("--min-duration");
  });

  it("rejects a non-RFC 3339 --end", () => {
    const err = usageError(() =>
      parseRetentionFlags({ kind: "cohort", offerId: "o", discount: "0.5", end: "2027-03-01" }),
    );
    expect(err.code).toBe("RETENTION_FLAG_INVALID");
    expect(err.message).toContain("--end");
  });
});

describe("buildRetentionOffer", () => {
  it("builds a cohort offer from the base plan: billing period, every region, other regions", () => {
    const flags = parseRetentionFlags({
      kind: "cohort",
      offerId: "winback-50",
      discount: "0.5",
      periods: "2",
      minDuration: "90d",
      multipleClaims: true,
      cooldown: "180d",
    });
    const offer = buildRetentionOffer("premium", monthly, flags, { now: NOW });
    expect(offer).toEqual({
      productId: "premium",
      basePlanId: "monthly",
      offerId: "winback-50",
      targeting: {
        retentionRule: {
          scope: { thisSubscription: {} },
          minDuration: "P90D",
          allowMultipleClaims: true,
          minOfferCooldownDuration: "P180D",
        },
      },
      phases: [
        {
          recurrenceCount: 2,
          duration: "P1M",
          regionalConfigs: [
            { regionCode: "US", relativeDiscount: 0.5 },
            { regionCode: "GB", relativeDiscount: 0.5 },
          ],
          otherRegionsConfig: { relativeDiscount: 0.5 },
        },
      ],
      regionalConfigs: [
        { regionCode: "US", newSubscriberAvailability: true },
        { regionCode: "GB", newSubscriberAvailability: true },
      ],
      otherRegionsConfig: { otherRegionsNewSubscriberAvailability: true },
    });
  });

  it("defaults a cohort to one period and minDuration P0D", () => {
    const offer = buildRetentionOffer(
      "premium",
      monthly,
      parseRetentionFlags({ kind: "cohort", offerId: "o", discount: "0.2" }),
      { now: NOW },
    );
    expect(offer.phases[0]?.recurrenceCount).toBe(1);
    expect(offer.targeting).toEqual({
      retentionRule: { scope: { thisSubscription: {} }, minDuration: "P0D" },
    });
  });

  it("builds a per-user offer", () => {
    const offer = buildRetentionOffer(
      "premium",
      monthly,
      parseRetentionFlags({ kind: "per-user", offerId: "o", discount: "0.3" }),
      { now: NOW },
    );
    expect(offer.targeting).toEqual({ retentionPerUserRule: {} });
  });

  it("limits regions to --regions and then leaves other regions out", () => {
    const offer = buildRetentionOffer(
      "premium",
      monthly,
      parseRetentionFlags({ kind: "cohort", offerId: "o", discount: "0.5", regions: "gb" }),
      { now: NOW },
    );
    expect(offer.regionalConfigs).toEqual([{ regionCode: "GB", newSubscriberAvailability: true }]);
    expect(offer.phases[0]?.regionalConfigs).toEqual([{ regionCode: "GB", relativeDiscount: 0.5 }]);
    expect(offer.phases[0]?.otherRegionsConfig).toBeUndefined();
    expect(offer.otherRegionsConfig).toBeUndefined();
  });

  it("refuses a region the base plan is not sold in", () => {
    const err = usageError(() =>
      buildRetentionOffer(
        "premium",
        monthly,
        parseRetentionFlags({ kind: "cohort", offerId: "o", discount: "0.5", regions: "US,FR" }),
        { now: NOW },
      ),
    );
    expect(err.code).toBe("RETENTION_FLAG_INVALID");
    expect(err.message).toContain("FR");
  });

  it("refuses a prepaid base plan", () => {
    const prepaid: BasePlan = {
      basePlanId: "prepaid-1m",
      prepaidBasePlanType: { billingPeriodDuration: "P1M" },
      regionalConfigs: monthly.regionalConfigs,
    };
    const err = usageError(() =>
      buildRetentionOffer(
        "premium",
        prepaid,
        parseRetentionFlags({ kind: "cohort", offerId: "o", discount: "0.5" }),
        { now: NOW },
      ),
    );
    expect(err.code).toBe("RETENTION_OFFER_INVALID");
    expect(err.message).toContain("auto-renewing");
  });

  it("runs the retention validator (cooldown without multiple claims)", () => {
    const err = usageError(() =>
      buildRetentionOffer(
        "premium",
        monthly,
        parseRetentionFlags({ kind: "cohort", offerId: "o", discount: "0.5", cooldown: "30d" }),
        { now: NOW },
      ),
    );
    expect(err.code).toBe("RETENTION_OFFER_INVALID");
    expect(err.message).toContain("minOfferCooldownDuration");
  });
});

function fakeClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    subscriptions: {
      get: vi.fn(async () => ({ productId: "premium", basePlans: [monthly] })),
      getOffer: vi.fn(),
      ...overrides,
    },
  } as unknown as PlayApiClient & {
    subscriptions: { get: ReturnType<typeof vi.fn>; getOffer: ReturnType<typeof vi.fn> };
  };
}

describe("prepareRetentionOffer", () => {
  it("checks the flags before any API call", async () => {
    const client = fakeClient();
    await expect(
      prepareRetentionOffer(client, "com.example.app", "premium", "monthly", {
        kind: "cohort",
        offerId: "o",
        discount: "50%",
      }),
    ).rejects.toMatchObject({ code: "RETENTION_FLAG_INVALID" });
    expect(client.subscriptions.get).not.toHaveBeenCalled();
  });

  it("names a missing base plan", async () => {
    await expect(
      prepareRetentionOffer(fakeClient(), "com.example.app", "premium", "yearly", {
        kind: "cohort",
        offerId: "o",
        discount: "0.5",
      }),
    ).rejects.toMatchObject({ code: "BASE_PLAN_NOT_FOUND", exitCode: 2 });
  });
});

describe("prepareRetentionOfferUpdate", () => {
  const existing: SubscriptionOffer = {
    packageName: "com.example.app",
    productId: "premium",
    basePlanId: "monthly",
    offerId: "winback",
    state: "ACTIVE",
    phases: [
      {
        recurrenceCount: 1,
        duration: "P1M",
        regionalConfigs: [{ regionCode: "US", relativeDiscount: 0.5 }],
      },
    ],
    targeting: {
      retentionRule: {
        scope: { thisSubscription: {} },
        minDuration: "P90D",
        allowMultipleClaims: true,
        minOfferCooldownDuration: "P180D",
      },
    },
    regionalConfigs: [{ regionCode: "US", newSubscriberAvailability: true }],
  } as SubscriptionOffer;

  it("merges targeting flags into the current rule and masks only what changed", async () => {
    const client = fakeClient({ getOffer: vi.fn(async () => existing) });
    const { offer, updateMask } = await prepareRetentionOfferUpdate(
      client,
      "com.example.app",
      "premium",
      "monthly",
      "winback",
      { minDuration: "30d", end: "2027-03-01T00:00:00Z" },
    );
    expect(updateMask).toBe("targeting,endTime");
    expect(offer.targeting).toEqual({
      retentionRule: {
        scope: { thisSubscription: {} },
        minDuration: "P30D",
        allowMultipleClaims: true,
        minOfferCooldownDuration: "P180D",
      },
    });
    expect(offer.endTime).toBe("2027-03-01T00:00:00Z");
    expect(offer.phases).toBeUndefined();
  });

  it("drops the cooldown when multiple claims are turned off", async () => {
    const client = fakeClient({ getOffer: vi.fn(async () => existing) });
    const { offer, updateMask } = await prepareRetentionOfferUpdate(
      client,
      "com.example.app",
      "premium",
      "monthly",
      "winback",
      { multipleClaims: false },
    );
    expect(updateMask).toBe("targeting");
    expect(offer.targeting).toEqual({
      retentionRule: {
        scope: { thisSubscription: {} },
        minDuration: "P90D",
        allowMultipleClaims: false,
      },
    });
  });

  it("checks a new start against the offer's stored end", async () => {
    const client = fakeClient({
      getOffer: vi.fn(async () => ({ ...existing, endTime: "2027-06-01T00:00:00Z" })),
    });
    const { updateMask } = await prepareRetentionOfferUpdate(
      client,
      "com.example.app",
      "premium",
      "monthly",
      "winback",
      { start: "2026-12-01T00:00:00Z" },
      { now: NOW },
    );
    expect(updateMask).toBe("startTime");
    await expect(
      prepareRetentionOfferUpdate(
        client,
        "com.example.app",
        "premium",
        "monthly",
        "winback",
        { start: "2027-07-01T00:00:00Z" },
        { now: NOW },
      ),
    ).rejects.toMatchObject({ code: "RETENTION_FLAG_INVALID", exitCode: 2 });
  });

  it("refuses an end time in the past", async () => {
    const client = fakeClient({ getOffer: vi.fn(async () => existing) });
    await expect(
      prepareRetentionOfferUpdate(
        client,
        "com.example.app",
        "premium",
        "monthly",
        "winback",
        { end: "2020-01-01T00:00:00Z" },
        { now: NOW },
      ),
    ).rejects.toMatchObject({ code: "RETENTION_FLAG_INVALID", exitCode: 2 });
  });

  it("refuses an end before the start given in the same call", async () => {
    const client = fakeClient({ getOffer: vi.fn(async () => existing) });
    await expect(
      prepareRetentionOfferUpdate(
        client,
        "com.example.app",
        "premium",
        "monthly",
        "winback",
        { start: "2027-06-01T00:00:00Z", end: "2027-01-01T00:00:00Z" },
        { now: NOW },
      ),
    ).rejects.toMatchObject({ code: "RETENTION_FLAG_INVALID", exitCode: 2 });
  });

  it("refuses targeting flags on an offer that is not a cohort retention offer", async () => {
    const client = fakeClient({
      getOffer: vi.fn(async () => ({ ...existing, targeting: { retentionPerUserRule: {} } })),
    });
    await expect(
      prepareRetentionOfferUpdate(client, "com.example.app", "premium", "monthly", "winback", {
        cooldown: "30d",
      }),
    ).rejects.toMatchObject({ code: "RETENTION_FLAG_INVALID", exitCode: 2 });
  });
});

describe("createOffer with a retention offer file", () => {
  const fileOffer = {
    offerId: "winback",
    phases: [
      {
        recurrenceCount: 1,
        duration: "P1M",
        regionalConfigs: [{ regionCode: "US", relativeDiscount: 0.5 }],
      },
    ],
    targeting: { retentionPerUserRule: {} },
    regionalConfigs: [{ regionCode: "US", newSubscriberAvailability: true }],
  } as SubscriptionOffer;

  it("refuses a prepaid base plan before the create call", async () => {
    const prepaid = { ...monthly, autoRenewingBasePlanType: undefined, prepaidBasePlanType: {} };
    const createOfferFn = vi.fn();
    const client = fakeClient({
      get: vi.fn(async () => ({ productId: "premium", basePlans: [prepaid] })),
      createOffer: createOfferFn,
    });
    await expect(
      createOffer(client, "com.example.app", "premium", "monthly", fileOffer),
    ).rejects.toMatchObject({ code: "RETENTION_OFFER_INVALID" });
    expect(createOfferFn).not.toHaveBeenCalled();
  });

  it("creates it on an auto-renewing base plan", async () => {
    const createOfferFn = vi.fn(async () => ({ offerId: "winback" }));
    const client = fakeClient({ createOffer: createOfferFn });
    await createOffer(client, "com.example.app", "premium", "monthly", fileOffer);
    expect(createOfferFn).toHaveBeenCalledOnce();
  });
});
