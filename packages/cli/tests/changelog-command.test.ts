import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

const mockFetchChangelog = vi.fn();
const mockFormatChangelogEntry = vi.fn();
const mockGenerateChangelog = vi.fn();
const mockResolveLocales = vi.fn();
const mockGetClient = vi.fn();

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    fetchChangelog: mockFetchChangelog,
    formatChangelogEntry: mockFormatChangelogEntry,
    generateChangelog: mockGenerateChangelog,
    resolveLocales: mockResolveLocales,
    formatOutput: actual.formatOutput,
    RENDERERS: actual.RENDERERS,
    renderPlayStore: actual.renderPlayStore,
    GpcError: actual.GpcError,
  };
});

vi.mock("../src/resolve.js", () => ({
  resolvePackageName: () => "com.example.app",
  getClient: (...args: unknown[]) => mockGetClient(...args),
}));

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ output: "table" }),
  };
});

describe("changelog command", () => {
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
    program.option("-o, --output <format>", "Output format");
    return program;
  }

  it("does not crash when invoked (Bug AA regression)", async () => {
    mockFetchChangelog.mockResolvedValue([
      { version: "v0.9.44", date: "2026-03-24", title: "changelog command", body: "" },
    ]);
    mockFormatChangelogEntry.mockReturnValue("v0.9.44 — changelog command");

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    // Should not throw — Bug AA was getOutputFormat called without config
    await program.parseAsync(["node", "gpc", "changelog"]);

    expect(mockFetchChangelog).toHaveBeenCalled();
  });

  it("prints 'No releases found.' when empty", async () => {
    mockFetchChangelog.mockResolvedValue([]);

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog"]);

    expect(console.log).toHaveBeenCalledWith("No releases found.");
  });

  it("passes --tag value to fetchChangelog as version (Bug AC fix)", async () => {
    mockFetchChangelog.mockResolvedValue([
      { version: "v0.9.46", date: "2026-03-27", title: "error handling", body: "details" },
    ]);
    mockFormatChangelogEntry.mockReturnValue("v0.9.46 — error handling");

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "--tag", "v0.9.46"]);

    expect(mockFetchChangelog).toHaveBeenCalledWith(
      expect.objectContaining({ version: "v0.9.46" }),
    );
    expect(mockFormatChangelogEntry).toHaveBeenCalled();
  });

  it("outputs JSON when --output json is passed", async () => {
    mockFetchChangelog.mockResolvedValue([
      { version: "v0.9.44", date: "2026-03-24", title: "test", body: "body" },
    ]);

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "--output", "json"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(() => JSON.parse(output)).not.toThrow();
  });
});

describe("changelog generate subcommand", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.exitCode = undefined;
    mockResolveLocales.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  function makeProgram() {
    const program = new Command();
    program.option("-o, --output <format>", "Output format");
    return program;
  }

  function makeGenerated(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      from: "v0.9.59",
      to: "v0.9.60",
      repo: "yasserstudio/gpc",
      rawCommitCount: 2,
      commits: [],
      clusters: [
        {
          id: "completion",
          label: "completion",
          commits: [
            {
              sha: "abc1234",
              type: "feat",
              subject: "shell completion walker",
              files: ["packages/cli/src/commands/completion.ts"],
              weight: 50,
              isRevert: false,
              isFixup: false,
              authorDate: "2026-04-15T12:00:00Z",
            },
          ],
          weight: 50,
          primaryType: "feat",
        },
      ],
      grouped: {
        feat: [
          {
            sha: "abc1234",
            type: "feat",
            subject: "shell completion walker",
            files: ["packages/cli/src/commands/completion.ts"],
            weight: 50,
            isRevert: false,
            isFixup: false,
            authorDate: "2026-04-15T12:00:00Z",
          },
        ],
      },
      headlineCandidates: [],
      warnings: [],
      ...overrides,
    };
  }

  it("calls generateChangelog when 'generate' subcommand is invoked", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync([
      "node",
      "gpc",
      "changelog",
      "generate",
      "--from",
      "v0.9.59",
      "--to",
      "v0.9.60",
    ]);

    expect(mockGenerateChangelog).toHaveBeenCalledWith(
      expect.objectContaining({ from: "v0.9.59", to: "v0.9.60" }),
    );
  });

  it("--output json from generate subcommand produces valid JSON", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate", "--format", "json"]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("prints linter warnings to stderr, not stdout", async () => {
    mockGenerateChangelog.mockResolvedValue(
      makeGenerated({ warnings: ['jargon: "mutex" in subject "..."'] }),
    );

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate"]);

    const stderrCalls = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    const stdoutCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderrCalls).toContain("mutex");
    expect(stdoutCalls).not.toContain("warn:");
  });

  it("--strict with warnings sets exit code to 1", async () => {
    mockGenerateChangelog.mockResolvedValue(
      makeGenerated({ warnings: ['jargon: "mutex" in subject "..."'] }),
    );

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate", "--strict"]);

    expect(process.exitCode).toBe(1);
  });

  it("--strict with zero warnings does NOT exit 1", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated({ warnings: [] }));

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate", "--strict"]);

    expect(process.exitCode).toBeUndefined();
  });

  it("invalid --format value exits with code 2 and writes to stderr", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate", "--format", "yaml"]);

    expect(process.exitCode).toBe(2);
    expect(mockGenerateChangelog).not.toHaveBeenCalled();
    const stderr = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderr).toContain("Invalid --format");
  });

  it("invalid --repo value exits with code 2 and writes to stderr", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync([
      "node",
      "gpc",
      "changelog",
      "generate",
      "--repo",
      "https://evil.com/foo",
    ]);

    expect(process.exitCode).toBe(2);
    expect(mockGenerateChangelog).not.toHaveBeenCalled();
    const stderr = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderr).toContain("Invalid --repo");
  });

  it("--target play-store without --locales exits 2 with CHANGELOG_LOCALES_REQUIRED hint", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate", "--target", "play-store"]);

    expect(process.exitCode).toBe(2);
    expect(mockGenerateChangelog).not.toHaveBeenCalled();
    const stderr = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderr).toContain("--target play-store requires --locales");
    expect(stderr).toContain("--locales auto");
  });

  it("--target play-store with explicit --locales calls renderPlayStore", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());
    mockResolveLocales.mockResolvedValue(["en-US", "fr-FR"]);

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync([
      "node",
      "gpc",
      "changelog",
      "generate",
      "--target",
      "play-store",
      "--locales",
      "en-US,fr-FR",
      "--format",
      "json",
    ]);

    expect(mockResolveLocales).toHaveBeenCalledWith("en-US,fr-FR");
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.locales.map((l: { language: string }) => l.language)).toEqual(["en-US", "fr-FR"]);
    expect(parsed.limit).toBe(500);
  });

  it("--target play-store --locales auto routes through API client", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());
    mockResolveLocales.mockResolvedValue(["en-US", "fr-FR", "de-DE"]);
    const fakeClient = { edits: {}, listings: {} };
    mockGetClient.mockResolvedValue(fakeClient);

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync([
      "node",
      "gpc",
      "changelog",
      "generate",
      "--target",
      "play-store",
      "--locales",
      "auto",
      "--format",
      "json",
    ]);

    expect(mockGetClient).toHaveBeenCalled();
    expect(mockResolveLocales).toHaveBeenCalledWith("auto", {
      client: fakeClient,
      packageName: "com.example.app",
    });
  });

  it("--strict exits 1 when play-store output overflows a locale", async () => {
    const longSubject = "x".repeat(600);
    mockGenerateChangelog.mockResolvedValue(
      makeGenerated({
        grouped: {
          feat: [
            {
              sha: "abc",
              type: "feat",
              subject: longSubject,
              files: [],
              weight: 1,
              isRevert: false,
              isFixup: false,
              authorDate: "2026-04-15T12:00:00Z",
            },
          ],
        },
      }),
    );
    mockResolveLocales.mockResolvedValue(["en-US"]);

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync([
      "node",
      "gpc",
      "changelog",
      "generate",
      "--target",
      "play-store",
      "--locales",
      "en-US",
      "--strict",
    ]);

    expect(process.exitCode).toBe(1);
    const stderr = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderr).toContain("en-US exceeds 500 chars");
  });

  it("invalid --target exits 2", async () => {
    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate", "--target", "bogus"]);

    expect(process.exitCode).toBe(2);
    const stderr = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderr).toContain("Invalid --target");
  });

  it("--locales without --target play-store exits 2", async () => {
    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate", "--locales", "en-US"]);

    expect(process.exitCode).toBe(2);
    const stderr = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderr).toContain("--locales only applies to --target play-store");
  });

  it("--apply without --target play-store exits 2", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync(["node", "gpc", "changelog", "generate", "--apply"]);

    expect(process.exitCode).toBe(2);
    const stderr = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderr).toContain("--apply only applies to --target play-store");
  });

  it("--apply with --format prompt exits 2", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    registerChangelogCommand(program);

    await program.parseAsync([
      "node",
      "gpc",
      "changelog",
      "generate",
      "--target",
      "play-store",
      "--locales",
      "en-US",
      "--format",
      "prompt",
      "--apply",
    ]);

    expect(process.exitCode).toBe(2);
    const stderr = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join("");
    expect(stderr).toContain("--apply cannot be combined with --format prompt");
  });

  it("--apply --dry-run prints preview JSON without API call", async () => {
    mockGenerateChangelog.mockResolvedValue(makeGenerated());
    mockResolveLocales.mockResolvedValue(["en-US"]);

    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    const program = makeProgram();
    program.option("--dry-run", "Dry run");
    registerChangelogCommand(program);

    await program.parseAsync([
      "node",
      "gpc",
      "changelog",
      "generate",
      "--target",
      "play-store",
      "--locales",
      "en-US",
      "--apply",
      "--dry-run",
    ]);

    // Should have printed the rendered play-store output first, then the dry-run preview
    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]));
    const dryRunOutput = logCalls.find((c) => c.includes("dryRun"));
    expect(dryRunOutput).toBeDefined();
    const parsed = JSON.parse(dryRunOutput!);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.action).toBe("apply release notes");
    expect(parsed.packageName).toBe("com.example.app");
  });
});
