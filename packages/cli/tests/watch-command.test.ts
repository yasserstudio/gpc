import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies before importing the command
vi.mock("@gpc-cli/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({
    app: "com.example.app",
    auth: { serviceAccount: "/tmp/sa.json" },
  }),
}));

vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn().mockResolvedValue({
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
    getClientEmail: vi.fn().mockReturnValue("test@test.iam.gserviceaccount.com"),
  }),
}));

vi.mock("@gpc-cli/api", () => ({
  createApiClient: vi.fn().mockReturnValue({}),
  createReportingClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@gpc-cli/core", async () => {
  const actual = await vi.importActual("@gpc-cli/core");
  return {
    ...actual,
    runWatch: vi.fn().mockResolvedValue({
      rounds: 1,
      durationMs: 60_000,
      finalRollout: 0.1,
      breachCount: 0,
      halted: false,
      events: [],
    }),
  };
});

import { Command } from "commander";
import { registerWatchCommand } from "../src/commands/watch.js";
import { runWatch, VALID_WATCH_METRICS } from "@gpc-cli/core";

const mockRunWatch = vi.mocked(runWatch);

describe("watch command", () => {
  let program: Command;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.option("--app <package>");
    program.option("-o, --output <format>");
    program.option("--json");
    registerWatchCommand(program);
  });

  it("registers the watch command", () => {
    const watchCmd = program.commands.find((c) => c.name() === "watch");
    expect(watchCmd).toBeDefined();
    expect(watchCmd!.description()).toContain("Monitor");
  });

  it("has all expected options", () => {
    const watchCmd = program.commands.find((c) => c.name() === "watch")!;
    const optNames = watchCmd.options.map((o) => o.long);
    expect(optNames).toContain("--track");
    expect(optNames).toContain("--metrics");
    expect(optNames).toContain("--interval");
    expect(optNames).toContain("--rounds");
    expect(optNames).toContain("--crash-threshold");
    expect(optNames).toContain("--anr-threshold");
    expect(optNames).toContain("--lmk-threshold");
    expect(optNames).toContain("--on-breach");
    expect(optNames).toContain("--webhook-url");
  });

  it("defaults track to production", () => {
    const watchCmd = program.commands.find((c) => c.name() === "watch")!;
    const trackOpt = watchCmd.options.find((o) => o.long === "--track");
    expect(trackOpt?.defaultValue).toBe("production");
  });

  it("defaults metrics to crashes,anr", () => {
    const watchCmd = program.commands.find((c) => c.name() === "watch")!;
    const metricsOpt = watchCmd.options.find((o) => o.long === "--metrics");
    expect(metricsOpt?.defaultValue).toBe("crashes,anr");
  });

  it("defaults interval to 900", () => {
    const watchCmd = program.commands.find((c) => c.name() === "watch")!;
    const intervalOpt = watchCmd.options.find((o) => o.long === "--interval");
    expect(intervalOpt?.defaultValue).toBe("900");
  });

  it("defaults on-breach to notify", () => {
    const watchCmd = program.commands.find((c) => c.name() === "watch")!;
    const breachOpt = watchCmd.options.find((o) => o.long === "--on-breach");
    expect(breachOpt?.defaultValue).toBe("notify");
  });

  it("calls runWatch with parsed config", async () => {
    await program.parseAsync([
      "node",
      "gpc",
      "--app",
      "com.test.app",
      "watch",
      "--track",
      "beta",
      "--metrics",
      "crashes",
      "--interval",
      "120",
      "--rounds",
      "5",
      "--crash-threshold",
      "0.03",
    ]);

    expect(mockRunWatch).toHaveBeenCalledTimes(1);
    const config = mockRunWatch.mock.calls[0]![2];
    expect(config.packageName).toBe("com.test.app");
    expect(config.track).toBe("beta");
    expect(config.metrics).toEqual(["crashes"]);
    expect(config.intervalSeconds).toBe(120);
    expect(config.maxRounds).toBe(5);
    expect(config.thresholds.crashes).toBe(0.03);
  });

  it("sets exit code 6 on breach", async () => {
    mockRunWatch.mockResolvedValueOnce({
      rounds: 1,
      durationMs: 60_000,
      finalRollout: 0.1,
      breachCount: 1,
      halted: false,
      events: [],
    });

    await program.parseAsync(["node", "gpc", "--app", "com.test.app", "watch", "--rounds", "1"]);

    expect(process.exitCode).toBe(6);
    process.exitCode = undefined;
  });

  it("sets exit code 0 on clean run", async () => {
    await program.parseAsync(["node", "gpc", "--app", "com.test.app", "watch", "--rounds", "1"]);

    expect(process.exitCode).toBe(0);
    process.exitCode = undefined;
  });
});

describe("VALID_WATCH_METRICS (re-exported)", () => {
  it("has 6 metrics", () => {
    expect(VALID_WATCH_METRICS.size).toBe(6);
  });
});
