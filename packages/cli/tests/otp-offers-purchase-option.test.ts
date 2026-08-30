import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Drives the REAL createProgram() so Commander's own required-option handling is
// exercised, not a synthetic root with a partial option set.

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

const getClient = vi.fn().mockResolvedValue({});
vi.mock("../src/resolve.js", () => ({
  resolvePackageName: vi.fn().mockReturnValue("com.example.app"),
  getClient,
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

describe("gpc one-time-products offers --purchase-option", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // The batch-backed singular routes need a concrete purchase option, so omitting
  // the flag is a usage error up front instead of an API_INVALID_INPUT round trip.
  const cases: Array<[string, string[]]> = [
    ["get", ["one-time-products", "offers", "get", "otp1", "offer1"]],
    ["create", ["one-time-products", "offers", "create", "otp1", "--file", "/tmp/offer.json"]],
    [
      "update",
      ["one-time-products", "offers", "update", "otp1", "offer1", "--file", "/tmp/offer.json"],
    ],
    ["delete", ["one-time-products", "offers", "delete", "otp1", "offer1", "--yes"]],
  ];

  for (const [name, argv] of cases) {
    it(`offers ${name} refuses to run without --purchase-option`, async () => {
      await expect(runCli(...argv)).rejects.toMatchObject({
        code: "commander.missingMandatoryOptionValue",
      });
      expect(getClient).not.toHaveBeenCalled();
    });
  }
});
