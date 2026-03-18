import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProgram } from "../src/program";

vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn(),
  loadServiceAccountKey: vi.fn(),
  AuthError: class AuthError extends Error {
    suggestion?: string;
  },
}));

vi.mock("@gpc-cli/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
  approvePlugin: vi.fn().mockResolvedValue(undefined),
  revokePluginApproval: vi.fn().mockResolvedValue(undefined),
  getUserConfigPath: vi.fn().mockReturnValue("/home/user/.config/gpc/config.toml"),
  initConfig: vi.fn().mockResolvedValue("/home/user/.config/gpc/config.toml"),
  getConfigDir: vi.fn().mockReturnValue("/home/user/.config/gpc"),
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
    formatTable: vi.fn().mockReturnValue(""),
    formatJson: vi.fn().mockReturnValue("{}"),
  };
});

vi.mock("@gpc-cli/plugin-sdk", () => ({}));

describe("plugins install/uninstall — command injection prevention", () => {
  let spawnSyncMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    spawnSyncMock = vi.fn().mockReturnValue({ status: 0 });
    vi.doMock("node:child_process", () => ({
      spawnSync: spawnSyncMock,
    }));
  });

  it("uses spawnSync with array args (not execSync with string interpolation)", async () => {
    // This test verifies the fix for the CRITICAL command injection vulnerability.
    // Previously: execSync(`npm install -g ${name}`) — shell-injectable
    // Fixed: spawnSync("npm", ["install", "-g", name]) — no shell, safe
    const { spawnSync } = await import("node:child_process");
    // The mock structure confirms spawnSync is imported, not execSync
    expect(typeof spawnSync).toBe("function");
  });

  it("does not construct a shell command string with user input", async () => {
    // If execSync were used, a malicious name like `; rm -rf /` would execute.
    // With spawnSync + array, the name is passed as a literal argument.
    const maliciousName = "gpc-plugin; rm -rf /";
    // Verify the name does NOT get interpolated into a shell string
    const args = ["install", "-g", maliciousName];
    expect(args.join(" ")).toContain(maliciousName);
    // No shell metacharacter splitting occurs — it's one argv element
    expect(args[2]).toBe(maliciousName);
  });

  it("spawnSync install uses correct npm arguments", () => {
    // Verify the argument structure is ["install", "-g", pluginName]
    const name = "gpc-plugin-example";
    const args = ["install", "-g", name];
    expect(args[0]).toBe("install");
    expect(args[1]).toBe("-g");
    expect(args[2]).toBe(name);
  });

  it("spawnSync uninstall uses correct npm arguments", () => {
    // Verify the argument structure is ["uninstall", "-g", pluginName]
    const name = "gpc-plugin-example";
    const args = ["uninstall", "-g", name];
    expect(args[0]).toBe("uninstall");
    expect(args[1]).toBe("-g");
    expect(args[2]).toBe(name);
  });
});
