import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Drives the REAL createProgram() (v0.9.95 lesson: synthetic roots miss global
// flag collisions); only the API client is mocked.

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

const getClient = vi.fn();
vi.mock("../src/resolve.js", () => ({
  resolvePackageName: vi.fn().mockReturnValue("com.example.app"),
  getClient: (...a: unknown[]) => getClient(...a),
}));

const OFFER = "retention-peruser-30off";

async function runCli(...args: string[]): Promise<string> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  process.argv = argv;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    const { createProgram, runProgram } = await import("../src/program.js");
    const program = await createProgram();
    await runProgram(program, argv);
    return log.mock.calls.map((c) => String(c[0])).join("\n");
  } finally {
    process.argv = origArgv;
  }
}

describe("purchases subscription target-offer / untarget-offer", () => {
  const activateOfferTargeting = vi.fn();
  const deactivateOfferTargeting = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    activateOfferTargeting.mockResolvedValue(undefined);
    deactivateOfferTargeting.mockResolvedValue(undefined);
    getClient.mockResolvedValue({
      purchases: { activateOfferTargeting, deactivateOfferTargeting },
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    getClient.mockReset();
    activateOfferTargeting.mockReset();
    deactivateOfferTargeting.mockReset();
    process.exitCode = undefined;
  });

  it("target-offer calls activateOfferTargeting with the token and offer", async () => {
    const out = await runCli(
      "purchases",
      "subscription",
      "target-offer",
      "tok-1",
      "--offer",
      OFFER,
      "--yes",
    );
    expect(activateOfferTargeting).toHaveBeenCalledWith("com.example.app", "tok-1", OFFER);
    expect(out).toContain(OFFER);
  });

  it("untarget-offer calls deactivateOfferTargeting", async () => {
    await runCli("purchases", "subscription", "untarget-offer", "tok-1", "--offer", OFFER, "--yes");
    expect(deactivateOfferTargeting).toHaveBeenCalledWith("com.example.app", "tok-1", OFFER);
    expect(activateOfferTargeting).not.toHaveBeenCalled();
  });

  it("--json prints a machine-readable result", async () => {
    const out = await runCli(
      "--output",
      "json",
      "purchases",
      "subscription",
      "target-offer",
      "tok-1",
      "--offer",
      OFFER,
      "--yes",
    );
    expect(JSON.parse(out)).toMatchObject({ offerId: OFFER, targeted: true });
  });

  it("--dry-run sends nothing", async () => {
    const out = await runCli(
      "--dry-run",
      "--output",
      "json",
      "purchases",
      "subscription",
      "target-offer",
      "tok-1",
      "--offer",
      OFFER,
    );
    expect(activateOfferTargeting).not.toHaveBeenCalled();
    expect(getClient).not.toHaveBeenCalled();
    expect(out).toContain(OFFER);
  });

  it("is a normal (not money) confirm: a non-interactive run proceeds without --yes", async () => {
    await runCli(
      "--no-interactive",
      "purchases",
      "subscription",
      "target-offer",
      "tok-1",
      "--offer",
      OFFER,
    );
    expect(activateOfferTargeting).toHaveBeenCalledTimes(1);
  });

  it("--offer is required (usage error, nothing sent)", async () => {
    const err = await runCli("purchases", "subscription", "target-offer", "tok-1", "--yes").then(
      () => undefined,
      (e: { exitCode?: number }) => e,
    );
    expect(err?.exitCode).toBe(2);
    expect(activateOfferTargeting).not.toHaveBeenCalled();
  });

  it("a blank --offer fails with exit 2 even on --dry-run", async () => {
    const err = await runCli(
      "--dry-run",
      "purchases",
      "subscription",
      "target-offer",
      "tok-1",
      "--offer",
      "  ",
    ).then(
      () => undefined,
      (e: { code?: string; exitCode?: number }) => e,
    );
    expect(err?.code).toBe("OFFER_ID_REQUIRED");
    expect(err?.exitCode).toBe(2);
  });

  it("sends and echoes the trimmed offer id", async () => {
    const out = await runCli(
      "--output",
      "json",
      "purchases",
      "subscription",
      "target-offer",
      "tok-1",
      "--offer",
      ` ${OFFER} `,
      "--yes",
    );
    expect(activateOfferTargeting).toHaveBeenCalledWith("com.example.app", "tok-1", OFFER);
    expect(JSON.parse(out).offerId).toBe(OFFER);
  });
});

describe("purchases subscription get lists targeted offers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getClient.mockReset();
  });

  // Shape from Google's retention-offers guide (subscriptionsv2.get example).
  const purchase = {
    kind: "androidpublisher#subscriptionPurchaseV2",
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    startTime: "2026-10-01T10:00:00Z",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    lineItems: [
      {
        productId: "premium",
        expiryTime: "2026-12-31T10:00:00Z",
        developerTargetedOffers: [{ offerId: OFFER, activateTime: "2026-12-03T15:04:05Z" }],
      },
    ],
  };

  it("table output names each targeted offer and when it was activated", async () => {
    getClient.mockResolvedValue({
      purchases: { getSubscriptionV2: vi.fn().mockResolvedValue(purchase) },
    });
    const out = await runCli("purchases", "subscription", "get", "tok-1");
    expect(out).toContain(OFFER);
    expect(out).toContain("2026-12-03T15:04:05Z");
  });

  it("omits the field when nothing is targeted", async () => {
    const plain = { ...purchase, lineItems: [{ productId: "premium" }] };
    getClient.mockResolvedValue({
      purchases: { getSubscriptionV2: vi.fn().mockResolvedValue(plain) },
    });
    const out = await runCli("purchases", "subscription", "get", "tok-1");
    expect(out).not.toMatch(/targetedOffers/);
  });
});

describe("purchases subscription get shows a pending plan transition", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getClient.mockReset();
  });

  // Verbatim from Google's retention-offers guide: the subscriptionsv2.get
  // response after the subscriber accepts a retention offer.
  const accepted = {
    lineItems: [
      {
        productId: "premium_monthly_sub",
        expiryTime: "2026-12-15T10:00:00Z",
        offerDetails: {
          basePlanId: "monthly-base",
        },
        autoRenewingPlan: {
          autoRenewEnabled: true,
          planTransitionDetails: {
            productId: "premium_monthly_sub",
            basePlanId: "monthly-base",
            offerId: "retention-50off-2m",
            transitionInfo: {
              transitionState: "IN_PROGRESS",
              expectedTransitionTime: "2026-12-15T10:00:00Z",
            },
          },
        },
      },
    ],
  };

  it("table output names the state, the target offer and the expected time", async () => {
    getClient.mockResolvedValue({
      purchases: { getSubscriptionV2: vi.fn().mockResolvedValue(accepted) },
    });
    const out = await runCli("purchases", "subscription", "get", "tok-1");
    expect(out).toMatch(/planTransition/);
    expect(out).toContain("IN_PROGRESS");
    expect(out).toContain("retention-50off-2m");
    expect(out).toContain("2026-12-15T10:00:00Z");
  });

  it("omits the row when there is no transition", async () => {
    getClient.mockResolvedValue({
      purchases: {
        getSubscriptionV2: vi
          .fn()
          .mockResolvedValue({ lineItems: [{ productId: "premium_monthly_sub" }] }),
      },
    });
    const out = await runCli("purchases", "subscription", "get", "tok-1");
    expect(out).not.toMatch(/planTransition/);
  });
});
