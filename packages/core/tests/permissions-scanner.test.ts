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

  // --- April 2026 policy: Contacts Permission ---

  it("flags READ_CONTACTS as contacts-permission-broad warning", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.READ_CONTACTS"]),
    );
    const f = findings.find((f) => f.ruleId === "contacts-permission-broad");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
    expect(f!.message).toContain("READ_CONTACTS");
  });

  it("flags WRITE_CONTACTS as contacts-permission-broad warning", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.WRITE_CONTACTS"]),
    );
    const f = findings.find((f) => f.ruleId === "contacts-permission-broad");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("emits single finding when both READ_CONTACTS and WRITE_CONTACTS present", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx([
        "android.permission.READ_CONTACTS",
        "android.permission.WRITE_CONTACTS",
      ]),
    );
    const contactsFindings = findings.filter((f) => f.ruleId === "contacts-permission-broad");
    expect(contactsFindings).toHaveLength(1);
    expect(contactsFindings[0]!.message).toContain("READ_CONTACTS");
    expect(contactsFindings[0]!.message).toContain("WRITE_CONTACTS");
  });

  it("respects allowedPermissions for contacts-permission-broad", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(
        ["android.permission.READ_CONTACTS"],
        ["android.permission.READ_CONTACTS"],
      ),
    );
    expect(findings.find((f) => f.ruleId === "contacts-permission-broad")).toBeUndefined();
  });

  // --- April 2026 policy: Health Connect granular permissions ---

  it("flags READ_ALL_HEALTH_DATA as warning on targetSdk 36", async () => {
    const ctx: PreflightContext = {
      manifest: {
        ...makeManifest(["android.permission.health.READ_ALL_HEALTH_DATA"]),
        targetSdk: 36,
      },
      config: { ...DEFAULT_PREFLIGHT_CONFIG },
    };
    const findings = await permissionsScanner.scan(ctx);
    const f = findings.find((f) => f.ruleId === "health-connect-granular");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
    expect(f!.message).toContain("targetSdk >= 36");
  });

  it("flags READ_ALL_HEALTH_DATA as info on targetSdk 35", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.health.READ_ALL_HEALTH_DATA"]),
    );
    const f = findings.find((f) => f.ruleId === "health-connect-granular");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
  });

  it("does not flag health-connect-granular without READ_ALL_HEALTH_DATA", async () => {
    const findings = await permissionsScanner.scan(
      makeCtx(["android.permission.INTERNET"]),
    );
    expect(findings.find((f) => f.ruleId === "health-connect-granular")).toBeUndefined();
  });

  it("respects allowedPermissions for health-connect-granular", async () => {
    const ctx: PreflightContext = {
      manifest: {
        ...makeManifest(["android.permission.health.READ_ALL_HEALTH_DATA"]),
        targetSdk: 36,
      },
      config: {
        ...DEFAULT_PREFLIGHT_CONFIG,
        allowedPermissions: ["android.permission.health.READ_ALL_HEALTH_DATA"],
      },
    };
    const findings = await permissionsScanner.scan(ctx);
    expect(findings.find((f) => f.ruleId === "health-connect-granular")).toBeUndefined();
  });

  it("emits both contacts and health connect findings independently", async () => {
    const ctx: PreflightContext = {
      manifest: {
        ...makeManifest([
          "android.permission.READ_CONTACTS",
          "android.permission.health.READ_ALL_HEALTH_DATA",
        ]),
        targetSdk: 36,
      },
      config: { ...DEFAULT_PREFLIGHT_CONFIG },
    };
    const findings = await permissionsScanner.scan(ctx);
    expect(findings.find((f) => f.ruleId === "contacts-permission-broad")).toBeDefined();
    expect(findings.find((f) => f.ruleId === "health-connect-granular")).toBeDefined();
  });

  it("flags health-connect-granular as warning on targetSdk 37", async () => {
    const ctx: PreflightContext = {
      manifest: {
        ...makeManifest(["android.permission.health.READ_ALL_HEALTH_DATA"]),
        targetSdk: 37,
      },
      config: { ...DEFAULT_PREFLIGHT_CONFIG },
    };
    const findings = await permissionsScanner.scan(ctx);
    const f = findings.find((f) => f.ruleId === "health-connect-granular");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });
});
