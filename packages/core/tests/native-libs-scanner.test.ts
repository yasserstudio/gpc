import { describe, it, expect } from "vitest";
import { nativeLibsScanner } from "../src/preflight/scanners/native-libs-scanner";
import type { PreflightContext, ZipEntryInfo } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeCtx(entries: ZipEntryInfo[]): PreflightContext {
  return {
    zipEntries: entries,
    config: { ...DEFAULT_PREFLIGHT_CONFIG },
  };
}

function lib(abi: string, name: string = "libapp.so", size: number = 1024): ZipEntryInfo {
  return { path: `base/lib/${abi}/${name}`, compressedSize: size, uncompressedSize: size * 2 };
}

describe("nativeLibsScanner", () => {
  it("returns no findings when no native libraries exist", async () => {
    const findings = await nativeLibsScanner.scan(
      makeCtx([{ path: "base/dex/classes.dex", compressedSize: 1000, uncompressedSize: 2000 }]),
    );
    expect(findings).toEqual([]);
  });

  it("passes with 64-bit only (arm64-v8a)", async () => {
    const findings = await nativeLibsScanner.scan(makeCtx([lib("arm64-v8a")]));
    expect(findings.find((f) => f.severity === "critical")).toBeUndefined();
    expect(findings.find((f) => f.ruleId === "native-libs-summary")).toBeDefined();
  });

  it("passes with both 32-bit and 64-bit ARM", async () => {
    const findings = await nativeLibsScanner.scan(makeCtx([lib("armeabi-v7a"), lib("arm64-v8a")]));
    expect(findings.find((f) => f.severity === "critical")).toBeUndefined();
  });

  it("flags 32-bit ARM without 64-bit as critical", async () => {
    const findings = await nativeLibsScanner.scan(makeCtx([lib("armeabi-v7a")]));
    const f = findings.find((f) => f.ruleId === "missing-arm64");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("flags x86 without x86_64 as warning", async () => {
    const findings = await nativeLibsScanner.scan(makeCtx([lib("arm64-v8a"), lib("x86")]));
    const f = findings.find((f) => f.ruleId === "missing-x86_64");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("passes with complete x86 coverage", async () => {
    const findings = await nativeLibsScanner.scan(
      makeCtx([lib("arm64-v8a"), lib("x86"), lib("x86_64")]),
    );
    expect(findings.find((f) => f.ruleId === "missing-x86_64")).toBeUndefined();
  });

  it("includes summary with detected ABIs", async () => {
    const findings = await nativeLibsScanner.scan(makeCtx([lib("arm64-v8a"), lib("armeabi-v7a")]));
    const summary = findings.find((f) => f.ruleId === "native-libs-summary");
    expect(summary).toBeDefined();
    expect(summary!.title).toContain("arm64-v8a");
    expect(summary!.title).toContain("armeabi-v7a");
  });

  it("warns on large native libraries", async () => {
    const bigSize = 80 * 1024 * 1024; // 80 MB compressed → 160 MB uncompressed
    const findings = await nativeLibsScanner.scan(
      makeCtx([lib("arm64-v8a", "libbig.so", bigSize)]),
    );
    const f = findings.find((f) => f.ruleId === "native-libs-large");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });
});
