import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  runBeforeRequest: vi.fn(),
  runAfterResponse: vi.fn(),
  setDefaultApiLifecycleHooks: vi.fn(),
  discoverPluginEntries: vi.fn(),
  loadConfig: vi.fn(),
  plugin: { name: "gpc-plugin-test", version: "1.0.0", register: vi.fn() },
  manifest: {
    name: "gpc-plugin-test",
    version: "1.0.0",
    permissions: ["hooks:beforeRequest"],
    trusted: false,
  },
}));

vi.mock("@gpc-cli/core", () => ({
  PluginManager: class PluginManager {
    load = mocks.load;
    runBeforeRequest = mocks.runBeforeRequest;
    runAfterResponse = mocks.runAfterResponse;
    hasRequestHooks() {
      return true;
    }
    getRegisteredCommands() {
      return [];
    }
  },
  discoverPluginEntries: mocks.discoverPluginEntries,
}));

vi.mock("@gpc-cli/api", () => ({
  setDefaultApiLifecycleHooks: mocks.setDefaultApiLifecycleHooks,
}));

vi.mock("@gpc-cli/config", () => ({
  ensurePluginApprovalPolicy: vi.fn().mockResolvedValue(undefined),
  loadConfig: mocks.loadConfig,
}));

import { loadPlugins } from "../src/plugins.js";

describe("plugin runtime wiring", () => {
  beforeEach(() => {
    mocks.loadConfig.mockResolvedValue({
      plugins: ["gpc-plugin-test"],
      approvedPlugins: ["gpc-plugin-test"],
      legacyApprovedPlugins: [],
    });
    mocks.discoverPluginEntries.mockResolvedValue([
      { plugin: mocks.plugin, manifest: mocks.manifest, legacyPermissions: false },
    ]);
  });

  afterEach(() => {
    delete process.env["__GPC_BINARY"];
    vi.clearAllMocks();
  });

  it("loads discovered plugins with their manifest and configures API hooks", async () => {
    await loadPlugins();

    expect(mocks.load).toHaveBeenCalledWith(mocks.plugin, mocks.manifest);
    expect(mocks.setDefaultApiLifecycleHooks).toHaveBeenCalledWith({
      beforeRequest: expect.any(Function),
      afterResponse: expect.any(Function),
    });

    const hooks = mocks.setDefaultApiLifecycleHooks.mock.calls[0]![0];
    const request = { method: "GET", path: "/apps", startedAt: new Date() };
    const response = { status: 200, durationMs: 10, ok: true };
    await hooks.beforeRequest(request);
    await hooks.afterResponse(request, response);
    expect(mocks.runBeforeRequest).toHaveBeenCalledWith(request);
    expect(mocks.runAfterResponse).toHaveBeenCalledWith(request, response);
  });

  it("warns but keeps an approved legacy plugin enabled", async () => {
    mocks.discoverPluginEntries.mockResolvedValue([
      { plugin: mocks.plugin, manifest: mocks.manifest, legacyPermissions: true },
    ]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await loadPlugins();

    expect(mocks.load).toHaveBeenCalledWith(mocks.plugin, mocks.manifest);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("legacy broad permissions"));
  });

  it("resolves local plugins from the discovered project config directory", async () => {
    mocks.loadConfig.mockResolvedValueOnce({
      configPath: "/repo/.gpcrc.json",
      plugins: ["./plugins/custom.js"],
      approvedPlugins: ["file:///repo/plugins/custom.js"],
      legacyApprovedPlugins: [],
    });

    await loadPlugins();

    expect(mocks.discoverPluginEntries).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: "/repo" }),
    );
  });
});
