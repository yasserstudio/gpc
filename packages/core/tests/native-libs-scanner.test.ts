import { describe, it, expect } from "vitest";
import { nativeLibsScanner, checkElfAlignment } from "../src/preflight/scanners/native-libs-scanner";
import type { PreflightContext, ZipEntryInfo, EntryHeaderMap } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeCtx(entries: ZipEntryInfo[], headers?: EntryHeaderMap): PreflightContext {
  return {
    zipEntries: entries,
    nativeLibHeaders: headers,
    config: { ...DEFAULT_PREFLIGHT_CONFIG },
  };
}

/** Build a minimal ELF64 little-endian binary with one PT_LOAD segment at given alignment. */
function fakeElf64(align: number): Buffer {
  const headerSize = 64;
  const phEntSize = 56;
  const buf = Buffer.alloc(headerSize + phEntSize);

  // ELF magic
  buf.writeUInt32BE(0x7f454c46, 0); // \x7fELF
  buf[4] = 2; // EI_CLASS = 64-bit
  buf[5] = 1; // EI_DATA = little-endian

  // e_phoff (offset 32, 8 bytes) = 64 (right after header)
  buf.writeBigUInt64LE(BigInt(headerSize), 32);
  // e_phentsize (offset 54, 2 bytes) = 56
  buf.writeUInt16LE(phEntSize, 54);
  // e_phnum (offset 56, 2 bytes) = 1
  buf.writeUInt16LE(1, 56);

  // Program header at offset 64
  const ph = headerSize;
  buf.writeUInt32LE(1, ph); // p_type = PT_LOAD
  buf.writeBigUInt64LE(BigInt(align), ph + 48); // p_align

  return buf;
}

/** Build a minimal ELF32 little-endian binary with one PT_LOAD segment at given alignment. */
function fakeElf32(align: number): Buffer {
  const headerSize = 52;
  const phEntSize = 32;
  const buf = Buffer.alloc(headerSize + phEntSize);

  buf.writeUInt32BE(0x7f454c46, 0);
  buf[4] = 1; // EI_CLASS = 32-bit
  buf[5] = 1; // EI_DATA = little-endian

  // e_phoff (offset 28, 4 bytes) = 52
  buf.writeUInt32LE(headerSize, 28);
  // e_phentsize (offset 42, 2 bytes) = 32
  buf.writeUInt16LE(phEntSize, 42);
  // e_phnum (offset 44, 2 bytes) = 1
  buf.writeUInt16LE(1, 44);

  // Program header at offset 52
  const ph = headerSize;
  buf.writeUInt32LE(1, ph); // p_type = PT_LOAD
  buf.writeUInt32LE(align, ph + 28); // p_align

  return buf;
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

describe("checkElfAlignment", () => {
  it("returns null for non-ELF data", () => {
    expect(checkElfAlignment(Buffer.from("not an elf"))).toBeNull();
  });

  it("returns null for buffer too small", () => {
    expect(checkElfAlignment(Buffer.alloc(10))).toBeNull();
  });

  it("parses 64-bit ELF with 16KB alignment", () => {
    const result = checkElfAlignment(fakeElf64(16384));
    expect(result).not.toBeNull();
    expect(result!.is64).toBe(true);
    expect(result!.minAlign).toBe(16384);
  });

  it("parses 64-bit ELF with 4KB alignment", () => {
    const result = checkElfAlignment(fakeElf64(4096));
    expect(result).not.toBeNull();
    expect(result!.minAlign).toBe(4096);
  });

  it("parses 32-bit ELF with 16KB alignment", () => {
    const result = checkElfAlignment(fakeElf32(16384));
    expect(result).not.toBeNull();
    expect(result!.is64).toBe(false);
    expect(result!.minAlign).toBe(16384);
  });

  it("parses 32-bit ELF with 4KB alignment", () => {
    const result = checkElfAlignment(fakeElf32(4096));
    expect(result).not.toBeNull();
    expect(result!.minAlign).toBe(4096);
  });
});

describe("16KB alignment scanner integration", () => {
  it("flags non-16KB-aligned .so as critical", async () => {
    const headers: EntryHeaderMap = new Map([
      ["base/lib/arm64-v8a/libapp.so", fakeElf64(4096)],
    ]);
    const findings = await nativeLibsScanner.scan(
      makeCtx([lib("arm64-v8a")], headers),
    );
    const f = findings.find((f) => f.ruleId === "native-libs-16kb-alignment");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
    expect(f!.message).toContain("4KB");
  });

  it("does not flag 16KB-aligned .so", async () => {
    const headers: EntryHeaderMap = new Map([
      ["base/lib/arm64-v8a/libapp.so", fakeElf64(16384)],
    ]);
    const findings = await nativeLibsScanner.scan(
      makeCtx([lib("arm64-v8a")], headers),
    );
    expect(findings.find((f) => f.ruleId === "native-libs-16kb-alignment")).toBeUndefined();
  });

  it("downgrades to warning with pageSizeCompat", async () => {
    const headers: EntryHeaderMap = new Map([
      ["base/lib/arm64-v8a/libapp.so", fakeElf64(4096)],
    ]);
    const ctx = makeCtx([lib("arm64-v8a")], headers);
    ctx.manifest = {
      packageName: "com.test",
      versionCode: 1,
      versionName: "1.0",
      minSdk: 21,
      targetSdk: 36,
      debuggable: false,
      testOnly: false,
      usesCleartextTraffic: false,
      extractNativeLibs: false,
      pageSizeCompat: true,
      permissions: [],
      features: [],
      activities: [],
      services: [],
      receivers: [],
      providers: [],
    };
    const findings = await nativeLibsScanner.scan(ctx);
    const f = findings.find((f) => f.ruleId === "native-libs-16kb-alignment");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
    expect(f!.message).toContain("pageSizeCompat");
  });

  it("skips check when no native lib headers provided", async () => {
    const findings = await nativeLibsScanner.scan(
      makeCtx([lib("arm64-v8a")]),
    );
    expect(findings.find((f) => f.ruleId === "native-libs-16kb-alignment")).toBeUndefined();
  });

  it("flags multiple non-compliant libs", async () => {
    const headers: EntryHeaderMap = new Map([
      ["base/lib/arm64-v8a/libfoo.so", fakeElf64(4096)],
      ["base/lib/arm64-v8a/libbar.so", fakeElf64(4096)],
      ["base/lib/arm64-v8a/libgood.so", fakeElf64(16384)],
    ]);
    const findings = await nativeLibsScanner.scan(
      makeCtx([lib("arm64-v8a", "libfoo.so"), lib("arm64-v8a", "libbar.so"), lib("arm64-v8a", "libgood.so")], headers),
    );
    const f = findings.find((f) => f.ruleId === "native-libs-16kb-alignment");
    expect(f).toBeDefined();
    expect(f!.title).toContain("2 native libraries");
  });
});
