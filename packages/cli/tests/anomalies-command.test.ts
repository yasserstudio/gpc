import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

const mockGetVitalsAnomalies = vi.fn();

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    getVitalsAnomalies: mockGetVitalsAnomalies,
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
    createReportingClient: vi.fn().mockReturnValue({}),
  };
});

describe("anomalies list command", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
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
      .option("-j, --json", "JSON mode");
    return program;
  }

  it("prints 'No anomalies detected.' when result is empty", async () => {
    mockGetVitalsAnomalies.mockResolvedValue({ anomalies: [] });

    const { registerAnomaliesCommands } = await import("../src/commands/anomalies.js");
    const program = makeProgram();
    registerAnomaliesCommands(program);

    await program.parseAsync(["node", "gpc", "anomalies", "list"]);

    expect(console.log).toHaveBeenCalledWith("No anomalies detected.");
  });

  it("prints table rows when anomalies are returned", async () => {
    mockGetVitalsAnomalies.mockResolvedValue({
      anomalies: [
        {
          name: "apps/com.example/anomalies/1",
          metricSet: "crashRateMetricSet",
          aggregationPeriod: "DAILY",
        },
      ],
    });

    const { registerAnomaliesCommands } = await import("../src/commands/anomalies.js");
    const program = makeProgram();
    registerAnomaliesCommands(program);

    await program.parseAsync(["node", "gpc", "anomalies", "list"]);

    expect(console.log).toHaveBeenCalled();
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? "";
    expect(output).toContain("crashRateMetricSet");
  });

  it("outputs JSON when --output json flag is set", async () => {
    const rawResult = { anomalies: [{ name: "apps/com.example/anomalies/1" }] };
    mockGetVitalsAnomalies.mockResolvedValue(rawResult);

    const { registerAnomaliesCommands } = await import("../src/commands/anomalies.js");
    const program = makeProgram();
    registerAnomaliesCommands(program);

    await program.parseAsync(["node", "gpc", "anomalies", "list", "--output", "json"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? "";
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("anomalies");
  });

  it("handles empty result object (no anomalies key)", async () => {
    mockGetVitalsAnomalies.mockResolvedValue({});

    const { registerAnomaliesCommands } = await import("../src/commands/anomalies.js");
    const program = makeProgram();
    registerAnomaliesCommands(program);

    await program.parseAsync(["node", "gpc", "anomalies", "list"]);

    expect(console.log).toHaveBeenCalledWith("No anomalies detected.");
  });
});
