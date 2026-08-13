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
  it("returns only the developer-verification advisory for a clean manifest", async () => {
    const findings = await policyScanner.scan(makeCtx(makeManifest()));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe("policy-developer-verification");
    expect(findings[0]!.severity).toBe("info");
  });

  // GH #101: the reporter's app declared foregroundServiceType correctly, so the
  // manifest scanner passed. What was missing was the Play Console App content
  // declaration, which only surfaced as a 403 after a 130 MB upload.
  describe("App content declaration advisory", () => {
    it("flags foreground service permissions", async () => {
      const findings = await policyScanner.scan(
        makeCtx(
          makeManifest({
            permissions: [
              "android.permission.FOREGROUND_SERVICE",
              "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
              "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
            ],
          }),
        ),
      );

      const f = findings.find((x) => x.ruleId === "policy-app-content-declaration");
      expect(f).toBeDefined();
      expect(f!.severity).toBe("info");
      expect(f!.message).toContain("FOREGROUND_SERVICE_MEDIA_PLAYBACK");
      expect(f!.message).toContain("FOREGROUND_SERVICE_DATA_SYNC");
      expect(f!.suggestion).toContain("App content");
    });

    it("emits one aggregated finding rather than one per permission", async () => {
      const findings = await policyScanner.scan(
        makeCtx(
          makeManifest({
            permissions: [
              "android.permission.FOREGROUND_SERVICE",
              "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
              "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
              "android.permission.FOREGROUND_SERVICE_LOCATION",
            ],
          }),
        ),
      );

      expect(findings.filter((f) => f.ruleId === "policy-app-content-declaration")).toHaveLength(1);
    });

    it("stays silent when no foreground service permission is requested", async () => {
      const findings = await policyScanner.scan(
        makeCtx(makeManifest({ permissions: ["android.permission.INTERNET"] })),
      );

      expect(findings.find((f) => f.ruleId === "policy-app-content-declaration")).toBeUndefined();
    });

    it("never fails a preflight run on its own", async () => {
      const findings = await policyScanner.scan(
        makeCtx(makeManifest({ permissions: ["android.permission.FOREGROUND_SERVICE"] })),
      );

      // info severity sits below the default failOn threshold
      for (const f of findings) {
        expect(f.severity).toBe("info");
      }
    });
  });

  it("always emits the developer-verification advisory (info, cites date + markets)", async () => {
    // present even alongside other findings; never fails a run
    const findings = await policyScanner.scan(
      makeCtx(makeManifest({ permissions: ["android.permission.SYSTEM_ALERT_WINDOW"] })),
    );
    const v = findings.find((f) => f.ruleId === "policy-developer-verification");
    expect(v).toBeDefined();
    expect(v!.severity).toBe("info");
    expect(v!.message).toContain("September 30, 2026");
    expect(v!.message).toContain("Brazil");
    expect(v!.message).toContain("Play App Signing");
    // July 15, 2026 Play Console registration mandate (unregistered apps risk removal)
    expect(v!.message).toContain("July 15, 2026");
    expect(v!.message).toContain("registered in Play Console");
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
