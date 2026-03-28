import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

const mockGetVitalsCrashes = vi.fn();
const mockGetVitalsAnr = vi.fn();
const mockGetVitalsLmk = vi.fn();
const mockCheckThreshold = vi.fn().mockReturnValue({ breached: false });

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    getVitalsCrashes: mockGetVitalsCrashes,
    getVitalsAnr: mockGetVitalsAnr,
    getVitalsLmk: mockGetVitalsLmk,
    checkThreshold: mockCheckThreshold,
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

describe("vitals commands — 403 graceful degradation (Bug Q)", () => {
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

  it("vitals crashes degrades gracefully on 403", async () => {
    const { PlayApiError } = await import("@gpc-cli/api");
    mockGetVitalsCrashes.mockRejectedValue(
      new PlayApiError("Forbidden", "API_FORBIDDEN", 403),
    );

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    registerVitalsCommands(program);

    await program.parseAsync(["node", "gpc", "vitals", "crashes"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("No vitals data available");
    expect(output).toContain("Reporting API");
  });

  it("vitals crashes returns empty JSON on 403 in JSON mode", async () => {
    const { PlayApiError } = await import("@gpc-cli/api");
    mockGetVitalsCrashes.mockRejectedValue(
      new PlayApiError("Forbidden", "API_FORBIDDEN", 403),
    );

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    registerVitalsCommands(program);

    await program.parseAsync(["node", "gpc", "vitals", "crashes", "--output", "json"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? "";
    const parsed = JSON.parse(output);
    expect(parsed.rows).toEqual([]);
    expect(parsed.message).toContain("Reporting API");
  });

  it("vitals anr degrades gracefully on 403", async () => {
    const { PlayApiError } = await import("@gpc-cli/api");
    mockGetVitalsAnr.mockRejectedValue(
      new PlayApiError("Forbidden", "API_FORBIDDEN", 403),
    );

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    registerVitalsCommands(program);

    await program.parseAsync(["node", "gpc", "vitals", "anr"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("No vitals data available");
  });

  it("vitals lmk degrades gracefully on 403", async () => {
    const { PlayApiError } = await import("@gpc-cli/api");
    mockGetVitalsLmk.mockRejectedValue(
      new PlayApiError("Forbidden", "API_FORBIDDEN", 403),
    );

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    registerVitalsCommands(program);

    await program.parseAsync(["node", "gpc", "vitals", "lmk"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("No vitals data available");
  });

  it("re-throws non-403 errors from vitals commands", async () => {
    const { PlayApiError } = await import("@gpc-cli/api");
    mockGetVitalsCrashes.mockRejectedValue(
      new PlayApiError("Internal Error", "API_INTERNAL", 500),
    );

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    program.exitOverride();
    registerVitalsCommands(program);

    await expect(
      program.parseAsync(["node", "gpc", "vitals", "crashes"]),
    ).rejects.toThrow("Internal Error");
  });
});
