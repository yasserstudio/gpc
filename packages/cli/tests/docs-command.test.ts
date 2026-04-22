import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { mkdtemp, rm, readFile as fsReadFile, writeFile as fsWriteFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerDocsCommand } from "../src/commands/docs.js";

function makeProgram(json = false): Command {
  const program = new Command();
  program.option("-o, --output <format>", "Output format");
  registerDocsCommand(program);
  if (json) {
    program.setOptionValue("output", "json");
  }
  return program;
}

async function run(
  args: string[],
  opts?: { json?: boolean },
): Promise<{ stdout: string; stderr: string; exitCode?: number }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  const origWrite = process.stderr.write;
  console.log = (...a: unknown[]) => stdout.push(a.join(" "));
  console.error = (...a: unknown[]) => stderr.push(a.join(" "));
  process.stderr.write = ((s: string) => {
    stderr.push(s);
    return true;
  }) as typeof process.stderr.write;
  process.exitCode = undefined;

  const program = makeProgram(opts?.json);
  program.exitOverride();
  try {
    await program.parseAsync(["node", "gpc", ...args]);
  } catch (e: any) {
    if (e.exitCode !== undefined || e.code) {
      return { stdout: stdout.join("\n"), stderr: stderr.join("\n"), exitCode: e.exitCode ?? 1 };
    }
    throw e;
  } finally {
    console.log = origLog;
    console.error = origErr;
    process.stderr.write = origWrite;
    process.exitCode = undefined;
  }
  return { stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

describe("docs list", () => {
  it("lists topics with section headings", async () => {
    const { stdout } = await run(["docs", "list"]);
    expect(stdout).toContain("COMMANDS");
    expect(stdout).toContain("GUIDE");
    expect(stdout).toContain("topics");
  });

  it("supports --json output", async () => {
    const { stdout } = await run(["docs", "list"], { json: true });
    const data = JSON.parse(stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(10);
    expect(data[0]).toHaveProperty("slug");
    expect(data[0]).toHaveProperty("section");
    expect(data[0]).toHaveProperty("title");
  });
});

describe("docs show", () => {
  it("renders content for exact slug", async () => {
    const { stdout } = await run(["docs", "show", "authentication"]);
    expect(stdout).toContain("Authentication");
  });

  it("fuzzy-matches partial slug", async () => {
    const { stdout } = await run(["docs", "show", "auth"]);
    expect(stdout).toContain("Authentication");
  });

  it("exits with error for unknown topic", async () => {
    const result = await run(["docs", "show", "xyznonexistent"]);
    expect(result.exitCode).toBeDefined();
  });

  it("supports --json output", async () => {
    const { stdout } = await run(["docs", "show", "releases"], { json: true });
    const data = JSON.parse(stdout);
    expect(data).toHaveProperty("slug", "commands/releases");
    expect(data).toHaveProperty("content");
  });
});

describe("docs search", () => {
  it("returns matching results", async () => {
    const { stdout } = await run(["docs", "search", "rollout"]);
    expect(stdout).toContain("rollout");
  });

  it("returns empty message for no results", async () => {
    const { stdout } = await run(["docs", "search", "xyznonexistent"]);
    expect(stdout).toContain("No results");
  });

  it("supports --json output", async () => {
    const { stdout } = await run(["docs", "search", "authentication"], { json: true });
    const data = JSON.parse(stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty("slug");
    expect(data[0]).toHaveProperty("score");
  });
});

describe("docs init", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-docs-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates GPC.md in specified directory", async () => {
    const { stdout } = await run(["docs", "init", "--path", tmpDir]);
    expect(stdout).toContain("Created");
    const content = await fsReadFile(join(tmpDir, "GPC.md"), "utf-8");
    expect(content).toContain("# GPC Quick Reference");
    expect(content).toContain("gpc docs show");
  });

  it("refuses overwrite without --force", async () => {
    await fsWriteFile(join(tmpDir, "GPC.md"), "existing", "utf-8");
    const result = await run(["docs", "init", "--path", tmpDir]);
    expect(result.exitCode).toBeDefined();
  });

  it("overwrites with --force", async () => {
    await fsWriteFile(join(tmpDir, "GPC.md"), "existing", "utf-8");
    const { stdout } = await run(["docs", "init", "--force", "--path", tmpDir]);
    expect(stdout).toContain("Created");
    const content = await fsReadFile(join(tmpDir, "GPC.md"), "utf-8");
    expect(content).toContain("# GPC Quick Reference");
  });

  it("updates CLAUDE.md if it exists", async () => {
    await fsWriteFile(join(tmpDir, "CLAUDE.md"), "# Project\n", "utf-8");
    await run(["docs", "init", "--path", tmpDir]);
    const content = await fsReadFile(join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("@GPC.md");
  });
});

describe("docs web", () => {
  it("does not throw for bare web command", async () => {
    // execFile will fail in test env (no browser), but the command itself shouldn't throw
    const result = await run(["docs", "web"]);
    expect(result.exitCode).toBeUndefined();
  });
});
