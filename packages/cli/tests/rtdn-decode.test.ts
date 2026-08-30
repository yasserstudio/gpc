import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Drives the REAL createProgram() so the output-format resolution the hint depends
// on is the same one the shipped CLI uses.

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

const PAYLOAD = Buffer.from(
  JSON.stringify({
    version: "1.0",
    packageName: "com.example.app",
    eventTimeMillis: "1700000000000",
    pendingRefundReviewNotification: {
      version: "1.0",
      pendingRefundToken: "abcdefghijklmnopqrstuvwxyz",
      orderId: "GPA.1234",
      refundReason: 7,
    },
  }),
).toString("base64");

const HINT = "The pending refund token is truncated above";

describe("gpc rtdn decode", () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => {
      logs.push(a.join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

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

  it("shows the truncated-token hint on table output", async () => {
    await runCli("rtdn", "decode", PAYLOAD);
    expect(logs.join("\n")).toContain(HINT);
  });

  it("omits the hint on machine-readable output", async () => {
    for (const format of ["csv", "tsv", "yaml", "markdown"]) {
      logs = [];
      await runCli("rtdn", "decode", PAYLOAD, "--output", format);
      expect(logs.join("\n"), format).not.toContain(HINT);
    }
  });
});
