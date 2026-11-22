import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Drives the REAL createProgram() and the real core builder; only the API
// client is faked. Covers building a retention offer from flags (T3).

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

// Shape copied from Google's monetization.subscriptions.get response (rev 20261119).
const subscription = {
  packageName: "com.example.app",
  productId: "premium",
  basePlans: [
    {
      basePlanId: "monthly",
      state: "ACTIVE",
      autoRenewingBasePlanType: { billingPeriodDuration: "P1M" },
      regionalConfigs: [
        { regionCode: "US", price: { currencyCode: "USD", units: "9", nanos: 990000000 } },
      ],
      otherRegionsConfig: { usdPrice: { currencyCode: "USD", units: "9", nanos: 990000000 } },
    },
  ],
};

const existingOffer = {
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
  targeting: { retentionRule: { scope: { thisSubscription: {} }, minDuration: "P90D" } },
  regionalConfigs: [{ regionCode: "US", newSubscriberAvailability: true }],
};

const client = {
  subscriptions: {
    get: vi.fn(async () => subscription),
    getOffer: vi.fn(async () => existingOffer),
    createOffer: vi.fn(async (_p: string, _s: string, _b: string, body: object) => ({
      ...body,
      state: "DRAFT",
    })),
    updateOffer: vi.fn(
      async (_p: string, _s: string, _b: string, _o: string, body: unknown) => body,
    ),
    activateOffer: vi.fn(async (_p: string, _s: string, _b: string, offerId: string) => ({
      offerId,
      state: "ACTIVE",
    })),
  },
};
vi.mock("../src/resolve.js", () => ({
  resolvePackageName: vi.fn().mockReturnValue("com.example.app"),
  getClient: vi.fn(async () => client),
}));

async function runCli(...args: string[]): Promise<void> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  process.argv = argv;
  try {
    const { createProgram, runProgram } = await import("../src/program.js");
    const program = await createProgram();
    await runProgram(program, argv);
  } finally {
    process.argv = origArgv;
  }
}

let logs: string[];
const out = () => logs.join("\n");
const create = (...flags: string[]) =>
  runCli("subscriptions", "offers", "create", "premium", "monthly", ...flags);
const update = (...flags: string[]) =>
  runCli("subscriptions", "offers", "update", "premium", "monthly", "winback", ...flags);

describe("offers create --retention", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gpc-ret-"));
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
    Object.values(client.subscriptions).forEach((f) => f.mockClear());
  });

  it("builds the offer from the base plan, leaves it DRAFT and names the next command", async () => {
    await create(
      "--retention",
      "cohort",
      "--offer-id",
      "winback-50",
      "--discount",
      "0.5",
      "--periods",
      "2",
      "--min-duration",
      "90d",
      "--multiple-claims",
      "--cooldown",
      "180d",
    );
    const [pkg, product, basePlan, body] = client.subscriptions.createOffer.mock.calls[0]!;
    expect([pkg, product, basePlan]).toEqual(["com.example.app", "premium", "monthly"]);
    expect(body).toMatchObject({
      offerId: "winback-50",
      targeting: {
        retentionRule: {
          minDuration: "P90D",
          allowMultipleClaims: true,
          minOfferCooldownDuration: "P180D",
        },
      },
      phases: [
        {
          recurrenceCount: 2,
          duration: "P1M",
          regionalConfigs: [{ regionCode: "US", relativeDiscount: 0.5 }],
          otherRegionsConfig: { relativeDiscount: 0.5 },
        },
      ],
    });
    expect(client.subscriptions.activateOffer).not.toHaveBeenCalled();
    expect(out()).toContain(
      "gpc subscriptions offers activate premium monthly winback-50 --app com.example.app",
    );
  });

  it("activates the offer with --activate", async () => {
    await create(
      "--retention",
      "per-user",
      "--offer-id",
      "save-30",
      "--discount",
      "0.3",
      "--activate",
    );
    expect(client.subscriptions.createOffer).toHaveBeenCalledOnce();
    expect(client.subscriptions.activateOffer.mock.calls[0]![3]).toBe("save-30");
    expect(out()).toContain("ACTIVE");
  });

  it("says the draft exists when --activate fails after the create", async () => {
    client.subscriptions.activateOffer.mockRejectedValueOnce(
      Object.assign(new Error("Offer is not ready"), { code: "API_HTTP_400", exitCode: 4 }),
    );
    await expect(
      create("--retention", "per-user", "--offer-id", "save-30", "--discount", "0.3", "--activate"),
    ).rejects.toMatchObject({
      code: "API_HTTP_400",
      exitCode: 4,
      message: expect.stringContaining("created as a draft"),
      suggestion: expect.stringContaining(
        "gpc subscriptions offers activate premium monthly save-30",
      ),
    });
    expect(client.subscriptions.createOffer).toHaveBeenCalledOnce();
  });

  it("--dry-run prints the built offer and creates nothing", async () => {
    await runCli(
      "--dry-run",
      "subscriptions",
      "offers",
      "create",
      "premium",
      "monthly",
      "--retention",
      "cohort",
      "--offer-id",
      "o",
      "--discount",
      "0.5",
    );
    expect(client.subscriptions.createOffer).not.toHaveBeenCalled();
    expect(out()).toContain("retentionRule");
    expect(out()).toContain("dryRun");
  });

  it("refuses --file together with a retention flag", async () => {
    const file = join(dir, "offer.json");
    writeFileSync(file, "{}");
    await expect(
      create("--file", file, "--retention", "cohort", "--offer-id", "o", "--discount", "0.5"),
    ).rejects.toMatchObject({ exitCode: 2 });
    expect(client.subscriptions.get).not.toHaveBeenCalled();
  });

  it("asks for --file or --retention when neither is given", async () => {
    await expect(create()).rejects.toMatchObject({ exitCode: 2 });
  });

  it("requires --offer-id and --discount with --retention", async () => {
    await expect(create("--retention", "cohort", "--discount", "0.5")).rejects.toMatchObject({
      exitCode: 2,
    });
    await expect(create("--retention", "cohort", "--offer-id", "o")).rejects.toMatchObject({
      exitCode: 2,
    });
    expect(client.subscriptions.get).not.toHaveBeenCalled();
  });

  it("refuses retention flags without --retention", async () => {
    await expect(create("--offer-id", "o", "--discount", "0.5")).rejects.toMatchObject({
      exitCode: 2,
    });
  });

  it("refuses --discount 50 and names 0.5, before credentials are needed", async () => {
    const { getClient } = await import("../src/resolve.js");
    vi.mocked(getClient).mockClear();
    await expect(
      create("--retention", "cohort", "--offer-id", "o", "--discount", "50"),
    ).rejects.toMatchObject({ code: "RETENTION_FLAG_INVALID", exitCode: 2 });
    expect(getClient).not.toHaveBeenCalled();
  });
});

describe("offers update with retention flags", () => {
  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Object.values(client.subscriptions).forEach((f) => f.mockClear());
  });

  it("builds the mask from the flags given", async () => {
    await update("--min-duration", "30d", "--end", "2099-03-01T00:00:00Z");
    const [, , , , body, mask] = client.subscriptions.updateOffer.mock.calls[0]!;
    expect(mask).toBe("targeting,endTime");
    expect(body).toMatchObject({
      targeting: { retentionRule: { minDuration: "P30D" } },
      endTime: "2099-03-01T00:00:00Z",
    });
  });

  it("refuses --file together with a flag", async () => {
    await expect(update("--file", "x.json", "--end", "2099-03-01T00:00:00Z")).rejects.toMatchObject(
      {
        exitCode: 2,
      },
    );
    expect(client.subscriptions.updateOffer).not.toHaveBeenCalled();
  });

  it("refuses --update-mask with flags (the flags build the mask)", async () => {
    await expect(
      update("--end", "2099-03-01T00:00:00Z", "--update-mask", "phases"),
    ).rejects.toMatchObject({ exitCode: 2 });
  });

  it("asks for --file or a flag when neither is given", async () => {
    await expect(update()).rejects.toMatchObject({ exitCode: 2 });
  });

  it("refuses a bad duration before credentials are needed", async () => {
    const { getClient } = await import("../src/resolve.js");
    vi.mocked(getClient).mockClear();
    await expect(update("--min-duration", "3m")).rejects.toMatchObject({
      code: "RETENTION_FLAG_INVALID",
      exitCode: 2,
    });
    expect(getClient).not.toHaveBeenCalled();
  });
});
