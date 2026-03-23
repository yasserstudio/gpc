import { describe, it, expect } from "vitest";
import { SEVERITY_ORDER, DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

describe("preflight types", () => {
  it("SEVERITY_ORDER ranks correctly", () => {
    expect(SEVERITY_ORDER["info"]).toBeLessThan(SEVERITY_ORDER["warning"]);
    expect(SEVERITY_ORDER["warning"]).toBeLessThan(SEVERITY_ORDER["error"]);
    expect(SEVERITY_ORDER["error"]).toBeLessThan(SEVERITY_ORDER["critical"]);
  });

  it("DEFAULT_PREFLIGHT_CONFIG has sensible defaults", () => {
    expect(DEFAULT_PREFLIGHT_CONFIG.failOn).toBe("error");
    expect(DEFAULT_PREFLIGHT_CONFIG.targetSdkMinimum).toBe(35);
    expect(DEFAULT_PREFLIGHT_CONFIG.maxDownloadSizeMb).toBe(150);
    expect(DEFAULT_PREFLIGHT_CONFIG.allowedPermissions).toEqual([]);
    expect(DEFAULT_PREFLIGHT_CONFIG.disabledRules).toEqual([]);
    expect(DEFAULT_PREFLIGHT_CONFIG.severityOverrides).toEqual({});
  });
});
