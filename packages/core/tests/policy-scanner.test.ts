import { describe, it, expect } from "vitest";
import { policyScanner } from "../src/preflight/scanners/policy-scanner";
import type { PreflightContext, ParsedManifest } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeManifest(overrides: Partial<ParsedManifest> = {}): ParsedManifest {
  return {
    packageName: "com.example.app",
    versionCode: 1,
    versionName: "1.0",
    minSdk: 24,
    targetSdk: 35,
    debuggable: false,
    testOnly: false,
    usesCleartextTraffic: false,
    extractNativeLibs: true,
    permissions: [],
    features: [],
    activities: [],
    services: [],
    receivers: [],
    providers: [],
    ...overrides,
  };
}

function makeCtx(manifest: ParsedManifest): PreflightContext {
  return { manifest, config: { ...DEFAULT_PREFLIGHT_CONFIG } };
}

describe("policyScanner", () => {
  it("returns no findings for clean manifest", async () => {
    const findings = await policyScanner.scan(makeCtx(makeManifest()));
    expect(findings).toEqual([]);
  });

  it("flags families policy concern", async () => {
    const findings = await policyScanner.scan(
      makeCtx(
        makeManifest({
          permissions: ["android.permission.ACCESS_FINE_LOCATION"],
          features: [{ name: "com.example.kids.feature", required: false }],
        }),
      ),
    );
    const f = findings.find((f) => f.ruleId === "policy-families-data-collection");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("flags financial app indicators", async () => {
    const findings = await policyScanner.scan(
      makeCtx(
        makeManifest({
          permissions: [
            "android.permission.READ_SMS",
            "android.permission.RECEIVE_SMS",
            "android.permission.BIND_AUTOFILL_SERVICE",
          ],
        }),
      ),
    );
    const f = findings.find((f) => f.ruleId === "policy-financial-app");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("flags health app indicators", async () => {
    const findings = await policyScanner.scan(
      makeCtx(
        makeManifest({
          permissions: ["android.permission.BODY_SENSORS"],
        }),
      ),
    );
    const f = findings.find((f) => f.ruleId === "policy-health-app");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
  });

  it("flags UGC content indicators", async () => {
    const findings = await policyScanner.scan(
      makeCtx(
        makeManifest({
          permissions: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
        }),
      ),
    );
    const f = findings.find((f) => f.ruleId === "policy-ugc-content");
    expect(f).toBeDefined();
  });

  it("flags SYSTEM_ALERT_WINDOW", async () => {
    const findings = await policyScanner.scan(
      makeCtx(
        makeManifest({
          permissions: ["android.permission.SYSTEM_ALERT_WINDOW"],
        }),
      ),
    );
    const f = findings.find((f) => f.ruleId === "policy-overlay");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("does not flag families when no children features", async () => {
    const findings = await policyScanner.scan(
      makeCtx(
        makeManifest({
          permissions: ["android.permission.ACCESS_FINE_LOCATION"],
          features: [{ name: "android.hardware.camera", required: true }],
        }),
      ),
    );
    expect(findings.find((f) => f.ruleId === "policy-families-data-collection")).toBeUndefined();
  });

  it("does not flag financial when only one matching permission", async () => {
    const findings = await policyScanner.scan(
      makeCtx(
        makeManifest({
          permissions: ["android.permission.READ_SMS"],
        }),
      ),
    );
    expect(findings.find((f) => f.ruleId === "policy-financial-app")).toBeUndefined();
  });
});
