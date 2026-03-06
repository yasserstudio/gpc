import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { createProgram } from "../src/program";

// Mock external dependencies to avoid real file/API operations
vi.mock("@gpc/auth", () => ({
  resolveAuth: vi.fn(),
  loadServiceAccountKey: vi.fn(),
  AuthError: class AuthError extends Error {
    suggestion?: string;
  },
}));

vi.mock("@gpc/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
  setConfigValue: vi.fn().mockResolvedValue(undefined),
  getUserConfigPath: vi.fn().mockReturnValue("/home/user/.config/gpc/config.toml"),
  initConfig: vi.fn().mockResolvedValue("/home/user/.config/gpc/config.toml"),
}));

vi.mock("@gpc/core", () => ({
  detectOutputFormat: vi.fn().mockReturnValue("table"),
  formatOutput: vi.fn().mockImplementation((data: unknown) => JSON.stringify(data)),
  uploadRelease: vi.fn().mockResolvedValue({}),
  getReleasesStatus: vi.fn().mockResolvedValue([]),
  promoteRelease: vi.fn().mockResolvedValue({}),
  updateRollout: vi.fn().mockResolvedValue({}),
  listTracks: vi.fn().mockResolvedValue([]),
}));

vi.mock("@gpc/api", () => ({
  createApiClient: vi.fn().mockReturnValue({
    edits: { insert: vi.fn(), get: vi.fn(), validate: vi.fn(), commit: vi.fn(), delete: vi.fn() },
    details: { get: vi.fn() },
    bundles: { list: vi.fn(), upload: vi.fn() },
    tracks: { list: vi.fn(), get: vi.fn(), update: vi.fn() },
  }),
}));

describe("createProgram", () => {
  let program: Command;

  beforeEach(() => {
    program = createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a Commander program instance", () => {
    expect(program).toBeInstanceOf(Command);
  });

  it('has name "gpc"', () => {
    expect(program.name()).toBe("gpc");
  });

  it('has version "0.0.0"', () => {
    expect(program.version()).toBe("0.0.0");
  });

  it("has all expected commands registered", () => {
    const commandNames = program.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain("auth");
    expect(commandNames).toContain("config");
    expect(commandNames).toContain("doctor");
    expect(commandNames).toContain("docs");
    expect(commandNames).toContain("releases");
    expect(commandNames).toContain("tracks");
    expect(commandNames).toContain("status");
  });

  it("has all expected global options", () => {
    const optionFlags = program.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--output");
    expect(optionFlags).toContain("--verbose");
    expect(optionFlags).toContain("--quiet");
    expect(optionFlags).toContain("--app");
    expect(optionFlags).toContain("--profile");
    expect(optionFlags).toContain("--no-color");
    expect(optionFlags).toContain("--no-interactive");
  });
});

describe("command parsing", () => {
  let program: Command;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = createProgram();
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gpc --help does not throw an unhandled error", async () => {
    try {
      await program.parseAsync(["node", "test", "--help"]);
    } catch (err: unknown) {
      // Commander throws CommanderError with code "commander.helpDisplayed"
      expect((err as { code: string }).code).toBe("commander.helpDisplayed");
    }
  });

  it('gpc --version outputs "0.0.0"', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    try {
      await program.parseAsync(["node", "test", "--version"]);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("commander.version");
    }

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("0.0.0");
  });

  it("gpc auth --help shows auth subcommands", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    // Subcommands inherit exitOverride, but in some Commander versions they
    // write help to stdout without throwing. Handle both cases.
    let threw = false;
    try {
      await program.parseAsync(["node", "test", "auth", "--help"]);
    } catch {
      threw = true;
    }

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    // Whether it threw or not, help text should have been written
    expect(output).toContain("login");
    expect(output).toContain("status");
    expect(output).toContain("logout");
    expect(output).toContain("whoami");
  });

  it("gpc config --help shows config subcommands", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    let threw = false;
    try {
      await program.parseAsync(["node", "test", "config", "--help"]);
    } catch {
      threw = true;
    }

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("init");
    expect(output).toContain("show");
    expect(output).toContain("set");
    expect(output).toContain("path");
  });
});

describe("auth subcommands", () => {
  let program: Command;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = createProgram();
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gpc auth login without flags shows usage help", async () => {
    await program.parseAsync(["node", "test", "auth", "login"]);

    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("Usage: gpc auth login --service-account <path>");
    expect(output).toContain("--adc");
  });
});

describe("config subcommands", () => {
  let program: Command;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = createProgram();
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gpc config path outputs a path string", async () => {
    await program.parseAsync(["node", "test", "config", "path"]);

    expect(logSpy).toHaveBeenCalled();
    const output = String(logSpy.mock.calls[0]![0]);
    expect(output).toContain("/");
    expect(output).toContain("gpc");
  });
});

describe("releases subcommands", () => {
  let program: Command;

  beforeEach(() => {
    program = createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("releases command has all expected subcommands", () => {
    const releasesCmd = program.commands.find((cmd) => cmd.name() === "releases");
    expect(releasesCmd).toBeDefined();
    const subcommandNames = releasesCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("upload");
    expect(subcommandNames).toContain("status");
    expect(subcommandNames).toContain("promote");
    expect(subcommandNames).toContain("rollout");
    expect(subcommandNames).toContain("notes");
  });
});

describe("tracks subcommands", () => {
  let program: Command;

  beforeEach(() => {
    program = createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks command has list subcommand", () => {
    const tracksCmd = program.commands.find((cmd) => cmd.name() === "tracks");
    expect(tracksCmd).toBeDefined();
    const subcommandNames = tracksCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
  });
});

describe("releases rollout subcommands", () => {
  let program: Command;

  beforeEach(() => {
    program = createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rollout command has all expected subcommands", () => {
    const releasesCmd = program.commands.find((cmd) => cmd.name() === "releases");
    expect(releasesCmd).toBeDefined();
    const rolloutCmd = releasesCmd!.commands.find((cmd) => cmd.name() === "rollout");
    expect(rolloutCmd).toBeDefined();
    const subcommandNames = rolloutCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("increase");
    expect(subcommandNames).toContain("halt");
    expect(subcommandNames).toContain("resume");
    expect(subcommandNames).toContain("complete");
  });
});
