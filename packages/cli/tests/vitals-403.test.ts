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

describe("vitals commands — 403 fails instead of reading as no data", () => {
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
    program.exitOverride();
    return program;
  }

  async function forbidden() {
    const { PlayApiError } = await import("@gpc-cli/api");
    return new PlayApiError("Forbidden", "API_FORBIDDEN", 403);
  }

  function logged(spy: unknown): string {
    return (spy as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]).join("\n");
  }

  it.each([
    ["crashes", mockGetVitalsCrashes],
    ["anr", mockGetVitalsAnr],
    ["lmk", mockGetVitalsLmk],
  ])("vitals %s rethrows a 403 with the Reporting API hint on stderr", async (name, mock) => {
    mock.mockRejectedValue(await forbidden());

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    registerVitalsCommands(program);

    await expect(program.parseAsync(["node", "gpc", "vitals", name])).rejects.toThrow("Forbidden");
    expect(logged(console.error)).toContain("Reporting API");
    expect(logged(console.log)).toBe("");
  });

  it("a 403 never reaches the threshold check", async () => {
    mockGetVitalsCrashes.mockRejectedValue(await forbidden());

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    registerVitalsCommands(program);

    await expect(
      program.parseAsync(["node", "gpc", "vitals", "crashes", "--threshold", "2"]),
    ).rejects.toThrow("Forbidden");
    expect(mockCheckThreshold).not.toHaveBeenCalled();
  });

  it("JSON mode rethrows without printing an empty result", async () => {
    mockGetVitalsCrashes.mockRejectedValue(await forbidden());

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    registerVitalsCommands(program);

    await expect(
      program.parseAsync(["node", "gpc", "vitals", "crashes", "--output", "json"]),
    ).rejects.toThrow("Forbidden");
    expect(logged(console.log)).toBe("");
    expect(logged(console.error)).toBe("");
  });

  it("re-throws non-403 errors without the Reporting API hint", async () => {
    const { PlayApiError } = await import("@gpc-cli/api");
    mockGetVitalsCrashes.mockRejectedValue(new PlayApiError("Internal Error", "API_INTERNAL", 500));

    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = makeProgram();
    registerVitalsCommands(program);

    await expect(program.parseAsync(["node", "gpc", "vitals", "crashes"])).rejects.toThrow(
      "Internal Error",
    );
    expect(logged(console.error)).not.toContain("Reporting API");
  });
});

describe("vitals --threshold fails closed without a metric value", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function run(args: string[]) {
    const { registerVitalsCommands } = await import("../src/commands/vitals.js");
    const program = new Command();
    program.option("-a, --app <package>").option("-o, --output <format>").exitOverride();
    registerVitalsCommands(program);
    return program.parseAsync(["node", "gpc", "vitals", "crashes", ...args]);
  }

  it.each([[[] as string[]], [["--output", "json"]]])(
    "no rows with --threshold rejects THRESHOLD_NO_DATA (%j)",
    async (extra) => {
      mockGetVitalsCrashes.mockResolvedValue({ rows: [] });
      await expect(run(["--threshold", "2", ...extra])).rejects.toMatchObject({
        code: "THRESHOLD_NO_DATA",
        exitCode: 6,
      });
      expect(mockCheckThreshold).not.toHaveBeenCalled();
    },
  );

  it("no rows without --threshold still succeeds", async () => {
    mockGetVitalsCrashes.mockResolvedValue({ rows: [] });
    await run([]);
    const out = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]).join("\n");
    expect(out).toContain("No vitals data available");
  });

  it("a real value still reaches the threshold check", async () => {
    mockGetVitalsCrashes.mockResolvedValue({
      rows: [{ metrics: { crashRate: { decimalValue: { value: "1.5" } } } }],
    });
    await run(["--threshold", "2", "--output", "json"]);
    expect(mockCheckThreshold).toHaveBeenCalledWith(1.5, 2);
  });
});
