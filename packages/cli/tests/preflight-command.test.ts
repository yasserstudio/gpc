import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProgram } from "../src/program";

vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn(),
}));

vi.mock("@gpc-cli/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
}));

vi.mock("@gpc-cli/core", async () => {
  const actual = (await vi.importActual("@gpc-cli/core")) as Record<string, unknown>;
  class MockPluginManager {
    async load() {}
    async runBeforeCommand() {}
    async runAfterCommand() {}
    async runOnError() {}
    getCommands() {
      return [];
    }
  }
  return {
    ...actual,
    PluginManager: MockPluginManager,
    discoverPlugins: vi.fn().mockReturnValue([]),
    runPreflight: vi.fn().mockResolvedValue({
      scanners: ["manifest", "permissions"],
      findings: [],
      summary: { critical: 0, error: 0, warning: 0, info: 0 },
      passed: true,
      durationMs: 42,
    }),
    getAllScannerNames: vi.fn().mockReturnValue([
      "manifest",
      "permissions",
      "native-libs",
      "metadata",
      "secrets",
      "billing",
      "privacy",
      "policy",
      "size",
    ]),
    formatOutput: vi.fn().mockReturnValue("{}"),
  };
});

import { runPreflight } from "@gpc-cli/core";

const mockedRunPreflight = vi.mocked(runPreflight);

describe("gpc preflight CLI", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("registers preflight command", async () => {
    const program = await createProgram();
    const cmd = program.commands.find((c) => c.name() === "preflight");
    expect(cmd).toBeDefined();
    expect(cmd!.description()).toContain("compliance scanner");
  });

  it("exits 2 when no file or options given", async () => {
    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "preflight"], { from: "node" });
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it("calls runPreflight with aabPath", async () => {
    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "preflight", "app.aab"], { from: "node" });
    expect(mockedRunPreflight).toHaveBeenCalledWith(
      expect.objectContaining({ aabPath: "app.aab" }),
    );
  });

  it("passes --fail-on to runPreflight", async () => {
    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "preflight", "app.aab", "--fail-on", "warning"], {
      from: "node",
    });
    expect(mockedRunPreflight).toHaveBeenCalledWith(
      expect.objectContaining({ failOn: "warning" }),
    );
  });

  it("passes --scanners to runPreflight", async () => {
    const program = await createProgram();
    await program.parseAsync(
      ["node", "gpc", "preflight", "app.aab", "--scanners", "manifest,permissions"],
      { from: "node" },
    );
    expect(mockedRunPreflight).toHaveBeenCalledWith(
      expect.objectContaining({ scanners: ["manifest", "permissions"] }),
    );
  });

  it("exits 2 for invalid --fail-on value", async () => {
    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "preflight", "app.aab", "--fail-on", "invalid"], {
      from: "node",
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid --fail-on"));
  });

  it("exits 2 for unknown scanner name", async () => {
    const program = await createProgram();
    await program.parseAsync(
      ["node", "gpc", "preflight", "app.aab", "--scanners", "nonexistent"],
      { from: "node" },
    );
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown scanner"));
  });

  it("exits 0 when preflight passes", async () => {
    mockedRunPreflight.mockResolvedValue({
      scanners: ["manifest"],
      findings: [],
      summary: { critical: 0, error: 0, warning: 0, info: 0 },
      passed: true,
      durationMs: 10,
    });

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "preflight", "app.aab"], { from: "node" });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("exits 6 when preflight fails", async () => {
    mockedRunPreflight.mockResolvedValue({
      scanners: ["manifest"],
      findings: [
        {
          scanner: "manifest",
          ruleId: "debuggable-true",
          severity: "critical",
          title: "Debuggable",
          message: "App is debuggable",
        },
      ],
      summary: { critical: 1, error: 0, warning: 0, info: 0 },
      passed: false,
      durationMs: 10,
    });

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "preflight", "app.aab"], { from: "node" });
    expect(exitSpy).toHaveBeenCalledWith(6);
  });

  it("outputs JSON when --output json is used", async () => {
    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "--output", "json", "preflight", "app.aab"], {
      from: "node",
    });
    expect(mockedRunPreflight).toHaveBeenCalled();
  });
});
