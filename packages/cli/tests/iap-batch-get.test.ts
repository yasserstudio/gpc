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
    const { registerIapCommands } = await import("../src/commands/iap.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerIapCommands(program);

    await expect(
      program.parseAsync(["node", "gpc", "iap", "batch-get"]),
    ).rejects.toMatchObject({
      code: "IAP_BATCH_GET_UNAVAILABLE",
      exitCode: 1,
      message: expect.stringContaining("permanently blocked by Google Play"),
    });
  });

  it("deprecation message mentions alternatives", async () => {
    const { registerIapCommands } = await import("../src/commands/iap.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerIapCommands(program);

    await expect(
      program.parseAsync(["node", "gpc", "iap", "batch-get"]),
    ).rejects.toMatchObject({
      suggestion: expect.stringMatching(/gpc iap get.*gpc iap list/),
    });
  });

  it("makes no API calls (fetch is never called)", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { registerIapCommands } = await import("../src/commands/iap.js");
    const program = new Command();
    program.option("-a, --app <package>", "App package name");
    registerIapCommands(program);

    await expect(
      program.parseAsync(["node", "gpc", "iap", "batch-get"]),
    ).rejects.toMatchObject({
      code: "IAP_BATCH_GET_UNAVAILABLE",
    });

    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
