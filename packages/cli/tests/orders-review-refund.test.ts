import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mockReviewOrderRefund = vi.fn();

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    reviewOrderRefund: mockReviewOrderRefund,
  };
});

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
  };
});

vi.mock("@gpc-cli/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/auth")>();
  return {
    ...actual,
    resolveAuth: vi.fn().mockResolvedValue({
      getAccessToken: vi.fn().mockResolvedValue("token"),
      getClientEmail: vi.fn().mockReturnValue("test@example.iam.gserviceaccount.com"),
    }),
  };
});

vi.mock("@gpc-cli/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/api")>();
  return {
    ...actual,
    createApiClient: vi.fn().mockReturnValue({}),
  };
});

describe("purchases orders review-refund", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockReviewOrderRefund.mockResolvedValue({
      packageName: "com.example.app",
      orderId: "GPA.1234",
      refundPreference: "DECLINE",
      sampleContentProvided: true,
      consumptionUsageEventCount: 0,
      submitted: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  function makeProgram() {
    const program = new Command();
    program
      .option("-a, --app <package>", "App package name")
      .option("-o, --output <format>", "Output format")
      .option("-j, --json", "JSON mode")
      .option("-y, --yes", "Skip confirmations")
      .option("--dry-run", "Preview changes without executing")
      .option("--no-interactive", "Disable interactive prompts");
    return program;
  }

  async function run(args: string[]) {
    const { registerPurchasesCommands } = await import("../src/commands/purchases.js");
    const program = makeProgram();
    registerPurchasesCommands(program);
    await program.parseAsync([
      "node",
      "gpc",
      "purchases",
      "orders",
      "review-refund",
      ...args,
      "--no-interactive",
    ]);
    return program;
  }

  it("maps flags onto the core call", async () => {
    await run([
      "GPA.1234",
      "--pending-refund-token",
      "tok-1",
      "--preference",
      "decline",
      "--sample-content-provided",
    ]);

    expect(mockReviewOrderRefund).toHaveBeenCalledWith(
      expect.anything(),
      "com.example.app",
      "GPA.1234",
      {
        pendingRefundToken: "tok-1",
        preference: "decline",
        sampleContentProvided: true,
        consumptionPercentageMilliunits: undefined,
        consumptionUsageEvents: undefined,
      },
    );
  });

  it("converts --consumption-percent to milliunits", async () => {
    await run([
      "GPA.1234",
      "--pending-refund-token",
      "tok-1",
      "--preference",
      "approve",
      "--no-sample-content-provided",
      "--consumption-percent",
      "45.2",
    ]);

    expect(mockReviewOrderRefund).toHaveBeenCalledWith(
      expect.anything(),
      "com.example.app",
      "GPA.1234",
      expect.objectContaining({
        sampleContentProvided: false,
        consumptionPercentageMilliunits: 45200,
      }),
    );
  });

  it("loads usage events from --usage-events-file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-review-refund-"));
    const file = join(dir, "events.json");
    await writeFile(file, JSON.stringify([{ consumptionTime: "2026-08-30T10:15:00Z" }]));

    await run([
      "GPA.1234",
      "--pending-refund-token",
      "tok-1",
      "--preference",
      "neutral",
      "--sample-content-provided",
      "--usage-events-file",
      file,
    ]);

    expect(mockReviewOrderRefund).toHaveBeenCalledWith(
      expect.anything(),
      "com.example.app",
      "GPA.1234",
      expect.objectContaining({
        consumptionUsageEvents: [{ consumptionTime: "2026-08-30T10:15:00Z" }],
      }),
    );
  });

  it("requires an explicit sample-content answer", async () => {
    await expect(
      run(["GPA.1234", "--pending-refund-token", "tok-1", "--preference", "approve"]),
    ).rejects.toMatchObject({ code: "ORDER_REVIEW_REFUND_INVALID", exitCode: 2 });
    expect(mockReviewOrderRefund).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range --consumption-percent", async () => {
    await expect(
      run([
        "GPA.1234",
        "--pending-refund-token",
        "tok-1",
        "--preference",
        "approve",
        "--sample-content-provided",
        "--consumption-percent",
        "101",
      ]),
    ).rejects.toMatchObject({ code: "ORDER_REVIEW_REFUND_INVALID" });
    expect(mockReviewOrderRefund).not.toHaveBeenCalled();
  });

  it("treats an empty --consumption-percent as absent instead of 0%", async () => {
    await run([
      "GPA.1234",
      "--pending-refund-token",
      "tok-1",
      "--preference",
      "approve",
      "--sample-content-provided",
      "--consumption-percent",
      "   ",
    ]);

    expect(mockReviewOrderRefund).toHaveBeenCalledWith(
      expect.anything(),
      "com.example.app",
      "GPA.1234",
      expect.objectContaining({ consumptionPercentageMilliunits: undefined }),
    );
  });

  it.each(["0x10", "1e1", "Infinity", "45.2.1", "abc"])(
    "rejects a non-decimal --consumption-percent (%s)",
    async (value) => {
      await expect(
        run([
          "GPA.1234",
          "--pending-refund-token",
          "tok-1",
          "--preference",
          "approve",
          "--sample-content-provided",
          "--consumption-percent",
          value,
        ]),
      ).rejects.toMatchObject({ code: "ORDER_REVIEW_REFUND_INVALID", exitCode: 2 });
      expect(mockReviewOrderRefund).not.toHaveBeenCalled();
    },
  );

  it("rejects a usage-events file whose entries are not objects", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-review-refund-"));
    const file = join(dir, "events.json");
    await writeFile(file, JSON.stringify([null]));

    await expect(
      run([
        "GPA.1234",
        "--pending-refund-token",
        "tok-1",
        "--preference",
        "approve",
        "--sample-content-provided",
        "--usage-events-file",
        file,
      ]),
    ).rejects.toMatchObject({ code: "ORDER_REVIEW_REFUND_INVALID", exitCode: 2 });
    expect(mockReviewOrderRefund).not.toHaveBeenCalled();
  });

  it("rejects a usage-events file that is not a JSON array", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-review-refund-"));
    const file = join(dir, "events.json");
    await writeFile(file, JSON.stringify({ consumptionTime: "2026-08-30T10:15:00Z" }));

    await expect(
      run([
        "GPA.1234",
        "--pending-refund-token",
        "tok-1",
        "--preference",
        "approve",
        "--sample-content-provided",
        "--usage-events-file",
        file,
      ]),
    ).rejects.toMatchObject({ code: "ORDER_REVIEW_REFUND_INVALID" });
    expect(mockReviewOrderRefund).not.toHaveBeenCalled();
  });

  it("rejects an unknown --preference", async () => {
    const program = makeProgram();
    program.exitOverride();
    const { registerPurchasesCommands } = await import("../src/commands/purchases.js");
    registerPurchasesCommands(program);

    await expect(
      program.parseAsync([
        "node",
        "gpc",
        "purchases",
        "orders",
        "review-refund",
        "GPA.1234",
        "--pending-refund-token",
        "tok-1",
        "--preference",
        "maybe",
        "--sample-content-provided",
      ]),
    ).rejects.toThrow();
    expect(mockReviewOrderRefund).not.toHaveBeenCalled();
  });

  it("does not call the API on --dry-run", async () => {
    await run([
      "GPA.1234",
      "--pending-refund-token",
      "tok-1",
      "--preference",
      "approve",
      "--sample-content-provided",
      "--dry-run",
    ]);
    expect(mockReviewOrderRefund).not.toHaveBeenCalled();
  });
});
