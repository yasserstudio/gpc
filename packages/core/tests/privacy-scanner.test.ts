import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { privacyScanner } from "../src/preflight/scanners/privacy-scanner";
import type { PreflightContext, ParsedManifest } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeCtx(sourceDir: string, manifest?: ParsedManifest): PreflightContext {
  return { sourceDir, manifest, config: { ...DEFAULT_PREFLIGHT_CONFIG } };
}

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

describe("privacyScanner", () => {
  const tmpDir = join(tmpdir(), "gpc-test-privacy-scanner");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns no findings for clean code", async () => {
    await writeFile(join(tmpDir, "App.kt"), `class App { }`);
    const findings = await privacyScanner.scan(makeCtx(tmpDir));
    expect(findings).toEqual([]);
  });

  it("detects Facebook SDK", async () => {
    await writeFile(
      join(tmpDir, "App.kt"),
      `
      import com.facebook.sdk.FacebookSdk
    `,
    );
    const findings = await privacyScanner.scan(makeCtx(tmpDir));
    expect(findings.some((f) => f.ruleId === "tracking-facebook-sdk")).toBe(true);
  });

  it("detects Adjust SDK", async () => {
    await writeFile(
      join(tmpDir, "Tracker.kt"),
      `
      import com.adjust.sdk.Adjust
      val config = AdjustConfig(this, "token", AdjustConfig.ENVIRONMENT_PRODUCTION)
    `,
    );
    const findings = await privacyScanner.scan(makeCtx(tmpDir));
    expect(findings.some((f) => f.ruleId === "tracking-adjust-sdk")).toBe(true);
  });

  it("detects AppsFlyer SDK", async () => {
    await writeFile(
      join(tmpDir, "Analytics.java"),
      `
      import com.appsflyer.AppsFlyerLib;
    `,
    );
    const findings = await privacyScanner.scan(makeCtx(tmpDir));
    expect(findings.some((f) => f.ruleId === "tracking-appsflyer-sdk")).toBe(true);
  });

  it("detects Advertising ID usage", async () => {
    await writeFile(
      join(tmpDir, "AdHelper.kt"),
      `
      val adInfo = AdvertisingIdClient.getAdvertisingIdInfo(context)
    `,
    );
    const findings = await privacyScanner.scan(makeCtx(tmpDir));
    expect(findings.some((f) => f.ruleId === "advertising-id-usage")).toBe(true);
  });

  it("reports each SDK only once", async () => {
    await writeFile(join(tmpDir, "A.kt"), `import com.facebook.sdk.X`);
    await writeFile(join(tmpDir, "B.kt"), `import com.facebook.android.Y`);
    const findings = await privacyScanner.scan(makeCtx(tmpDir));
    const fb = findings.filter((f) => f.ruleId === "tracking-facebook-sdk");
    expect(fb).toHaveLength(1);
  });

  it("generates cross-reference when manifest + tracking SDKs present", async () => {
    await writeFile(join(tmpDir, "App.kt"), `import com.facebook.sdk.X`);
    const manifest = makeManifest(["android.permission.ACCESS_FINE_LOCATION"]);
    const findings = await privacyScanner.scan(makeCtx(tmpDir, manifest));
    const f = findings.find((f) => f.ruleId === "data-collection-cross-reference");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
    expect(f!.message).toContain("precise location");
  });
});
