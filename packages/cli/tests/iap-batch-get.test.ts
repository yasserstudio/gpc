import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

describe("iap batch-get deprecation notice", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints deprecation message and exits with code 1", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error("process.exit");
    });

    const { registerIapCommands } = await import("../src/commands/iap.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerIapCommands(program);

    await expect(program.parseAsync(["node", "gpc", "iap", "batch-get"])).rejects.toThrow(
      "process.exit",
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("permanently blocked by Google Play"),
    );
  });

  it("deprecation message mentions alternatives", async () => {
    vi.spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error("process.exit");
    });

    const { registerIapCommands } = await import("../src/commands/iap.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerIapCommands(program);

    await expect(program.parseAsync(["node", "gpc", "iap", "batch-get"])).rejects.toThrow(
      "process.exit",
    );

    // Both alternatives mentioned in the single deprecation message
    const errorCalls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
    const allMessages = errorCalls.map((call) => String(call[0])).join("\n");
    expect(allMessages).toContain("gpc iap get");
    expect(allMessages).toContain("gpc iap list");
  });

  it("makes no API calls (fetch is never called)", async () => {
    vi.spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error("process.exit");
    });
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { registerIapCommands } = await import("../src/commands/iap.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerIapCommands(program);

    await expect(program.parseAsync(["node", "gpc", "iap", "batch-get"])).rejects.toThrow(
      "process.exit",
    );

    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
