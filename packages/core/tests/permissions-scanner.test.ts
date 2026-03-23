import { describe, it, expect } from "vitest";
import { permissionsScanner } from "../src/preflight/scanners/permissions-scanner";
import type { PreflightContext, ParsedManifest } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeManifest(permissions: string[]): ParsedManifest {
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
    permissions,
    features: [],
    activities: [],
    services: [],
    receivers: [],
    providers: [],
  };
}

function makeCtx(permissions: string[], allowedPermissions: string[] = []): PreflightContext {
  return {
    manifest: makeManifest(permissions),
    config: { ...DEFAULT_PREFLIGHT_CONFIG, allowedPermissions },
  };
}

describe("permissionsScanner", () => {
  it("returns no findings for clean permissions", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.INTERNET", "android.permission.VIBRATE"]),
    );
    expect(findings).toEqual([]);
  });

  it("flags SMS permissions as critical", async () => {
    const findings = await permissionsScanner.scan(makeCtx(["android.permission.READ_SMS"]));
    const f = findings.find((f) => f.ruleId.includes("read_sms"));
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("flags CALL_LOG permissions as critical", async () => {
    const findings = await permissionsScanner.scan(makeCtx(["android.permission.READ_CALL_LOG"]));
    const f = findings.find((f) => f.ruleId.includes("read_call_log"));
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("flags QUERY_ALL_PACKAGES as error", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.QUERY_ALL_PACKAGES"]),
    );
    const f = findings.find((f) => f.ruleId.includes("query_all_packages"));
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
  });

  it("flags MANAGE_EXTERNAL_STORAGE as error", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.MANAGE_EXTERNAL_STORAGE"]),
    );
    const f = findings.find((f) => f.ruleId.includes("manage_external_storage"));
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
  });

  it("flags ACCESS_BACKGROUND_LOCATION as error", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.ACCESS_BACKGROUND_LOCATION"]),
    );
    expect(findings.some((f) => f.severity === "error")).toBe(true);
  });

  it("flags READ_MEDIA_IMAGES as error", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.READ_MEDIA_IMAGES"]),
    );
    expect(findings.some((f) => f.severity === "error")).toBe(true);
  });

  it("respects allowedPermissions whitelist", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.READ_SMS"], ["android.permission.READ_SMS"]),
    );
    // Should not flag READ_SMS since it's allowed
    expect(findings.find((f) => f.ruleId.includes("READ_SMS"))).toBeUndefined();
  });

  it("generates data safety reminder for location permission", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.ACCESS_FINE_LOCATION"]),
    );
    const f = findings.find((f) => f.ruleId === "data-safety-reminder");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
    expect(f!.message).toContain("precise location");
  });

  it("generates data safety reminder for multiple data permissions", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx([
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_CONTACTS",
      ]),
    );
    const f = findings.find((f) => f.ruleId === "data-safety-reminder");
    expect(f).toBeDefined();
    expect(f!.message).toContain("camera");
    expect(f!.message).toContain("audio");
    expect(f!.message).toContain("contacts");
  });

  it("detects multiple restricted permissions at once", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx([
        "android.permission.READ_SMS",
        "android.permission.SEND_SMS",
        "android.permission.READ_CALL_LOG",
      ]),
    );
    const restricted = findings.filter((f) => f.ruleId !== "data-safety-reminder");
    expect(restricted.length).toBe(3);
    expect(restricted.every((f) => f.severity === "critical")).toBe(true);
  });
});
