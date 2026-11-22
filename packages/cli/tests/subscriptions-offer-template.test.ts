import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateRetentionOffer } from "@gpc-cli/core";
import { handleCliError } from "../src/error-handler.js";

// Drives the REAL createProgram(). The template is offline: it must never build
// an API client, and its output must pass the same check `offers create` runs.

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

describe("subscriptions offers template retention", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => {
    vi.restoreAllMocks();
    getClient.mockClear();
  });

  it("prints a cohort offer that passes the retention check", async () => {
    const out = JSON.parse(await runCli("subscriptions", "offers", "template", "retention"));
    expect(out.targeting.retentionRule).toEqual({
      scope: { thisSubscription: {} },
      minDuration: "P90D",
      allowMultipleClaims: true,
      minOfferCooldownDuration: "P180D",
    });
    expect(validateRetentionOffer(out)).toEqual([]);
    expect(getClient).not.toHaveBeenCalled();
  });

  it("--per-user prints a per-user offer that passes the retention check", async () => {
    const out = JSON.parse(
      await runCli("subscriptions", "offers", "template", "retention", "--per-user"),
    );
    expect(out.targeting).toEqual({ retentionPerUserRule: {} });
    expect(validateRetentionOffer(out)).toEqual([]);
    expect(getClient).not.toHaveBeenCalled();
  });
});

describe("subscriptions offers create with a retention file", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getClient.mockReset();
  });

  it("lists every problem, exits 2 and never calls Google", async () => {
    const createOffer = vi.fn();
    getClient.mockResolvedValue({ subscriptions: { createOffer } });
    const dir = mkdtempSync(join(tmpdir(), "gpc-retention-"));
    const file = join(dir, "offer.json");
    writeFileSync(
      file,
      JSON.stringify({
        offerId: "retention-50off-2m",
        targeting: {
          retentionRule: {
            scope: { thisSubscription: {} },
            minDuration: "P3M",
            allowMultipleClaims: true,
          },
        },
        regionalConfigs: [{ regionCode: "US", newSubscriberAvailability: true }],
        phases: [
          {
            recurrenceCount: 2,
            duration: "P1M",
            regionalConfigs: [{ regionCode: "US", price: { currencyCode: "USD", units: "1" } }],
          },
        ],
      }),
    );
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((m: unknown) => void errors.push(String(m)));
    let caught: unknown;
    try {
      await runCli("subscriptions", "offers", "create", "premium", "monthly-base", "--file", file);
    } catch (e) {
      caught = e;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(handleCliError(caught)).toBe(2);
    const printed = errors.join("\n");
    expect(printed).toContain("RETENTION_OFFER_INVALID");
    expect(printed).toContain("4 problems");
    for (const f of [
      "minDuration",
      "minOfferCooldownDuration",
      "regionalConfigs[0]",
      "relativeDiscount",
    ]) {
      expect(printed).toContain(f);
    }
    expect(createOffer).not.toHaveBeenCalled();
  });
});
