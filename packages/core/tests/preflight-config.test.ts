import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadPreflightConfig } from "../src/preflight/config";

describe("loadPreflightConfig", () => {
  const tmpDir = join(tmpdir(), "gpc-test-preflight-config");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns defaults when config file does not exist", async () => {
    const config = await loadPreflightConfig(join(tmpDir, "nonexistent.json"));
    expect(config.failOn).toBe("error");
    expect(config.targetSdkMinimum).toBe(35);
    expect(config.maxDownloadSizeMb).toBe(150);
    expect(config.allowedPermissions).toEqual([]);
    expect(config.disabledRules).toEqual([]);
    expect(config.severityOverrides).toEqual({});
  });

  it("loads valid config file", async () => {
    const configPath = join(tmpDir, ".preflightrc.json");
    await writeFile(configPath, JSON.stringify({
      failOn: "warning",
      targetSdkMinimum: 34,
      maxDownloadSizeMb: 200,
      allowedPermissions: ["android.permission.READ_SMS"],
      disabledRules: ["cleartext-traffic"],
      severityOverrides: { "debuggable-true": "warning" },
    }));

    const config = await loadPreflightConfig(configPath);
    expect(config.failOn).toBe("warning");
    expect(config.targetSdkMinimum).toBe(34);
    expect(config.maxDownloadSizeMb).toBe(200);
    expect(config.allowedPermissions).toEqual(["android.permission.READ_SMS"]);
    expect(config.disabledRules).toEqual(["cleartext-traffic"]);
    expect(config.severityOverrides).toEqual({ "debuggable-true": "warning" });
  });

  it("throws on invalid JSON", async () => {
    const configPath = join(tmpDir, ".preflightrc.json");
    await writeFile(configPath, "{ invalid json");

    await expect(loadPreflightConfig(configPath)).rejects.toThrow("Invalid JSON");
  });

  it("ignores unknown or invalid fields", async () => {
    const configPath = join(tmpDir, ".preflightrc.json");
    await writeFile(configPath, JSON.stringify({
      failOn: "notavalidseverity",
      targetSdkMinimum: -1,
      unknownField: true,
    }));

    const config = await loadPreflightConfig(configPath);
    // Invalid failOn should be ignored, keeping default
    expect(config.failOn).toBe("error");
    // Invalid targetSdkMinimum should be ignored
    expect(config.targetSdkMinimum).toBe(35);
  });

  it("handles partial config (only some fields)", async () => {
    const configPath = join(tmpDir, ".preflightrc.json");
    await writeFile(configPath, JSON.stringify({
      disabledRules: ["minSdk-below-21"],
    }));

    const config = await loadPreflightConfig(configPath);
    expect(config.disabledRules).toEqual(["minSdk-below-21"]);
    // All other fields should keep defaults
    expect(config.failOn).toBe("error");
    expect(config.targetSdkMinimum).toBe(35);
  });
});
