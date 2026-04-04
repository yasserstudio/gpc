import { describe, it, expect } from "vitest";
import { manifestScanner } from "../src/preflight/scanners/manifest-scanner";
import type { PreflightContext, ParsedManifest } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeManifest(overrides: Partial<ParsedManifest> = {}): ParsedManifest {
  return {
    packageName: "com.example.app",
    versionCode: 42,
    versionName: "1.0.0",
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

function makeCtx(
  manifest: ParsedManifest,
  configOverrides: Partial<typeof DEFAULT_PREFLIGHT_CONFIG> = {},
): PreflightContext {
  return {
    manifest,
    config: { ...DEFAULT_PREFLIGHT_CONFIG, ...configOverrides },
  };
}

describe("manifestScanner", () => {
  it("returns no findings for a clean manifest", async () => {
    const findings = await manifestScanner.scan(makeCtx(makeManifest()));
    expect(findings).toEqual([]);
  });

  it("flags targetSdk below minimum as critical", async () => {
    const findings = await manifestScanner.scan(makeCtx(makeManifest({ targetSdk: 33 })));
    const f = findings.find((f) => f.ruleId === "targetSdk-below-minimum");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
    expect(f!.message).toContain("33");
  });

  it("passes when targetSdk equals minimum", async () => {
    const findings = await manifestScanner.scan(makeCtx(makeManifest({ targetSdk: 35 })));
    expect(findings.find((f) => f.ruleId === "targetSdk-below-minimum")).toBeUndefined();
  });

  it("respects custom targetSdkMinimum config", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(makeManifest({ targetSdk: 34 }), { targetSdkMinimum: 34 }),
    );
    expect(findings.find((f) => f.ruleId === "targetSdk-below-minimum")).toBeUndefined();
  });

  it("flags debuggable=true as critical", async () => {
    const findings = await manifestScanner.scan(makeCtx(makeManifest({ debuggable: true })));
    const f = findings.find((f) => f.ruleId === "debuggable-true");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("flags testOnly=true as critical", async () => {
    const findings = await manifestScanner.scan(makeCtx(makeManifest({ testOnly: true })));
    const f = findings.find((f) => f.ruleId === "testOnly-true");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("flags versionCode <= 0 as error", async () => {
    const findings = await manifestScanner.scan(makeCtx(makeManifest({ versionCode: 0 })));
    const f = findings.find((f) => f.ruleId === "versionCode-invalid");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
  });

  it("flags cleartext traffic on API 28+ as warning", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(makeManifest({ usesCleartextTraffic: true, targetSdk: 28 })),
    );
    const f = findings.find((f) => f.ruleId === "cleartext-traffic");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("does not flag cleartext traffic on API < 28", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(makeManifest({ usesCleartextTraffic: true, targetSdk: 27 }), {
        targetSdkMinimum: 27,
      }),
    );
    expect(findings.find((f) => f.ruleId === "cleartext-traffic")).toBeUndefined();
  });

  it("flags missing exported on components with intent filters (API 31+)", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(
        makeManifest({
          targetSdk: 35,
          activities: [
            { name: ".MainActivity", exported: undefined, hasIntentFilter: true },
            { name: ".OtherActivity", exported: true, hasIntentFilter: true },
          ],
        }),
      ),
    );
    const f = findings.filter((f) => f.ruleId === "missing-exported");
    expect(f).toHaveLength(1);
    expect(f[0]!.message).toContain("MainActivity");
  });

  it("does not flag missing exported without intent filters", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(
        makeManifest({
          targetSdk: 35,
          activities: [{ name: ".InternalActivity", exported: undefined, hasIntentFilter: false }],
        }),
      ),
    );
    expect(findings.find((f) => f.ruleId === "missing-exported")).toBeUndefined();
  });

  it("flags missing foregroundServiceType on API 34+", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(
        makeManifest({
          targetSdk: 35,
          permissions: ["android.permission.FOREGROUND_SERVICE"],
          services: [
            { name: ".MyService", hasIntentFilter: false, foregroundServiceType: undefined },
          ],
        }),
      ),
    );
    const f = findings.find((f) => f.ruleId === "foreground-service-type-missing");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
  });

  it("does not flag foregroundServiceType when declared", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(
        makeManifest({
          targetSdk: 35,
          permissions: ["android.permission.FOREGROUND_SERVICE"],
          services: [
            { name: ".MyService", hasIntentFilter: false, foregroundServiceType: "location" },
          ],
        }),
      ),
    );
    expect(findings.find((f) => f.ruleId === "foreground-service-type-missing")).toBeUndefined();
  });

  it("flags minSdk < 21 as info", async () => {
    const findings = await manifestScanner.scan(makeCtx(makeManifest({ minSdk: 19 })));
    const f = findings.find((f) => f.ruleId === "minSdk-below-21");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
  });

  it("flags exported service without permission", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(
        makeManifest({
          services: [{ name: "com.example.MyService", exported: true, hasIntentFilter: true }],
        }),
      ),
    );
    const f = findings.find((f) => f.ruleId === "exported-no-permission");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
    expect(f!.message).toContain("MyService");
  });

  it("skips exported component with permission", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(
        makeManifest({
          services: [
            {
              name: "com.example.MyService",
              exported: true,
              permission: "com.example.PERM",
              hasIntentFilter: false,
            },
          ],
        }),
      ),
    );
    expect(findings.find((f) => f.ruleId === "exported-no-permission")).toBeUndefined();
  });

  it("skips main launcher activity", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(
        makeManifest({
          activities: [
            {
              name: "com.example.MainActivity",
              exported: true,
              hasIntentFilter: true,
              intentActions: ["android.intent.action.MAIN"],
              intentCategories: ["android.intent.category.LAUNCHER"],
            },
          ],
        }),
      ),
    );
    expect(findings.find((f) => f.ruleId === "exported-no-permission")).toBeUndefined();
  });

  it("skips non-exported components", async () => {
    const findings = await manifestScanner.scan(
      makeCtx(
        makeManifest({
          receivers: [{ name: "com.example.MyReceiver", exported: false, hasIntentFilter: false }],
        }),
      ),
    );
    expect(findings.find((f) => f.ruleId === "exported-no-permission")).toBeUndefined();
  });
});
