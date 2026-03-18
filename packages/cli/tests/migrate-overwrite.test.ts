import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Control variable for simulating .gpcrc.json existence
let gpcrcExists = false;

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    access: vi.fn(async (path: unknown) => {
      if (String(path).endsWith(".gpcrc.json") && !gpcrcExists) {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      }
      // For non-.gpcrc.json paths, always succeed
      return undefined;
    }),
  };
});

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    detectFastlane: vi.fn().mockResolvedValue({
      hasFastfile: true,
      hasAppfile: true,
      hasMetadata: false,
      hasGemfile: false,
      packageName: "com.example.app",
      lanes: [],
      metadataLanguages: [],
      parseWarnings: [],
    }),
    generateMigrationPlan: vi.fn().mockReturnValue({
      config: { app: "com.example.app" },
      checklist: ["Step 1"],
      warnings: [],
    }),
    writeMigrationOutput: vi.fn().mockResolvedValue(["MIGRATION.md", ".gpcrc.json"]),
    formatOutput: actual.formatOutput,
  };
});

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({}),
  };
});

describe("migrate fastlane overwrite guard", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    gpcrcExists = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function runMigrate(args: string[]) {
    const { registerMigrateCommands } = await import("../src/commands/migrate.js");
    const program = new Command();
    program
      .option("-o, --output <format>", "Output format")
      .option("-j, --json", "JSON mode")
      .option("-y, --yes", "Skip confirmation");
    registerMigrateCommands(program);
    await program.parseAsync(["node", "gpc", "migrate", "fastlane", ...args]);
  }

  it("aborts with warning when .gpcrc.json exists and no --yes", async () => {
    gpcrcExists = true;
    const origArgv = process.argv;
    process.argv = ["node", "gpc", "migrate", "fastlane"];

    try {
      await runMigrate([]);
    } finally {
      process.argv = origArgv;
    }

    const { writeMigrationOutput } = await import("@gpc-cli/core");
    expect(writeMigrationOutput).not.toHaveBeenCalled();

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat();
    expect(logCalls.some((c: unknown) => String(c).includes("Aborting"))).toBe(true);
  });

  it("writes file when .gpcrc.json exists and --yes is passed", async () => {
    gpcrcExists = true;
    const origArgv = process.argv;
    process.argv = ["node", "gpc", "migrate", "fastlane", "--yes"];

    try {
      await runMigrate(["--yes"]);
    } finally {
      process.argv = origArgv;
    }

    const { writeMigrationOutput } = await import("@gpc-cli/core");
    expect(writeMigrationOutput).toHaveBeenCalled();
  });

  it("writes file normally when .gpcrc.json does not exist", async () => {
    gpcrcExists = false;
    const origArgv = process.argv;
    process.argv = ["node", "gpc", "migrate", "fastlane"];

    try {
      await runMigrate([]);
    } finally {
      process.argv = origArgv;
    }

    const { writeMigrationOutput } = await import("@gpc-cli/core");
    expect(writeMigrationOutput).toHaveBeenCalled();

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat();
    expect(logCalls.some((c: unknown) => String(c).includes("Aborting"))).toBe(false);
  });

  it("dry-run does not write any files", async () => {
    gpcrcExists = true;
    const origArgv = process.argv;
    process.argv = ["node", "gpc", "migrate", "fastlane", "--dry-run"];

    try {
      await runMigrate(["--dry-run"]);
    } finally {
      process.argv = origArgv;
    }

    const { writeMigrationOutput } = await import("@gpc-cli/core");
    expect(writeMigrationOutput).not.toHaveBeenCalled();
  });
});
