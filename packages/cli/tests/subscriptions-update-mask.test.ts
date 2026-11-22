import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Drives the REAL createProgram() and the real core commands; only the API
// client is faked. Guards the get -> edit -> update round trip: a file saved
// from `get` carries output-only fields that must never reach the updateMask.

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

const client = {
  subscriptions: {
    updateOffer: vi.fn(
      async (_p: string, _s: string, _b: string, _o: string, body: unknown) => body,
    ),
    update: vi.fn(async (_p: string, _s: string, body: unknown) => body),
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

// Shapes copied from Google's monetization.subscriptions{,.basePlans.offers}.get
// responses: `state` (offer) and `archived` (subscription) are output only.
const offerFromGet = {
  packageName: "com.example.app",
  productId: "premium",
  basePlanId: "monthly",
  offerId: "intro",
  state: "ACTIVE",
  phases: [
    {
      recurrenceCount: 1,
      duration: "P1M",
      regionalConfigs: [{ regionCode: "US", relativeDiscount: 0.5 }],
    },
  ],
  targeting: { acquisitionRule: { scope: { anySubscriptionInApp: {} } } },
  regionalConfigs: [{ regionCode: "US", newSubscriberAvailability: true }],
  offerTags: [{ tag: "intro" }],
};

const subscriptionFromGet = {
  packageName: "com.example.app",
  productId: "premium",
  archived: false,
  listings: [{ languageCode: "en-US", title: "Premium", benefits: ["Ad free"] }],
};

describe("update round trip from a `get` file", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gpc-mask-"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
    client.subscriptions.updateOffer.mockClear();
    client.subscriptions.update.mockClear();
  });

  it("offers update masks only the editable offer fields", async () => {
    const file = join(dir, "offer.json");
    writeFileSync(file, JSON.stringify(offerFromGet));
    await runCli(
      "subscriptions",
      "offers",
      "update",
      "premium",
      "monthly",
      "intro",
      "--file",
      file,
    );
    const [, , , , body, mask] = client.subscriptions.updateOffer.mock.calls[0]!;
    expect(mask).toBe("phases,targeting,regionalConfigs,offerTags");
    expect(body).not.toHaveProperty("state");
  });

  it("offers update sends an explicit --update-mask unchanged", async () => {
    const file = join(dir, "offer.json");
    writeFileSync(file, JSON.stringify(offerFromGet));
    await runCli(
      "subscriptions",
      "offers",
      "update",
      "premium",
      "monthly",
      "intro",
      "--file",
      file,
      "--update-mask",
      "offerTags",
    );
    expect(client.subscriptions.updateOffer.mock.calls[0]![5]).toBe("offerTags");
  });

  it("subscriptions update masks only the editable subscription fields", async () => {
    const file = join(dir, "sub.json");
    writeFileSync(file, JSON.stringify(subscriptionFromGet));
    await runCli("subscriptions", "update", "premium", "--file", file);
    const [, , body, mask] = client.subscriptions.update.mock.calls[0]!;
    expect(mask).toBe("listings");
    expect(body).not.toHaveProperty("archived");
  });
});
