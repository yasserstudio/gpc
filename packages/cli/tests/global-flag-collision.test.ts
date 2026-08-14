import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Regression tests for GH #103: the root program's global options (-p/--profile,
// -a/--app, -y/--yes, --dry-run, -o/--output, --notify) consume identically
// named flags placed after a subcommand, so subcommand actions never receive
// them. These tests intentionally go through the REAL createProgram() — a
// synthetic root with a partial option set cannot reproduce the collision.

const setProfileConfig = vi.fn();
const setConfigValue = vi.fn();
const deleteProfile = vi.fn().mockResolvedValue(true);
const clearProfileCredentials = vi.fn().mockResolvedValue("removed");
const deleteConfigValue = vi.fn();

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    setProfileConfig,
    setConfigValue,
    deleteProfile,
    clearProfileCredentials,
    deleteConfigValue,
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

vi.mock("@gpc-cli/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/auth")>();
  return {
    ...actual,
    loadServiceAccountKey: vi.fn().mockResolvedValue({
      client_email: "sa@example.iam.gserviceaccount.com",
      project_id: "example-project",
    }),
    resolveAuth: vi.fn().mockResolvedValue({
      getClientEmail: () => "sa@example.iam.gserviceaccount.com",
      getAccessToken: vi.fn().mockResolvedValue({ token: "tok" }),
    }),
    clearTokenCache: vi.fn().mockResolvedValue(undefined),
  };
});

const initProject = vi.fn().mockResolvedValue({ created: [".gpcrc.json"], skipped: [] });
const writeMigrationOutput = vi.fn().mockResolvedValue(["MIGRATION.md"]);
const exportReviews = vi.fn().mockResolvedValue("review,data");
const downloadGeneratedApk = vi.fn().mockResolvedValue({ saved: true });
const sendNotification = vi.fn();

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    initProject,
    detectFastlane: vi.fn().mockResolvedValue({
      hasFastfile: true,
      hasAppfile: false,
      hasMetadata: false,
      hasGemfile: false,
      packageName: "com.example.app",
      lanes: [],
      metadataLanguages: [],
      parseWarnings: [],
    }),
    generateMigrationPlan: vi.fn().mockReturnValue({
      config: {},
      checklist: ["Step 1"],
      warnings: [],
    }),
    writeMigrationOutput,
    exportReviews,
    downloadGeneratedApk,
    loadStatusCache: vi.fn().mockResolvedValue({
      packageName: "com.example.app",
      fetchedAt: "2026-08-14T00:00:00.000Z",
      cached: true,
      sections: ["releases", "vitals", "reviews"],
      releases: [],
      vitals: {},
      reviews: {},
    }),
    statusHasBreach: vi.fn().mockReturnValue(false),
    trackBreachState: vi.fn().mockResolvedValue(true),
    sendNotification,
    formatStatusTable: vi.fn().mockReturnValue("table"),
  };
});

const writeFile = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, writeFile };
});

const execFileSync = vi.fn();
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, execFileSync };
});

vi.mock("../src/resolve.js", () => ({
  resolvePackageName: vi.fn().mockReturnValue("com.example.app"),
  getClient: vi.fn().mockResolvedValue({
    systemApks: { download: vi.fn().mockResolvedValue(new ArrayBuffer(0)) },
  }),
}));

async function runCli(...args: string[]): Promise<void> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  process.argv = argv;
  try {
    const { createProgram } = await import("../src/program.js");
    const program = await createProgram();
    await program.parseAsync(argv);
  } finally {
    process.argv = origArgv;
  }
}

describe("global flag collision regressions (GH #103)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it("auth login --profile after the subcommand creates the profile", async () => {
    await runCli("auth", "login", "--service-account", "/tmp/key.json", "--profile", "myprof");
    expect(setProfileConfig).toHaveBeenCalledWith(
      "myprof",
      expect.objectContaining({ auth: expect.anything() }),
    );
    expect(setConfigValue).not.toHaveBeenCalled();
  });

  it("auth login with global -p before the subcommand creates the profile", async () => {
    await runCli("-p", "myprof", "auth", "login", "--service-account", "/tmp/key.json");
    expect(setProfileConfig).toHaveBeenCalledWith("myprof", expect.anything());
    expect(setConfigValue).not.toHaveBeenCalled();
  });

  it("auth logout --profile clears that profile's credentials, not the global ones", async () => {
    await runCli("auth", "logout", "--profile", "myprof");
    expect(clearProfileCredentials).toHaveBeenCalledWith("myprof");
    expect(deleteConfigValue).not.toHaveBeenCalled();
  });

  it("auth login --adc --profile is rejected as a usage error", async () => {
    await expect(runCli("auth", "login", "--adc", "--profile", "ci")).rejects.toMatchObject({
      code: "USAGE_ERROR",
    });
    expect(setProfileConfig).not.toHaveBeenCalled();
  });

  it("init --app uses the given package name", async () => {
    await runCli("init", "--app", "com.example.testapp", "--no-interactive");
    expect(initProject).toHaveBeenCalledWith(
      expect.objectContaining({ app: "com.example.testapp" }),
    );
  });

  it("migrate fastlane --dry-run writes nothing", async () => {
    await runCli("migrate", "fastlane", "--dry-run");
    expect(writeMigrationOutput).not.toHaveBeenCalled();
  });

  it("migrate fastlane --out-dir writes to the given directory", async () => {
    await runCli("migrate", "fastlane", "--out-dir", "./migration-out");
    expect(writeMigrationOutput).toHaveBeenCalledWith(expect.anything(), "./migration-out");
  });

  it("reviews export --output-file writes the file", async () => {
    await runCli("reviews", "export", "--output-file", "out.csv");
    expect(writeFile).toHaveBeenCalledWith("out.csv", "review,data", "utf-8");
  });

  it("status --desktop-notify sends the desktop notification", async () => {
    await runCli("status", "--desktop-notify", "--cached");
    expect(sendNotification).toHaveBeenCalled();
  });

  it("generated-apks download --output-file reaches the download call", async () => {
    await runCli("generated-apks", "download", "42", "apk-1", "--output-file", "./gen.apk");
    expect(downloadGeneratedApk).toHaveBeenCalledWith(
      expect.anything(),
      "com.example.app",
      42,
      "apk-1",
      "./gen.apk",
    );
  });

  it("system-apks download --output-file writes the file", async () => {
    await runCli("system-apks", "download", "42", "7", "--output-file", "./sys.apk");
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("sys.apk"), expect.anything());
  });

  it("install-skills -y forwards --yes to the skills installer", async () => {
    await runCli("install-skills", "-y", "--list");
    expect(execFileSync).toHaveBeenCalledWith(
      "npx",
      expect.arrayContaining(["--yes", "--list"]),
      expect.anything(),
    );
  });
});
