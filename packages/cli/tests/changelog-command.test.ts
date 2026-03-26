import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

const mockFetchChangelog = vi.fn();
const mockFormatChangelogEntry = vi.fn();

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    fetchChangelog: mockFetchChangelog,
    formatChangelogEntry: mockFormatChangelogEntry,
    formatOutput: actual.formatOutput,
  };
});

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
