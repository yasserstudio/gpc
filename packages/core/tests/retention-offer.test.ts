import { describe, it, expect, vi } from "vitest";
import type { BasePlan, SubscriptionOffer } from "@gpc-cli/api";
import {
  validateRetentionOffer,
  assertValidRetentionOffer,
  isRetentionOffer,
} from "../src/commands/retention-offers.js";
import { GpcError } from "../src/errors.js";
import { createOffer, updateOffer } from "../src/commands/subscriptions.js";

// Targeting and times copied verbatim from developer.android.com/google/play/billing/retention-offers
// (Nov 2026). Google's snippets omit `phases`; the phase here follows the same
// page: one phase, relativeDiscount in (0,1), duration = base plan period.
const NOW = new Date("2026-11-22T00:00:00Z");
const PHASE = {
  recurrenceCount: 2,
  duration: "P1M",
  regionalConfigs: [{ regionCode: "US", relativeDiscount: 0.5 }],
  otherRegionsConfig: { relativeDiscount: 0.5 },
};
const cohortSample: SubscriptionOffer = {
  productId: "premium_monthly_sub",
  basePlanId: "monthly-base",
  offerId: "retention-50off-2m",
  startTime: "2026-12-01T00:00:00Z",
  endTime: "2027-03-01T00:00:00Z",
  targeting: {
    retentionRule: {
      scope: { thisSubscription: {} },
      minDuration: "P90D",
      allowMultipleClaims: true,
      minOfferCooldownDuration: "P180D",
    },
  },
  phases: [PHASE],
  regionalConfigs: [{ regionCode: "US", newSubscriberAvailability: true }],
};
const perUserSample: SubscriptionOffer = {
  productId: "premium_monthly_sub",
  basePlanId: "monthly-base",
  offerId: "retention-peruser-30off",
  targeting: { retentionPerUserRule: {} },
  phases: [{ ...PHASE, regionalConfigs: [{ regionCode: "US", relativeDiscount: 0.3 }] }],
  regionalConfigs: [{ regionCode: "US", newSubscriberAvailability: true }],
};
const monthlyBasePlan: BasePlan = {
  basePlanId: "monthly-base",
  autoRenewingBasePlanType: { billingPeriodDuration: "P1M" },
} as BasePlan;

function codes(offer: SubscriptionOffer, basePlan?: BasePlan): string[] {
  return validateRetentionOffer(offer, { basePlan, now: NOW }).map((v) => v.field);
}

describe("validateRetentionOffer", () => {
  it("accepts Google's cohort sample", () => {
    expect(codes(cohortSample, monthlyBasePlan)).toEqual([]);
  });

  it("accepts Google's per-user sample", () => {
    expect(codes(perUserSample, monthlyBasePlan)).toEqual([]);
  });

  // --- helpers to vary one field of the cohort sample ---
  const rule = cohortSample.targeting!.retentionRule!;
  const withRule = (r: Record<string, unknown>): SubscriptionOffer => ({
    ...cohortSample,
    targeting: { retentionRule: r as never },
  });
  const withPhase = (p: Record<string, unknown>): SubscriptionOffer => ({
    ...cohortSample,
    phases: [{ ...PHASE, ...p } as never],
  });

  it("rejects two targeting rules at once", () => {
    const offer = {
      ...cohortSample,
      targeting: { ...cohortSample.targeting, retentionPerUserRule: {} },
    };
    expect(codes(offer as SubscriptionOffer)).toContain("targeting");
  });

  it("requires scope { thisSubscription: {} }", () => {
    expect(codes(withRule({ ...rule, scope: { anySubscriptionInApp: {} } }))).toEqual([
      "targeting.retentionRule.scope",
    ]);
    expect(codes(withRule({ ...rule, scope: undefined }))).toEqual([
      "targeting.retentionRule.scope",
    ]);
  });

  it.each([
    ["P0D", true],
    ["P1826D", true],
    ["P1827D", false],
    ["P3M", false],
    ["90", false],
    [undefined, false],
  ])("minDuration %s valid=%s", (minDuration, ok) => {
    const got = codes(withRule({ ...rule, minDuration }));
    expect(got).toEqual(ok ? [] : ["targeting.retentionRule.minDuration"]);
  });

  it.each([
    [true, "P1D", true],
    [true, "P1826D", true],
    [true, "P0D", false],
    [true, "P1827D", false],
    [true, undefined, false],
    [false, "P30D", false],
    [undefined, "P30D", false],
    [false, undefined, true],
    [undefined, undefined, true],
  ])("allowMultipleClaims=%s cooldown=%s valid=%s", (allowMultipleClaims, cooldown, ok) => {
    const got = codes(
      withRule({ ...rule, allowMultipleClaims, minOfferCooldownDuration: cooldown }),
    );
    expect(got).toEqual(ok ? [] : ["targeting.retentionRule.minOfferCooldownDuration"]);
  });

  it("rejects a non-boolean allowMultipleClaims", () => {
    expect(
      codes(withRule({ ...rule, allowMultipleClaims: "yes", minOfferCooldownDuration: undefined })),
    ).toEqual(["targeting.retentionRule.allowMultipleClaims"]);
  });

  it("requires an empty retentionPerUserRule", () => {
    expect(
      codes({
        ...perUserSample,
        targeting: { retentionPerUserRule: { minDuration: "P1D" } as never },
      }),
    ).toEqual(["targeting.retentionPerUserRule"]);
  });

  it("requires exactly one phase", () => {
    expect(codes({ ...cohortSample, phases: [] })).toEqual(["phases"]);
    expect(codes({ ...cohortSample, phases: [PHASE, PHASE] })).toEqual(["phases"]);
  });

  it.each([
    [0, false],
    [1, true],
    [52, true],
    [53, false],
    [1.5, false],
  ])("recurrenceCount %s valid=%s", (recurrenceCount, ok) => {
    expect(codes(withPhase({ recurrenceCount }), monthlyBasePlan)).toEqual(
      ok ? [] : ["phases[0].recurrenceCount"],
    );
  });

  it("requires duration = billing period when recurrenceCount > 1 and the base plan is known", () => {
    expect(codes(withPhase({ duration: "P2M" }), monthlyBasePlan)).toEqual(["phases[0].duration"]);
    expect(codes(withPhase({ duration: "P2M", recurrenceCount: 1 }), monthlyBasePlan)).toEqual([]);
    expect(codes(withPhase({ duration: "P2M" }))).toEqual([]);
  });

  it.each([
    [0, false],
    [0.01, true],
    [0.99, true],
    [1, false],
    ["0.5", false],
  ])("relativeDiscount %s valid=%s", (relativeDiscount, ok) => {
    const offer = withPhase({ regionalConfigs: [{ regionCode: "US", relativeDiscount }] });
    expect(codes(offer)).toEqual(ok ? [] : ["phases[0].regionalConfigs[0].relativeDiscount"]);
  });

  it.each(["price", "absoluteDiscount", "free"])("rejects %s on a region", (key) => {
    const offer = withPhase({
      regionalConfigs: [
        {
          regionCode: "US",
          relativeDiscount: 0.5,
          [key]: key === "free" ? {} : { currencyCode: "USD", units: "1" },
        },
      ],
    });
    expect(codes(offer)).toEqual(["phases[0].regionalConfigs[0]"]);
  });

  it("rejects otherRegionsConfig price fields and a bad fraction", () => {
    expect(codes(withPhase({ otherRegionsConfig: { free: {} } }))).toEqual([
      "phases[0].otherRegionsConfig",
    ]);
    expect(codes(withPhase({ otherRegionsConfig: { relativeDiscount: 1 } }))).toEqual([
      "phases[0].otherRegionsConfig.relativeDiscount",
    ]);
  });

  it("checks startTime/endTime format and order", () => {
    expect(codes({ ...cohortSample, startTime: "2026-12-01" })).toEqual(["startTime"]);
    expect(codes({ ...cohortSample, endTime: "2027-02-30T00:00:00Z" })).toEqual(["endTime"]);
    expect(
      codes({ ...cohortSample, endTime: "2026-11-21T00:00:00Z", startTime: undefined }),
    ).toEqual(["endTime"]);
    expect(codes({ ...cohortSample, endTime: "2026-12-01T00:00:00Z" })).toEqual(["endTime"]);
    expect(codes({ ...cohortSample, startTime: undefined, endTime: undefined })).toEqual([]);
  });

  it("requires an auto-renewing base plan when the base plan is known", () => {
    const installments = { basePlanId: "monthly-base", installmentsBasePlanType: {} } as BasePlan;
    const prepaid = { basePlanId: "monthly-base", prepaidBasePlanType: {} } as BasePlan;
    expect(codes(cohortSample, installments)).toEqual(["basePlanId"]);
    expect(codes(cohortSample, prepaid)).toEqual(["basePlanId"]);
  });

  it("reports every violation, not only the first", () => {
    const offer = withRule({ scope: {}, minDuration: "P3M", allowMultipleClaims: true });
    expect(codes({ ...offer, phases: [] })).toEqual([
      "targeting.retentionRule.scope",
      "targeting.retentionRule.minDuration",
      "targeting.retentionRule.minOfferCooldownDuration",
      "phases",
    ]);
  });

  it("assertValidRetentionOffer throws one exit-2 error listing all problems", () => {
    const offer = withRule({ ...rule, minDuration: "P3M", minOfferCooldownDuration: undefined });
    let err: unknown;
    try {
      assertValidRetentionOffer(offer, { now: NOW });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(GpcError);
    const g = err as GpcError;
    expect(g.code).toBe("RETENTION_OFFER_INVALID");
    expect(g.exitCode).toBe(2);
    expect(g.message).toContain("2 problems");
    expect(g.message).toContain("minDuration");
    expect(g.message).toContain("minOfferCooldownDuration");
    expect(g.suggestion).toBeTruthy();
  });

  it("isRetentionOffer is false for acquisition and upgrade offers", () => {
    expect(isRetentionOffer({ ...cohortSample, targeting: { acquisitionRule: {} } })).toBe(false);
    expect(isRetentionOffer({ ...cohortSample, targeting: undefined })).toBe(false);
    expect(isRetentionOffer(perUserSample)).toBe(true);
  });

  it("reports wrong-typed or null fields instead of throwing", () => {
    expect(codes({ ...cohortSample, endTime: null as never })).toEqual(["endTime"]);
    expect(codes({ ...cohortSample, startTime: 1733011200 as never })).toEqual(["startTime"]);
    expect(codes(withPhase({ regionalConfigs: [null] }))).toEqual(["phases[0].regionalConfigs[0]"]);
    expect(codes({ ...cohortSample, phases: [null as never] })).toEqual(["phases[0]"]);
  });

  describe("requireComplete (create)", () => {
    const full = (offer: SubscriptionOffer) =>
      validateRetentionOffer(offer, { now: NOW, requireComplete: true }).map((v) => v.field);

    it("accepts both samples", () => {
      expect(full(cohortSample)).toEqual([]);
      expect(full(perUserSample)).toEqual([]);
    });

    it("requires phases", () => {
      expect(full({ ...cohortSample, phases: undefined })).toEqual(["phases"]);
    });

    it("requires offer-level regionalConfigs", () => {
      expect(full({ ...cohortSample, regionalConfigs: undefined })).toEqual(["regionalConfigs"]);
      expect(full({ ...cohortSample, regionalConfigs: [] })).toEqual(["regionalConfigs"]);
    });

    it("requires a discount somewhere in the phase", () => {
      const offer = withPhase({ regionalConfigs: [], otherRegionsConfig: undefined });
      expect(full(offer)).toEqual(["phases[0]"]);
    });

    it("partial updates stay lenient", () => {
      expect(codes({ ...cohortSample, phases: undefined, regionalConfigs: undefined })).toEqual([]);
    });
  });

  it("property: valid retention offers are never rejected", () => {
    // Seeded LCG so a failure reproduces; 1,000 random in-range offers.
    let seed = 20261119;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
    for (let i = 0; i < 1000; i++) {
      const multi = rnd() < 0.5;
      const count = int(1, 52);
      const start = Date.UTC(2026, 11, 1) + int(0, 365) * 86_400_000;
      const offer: SubscriptionOffer = {
        productId: "premium",
        basePlanId: "monthly-base",
        offerId: `r${i}`,
        ...(rnd() < 0.5
          ? {
              startTime: new Date(start).toISOString(),
              endTime: new Date(start + int(1, 900) * 86_400_000).toISOString(),
            }
          : {}),
        targeting:
          rnd() < 0.3
            ? { retentionPerUserRule: {} }
            : {
                retentionRule: {
                  scope: { thisSubscription: {} },
                  minDuration: `P${int(0, 1826)}D`,
                  ...(multi
                    ? { allowMultipleClaims: true, minOfferCooldownDuration: `P${int(1, 1826)}D` }
                    : rnd() < 0.5
                      ? { allowMultipleClaims: false }
                      : {}),
                },
              },
        phases: [
          {
            recurrenceCount: count,
            duration: count > 1 ? "P1M" : rnd() < 0.5 ? "P1M" : "P1W",
            regionalConfigs: [{ regionCode: "US", relativeDiscount: int(1, 99) / 100 }],
          },
        ],
      };
      expect(validateRetentionOffer(offer, { basePlan: monthlyBasePlan, now: NOW })).toEqual([]);
    }
  });
});

describe("offer create/update run the retention check before any API call", () => {
  const client = () =>
    ({
      subscriptions: {
        createOffer: vi.fn(async (_p: string, _s: string, _b: string, body: unknown) => body),
        updateOffer: vi.fn(
          async (_p: string, _s: string, _b: string, _o: string, body: unknown) => body,
        ),
      },
    }) as never as Parameters<typeof createOffer>[0] & {
      subscriptions: {
        createOffer: ReturnType<typeof vi.fn>;
        updateOffer: ReturnType<typeof vi.fn>;
      };
    };
  const bad: SubscriptionOffer = {
    ...cohortSample,
    endTime: undefined,
    startTime: undefined,
    targeting: { retentionRule: { scope: { thisSubscription: {} }, minDuration: "P3M" } },
  };

  it("createOffer refuses a retention offer with no phases", async () => {
    const c = client();
    const { phases: _p, ...noPhases } = cohortSample;
    await expect(
      createOffer(c, "com.example.app", "premium", "monthly-base", {
        ...noPhases,
        startTime: undefined,
        endTime: undefined,
      } as SubscriptionOffer),
    ).rejects.toMatchObject({ code: "RETENTION_OFFER_INVALID" });
    expect(c.subscriptions.createOffer).not.toHaveBeenCalled();
  });

  it("createOffer refuses an invalid retention offer without calling Google", async () => {
    const c = client();
    await expect(
      createOffer(c, "com.example.app", "premium", "monthly-base", bad),
    ).rejects.toMatchObject({
      code: "RETENTION_OFFER_INVALID",
      exitCode: 2,
    });
    expect(c.subscriptions.createOffer).not.toHaveBeenCalled();
  });

  it("updateOffer refuses an invalid retention offer without calling Google", async () => {
    const c = client();
    await expect(
      updateOffer(c, "com.example.app", "premium", "monthly-base", "retention-50off-2m", bad),
    ).rejects.toMatchObject({ code: "RETENTION_OFFER_INVALID" });
    expect(c.subscriptions.updateOffer).not.toHaveBeenCalled();
  });

  it("createOffer sends a valid retention offer", async () => {
    const c = client();
    const sample = { ...cohortSample, startTime: undefined, endTime: undefined };
    await createOffer(c, "com.example.app", "premium", "monthly-base", sample);
    expect(c.subscriptions.createOffer).toHaveBeenCalledOnce();
  });

  it("non-retention offers are not checked (two phases still sent)", async () => {
    const c = client();
    const intro: SubscriptionOffer = {
      productId: "premium",
      basePlanId: "monthly-base",
      offerId: "intro",
      targeting: { acquisitionRule: { scope: { anySubscriptionInApp: {} } } },
      phases: [PHASE, PHASE],
    };
    await createOffer(c, "com.example.app", "premium", "monthly-base", intro);
    expect(c.subscriptions.createOffer).toHaveBeenCalledOnce();
  });
});
