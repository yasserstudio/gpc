import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  loadEnvConfig,
  findConfigFile,
  loadConfig,
  getConfigDir,
  getUserConfigPath,
  getDataDir,
  getCacheDir,
  setConfigValue,
  initConfig,
  setProfileConfig,
  deleteProfile,
  listProfiles,
  approvePlugin,
  revokePluginApproval,
  DEFAULT_CONFIG,
} from "../src/index";
import { readConfigFile, findConfigFile } from "../src/loader";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Saves listed env vars so they can be restored after each test. */
function saveEnv(...keys: string[]) {
  const saved = new Map<string, string | undefined>();
  for (const k of keys) {
    saved.set(k, process.env[k]);
  }
  return {
    restore() {
      for (const [k, v] of saved) {
        if (v === undefined) {
          delete process.env[k];
        } else {
          process.env[k] = v;
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// loadEnvConfig
// ---------------------------------------------------------------------------
describe("loadEnvConfig", () => {
  const ENV_KEYS = ["GPC_APP", "GPC_OUTPUT", "GPC_PROFILE", "GPC_SERVICE_ACCOUNT"] as const;

  let envBackup: ReturnType<typeof saveEnv>;

  beforeEach(() => {
    envBackup = saveEnv(...ENV_KEYS);
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    envBackup.restore();
  });

  it("reads GPC_APP from env", () => {
    process.env["GPC_APP"] = "com.example.app";
    const config = loadEnvConfig();
    expect(config.app).toBe("com.example.app");
  });

  it("reads GPC_OUTPUT from env when valid", () => {
    process.env["GPC_OUTPUT"] = "json";
    const config = loadEnvConfig();
    expect(config.output).toBe("json");
  });

  it("ignores invalid GPC_OUTPUT values", () => {
    process.env["GPC_OUTPUT"] = "csv";
    const config = loadEnvConfig();
    expect(config.output).toBeUndefined();
  });

  it("reads GPC_PROFILE from env", () => {
    process.env["GPC_PROFILE"] = "staging";
    const config = loadEnvConfig();
    expect(config.profile).toBe("staging");
  });

  it("reads GPC_SERVICE_ACCOUNT into auth.serviceAccount", () => {
    process.env["GPC_SERVICE_ACCOUNT"] = "/path/to/sa.json";
    const config = loadEnvConfig();
    expect(config.auth).toEqual({ serviceAccount: "/path/to/sa.json" });
  });

  it("returns empty object when no env vars set", () => {
    const config = loadEnvConfig();
    expect(config).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// findConfigFile
// ---------------------------------------------------------------------------
describe("findConfigFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("finds .gpcrc.json in the given directory", async () => {
    const configPath = join(tmpDir, ".gpcrc.json");
    await writeFile(configPath, JSON.stringify({ app: "test" }));

    const found = await findConfigFile(tmpDir);
    expect(found).toBe(configPath);
  });

  it("walks up parent directories to find .gpcrc.json", async () => {
    const configPath = join(tmpDir, ".gpcrc.json");
    await writeFile(configPath, JSON.stringify({ app: "parent" }));

    const childDir = join(tmpDir, "a", "b", "c");
    await mkdir(childDir, { recursive: true });

    const found = await findConfigFile(childDir);
    expect(found).toBe(configPath);
  });

  it("returns undefined when no config file exists", async () => {
    const found = await findConfigFile(tmpDir);
    expect(found).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// readConfigFile
// ---------------------------------------------------------------------------
describe("readConfigFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("reads and parses valid JSON config", async () => {
    const filePath = join(tmpDir, "config.json");
    await writeFile(filePath, JSON.stringify({ app: "myapp", output: "json" }));

    const config = await readConfigFile(filePath);
    expect(config.app).toBe("myapp");
    expect(config.output).toBe("json");
  });

  it("throws on invalid JSON", async () => {
    const filePath = join(tmpDir, "bad.json");
    await writeFile(filePath, "{ not valid json }}}");

    await expect(readConfigFile(filePath)).rejects.toThrow();
  });

  it("throws on invalid output format in config", async () => {
    const filePath = join(tmpDir, "bad-output.json");
    await writeFile(filePath, JSON.stringify({ output: "csv" }));

    await expect(readConfigFile(filePath)).rejects.toThrow(/Invalid output format/);
  });
});

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------
describe("loadConfig", () => {
  let tmpDir: string;
  let envBackup: ReturnType<typeof saveEnv>;
  let originalCwd: typeof process.cwd;

  const ENV_KEYS = [
    "GPC_APP",
    "GPC_OUTPUT",
    "GPC_PROFILE",
    "GPC_SERVICE_ACCOUNT",
    "XDG_CONFIG_HOME",
  ] as const;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-test-"));
    envBackup = saveEnv(...ENV_KEYS);
    for (const k of ENV_KEYS) delete process.env[k];

    // Point XDG_CONFIG_HOME to tmp so user config doesn't interfere
    process.env["XDG_CONFIG_HOME"] = join(tmpDir, "xdg-config");

    // Override cwd to a directory with no .gpcrc.json
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
  });

  afterEach(async () => {
    envBackup.restore();
    process.cwd = originalCwd;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns defaults when no config exists", async () => {
    const config = await loadConfig();
    expect(config.output).toBe(DEFAULT_CONFIG.output);
  });

  it("merges env vars over defaults", async () => {
    process.env["GPC_OUTPUT"] = "json";
    process.env["GPC_APP"] = "envapp";

    const config = await loadConfig();
    expect(config.output).toBe("json");
    expect(config.app).toBe("envapp");
  });

  it("merges overrides over env vars", async () => {
    process.env["GPC_APP"] = "from-env";

    const config = await loadConfig({ app: "from-override" });
    expect(config.app).toBe("from-override");
  });

  it("correct priority chain: overrides > env > project > user > defaults", async () => {
    // User config
    const userConfigDir = join(tmpDir, "xdg-config", "gpc");
    await mkdir(userConfigDir, { recursive: true });
    await writeFile(
      join(userConfigDir, "config.json"),
      JSON.stringify({ app: "user-app", output: "yaml", profile: "user-profile" }),
    );

    // Project config
    await writeFile(
      join(tmpDir, ".gpcrc.json"),
      JSON.stringify({ app: "project-app", output: "markdown" }),
    );

    // Env
    process.env["GPC_APP"] = "env-app";

    // Overrides
    const config = await loadConfig({ app: "override-app" });

    // app: override > env > project > user
    expect(config.app).toBe("override-app");
    // output: no override, no env -> project wins over user
    expect(config.output).toBe("markdown");
    // profile: no override, no env, no project -> user wins
    expect(config.profile).toBe("user-profile");
  });
});

// ---------------------------------------------------------------------------
// getConfigDir / getUserConfigPath / getDataDir
// ---------------------------------------------------------------------------
describe("getConfigDir / getUserConfigPath / getDataDir", () => {
  let envBackup: ReturnType<typeof saveEnv>;

  beforeEach(() => {
    envBackup = saveEnv("XDG_CONFIG_HOME", "XDG_DATA_HOME");
    delete process.env["XDG_CONFIG_HOME"];
    delete process.env["XDG_DATA_HOME"];
  });

  afterEach(() => {
    envBackup.restore();
  });

  it("returns default XDG paths", () => {
    const home = homedir();
    expect(getConfigDir()).toBe(join(home, ".config", "gpc"));
    expect(getUserConfigPath()).toBe(join(home, ".config", "gpc", "config.json"));
    expect(getDataDir()).toBe(join(home, ".local", "share", "gpc"));
  });

  it("respects XDG_CONFIG_HOME env var", () => {
    process.env["XDG_CONFIG_HOME"] = "/custom/config";
    expect(getConfigDir()).toBe(join("/custom/config", "gpc"));
    expect(getUserConfigPath()).toBe(join("/custom/config", "gpc", "config.json"));
  });

  it("respects XDG_DATA_HOME env var", () => {
    process.env["XDG_DATA_HOME"] = "/custom/data";
    expect(getDataDir()).toBe(join("/custom/data", "gpc"));
  });

  it("returns default cache dir", () => {
    delete process.env["XDG_CACHE_HOME"];
    const home = homedir();
    expect(getCacheDir()).toBe(join(home, ".cache", "gpc"));
  });

  it("respects XDG_CACHE_HOME env var", () => {
    process.env["XDG_CACHE_HOME"] = "/custom/cache";
    expect(getCacheDir()).toBe(join("/custom/cache", "gpc"));
  });
});

// ---------------------------------------------------------------------------
// setConfigValue
// ---------------------------------------------------------------------------
describe("setConfigValue", () => {
  let tmpDir: string;
  let envBackup: ReturnType<typeof saveEnv>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-test-"));
    envBackup = saveEnv("XDG_CONFIG_HOME");
    process.env["XDG_CONFIG_HOME"] = tmpDir;
  });

  afterEach(async () => {
    envBackup.restore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates config file if it doesn't exist", async () => {
    await setConfigValue("app", "newapp");

    const configPath = join(tmpDir, "gpc", "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content.app).toBe("newapp");
  });

  it("sets a simple key", async () => {
    await setConfigValue("app", "myapp");

    const configPath = join(tmpDir, "gpc", "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content.app).toBe("myapp");
  });

  it("sets a dotted key (e.g., 'auth.serviceAccount')", async () => {
    await setConfigValue("auth.serviceAccount", "/path/to/key.json");

    const configPath = join(tmpDir, "gpc", "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content.auth.serviceAccount).toBe("/path/to/key.json");
  });

  it("preserves existing values when setting new ones", async () => {
    await setConfigValue("app", "first");
    await setConfigValue("profile", "staging");

    const configPath = join(tmpDir, "gpc", "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content.app).toBe("first");
    expect(content.profile).toBe("staging");
  });
});

// ---------------------------------------------------------------------------
// initConfig
// ---------------------------------------------------------------------------
describe("initConfig", () => {
  let tmpDir: string;
  let envBackup: ReturnType<typeof saveEnv>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-test-"));
    envBackup = saveEnv("XDG_CONFIG_HOME");
    process.env["XDG_CONFIG_HOME"] = tmpDir;
  });

  afterEach(async () => {
    envBackup.restore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates config file with given config", async () => {
    const config = { app: "myapp", output: "json" as const };
    await initConfig(config);

    const configPath = join(tmpDir, "gpc", "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content).toEqual(config);
  });

  it("returns the config file path", async () => {
    const config = { app: "myapp" };
    const result = await initConfig(config);

    const expectedPath = join(tmpDir, "gpc", "config.json");
    expect(result).toBe(expectedPath);
  });
});

// ---------------------------------------------------------------------------
// Profile management
// ---------------------------------------------------------------------------
describe("setProfileConfig / deleteProfile / listProfiles", () => {
  let tmpDir: string;
  let envBackup: ReturnType<typeof saveEnv>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-test-"));
    envBackup = saveEnv("XDG_CONFIG_HOME");
    process.env["XDG_CONFIG_HOME"] = tmpDir;
  });

  afterEach(async () => {
    envBackup.restore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates a profile", async () => {
    await setProfileConfig("staging", { auth: { serviceAccount: "/path/staging.json" } });

    const profiles = await listProfiles();
    expect(profiles).toEqual(["staging"]);
  });

  it("creates multiple profiles", async () => {
    await setProfileConfig("staging", { auth: { serviceAccount: "/staging.json" } });
    await setProfileConfig("production", {
      auth: { serviceAccount: "/prod.json" },
      app: "com.prod",
    });

    const profiles = await listProfiles();
    expect(profiles).toContain("staging");
    expect(profiles).toContain("production");
  });

  it("deletes a profile", async () => {
    await setProfileConfig("staging", { auth: { serviceAccount: "/staging.json" } });
    const deleted = await deleteProfile("staging");

    expect(deleted).toBe(true);
    expect(await listProfiles()).toEqual([]);
  });

  it("returns false when deleting nonexistent profile", async () => {
    const deleted = await deleteProfile("nope");
    expect(deleted).toBe(false);
  });

  it("returns empty list when no profiles configured", async () => {
    const profiles = await listProfiles();
    expect(profiles).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Profile resolution in loadConfig
// ---------------------------------------------------------------------------
describe("loadConfig with profiles", () => {
  let tmpDir: string;
  let envBackup: ReturnType<typeof saveEnv>;
  let originalCwd: typeof process.cwd;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-test-"));
    envBackup = saveEnv(
      "GPC_APP",
      "GPC_OUTPUT",
      "GPC_PROFILE",
      "GPC_SERVICE_ACCOUNT",
      "XDG_CONFIG_HOME",
    );
    for (const k of ["GPC_APP", "GPC_OUTPUT", "GPC_PROFILE", "GPC_SERVICE_ACCOUNT"]) {
      delete process.env[k];
    }
    process.env["XDG_CONFIG_HOME"] = join(tmpDir, "xdg-config");
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
  });

  afterEach(async () => {
    envBackup.restore();
    process.cwd = originalCwd;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("resolves profile auth from config file", async () => {
    const configDir = join(tmpDir, "xdg-config", "gpc");
    await mkdir(configDir, { recursive: true });
    await writeFile(
      join(configDir, "config.json"),
      JSON.stringify({
        app: "default-app",
        auth: { serviceAccount: "/default.json" },
        profiles: {
          staging: { auth: { serviceAccount: "/staging.json" }, app: "staging-app" },
        },
      }),
    );

    const config = await loadConfig({ profile: "staging" });

    expect(config.auth?.serviceAccount).toBe("/staging.json");
    expect(config.app).toBe("staging-app");
  });

  it("throws when profile does not exist", async () => {
    const configDir = join(tmpDir, "xdg-config", "gpc");
    await mkdir(configDir, { recursive: true });
    await writeFile(
      join(configDir, "config.json"),
      JSON.stringify({
        profiles: { prod: { app: "com.prod" } },
      }),
    );

    await expect(loadConfig({ profile: "nope" })).rejects.toThrow(/Profile "nope" not found/);
  });

  it("does not throw when profile is set but no profiles key exists", async () => {
    // profile set but no profiles map — just silently continues
    const config = await loadConfig({ profile: "ghost" });
    expect(config.profile).toBe("ghost");
  });

  it("profile from GPC_PROFILE env var is resolved", async () => {
    const configDir = join(tmpDir, "xdg-config", "gpc");
    await mkdir(configDir, { recursive: true });
    await writeFile(
      join(configDir, "config.json"),
      JSON.stringify({
        profiles: {
          ci: { auth: { serviceAccount: "/ci.json" } },
        },
      }),
    );

    process.env["GPC_PROFILE"] = "ci";
    const config = await loadConfig();

    expect(config.auth?.serviceAccount).toBe("/ci.json");
  });
});

// ---------------------------------------------------------------------------
// Plugin approval
// ---------------------------------------------------------------------------
describe("plugin approval", () => {
  let envBackup: ReturnType<typeof saveEnv>;

  beforeEach(async () => {
    envBackup = saveEnv("XDG_CONFIG_HOME");
    const tmpDir = await mkdtemp(join(tmpdir(), "gpc-approve-"));
    process.env["XDG_CONFIG_HOME"] = tmpDir;
  });

  afterEach(() => {
    envBackup.restore();
  });

  it("approves a plugin", async () => {
    await approvePlugin("gpc-plugin-slack");

    const configPath = join(getConfigDir(), "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content.approvedPlugins).toContain("gpc-plugin-slack");
  });

  it("does not duplicate approved plugin", async () => {
    await approvePlugin("gpc-plugin-slack");
    await approvePlugin("gpc-plugin-slack");

    const configPath = join(getConfigDir(), "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content.approvedPlugins.filter((p: string) => p === "gpc-plugin-slack")).toHaveLength(1);
  });

  it("approves multiple plugins", async () => {
    await approvePlugin("gpc-plugin-slack");
    await approvePlugin("gpc-plugin-jira");

    const configPath = join(getConfigDir(), "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content.approvedPlugins).toEqual(["gpc-plugin-slack", "gpc-plugin-jira"]);
  });

  it("revokes an approved plugin", async () => {
    await approvePlugin("gpc-plugin-slack");
    const revoked = await revokePluginApproval("gpc-plugin-slack");

    expect(revoked).toBe(true);
    const configPath = join(getConfigDir(), "config.json");
    const content = JSON.parse(await readFile(configPath, "utf-8"));
    expect(content.approvedPlugins).toEqual([]);
  });

  it("returns false when revoking unapproved plugin", async () => {
    const revoked = await revokePluginApproval("gpc-plugin-nope");
    expect(revoked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Prototype pollution protection
// ---------------------------------------------------------------------------
describe("prototype pollution protection", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-proto-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("strips __proto__ from config file", async () => {
    const configPath = join(tmpDir, "config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        app: "com.safe",
        __proto__: { polluted: true },
      }),
    );

    const config = await readConfigFile(configPath);
    expect((config as any).__proto__?.polluted).toBeUndefined();
    expect(config.app).toBe("com.safe");
  });

  it("strips constructor from config file", async () => {
    const configPath = join(tmpDir, "config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        app: "com.safe",
        constructor: { polluted: true },
      }),
    );

    const config = await readConfigFile(configPath);
    expect((config as any).constructor?.polluted).toBeUndefined();
    expect(config.app).toBe("com.safe");
  });

  it("strips nested __proto__ keys", async () => {
    const configPath = join(tmpDir, "config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        auth: {
          serviceAccount: "/safe.json",
          __proto__: { admin: true },
        },
      }),
    );

    const config = await readConfigFile(configPath);
    expect((config.auth as any)?.__proto__?.admin).toBeUndefined();
    expect(config.auth?.serviceAccount).toBe("/safe.json");
  });
});
