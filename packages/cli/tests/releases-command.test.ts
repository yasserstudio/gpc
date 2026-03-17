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
      get: vi.fn().mockResolvedValue({ track: "internal", releases: [{ status: "inProgress", versionCodes: ["42"], userFraction: 0.1 }] }),
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

vi.mock("@gpc-cli/core", () => {
  class MockPluginManager {
    async load() {}
    async runBeforeCommand() {}
    async runAfterCommand() {}
    async runOnError() {}
    async runBeforeRequest() {}
    async runAfterResponse() {}
    getRegisteredCommands() { return []; }
    getLoadedPlugins() { return []; }
    hasRequestHooks() { return false; }
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
    uploadRelease: vi.fn().mockResolvedValue({ versionCode: 42, track: "internal", status: "completed" }),
    getReleasesStatus: vi.fn().mockResolvedValue([
      { track: "internal", status: "completed", versionCodes: ["42"], releaseNotes: [{ language: "en-US", text: "test notes" }] },
    ]),
    promoteRelease: vi.fn().mockResolvedValue({}),
    updateRollout: vi.fn().mockResolvedValue({}),
    readReleaseNotesFromDir: vi.fn().mockResolvedValue([]),
    generateNotesFromGit: vi.fn().mockResolvedValue({ language: "en-US", text: "git notes" }),
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
    createAuditEntry: vi.fn().mockReturnValue({ timestamp: new Date().toISOString(), success: false }),
    uploadExternallyHosted: vi.fn().mockResolvedValue({}),
    diffReleases: vi.fn().mockResolvedValue({ fromTrack: "internal", toTrack: "production", diffs: [] }),
    sortResults: vi.fn().mockImplementation((arr: unknown[]) => arr),
    getVitalsCrashes: vi.fn().mockResolvedValue({ data: [] }),
    checkThreshold: vi.fn().mockReturnValue({ breached: false }),
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
  return vi
    .spyOn(process, "exit")
    .mockImplementation((code?: number) => {
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
    try { await unlink(tmpFile); } catch { /* ignore */ }
    vi.clearAllMocks();
  });

  it("exits with code 2 when upload file has .zip extension", async () => {
    await expect(run(["releases", "upload", tmpFile])).rejects.toThrow("process.exit(2)");
    const allErrors = errSpy.mock.calls.flat().join("\n");
    expect(allErrors).toContain(".zip");
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
    await expect(run(["releases", "notes", "set"])).rejects.toThrow("process.exit(1)");
    const allErrors = errSpy.mock.calls.flat().join("\n");
    expect(allErrors).toContain("gpc releases upload");
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
    try { await unlink(tmpFile); } catch { /* ignore */ }
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

  it("warns and skips gate when no crashRate threshold configured", async () => {
    await run(["releases", "rollout", "increase", "--track", "production", "--to", "50", "--vitals-gate"]);
    const allErrors = errSpy.mock.calls.flat().join("\n");
    expect(allErrors).toContain("vitals.thresholds.crashRate");
  });
});
