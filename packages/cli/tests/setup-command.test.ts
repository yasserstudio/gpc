import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

vi.mock("@gpc-cli/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({
    app: "com.example.app",
    profile: "default",
    auth: { serviceAccount: "/path/to/sa.json" },
  }),
  initConfig: vi.fn().mockResolvedValue("/home/user/.config/gpc/config.json"),
  setConfigValue: vi.fn().mockResolvedValue(undefined),
  getUserConfigPath: vi.fn().mockReturnValue("/home/user/.config/gpc/config.json"),
}));

vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn().mockResolvedValue({
    getClientEmail: () => "ci@example.iam.gserviceaccount.com",
    getAccessToken: vi.fn().mockResolvedValue("token"),
  }),
  loadServiceAccountKey: vi.fn().mockResolvedValue({
    client_email: "ci@example.iam.gserviceaccount.com",
    project_id: "my-project",
  }),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
  };
});

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

describe("gpc setup", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    lastSpawnArgs = [];
    delete process.env["GPC_SERVICE_ACCOUNT"];
    delete process.env["GPC_APP"];
    delete process.env["GOOGLE_APPLICATION_CREDENTIALS"];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("registers the setup command", async () => {
    const { registerSetupCommand } = await import("../src/commands/setup.js");
    const program = new Command();
    program.option("--no-interactive", "Disable interactive prompts");
    registerSetupCommand(program);

    const cmd = program.commands.find((c) => c.name() === "setup");
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toContain("setup");
  });

  it("--auto mode uses resolveAuth and prints success", async () => {
    const { registerSetupCommand } = await import("../src/commands/setup.js");
    const program = new Command();
    program.option("--no-interactive", "Disable interactive prompts");
    registerSetupCommand(program);

    await program.parseAsync(["node", "gpc", "setup", "--auto"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .flat()
      .map(String)
      .join("\n");
    expect(output).toContain("auto mode");
    expect(output).toContain("ci@example.iam.gserviceaccount.com");
  });

  it("--auto mode runs doctor as final step", async () => {
    const { registerSetupCommand } = await import("../src/commands/setup.js");
    const program = new Command();
    program.option("--no-interactive", "Disable interactive prompts");
    registerSetupCommand(program);

    await program.parseAsync(["node", "gpc", "setup", "--auto"]);

    expect(lastSpawnArgs).toContain("doctor");
  });

  it("--auto mode reads GPC_APP from env", async () => {
    process.env["GPC_APP"] = "com.env.app";

    const { registerSetupCommand } = await import("../src/commands/setup.js");
    const program = new Command();
    program.option("--no-interactive", "Disable interactive prompts");
    registerSetupCommand(program);

    await program.parseAsync(["node", "gpc", "setup", "--auto"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .flat()
      .map(String)
      .join("\n");
    expect(output).toContain("com.env.app");
  });

  it("non-interactive non-auto mode skips prompts gracefully", async () => {
    const { registerSetupCommand } = await import("../src/commands/setup.js");
    const program = new Command();
    program.option("--no-interactive", "Disable interactive prompts");
    registerSetupCommand(program);

    await program.parseAsync(["node", "gpc", "setup", "--no-interactive"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .flat()
      .map(String)
      .join("\n");
    expect(output).toContain("non-interactive, skipped");
  });
});
