import { describe, it, expect } from "vitest";
import { sizeScanner } from "../src/preflight/scanners/size-scanner";
import type { PreflightContext, ZipEntryInfo } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeCtx(
  entries: ZipEntryInfo[],
  maxDownloadSizeMb?: number,
  deferredModules?: string[],
  isAppBundle = false,
): PreflightContext {
  return {
    zipEntries: entries,
    isAppBundle,
    deferredModules,
    config: {
      ...DEFAULT_PREFLIGHT_CONFIG,
      maxDownloadSizeMb: maxDownloadSizeMb ?? DEFAULT_PREFLIGHT_CONFIG.maxDownloadSizeMb,
    },
  };
}

const MB = 1024 * 1024;

describe("sizeScanner", () => {
  it("passes for small bundles", async () => {
    const findings = await sizeScanner.scan(
      makeCtx([
        { path: "dex/classes.dex", compressedSize: 5 * MB, uncompressedSize: 10 * MB },
        { path: "res/drawable/icon.png", compressedSize: 0.5 * MB, uncompressedSize: 1 * MB },
      ]),
    );
    expect(findings.find((f) => f.ruleId === "size-over-limit")).toBeUndefined();
    const summary = findings.find((f) => f.ruleId === "size-summary");
    expect(summary).toBeDefined();
    expect(summary!.title).toContain("5.5 MB");
  });

  it("warns when compressed size exceeds limit", async () => {
    const findings = await sizeScanner.scan(
      makeCtx([
        { path: "dex/classes.dex", compressedSize: 150 * MB, uncompressedSize: 300 * MB },
        {
          path: "lib/arm64-v8a/libapp.so",
          compressedSize: 60 * MB,
          uncompressedSize: 120 * MB,
        },
      ]),
    );
    const f = findings.find((f) => f.ruleId === "size-over-limit");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("respects custom maxDownloadSizeMb", async () => {
    const findings = await sizeScanner.scan(
      makeCtx(
        [{ path: "dex/classes.dex", compressedSize: 100 * MB, uncompressedSize: 200 * MB }],
        200,
      ),
    );
    expect(findings.find((f) => f.ruleId === "size-over-limit")).toBeUndefined();
  });

  it("warns on large native libraries", async () => {
    const findings = await sizeScanner.scan(
      makeCtx([
        {
          path: "lib/arm64-v8a/libhuge.so",
          compressedSize: 55 * MB,
          uncompressedSize: 100 * MB,
        },
      ]),
    );
    const f = findings.find((f) => f.ruleId === "size-large-native");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("reports large assets", async () => {
    const findings = await sizeScanner.scan(
      makeCtx([
        { path: "assets/model.tflite", compressedSize: 35 * MB, uncompressedSize: 40 * MB },
      ]),
    );
    const f = findings.find((f) => f.ruleId === "size-large-assets");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
  });

  it("includes category breakdown in summary", async () => {
    const findings = await sizeScanner.scan(
      makeCtx([
        { path: "dex/classes.dex", compressedSize: 5 * MB, uncompressedSize: 10 * MB },
        {
          path: "lib/arm64-v8a/libapp.so",
          compressedSize: 10 * MB,
          uncompressedSize: 20 * MB,
        },
        { path: "res/drawable/bg.png", compressedSize: 2 * MB, uncompressedSize: 4 * MB },
      ]),
    );
    const summary = findings.find((f) => f.ruleId === "size-summary");
    expect(summary).toBeDefined();
    expect(summary!.message).toContain("native-libs");
    expect(summary!.message).toContain("dex");
    expect(summary!.message).toContain("resources");
  });

  it("counts total entries", async () => {
    const findings = await sizeScanner.scan(
      makeCtx([
        { path: "a.dex", compressedSize: 100, uncompressedSize: 200 },
        { path: "b.dex", compressedSize: 100, uncompressedSize: 200 },
        { path: "c.dex", compressedSize: 100, uncompressedSize: 200 },
      ]),
    );
    const summary = findings.find((f) => f.ruleId === "size-summary");
    expect(summary!.message).toContain("3 files");
  });

  describe("app bundles (#116)", () => {
    const bundleCtx = (entries: ZipEntryInfo[], maxMb?: number, deferred?: string[]) =>
      makeCtx(entries, maxMb, deferred, true);
    const manifest = {
      path: "base/manifest/AndroidManifest.xml",
      compressedSize: 1000,
      uncompressedSize: 4000,
    };
    const so = (abi: string, mb: number, module = "base"): ZipEntryInfo => ({
      path: `${module}/lib/${abi}/libapp.so`,
      compressedSize: mb * MB,
      uncompressedSize: mb * 2 * MB,
    });

    // Flutter-style bundle: three ABIs of ~50 MB each. The file is ~154 MB but a
    // device downloads one ABI, which is what the Play Store listing shows.
    const flutterBundle: ZipEntryInfo[] = [
      manifest,
      { path: "base/dex/classes.dex", compressedSize: 4 * MB, uncompressedSize: 8 * MB },
      so("armeabi-v7a", 45),
      so("arm64-v8a", 52),
      so("x86_64", 53),
    ];

    it("ignores native libs that live only in deferred modules", async () => {
      const findings = await sizeScanner.scan(
        bundleCtx([manifest, so("arm64-v8a", 80, "ar"), so("x86_64", 90, "ar")], undefined, ["ar"]),
      );
      expect(findings.find((f) => f.ruleId === "size-large-native")).toBeUndefined();
      expect(findings.find((f) => f.ruleId === "size-summary")!.title).toContain(
        "0.0 MB per device",
      );
    });

    it("counts one ABI, not every ABI, toward the download estimate", async () => {
      const findings = await sizeScanner.scan(bundleCtx(flutterBundle));
      expect(findings.find((f) => f.ruleId === "size-over-limit")).toBeUndefined();
      const summary = findings.find((f) => f.ruleId === "size-summary");
      expect(summary!.title).toContain("57.0 MB");
    });

    it("still warns when the one-ABI estimate is over the threshold", async () => {
      const findings = await sizeScanner.scan(bundleCtx(flutterBundle, 50));
      const f = findings.find((f) => f.ruleId === "size-over-limit");
      expect(f).toBeDefined();
      expect(f!.message).toContain("57.0 MB");
      expect(f!.message).toContain("x86_64");
      expect(f!.suggestion).not.toContain("Android App Bundle");
      // 57 MB is under Play's 200 MB dialog, so the message must not cite it.
      expect(f!.message).not.toContain("200 MB");
    });

    it("excludes bundle metadata such as debug symbols and the bundle signature", async () => {
      const findings = await sizeScanner.scan(
        bundleCtx([
          manifest,
          { path: "base/dex/classes.dex", compressedSize: 10 * MB, uncompressedSize: 20 * MB },
          {
            path: "BUNDLE-METADATA/com.android.tools.build.debugsymbols/arm64-v8a/libapp.so.sym",
            compressedSize: 300 * MB,
            uncompressedSize: 600 * MB,
          },
          { path: "META-INF/ANDROIDD.SF", compressedSize: 1 * MB, uncompressedSize: 1 * MB },
          { path: "BundleConfig.pb", compressedSize: 1 * MB, uncompressedSize: 1 * MB },
        ]),
      );
      expect(findings.find((f) => f.ruleId === "size-over-limit")).toBeUndefined();
      expect(findings.find((f) => f.ruleId === "size-summary")!.title).toContain("10.0 MB");
    });

    it("excludes modules that are not delivered at install time", async () => {
      const findings = await sizeScanner.scan(
        bundleCtx(
          [
            manifest,
            { path: "base/dex/classes.dex", compressedSize: 10 * MB, uncompressedSize: 20 * MB },
            {
              path: "levels/assets/world.pak",
              compressedSize: 900 * MB,
              uncompressedSize: 900 * MB,
            },
            so("arm64-v8a", 80, "camera"),
          ],
          undefined,
          ["levels", "camera"],
        ),
      );
      expect(findings.find((f) => f.ruleId === "size-over-limit")).toBeUndefined();
      expect(findings.find((f) => f.ruleId === "size-large-assets")).toBeUndefined();
      expect(findings.find((f) => f.ruleId === "size-large-native")).toBeUndefined();
    });

    it("counts install-time feature modules and their native libs per ABI", async () => {
      const findings = await sizeScanner.scan(
        bundleCtx([manifest, so("arm64-v8a", 30), so("arm64-v8a", 25, "ar"), so("x86_64", 40)]),
      );
      const f = findings.find((f) => f.ruleId === "size-large-native");
      expect(f).toBeDefined();
      expect(f!.message).toContain("55.0 MB");
      expect(f!.message).toContain("arm64-v8a");
    });

    it("does not flag native libs when each ABI is under the limit", async () => {
      const findings = await sizeScanner.scan(
        bundleCtx([manifest, so("armeabi-v7a", 45), so("arm64-v8a", 48), so("x86_64", 49)]),
      );
      expect(findings.find((f) => f.ruleId === "size-large-native")).toBeUndefined();
    });
  });

  it("an APK is downloaded whole, so every ABI counts", async () => {
    const findings = await sizeScanner.scan(
      makeCtx([
        { path: "AndroidManifest.xml", compressedSize: 1000, uncompressedSize: 4000 },
        { path: "lib/armeabi-v7a/libapp.so", compressedSize: 70 * MB, uncompressedSize: 140 * MB },
        { path: "lib/arm64-v8a/libapp.so", compressedSize: 75 * MB, uncompressedSize: 150 * MB },
        { path: "lib/x86_64/libapp.so", compressedSize: 80 * MB, uncompressedSize: 160 * MB },
      ]),
    );
    const over = findings.find((f) => f.ruleId === "size-over-limit");
    expect(over).toBeDefined();
    expect(over!.suggestion).toContain("Android App Bundle");
    expect(over!.message).toContain("large-download dialog");
    expect(findings.find((f) => f.ruleId === "size-large-native")).toBeDefined();
  });

  it("defaults the threshold to Google's 200 MB mobile-data dialog", () => {
    expect(DEFAULT_PREFLIGHT_CONFIG.maxDownloadSizeMb).toBe(200);
  });
});
