import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Bug O regression: gpc quota usage showed [object Object] for topCommands
// because the action called formatOutput() instead of rendering a custom table.

const mockUsage = {
  dailyCallsUsed: 1500,
  dailyCallsLimit: 200_000,
  dailyCallsRemaining: 198_500,
  minuteCallsUsed: 12,
  minuteCallsLimit: 3_000,
  minuteCallsRemaining: 2_988,
  topCommands: [
    { command: "releases.tracks.list", count: 800 },
    { command: "reviews.list", count: 400 },
    { command: "vitals.crashRateMetricSet", count: 300 },
  ],
};

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    getQuotaUsage: vi.fn().mockResolvedValue(mockUsage),
  };
});

describe("gpc quota status (Bug O regression)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function runQuota(subcommand: "status" | "usage") {
    const { registerQuotaCommand } = await import("../src/commands/quota.js");
    const program = new Command();
    program.option("-o, --output <format>", "Output format");
    program.option("-j, --json", "JSON mode");
    registerQuotaCommand(program);
    await program.parseAsync(["node", "gpc", "quota", subcommand]);
    return (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().map(String).join("\n");
  }

  it("quota status — topCommands rendered as padded lines, not [object Object]", async () => {
    const output = await runQuota("status");
    expect(output).not.toContain("[object Object]");
    expect(output).toContain("releases.tracks.list");
    expect(output).toContain("800");
  });

  it("quota usage — topCommands rendered as padded lines, not [object Object]", async () => {
    const output = await runQuota("usage");
    expect(output).not.toContain("[object Object]");
    expect(output).toContain("releases.tracks.list");
    expect(output).toContain("800");
  });

  it("quota status — shows daily and per-minute usage", async () => {
    const output = await runQuota("status");
    expect(output).toContain("Daily:");
    expect(output).toContain("Minute:");
    expect(output).toContain("1,500");
    expect(output).toContain("200,000");
  });

  it("quota usage — matches quota status output exactly", async () => {
    const statusOutput = await runQuota("status");

    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});

    const usageOutput = await runQuota("usage");
    expect(usageOutput).toBe(statusOutput);
  });
});
