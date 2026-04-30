import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkNodeVersion,
  checkPackageName,
  checkProxy,
  checkDeveloperId,
  checkConflictingCredentials,
  checkConfigKeys,
  checkCiEnvironment,
  checkStaleCache,
  checkShellCompletion,
  checkVerificationDeadline,
  checkQuotaProximity,
  checkPluginHealth,
} from "../src/commands/doctor.js";

// ---------------------------------------------------------------------------
// checkNodeVersion
// ---------------------------------------------------------------------------

describe("checkNodeVersion", () => {
  it("passes for Node.js 20", () => {
    const result = checkNodeVersion("20.0.0");
    expect(result.status).toBe("pass");
    expect(result.message).toContain("20.0.0");
  });

  it("passes for Node.js 22", () => {
    const result = checkNodeVersion("22.12.0");
    expect(result.status).toBe("pass");
  });

  it("fails for Node.js 18", () => {
    const result = checkNodeVersion("18.20.0");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("requires >=20");
    expect(result.suggestion).toContain("nodejs.org");
  });

  it("fails for Node.js 16", () => {
    const result = checkNodeVersion("16.0.0");
    expect(result.status).toBe("fail");
  });

  it("fails for malformed version defaulting to 0", () => {
    const result = checkNodeVersion("bad.version");
    expect(result.status).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// checkPackageName
// ---------------------------------------------------------------------------

describe("checkPackageName", () => {
  it("returns null when app is undefined", () => {
    expect(checkPackageName(undefined)).toBeNull();
  });

  it("passes for a well-formed package name", () => {
    const result = checkPackageName("com.example.app");
    expect(result?.status).toBe("pass");
    expect(result?.message).toContain("com.example.app");
  });

  it("passes for a 3-segment package name", () => {
    expect(checkPackageName("com.example.remote")?.status).toBe("pass");
  });

  it("passes for package names with underscores and digits", () => {
    expect(checkPackageName("com.my_company.app2")?.status).toBe("pass");
  });

  it("warns for a single-segment name (no dots)", () => {
    const result = checkPackageName("myapp");
    expect(result?.status).toBe("warn");
    expect(result?.suggestion).toContain("2+");
  });

  it("warns for a name starting with a digit", () => {
    expect(checkPackageName("1com.example.app")?.status).toBe("warn");
  });

  it("warns for a name with an empty segment", () => {
    expect(checkPackageName("com..example")?.status).toBe("warn");
  });

  it("warns for a segment starting with a digit", () => {
    expect(checkPackageName("com.1example.app")?.status).toBe("warn");
  });
});

// ---------------------------------------------------------------------------
// checkProxy
// ---------------------------------------------------------------------------

describe("checkProxy", () => {
  it("returns null when no proxy is configured", () => {
    expect(checkProxy(undefined)).toBeNull();
  });

  it("passes for a valid http proxy URL", () => {
    const result = checkProxy("http://proxy.example.com:8080");
    expect(result?.status).toBe("pass");
    expect(result?.message).toContain("proxy.example.com");
  });

  it("passes for a valid https proxy URL", () => {
    expect(checkProxy("https://proxy.internal:3128")?.status).toBe("pass");
  });

  it("warns for a non-URL string", () => {
    const result = checkProxy("not-a-url");
    expect(result?.status).toBe("warn");
    expect(result?.suggestion).toContain("HTTPS_PROXY");
  });

  it("returns null for empty string (no proxy configured)", () => {
    expect(checkProxy("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkDeveloperId
// ---------------------------------------------------------------------------

describe("checkDeveloperId", () => {
  it("returns null when id is undefined", () => {
    expect(checkDeveloperId(undefined)).toBeNull();
  });

  it("passes for a numeric developer ID", () => {
    const result = checkDeveloperId("1234567890");
    expect(result?.status).toBe("pass");
    expect(result?.message).toContain("1234567890");
  });

  it("warns for a non-numeric developer ID", () => {
    const result = checkDeveloperId("abc123");
    expect(result?.status).toBe("warn");
    expect(result?.suggestion).toContain("numeric");
  });

  it("warns for developer ID with spaces", () => {
    expect(checkDeveloperId("123 456")?.status).toBe("warn");
  });

  it("passes for zero", () => {
    expect(checkDeveloperId("0")?.status).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// checkConflictingCredentials
// ---------------------------------------------------------------------------

describe("checkConflictingCredentials", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv["GPC_SERVICE_ACCOUNT"] = process.env["GPC_SERVICE_ACCOUNT"];
    savedEnv["GOOGLE_APPLICATION_CREDENTIALS"] = process.env["GOOGLE_APPLICATION_CREDENTIALS"];
    delete process.env["GPC_SERVICE_ACCOUNT"];
    delete process.env["GOOGLE_APPLICATION_CREDENTIALS"];
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val !== undefined) process.env[key] = val;
      else delete process.env[key];
    }
  });

  it("returns null when only one source is set", () => {
    expect(checkConflictingCredentials("/path/to/key.json")).toBeNull();
  });

  it("returns null when no sources are set", () => {
    expect(checkConflictingCredentials()).toBeNull();
  });

  it("warns when config file and GPC_SERVICE_ACCOUNT are both set", () => {
    process.env["GPC_SERVICE_ACCOUNT"] = "/other/key.json";
    const result = checkConflictingCredentials("/config/key.json");
    expect(result?.status).toBe("warn");
    expect(result?.message).toContain("Multiple credential sources");
    expect(result?.message).toContain("config file");
    expect(result?.message).toContain("GPC_SERVICE_ACCOUNT");
  });

  it("warns when all three sources are set", () => {
    process.env["GPC_SERVICE_ACCOUNT"] = "/a.json";
    process.env["GOOGLE_APPLICATION_CREDENTIALS"] = "/b.json";
    const result = checkConflictingCredentials("/c.json");
    expect(result?.status).toBe("warn");
    expect(result?.message).toContain("config file");
    expect(result?.message).toContain("GPC_SERVICE_ACCOUNT");
    expect(result?.message).toContain("GOOGLE_APPLICATION_CREDENTIALS");
  });

  it("warns when two env vars are set without config", () => {
    process.env["GPC_SERVICE_ACCOUNT"] = "/a.json";
    process.env["GOOGLE_APPLICATION_CREDENTIALS"] = "/b.json";
    const result = checkConflictingCredentials();
    expect(result?.status).toBe("warn");
  });
});

// ---------------------------------------------------------------------------
// checkConfigKeys
// ---------------------------------------------------------------------------

describe("checkConfigKeys", () => {
  it("returns null for valid config keys", () => {
    expect(checkConfigKeys({ app: "com.example.app", output: "json", debug: true })).toBeNull();
  });

  it("returns null for all known keys", () => {
    const config = {
      app: "x",
      output: "json",
      profile: "dev",
      auth: {},
      developerId: "123",
      plugins: [],
      profiles: {},
      approvedPlugins: [],
      webhooks: {},
      debug: true,
      train: {},
    };
    expect(checkConfigKeys(config)).toBeNull();
  });

  it("warns for unknown keys", () => {
    const result = checkConfigKeys({ app: "com.example.app", seviceAccount: "typo" });
    expect(result?.status).toBe("warn");
    expect(result?.message).toContain("seviceAccount");
    expect(result?.suggestion).toContain("Valid keys");
  });

  it("lists multiple unknown keys", () => {
    const result = checkConfigKeys({ foo: 1, bar: 2 });
    expect(result?.message).toContain("foo");
    expect(result?.message).toContain("bar");
    expect(result?.message).toContain("keys"); // plural
  });

  it("uses singular for one unknown key", () => {
    const result = checkConfigKeys({ oops: 1 });
    expect(result?.message).toMatch(/Unknown config key:/);
  });

  it("returns null for empty config", () => {
    expect(checkConfigKeys({})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkCiEnvironment
// ---------------------------------------------------------------------------

describe("checkCiEnvironment", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const ciVars = [
    "CI",
    "GITHUB_ACTIONS",
    "GITLAB_CI",
    "BITBUCKET_PIPELINE_UUID",
    "CIRCLECI",
    "JENKINS_URL",
    "TRAVIS",
    "CODEBUILD_BUILD_ID",
    "BUILD_BUILDID",
    "GPC_NO_COLOR",
    "GPC_NO_UPDATE_CHECK",
  ];

  beforeEach(() => {
    for (const v of ciVars) {
      savedEnv[v] = process.env[v];
      delete process.env[v];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val !== undefined) process.env[key] = val;
      else delete process.env[key];
    }
  });

  it("returns null when not in CI", () => {
    expect(checkCiEnvironment()).toBeNull();
  });

  it("detects GitHub Actions", () => {
    process.env["CI"] = "true";
    process.env["GITHUB_ACTIONS"] = "true";
    const result = checkCiEnvironment();
    expect(result?.status).toBe("info");
    expect(result?.message).toContain("GitHub Actions");
  });

  it("detects GitLab CI", () => {
    process.env["CI"] = "true";
    process.env["GITLAB_CI"] = "true";
    const result = checkCiEnvironment();
    expect(result?.message).toContain("GitLab CI");
  });

  it("detects Bitbucket Pipelines", () => {
    process.env["CI"] = "true";
    process.env["BITBUCKET_PIPELINE_UUID"] = "{uuid}";
    expect(checkCiEnvironment()?.message).toContain("Bitbucket Pipelines");
  });

  it("detects CircleCI", () => {
    process.env["CI"] = "true";
    process.env["CIRCLECI"] = "true";
    expect(checkCiEnvironment()?.message).toContain("CircleCI");
  });

  it("detects Jenkins", () => {
    process.env["CI"] = "true";
    process.env["JENKINS_URL"] = "http://jenkins.local";
    expect(checkCiEnvironment()?.message).toContain("Jenkins");
  });

  it("detects Azure Pipelines", () => {
    process.env["CI"] = "true";
    process.env["BUILD_BUILDID"] = "123";
    expect(checkCiEnvironment()?.message).toContain("Azure Pipelines");
  });

  it("falls back to Unknown CI", () => {
    process.env["CI"] = "true";
    expect(checkCiEnvironment()?.message).toContain("Unknown CI");
  });

  it("suggests GPC_NO_COLOR when not set", () => {
    process.env["CI"] = "true";
    const result = checkCiEnvironment();
    expect(result?.suggestion).toContain("GPC_NO_COLOR");
  });

  it("suggests GPC_NO_UPDATE_CHECK when not set", () => {
    process.env["CI"] = "true";
    const result = checkCiEnvironment();
    expect(result?.suggestion).toContain("GPC_NO_UPDATE_CHECK");
  });

  it("omits suggestions when CI env vars are already set", () => {
    process.env["CI"] = "true";
    process.env["GPC_NO_COLOR"] = "1";
    process.env["GPC_NO_UPDATE_CHECK"] = "1";
    const result = checkCiEnvironment();
    expect(result?.suggestion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkStaleCache
// ---------------------------------------------------------------------------

describe("checkStaleCache", () => {
  it("returns null for non-existent directory", async () => {
    const result = await checkStaleCache("/tmp/gpc-test-nonexistent-" + Date.now());
    expect(result).toBeNull();
  });

  it("returns null when no status files exist", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const dir = mkdtempSync(`${tmpdir()}/gpc-doctor-test-`);
    const result = await checkStaleCache(dir);
    expect(result).toBeNull();
    const { rmSync } = await import("node:fs");
    rmSync(dir, { recursive: true });
  });

  it("warns about stale status files", async () => {
    const { mkdtempSync, writeFileSync, utimesSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(`${tmpdir()}/gpc-doctor-test-`);
    const filePath = join(dir, "status-com.example.app.json");
    writeFileSync(filePath, "{}");
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    utimesSync(filePath, oldDate, oldDate);

    const result = await checkStaleCache(dir);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("warn");
    expect(result!.message).toContain("com.example.app");
    expect(result!.suggestion).toContain("--refresh");

    const { rmSync } = await import("node:fs");
    rmSync(dir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// checkShellCompletion
// ---------------------------------------------------------------------------

describe("checkShellCompletion", () => {
  const origShell = process.env["SHELL"];

  afterEach(() => {
    if (origShell !== undefined) process.env["SHELL"] = origShell;
    else delete process.env["SHELL"];
  });

  it("returns null when SHELL is not set", async () => {
    delete process.env["SHELL"];
    const result = await checkShellCompletion();
    expect(result).toBeNull();
  });

  it("returns null for unsupported shells", async () => {
    process.env["SHELL"] = "/bin/fish";
    const result = await checkShellCompletion();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkVerificationDeadline
// ---------------------------------------------------------------------------

describe("checkVerificationDeadline", () => {
  it("returns a result with days remaining", () => {
    const result = checkVerificationDeadline();
    expect(result.name).toBe("verification");
    expect(result.message).toContain("September 30, 2026");
  });
});

// ---------------------------------------------------------------------------
// checkQuotaProximity
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// checkQuotaProximity + checkPluginHealth — shared mock
// ---------------------------------------------------------------------------

const mockGetQuotaUsage = vi.fn();
const mockDiscoverPlugins = vi.fn();
const mockPluginManagerLoad = vi.fn();

vi.mock("@gpc-cli/core", () => ({
  getQuotaUsage: (...args: unknown[]) => mockGetQuotaUsage(...args),
  discoverPlugins: (...args: unknown[]) => mockDiscoverPlugins(...args),
  PluginManager: class MockPluginManager {
    load = mockPluginManagerLoad;
  },
}));

describe("checkQuotaProximity", () => {
  beforeEach(() => {
    mockGetQuotaUsage.mockReset();
  });

  it("returns null when no audit entries", async () => {
    mockGetQuotaUsage.mockResolvedValue({
      dailyCallsUsed: 0,
      dailyCallsLimit: 200_000,
      dailyCallsRemaining: 200_000,
      minuteCallsUsed: 0,
      minuteCallsLimit: 3_000,
      minuteCallsRemaining: 3_000,
      topCommands: [],
    });
    expect(await checkQuotaProximity()).toBeNull();
  });

  it("passes when usage is below 80%", async () => {
    mockGetQuotaUsage.mockResolvedValue({
      dailyCallsUsed: 100_000,
      dailyCallsLimit: 200_000,
      dailyCallsRemaining: 100_000,
      minuteCallsUsed: 1_000,
      minuteCallsLimit: 3_000,
      minuteCallsRemaining: 2_000,
      topCommands: [],
    });
    const result = await checkQuotaProximity();
    expect(result?.status).toBe("pass");
    expect(result?.message).toContain("100000/200000");
  });

  it("warns when daily calls exceed 80%", async () => {
    mockGetQuotaUsage.mockResolvedValue({
      dailyCallsUsed: 170_000,
      dailyCallsLimit: 200_000,
      dailyCallsRemaining: 30_000,
      minuteCallsUsed: 100,
      minuteCallsLimit: 3_000,
      minuteCallsRemaining: 2_900,
      topCommands: [],
    });
    const result = await checkQuotaProximity();
    expect(result?.status).toBe("warn");
    expect(result?.message).toContain("Daily quota");
    expect(result?.suggestion).toContain("gpc quota status");
  });

  it("warns when per-minute calls exceed 80%", async () => {
    mockGetQuotaUsage.mockResolvedValue({
      dailyCallsUsed: 1_000,
      dailyCallsLimit: 200_000,
      dailyCallsRemaining: 199_000,
      minuteCallsUsed: 2_500,
      minuteCallsLimit: 3_000,
      minuteCallsRemaining: 500,
      topCommands: [],
    });
    const result = await checkQuotaProximity();
    expect(result?.status).toBe("warn");
    expect(result?.message).toContain("Per-minute");
  });

  it("per-minute warning takes priority over daily", async () => {
    mockGetQuotaUsage.mockResolvedValue({
      dailyCallsUsed: 180_000,
      dailyCallsLimit: 200_000,
      dailyCallsRemaining: 20_000,
      minuteCallsUsed: 2_600,
      minuteCallsLimit: 3_000,
      minuteCallsRemaining: 400,
      topCommands: [],
    });
    const result = await checkQuotaProximity();
    expect(result?.status).toBe("warn");
    expect(result?.message).toContain("Per-minute");
  });
});

// ---------------------------------------------------------------------------
// checkPluginHealth
// ---------------------------------------------------------------------------

describe("checkPluginHealth", () => {
  beforeEach(() => {
    mockDiscoverPlugins.mockReset();
    mockPluginManagerLoad.mockReset();
  });

  it("returns empty array when no plugins discovered", async () => {
    mockDiscoverPlugins.mockResolvedValue([]);
    const results = await checkPluginHealth(undefined);
    expect(results).toEqual([]);
  });

  it("reports loaded plugin with name and version", async () => {
    const mockPlugin = { name: "@gpc-cli/plugin-ci", version: "1.0.0", register: vi.fn() };
    mockDiscoverPlugins.mockResolvedValue([mockPlugin]);
    mockPluginManagerLoad.mockResolvedValue(undefined);

    const results = await checkPluginHealth(["@gpc-cli/plugin-ci"]);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("pass");
    expect(results[0]!.message).toContain("@gpc-cli/plugin-ci@1.0.0");
  });

  it("reports failed plugin as warn with reinstall suggestion", async () => {
    const mockPlugin = { name: "gpc-plugin-bad", version: "0.1.0", register: vi.fn() };
    mockDiscoverPlugins.mockResolvedValue([mockPlugin]);
    mockPluginManagerLoad.mockRejectedValue(new Error("Module not found"));

    const results = await checkPluginHealth(["gpc-plugin-bad"]);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("warn");
    expect(results[0]!.message).toContain("failed to load");
    expect(results[0]!.suggestion).toContain("npm install");
  });

  it("handles mix of passing and failing plugins", async () => {
    const goodPlugin = { name: "plugin-good", version: "1.0.0", register: vi.fn() };
    const badPlugin = { name: "plugin-bad", version: "0.1.0", register: vi.fn() };
    mockDiscoverPlugins.mockResolvedValue([goodPlugin, badPlugin]);
    mockPluginManagerLoad.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("fail"));

    const results = await checkPluginHealth(["plugin-good", "plugin-bad"]);
    expect(results).toHaveLength(2);
    expect(results[0]!.status).toBe("pass");
    expect(results[1]!.status).toBe("warn");
  });
});
