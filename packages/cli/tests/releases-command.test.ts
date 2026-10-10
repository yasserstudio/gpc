import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createProgram } from "../src/program";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../src/updater", () => ({
  checkForUpdate: vi.fn(),
  fetchChecksums: vi.fn().mockResolvedValue(new Map()),
  updateViaNpm: vi.fn().mockResolvedValue(undefined),
  updateViaBrew: vi.fn().mockResolvedValue(undefined),
  updateBinaryInPlace: vi.fn().mockResolvedValue(undefined),
  getPlatformAsset: vi.fn().mockReturnValue("gpc-darwin-arm64"),
  getCurrentBinaryPath: vi.fn().mockReturnValue("/usr/local/bin/gpc"),
  detectInstallMethod: vi.fn().mockReturnValue("npm"),
}));

vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn().mockResolvedValue({
    getClientEmail: () => "test@example.com",
    getProjectId: () => "proj",
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
  }),
  loadServiceAccountKey: vi.fn(),
  AuthError: class AuthError extends Error {
    suggestion?: string;
  },
}));

vi.mock("@gpc-cli/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app", output: "table" }),
  setConfigValue: vi.fn(),
  getUserConfigPath: vi.fn().mockReturnValue("/home/user/.config/gpc/config.json"),
  initConfig: vi.fn(),
  getConfigDir: vi.fn().mockReturnValue("/home/user/.config/gpc"),
  getCacheDir: vi.fn().mockReturnValue("/home/user/.cache/gpc"),
}));

vi.mock("@gpc-cli/api", () => ({
  createApiClient: vi.fn().mockReturnValue({
    edits: {
      insert: vi.fn().mockResolvedValue({ id: "edit-1" }),
      delete: vi.fn().mockResolvedValue({}),
      validate: vi.fn().mockResolvedValue({}),
      commit: vi.fn().mockResolvedValue({}),
    },
    tracks: {
      get: vi.fn().mockResolvedValue({
        track: "internal",
        releases: [{ status: "inProgress", versionCodes: ["42"], userFraction: 0.1 }],
      }),
      list: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    bundles: {
      upload: vi.fn().mockResolvedValue({ versionCode: 42 }),
    },
    deobfuscation: {
      upload: vi.fn().mockResolvedValue({}),
    },
  }),
  createReportingClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  class GpcError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly exitCode: number,
      public readonly suggestion?: string,
    ) {
      super(message);
      this.name = "GpcError";
    }
  }
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
    GpcError,
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
    uploadRelease: vi
      .fn()
      .mockResolvedValue({ versionCode: 42, track: "internal", status: "completed" }),
    getReleasesStatus: vi.fn().mockResolvedValue([
      {
        track: "internal",
        status: "completed",
        versionCodes: ["42"],
        releaseNotes: [{ language: "en-US", text: "test notes" }],
      },
    ]),
    promoteRelease: vi.fn().mockResolvedValue({}),
    updateRollout: vi.fn().mockResolvedValue({}),
    readReleaseNotesFromDir: vi.fn().mockResolvedValue([]),
    generateNotesFromGit: vi.fn().mockResolvedValue({ language: "en-US", text: "git notes" }),
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
    createAuditEntry: vi
      .fn()
      .mockReturnValue({ timestamp: new Date().toISOString(), success: false }),
    uploadExternallyHosted: vi.fn().mockResolvedValue({}),
    diffReleases: vi
      .fn()
      .mockResolvedValue({ fromTrack: "internal", toTrack: "production", diffs: [] }),
    sortResults: vi.fn().mockImplementation((arr: unknown[]) => arr),
    getVitalsCrashes: vi.fn().mockResolvedValue({ data: [] }),
    checkThreshold: actual.checkThreshold,
    latestWorstValue: actual.latestWorstValue,
    assertRateThreshold: actual.assertRateThreshold,
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

// ---------------------------------------------------------------------------
// Tests: file extension validation
// ---------------------------------------------------------------------------

describe("gpc releases upload — file extension validation", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let tmpFile: string;

  beforeEach(async () => {
    exitSpy = mockExit();
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    tmpFile = join(tmpdir(), `test-upload-${Date.now()}.zip`);
    await writeFile(tmpFile, "fake zip content");
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    errSpy.mockRestore();
    vi.mocked(console.log).mockRestore?.();
    try {
      await unlink(tmpFile);
    } catch {
      /* ignore */
    }
    vi.clearAllMocks();
  });

  it("exits with code 2 when upload file has .zip extension", async () => {
    await expect(run(["releases", "upload", tmpFile])).rejects.toMatchObject({
      code: "RELEASES_USAGE_ERROR",
      exitCode: 2,
      message: expect.stringContaining(".zip"),
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: releases notes get
// ---------------------------------------------------------------------------

describe("gpc releases notes get", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = mockExit();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    vi.mocked(console.error).mockRestore?.();
    vi.clearAllMocks();
  });

  it("prints release notes for the given track", async () => {
    await run(["releases", "notes", "get", "--track", "internal"]);
    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("en-US");
  });
});

// ---------------------------------------------------------------------------
// Tests: releases notes set redirect
// ---------------------------------------------------------------------------

describe("gpc releases notes set redirect", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = mockExit();
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errSpy.mockRestore();
    vi.mocked(console.log).mockRestore?.();
    vi.clearAllMocks();
  });

  it("exits 1 immediately with redirect message when action is set", async () => {
    await expect(run(["releases", "notes", "set"])).rejects.toMatchObject({
      code: "RELEASES_USAGE_ERROR",
      exitCode: 1,
      message: expect.stringContaining("not implemented"),
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: upload progress bar
// ---------------------------------------------------------------------------

describe("gpc releases upload — progress bar", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let tmpFile: string;

  beforeEach(async () => {
    exitSpy = mockExit();
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    tmpFile = join(tmpdir(), `test-upload-${Date.now()}.aab`);
    await writeFile(tmpFile, "fake aab content");
    // Make stderr look like a TTY for this test
    Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
    vi.mocked(console.log).mockRestore?.();
    vi.mocked(console.error).mockRestore?.();
    Object.defineProperty(process.stderr, "isTTY", { value: undefined, configurable: true });
    try {
      await unlink(tmpFile);
    } catch {
      /* ignore */
    }
    vi.clearAllMocks();
  });

  it("completes upload without error when TTY is available", async () => {
    await run(["releases", "upload", tmpFile, "--track", "internal"]);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: rollout increase --vitals-gate
// ---------------------------------------------------------------------------

describe("gpc releases rollout increase --vitals-gate", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = mockExit();
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errSpy.mockRestore();
    vi.mocked(console.log).mockRestore?.();
    vi.clearAllMocks();
  });

  const INCREASE = [
    "releases",
    "rollout",
    "increase",
    "--track",
    "production",
    "--to",
    "50",
    "--vitals-gate",
  ];

  async function withThreshold(crashRate: unknown) {
    const { loadConfig } = await import("@gpc-cli/config");
    vi.mocked(loadConfig).mockResolvedValueOnce({
      app: "com.example.app",
      output: "table",
      vitals: { thresholds: { crashRate } },
    } as never);
  }

  const crashRows = (value: string) => ({
    rows: [{ metrics: [{ metric: "crashRate", decimalValue: { value } }] }],
  });

  // The gate used to warn and continue: --vitals-gate without a threshold
  // increased the rollout ungated.
  it("blocks the increase when no crashRate threshold is configured", async () => {
    const core = await import("@gpc-cli/core");
    await expect(run(INCREASE)).rejects.toMatchObject({ code: "THRESHOLD_INVALID", exitCode: 2 });
    expect(core.updateRollout).not.toHaveBeenCalled();
  });

  // vitals.thresholds.crashRate is a fraction everywhere; this gate alone used
  // to divide it by 100, so 0.02 meant 0.02% here and 2% elsewhere.
  it("treats the configured threshold as a fraction and blocks on breach", async () => {
    const core = await import("@gpc-cli/core");
    await withThreshold(0.02);
    vi.mocked(core.getVitalsCrashes).mockResolvedValueOnce(crashRows("0.03") as never);

    await run(INCREASE);

    expect(process.exitCode).toBe(6);
    expect(core.updateRollout).not.toHaveBeenCalled();
    process.exitCode = 0;
  });

  it("increases the rollout when the crash rate is under the fraction", async () => {
    const core = await import("@gpc-cli/core");
    await withThreshold(0.02);
    vi.mocked(core.getVitalsCrashes).mockResolvedValueOnce(crashRows("0.004") as never);

    await run(INCREASE);

    expect(core.updateRollout).toHaveBeenCalled();
  });

  it("refuses a percent-style threshold such as 2", async () => {
    const core = await import("@gpc-cli/core");
    await withThreshold(2);
    await expect(run(INCREASE)).rejects.toMatchObject({ code: "THRESHOLD_INVALID" });
    expect(core.updateRollout).not.toHaveBeenCalled();
  });

  it("blocks the increase when vitals cannot be read", async () => {
    const core = await import("@gpc-cli/core");
    await withThreshold(0.02);
    vi.mocked(core.getVitalsCrashes).mockRejectedValueOnce(
      Object.assign(new Error("Forbidden"), { code: "API_FORBIDDEN", exitCode: 4 }),
    );
    await expect(run(INCREASE)).rejects.toThrow("Forbidden");
    expect(core.updateRollout).not.toHaveBeenCalled();
  });

  it("blocks the increase when there is no crash value (THRESHOLD_NO_DATA)", async () => {
    const core = await import("@gpc-cli/core");
    await withThreshold(0.02);
    vi.mocked(core.getVitalsCrashes).mockResolvedValueOnce({ rows: [] } as never);
    await expect(run(INCREASE)).rejects.toMatchObject({ code: "THRESHOLD_NO_DATA", exitCode: 6 });
    expect(core.updateRollout).not.toHaveBeenCalled();
  });

  it("warns that --vitals-gate is ignored in --dry-run mode", async () => {
    await run([
      "releases",
      "rollout",
      "increase",
      "--track",
      "production",
      "--to",
      "50",
      "--vitals-gate",
      "--dry-run",
    ]);
    const allErrors = errSpy.mock.calls.flat().join("\n");
    expect(allErrors).toContain("--vitals-gate is ignored in --dry-run mode");
  });
});
