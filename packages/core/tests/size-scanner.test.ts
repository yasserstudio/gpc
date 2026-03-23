import { describe, it, expect } from "vitest";
import { sizeScanner } from "../src/preflight/scanners/size-scanner";
import type { PreflightContext, ZipEntryInfo } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeCtx(entries: ZipEntryInfo[], maxDownloadSizeMb?: number): PreflightContext {
  return {
    zipEntries: entries,
    config: {
      ...DEFAULT_PREFLIGHT_CONFIG,
      maxDownloadSizeMb: maxDownloadSizeMb ?? DEFAULT_PREFLIGHT_CONFIG.maxDownloadSizeMb,
    },
  };
}

const MB = 1024 * 1024;

describe("sizeScanner", () => {
  it("passes for small bundles", async () => {
    const findings = await sizeScanner.scan(makeCtx([
      { path: "base/dex/classes.dex", compressedSize: 5 * MB, uncompressedSize: 10 * MB },
      { path: "base/res/drawable/icon.png", compressedSize: 0.5 * MB, uncompressedSize: 1 * MB },
    ]));
    expect(findings.find((f) => f.ruleId === "size-over-limit")).toBeUndefined();
    const summary = findings.find((f) => f.ruleId === "size-summary");
    expect(summary).toBeDefined();
    expect(summary!.title).toContain("5.5 MB");
  });

  it("warns when compressed size exceeds limit", async () => {
    const findings = await sizeScanner.scan(makeCtx([
      { path: "base/dex/classes.dex", compressedSize: 100 * MB, uncompressedSize: 200 * MB },
      { path: "base/lib/arm64-v8a/libapp.so", compressedSize: 60 * MB, uncompressedSize: 120 * MB },
    ]));
    const f = findings.find((f) => f.ruleId === "size-over-limit");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("respects custom maxDownloadSizeMb", async () => {
    const findings = await sizeScanner.scan(makeCtx([
      { path: "base/dex/classes.dex", compressedSize: 100 * MB, uncompressedSize: 200 * MB },
    ], 200));
    expect(findings.find((f) => f.ruleId === "size-over-limit")).toBeUndefined();
  });

  it("warns on large native libraries", async () => {
    const findings = await sizeScanner.scan(makeCtx([
      { path: "base/lib/arm64-v8a/libhuge.so", compressedSize: 55 * MB, uncompressedSize: 100 * MB },
    ]));
    const f = findings.find((f) => f.ruleId === "size-large-native");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("reports large assets", async () => {
    const findings = await sizeScanner.scan(makeCtx([
      { path: "base/assets/model.tflite", compressedSize: 35 * MB, uncompressedSize: 40 * MB },
    ]));
    const f = findings.find((f) => f.ruleId === "size-large-assets");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
  });

  it("includes category breakdown in summary", async () => {
    const findings = await sizeScanner.scan(makeCtx([
      { path: "base/dex/classes.dex", compressedSize: 5 * MB, uncompressedSize: 10 * MB },
      { path: "base/lib/arm64-v8a/libapp.so", compressedSize: 10 * MB, uncompressedSize: 20 * MB },
      { path: "base/res/drawable/bg.png", compressedSize: 2 * MB, uncompressedSize: 4 * MB },
    ]));
    const summary = findings.find((f) => f.ruleId === "size-summary");
    expect(summary).toBeDefined();
    expect(summary!.message).toContain("native-libs");
    expect(summary!.message).toContain("dex");
    expect(summary!.message).toContain("resources");
  });

  it("counts total entries", async () => {
    const findings = await sizeScanner.scan(makeCtx([
      { path: "a.dex", compressedSize: 100, uncompressedSize: 200 },
      { path: "b.dex", compressedSize: 100, uncompressedSize: 200 },
      { path: "c.dex", compressedSize: 100, uncompressedSize: 200 },
    ]));
    const summary = findings.find((f) => f.ruleId === "size-summary");
    expect(summary!.message).toContain("3 files");
  });
});
