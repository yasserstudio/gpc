import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createProgram } from "../src/program";

// ---------------------------------------------------------------------------
// Mock updater module — all I/O is controlled here
// ---------------------------------------------------------------------------
vi.mock("../src/updater", () => ({
  checkForUpdate: vi.fn(),
  fetchChecksums: vi.fn().mockResolvedValue(new Map([["gpc-darwin-arm64", "abc123"]])),
  updateViaNpm: vi.fn().mockResolvedValue(undefined),
  updateViaBrew: vi.fn().mockResolvedValue(undefined),
  updateBinaryInPlace: vi.fn().mockResolvedValue(undefined),
  getPlatformAsset: vi.fn().mockReturnValue("gpc-darwin-arm64"),
  getCurrentBinaryPath: vi.fn().mockReturnValue("/usr/local/bin/gpc"),
  detectInstallMethod: vi.fn().mockReturnValue("npm"),
  cleanupStaleUpdateFiles: vi.fn(),
}));

vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn(),
  loadServiceAccountKey: vi.fn(),
  AuthError: class AuthError extends Error {
    suggestion?: string;
  },
}));

vi.mock("@gpc-cli/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
  setConfigValue: vi.fn(),
  getUserConfigPath: vi.fn().mockReturnValue("/home/user/.config/gpc/config.toml"),
  initConfig: vi.fn(),
  getConfigDir: vi.fn().mockReturnValue("/home/user/.config/gpc"),
  getCacheDir: vi.fn().mockReturnValue("/home/user/.cache/gpc"),
}));

vi.mock("@gpc-cli/core", () => {
  class MockPluginManager {
    async load() {}
    async runBeforeCommand() {}
    async runAfterCommand() {}
    async runOnError() {}
    async runBeforeRequest() {}
    async runAfterResponse() {}
    getRegisteredCommands() {
      return [];
    }
    getLoadedPlugins() {
      return [];
    }
    hasRequestHooks() {
      return false;
    }
    reset() {}
  }
  return {
    PluginManager: MockPluginManager,
    discoverPlugins: vi.fn().mockResolvedValue([]),
    detectOutputFormat: vi.fn().mockReturnValue("table"),
    formatOutput: vi.fn().mockImplementation((data: unknown) => JSON.stringify(data)),
    createSpinner: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
      fail: vi.fn(),
      update: vi.fn(),
    }),
    scaffoldPlugin: vi.fn(),
  };
});

vi.mock("../src/plugins", () => ({
  loadPlugins: vi.fn().mockResolvedValue({
    load: vi.fn(),
    runBeforeCommand: vi.fn(),
    runAfterCommand: vi.fn(),
    runOnError: vi.fn(),
    runBeforeRequest: vi.fn(),
    runAfterResponse: vi.fn(),
    getRegisteredCommands: vi.fn().mockReturnValue([]),
    getLoadedPlugins: vi.fn().mockReturnValue([]),
    hasRequestHooks: vi.fn().mockReturnValue(false),
    reset: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import * as updaterModule from "../src/updater";

const mockCheckForUpdate = vi.mocked(updaterModule.checkForUpdate);
const mockUpdateViaNpm = vi.mocked(updaterModule.updateViaNpm);
const mockUpdateViaBrew = vi.mocked(updaterModule.updateViaBrew);
const mockUpdateBinaryInPlace = vi.mocked(updaterModule.updateBinaryInPlace);
const mockGetPlatformAsset = vi.mocked(updaterModule.getPlatformAsset);

function makeCheckResult(overrides: Partial<ReturnType<typeof makeDefaultResult>> = {}) {
  return makeDefaultResult(overrides);
}

function makeDefaultResult(overrides: Record<string, unknown> = {}) {
  return {
    current: "0.9.29",
    latest: "0.9.30",
    latestTag: "v0.9.30",
    updateAvailable: true,
    installMethod: "npm" as const,
    release: {
      tag_name: "v0.9.30",
      html_url: "https://github.com/yasserstudio/gpc/releases/tag/v0.9.30",
      assets: [
        {
          name: "gpc-darwin-arm64",
          browser_download_url:
            "https://github.com/yasserstudio/gpc/releases/download/v0.9.30/gpc-darwin-arm64",
          size: 61_000_000,
        },
        {
          name: "checksums.txt",
          browser_download_url:
            "https://github.com/yasserstudio/gpc/releases/download/v0.9.30/checksums.txt",
          size: 320,
        },
      ],
    },
    ...overrides,
  };
}

function mockExit() {
  return vi.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new Error(`process.exit(${code ?? 0})`);
  }) as unknown as ReturnType<typeof vi.spyOn>;
}

async function run(args: string[]) {
  process.argv = ["node", "gpc", ...args];
  const program = await createProgram();
  return program.parseAsync(["node", "gpc", ...args]);
}

function savedArgv() {
  const orig = process.argv;
  return () => {
    process.argv = orig;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("gpc update --check", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let restoreArgv: () => void;

  beforeEach(() => {
    restoreArgv = savedArgv();
    exitSpy = mockExit();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env["__GPC_VERSION"];
    process.env["__GPC_VERSION"] = "0.9.29";
  });

  afterEach(() => {
    restoreArgv();
    exitSpy.mockRestore();
    logSpy.mockRestore();
    vi.mocked(console.error).mockRestore?.();
    delete process.env["__GPC_VERSION"];
    vi.clearAllMocks();
  });

  it("exits 0 and prints 'Already on latest' when no update available", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(
      makeCheckResult({ updateAvailable: false, latest: "0.9.29" }),
    );
    await run(["update", "--check"]);
    expect(exitSpy).not.toHaveBeenCalled();
    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("Already on latest");
  });

  it("shows install method when already on latest version", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(
      makeCheckResult({ updateAvailable: false, latest: "0.9.29", installMethod: "npm" }),
    );
    await run(["update", "--check"]);
    expect(exitSpy).not.toHaveBeenCalled();
    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("Install method");
    expect(output).toContain("npm");
  });

  it("exits 0 and prints version info when update is available", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(makeCheckResult());
    await run(["update", "--check"]);
    expect(exitSpy).not.toHaveBeenCalled();
    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("0.9.29");
    expect(output).toContain("0.9.30");
  });

  it("outputs structured JSON with --output json", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(makeCheckResult());
    await run(["update", "--check", "--output", "json"]);
    const jsonOut = logSpy.mock.calls
      .flat()
      .find((s) => typeof s === "string" && s.startsWith("{"));
    expect(jsonOut).toBeDefined();
    const parsed = JSON.parse(jsonOut as string);
    expect(parsed.updateAvailable).toBe(true);
    expect(parsed.current).toBe("0.9.29");
    expect(parsed.latest).toBe("0.9.30");
    expect(parsed.installMethod).toBe("npm");
  });
});

describe("gpc update (execute)", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let restoreArgv: () => void;

  beforeEach(() => {
    restoreArgv = savedArgv();
    exitSpy = mockExit();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env["__GPC_VERSION"] = "0.9.29";
  });

  afterEach(() => {
    restoreArgv();
    exitSpy.mockRestore();
    logSpy.mockRestore();
    stdoutSpy.mockRestore();
    vi.mocked(console.error).mockRestore?.();
    delete process.env["__GPC_VERSION"];
    vi.clearAllMocks();
  });

  it("calls updateViaNpm for npm install method", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(makeCheckResult({ installMethod: "npm" }));
    await run(["update"]);
    expect(mockUpdateViaNpm).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("0.9.30");
  });

  it("calls updateViaBrew for homebrew install method", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(makeCheckResult({ installMethod: "homebrew" }));
    await run(["update"]);
    expect(mockUpdateViaBrew).toHaveBeenCalledOnce();
  });

  it("calls updateBinaryInPlace for binary install method, showing size", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(makeCheckResult({ installMethod: "binary" }));
    mockGetPlatformAsset.mockReturnValueOnce("gpc-darwin-arm64");
    await run(["update"]);
    expect(mockUpdateBinaryInPlace).toHaveBeenCalledOnce();
    // Size is printed via process.stdout.write (progress line), not console.log
    const stdoutOutput = stdoutSpy.mock.calls.flat().join("\n");
    expect(stdoutOutput).toMatch(/\d+\.\d+ MB/);
  });

  it("--force updates even when already on latest", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(
      makeCheckResult({ updateAvailable: false, latest: "0.9.29" }),
    );
    await run(["update", "--force"]);
    expect(mockUpdateViaNpm).toHaveBeenCalledOnce();
  });

  it("throws typed error with manual instructions for unknown install method", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(makeCheckResult({ installMethod: "unknown" }));
    await expect(run(["update"])).rejects.toMatchObject({
      code: "UPDATE_UNKNOWN_METHOD",
      exitCode: 1,
      suggestion: expect.stringContaining("npm install"),
    });
  });

  it("propagates network error (exitCode 5) from checkForUpdate", async () => {
    mockCheckForUpdate.mockRejectedValueOnce(
      Object.assign(new Error("ECONNREFUSED"), { exitCode: 5 }),
    );
    await expect(run(["update"])).rejects.toThrow();
  });

  it("exits 0 with warning for dev build (version 0.0.0)", async () => {
    process.env["__GPC_VERSION"] = "0.0.0";
    await run(["update"]);
    expect(mockCheckForUpdate).not.toHaveBeenCalled();
    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("development build");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("outputs JSON on success with --output json", async () => {
    mockCheckForUpdate.mockResolvedValueOnce(makeCheckResult({ installMethod: "npm" }));
    await run(["update", "--output", "json"]);
    const jsonOut = logSpy.mock.calls
      .flat()
      .find((s) => typeof s === "string" && s.startsWith("{"));
    expect(jsonOut).toBeDefined();
    const parsed = JSON.parse(jsonOut as string);
    expect(parsed.success).toBe(true);
    expect(parsed.previous).toBe("0.9.29");
    expect(parsed.current).toBe("0.9.30");
    expect(parsed.method).toBe("npm");
  });
});
