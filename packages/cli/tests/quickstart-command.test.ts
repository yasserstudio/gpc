import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Bug M regression: gpc quickstart was passing --quiet to doctor spawnSync,
// which Commander treated as an unknown subcommand option → exit 1.

vi.mock("@gpc-cli/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({
    app: "com.example.app",
    profile: "default",
    auth: { serviceAccount: "/path/to/sa.json" },
  }),
}));

vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn().mockResolvedValue({
    getClientEmail: () => "ci@example.iam.gserviceaccount.com",
  }),
}));

// Capture the args passed to spawnSync (Bug M: must not include --quiet)
let lastSpawnArgs: string[] = [];
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawnSync: vi.fn((_cmd: string, args: string[]) => {
      lastSpawnArgs = args ?? [];
      return { status: 0, stdout: "", stderr: "" };
    }),
  };
});

describe("gpc quickstart (Bug M regression)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    lastSpawnArgs = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("does not pass --quiet to doctor spawnSync args", async () => {
    const { registerQuickstartCommand } = await import("../src/commands/quickstart.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerQuickstartCommand(program);

    await program.parseAsync(["node", "gpc", "quickstart"]);

    // doctor args must not contain --quiet
    expect(lastSpawnArgs).not.toContain("--quiet");
  });

  it("passes 'doctor' as the subcommand to spawnSync", async () => {
    const { registerQuickstartCommand } = await import("../src/commands/quickstart.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerQuickstartCommand(program);

    await program.parseAsync(["node", "gpc", "quickstart"]);

    expect(lastSpawnArgs).toContain("doctor");
  });

  it("prints next-steps when all checks pass", async () => {
    const { registerQuickstartCommand } = await import("../src/commands/quickstart.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerQuickstartCommand(program);

    await program.parseAsync(["node", "gpc", "quickstart"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .flat()
      .map(String)
      .join("\n");
    expect(output).toContain("Ready");
    expect(output).toContain("gpc status");
  });
});
