// Named exports only. No default export.

import type {
  PreflightScanner,
  PreflightContext,
  PreflightFinding,
  EntryHeaderMap,
} from "../types.js";

const KNOWN_ABIS = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"] as const;

/** Regex to match native library paths in AAB or APK. */
const LIB_PATH_RE = /^(?:[^/]+\/)?lib\/([^/]+)\/[^/]+\.so$/;

// ELF constants
const ELF_MAGIC = 0x7f454c46; // \x7fELF
const PT_LOAD = 1;
const PAGE_16KB = 16384; // 2^14

/** Parse ELF header and check PT_LOAD alignment. Returns min alignment or null if not ELF. */
export function checkElfAlignment(buf: Buffer): { minAlign: number; is64: boolean } | null {
  if (buf.length < 52) return null; // too small for any ELF header

  // Check magic bytes
  if (buf.readUInt32BE(0) !== ELF_MAGIC) return null;

  const is64 = buf[4] === 2; // EI_CLASS: 1=32-bit, 2=64-bit
  const isLE = buf[5] === 1; // EI_DATA: 1=little-endian, 2=big-endian

  const read16 = isLE ? (o: number) => buf.readUInt16LE(o) : (o: number) => buf.readUInt16BE(o);
  const read32 = isLE ? (o: number) => buf.readUInt32LE(o) : (o: number) => buf.readUInt32BE(o);
  const read64 = isLE
    ? (o: number) => Number(buf.readBigUInt64LE(o))
    : (o: number) => Number(buf.readBigUInt64BE(o));

  let phOff: number, phSize: number, phNum: number;
  if (is64) {
    if (buf.length < 64) return null;
    // ELF64: e_phoff at 32 (8 bytes), e_phentsize at 54 (2 bytes), e_phnum at 56 (2 bytes)
    phOff = read64(32);
    phSize = read16(54);
    phNum = read16(56);
  } else {
    // ELF32: e_phoff at 28 (4 bytes), e_phentsize at 42 (2 bytes), e_phnum at 44 (2 bytes)
    phOff = read32(28);
    phSize = read16(42);
    phNum = read16(44);
  }

  if (phNum === 0 || phSize === 0) return null;

  let minAlign = Infinity;
  let foundLoad = false;

  for (let i = 0; i < phNum; i++) {
    const off = phOff + i * phSize;
    if (off + phSize > buf.length) break;

    const pType = read32(off);
    if (pType !== PT_LOAD) continue;
    foundLoad = true;

    // p_align: ELF64 at offset 48 (8 bytes), ELF32 at offset 28 (4 bytes)
    const pAlign = is64 ? read64(off + 48) : read32(off + 28);

    if (pAlign > 0 && pAlign < minAlign) {
      minAlign = pAlign;
    }
  }

  if (!foundLoad) return null;
  return { minAlign: minAlign === Infinity ? 0 : minAlign, is64 };
}

function alignmentLabel(align: number): string {
  if (align <= 0) return "unknown";
  const log2 = Math.log2(align);
  return Number.isInteger(log2) ? `${align / 1024}KB (2^${log2})` : `${align} bytes`;
}

export const nativeLibsScanner: PreflightScanner = {
  name: "native-libs",
  description: "Checks native library architectures, 64-bit compliance, and 16KB alignment",
  requires: ["zipEntries"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const entries = ctx.zipEntries!;
    const findings: PreflightFinding[] = [];

    // Detect which ABIs are present
    const abisFound = new Set<string>();
    let totalNativeSize = 0;

    for (const entry of entries) {
      const match = LIB_PATH_RE.exec(entry.path);
      if (match) {
        abisFound.add(match[1]!);
        totalNativeSize += entry.uncompressedSize;
      }
    }

    // No native libraries -- nothing to check
    if (abisFound.size === 0) {
      return findings;
    }

    // 64-bit requirement: if 32-bit ABIs exist, 64-bit counterparts must also exist
    const has32Arm = abisFound.has("armeabi-v7a");
    const has64Arm = abisFound.has("arm64-v8a");
    const has32x86 = abisFound.has("x86");
    const has64x86 = abisFound.has("x86_64");

    if (has32Arm && !has64Arm) {
      findings.push({
        scanner: "native-libs",
        ruleId: "missing-arm64",
        severity: "critical",
        title: "Missing arm64-v8a native libraries",
        message:
          "App includes armeabi-v7a (32-bit ARM) native libraries but is missing arm64-v8a (64-bit ARM). Google Play requires 64-bit support for all apps with native code.",
        suggestion:
          "Build your native libraries for arm64-v8a. In build.gradle: ndk { abiFilters 'armeabi-v7a', 'arm64-v8a' }",
        policyUrl: "https://developer.android.com/google/play/requirements/64-bit",
      });
    }

    if (has32x86 && !has64x86) {
      findings.push({
        scanner: "native-libs",
        ruleId: "missing-x86_64",
        severity: "warning",
        title: "Missing x86_64 native libraries",
        message:
          "App includes x86 (32-bit) native libraries but is missing x86_64 (64-bit). While ARM is required, x86_64 is recommended for emulator and Chromebook support.",
        suggestion:
          "Add x86_64 to your ABI filters if you support x86: ndk { abiFilters 'x86', 'x86_64' }",
        policyUrl: "https://developer.android.com/google/play/requirements/64-bit",
      });
    }

    // 16KB page size alignment check (enforced since Nov 2025)
    check16KBAlignment(ctx.nativeLibHeaders, ctx.manifest, findings);

    // Report detected ABIs
    const detectedAbis = KNOWN_ABIS.filter((abi) => abisFound.has(abi));
    const unknownAbis = [...abisFound].filter(
      (abi) => !(KNOWN_ABIS as readonly string[]).includes(abi),
    );

    const abiList = [...detectedAbis, ...unknownAbis].join(", ");
    const sizeMb = (totalNativeSize / (1024 * 1024)).toFixed(1);

    findings.push({
      scanner: "native-libs",
      ruleId: "native-libs-summary",
      severity: "info",
      title: `Native libraries: ${abiList}`,
      message: `Found native libraries for ${abisFound.size} architecture(s): ${abiList}. Total uncompressed size: ${sizeMb} MB.`,
    });

    // Warn on large native libraries
    if (totalNativeSize > 150 * 1024 * 1024) {
      findings.push({
        scanner: "native-libs",
        ruleId: "native-libs-large",
        severity: "warning",
        title: "Large native libraries",
        message: `Native libraries total ${sizeMb} MB (uncompressed). This significantly increases download size.`,
        suggestion:
          "Consider using Android App Bundles to deliver only the required ABI per device. Review if all native libraries are necessary.",
      });
    }

    return findings;
  },
};

function check16KBAlignment(
  headers: EntryHeaderMap | undefined,
  manifest: PreflightContext["manifest"],
  findings: PreflightFinding[],
): void {
  if (!headers || headers.size === 0) return;

  const nonCompliant: Array<{ path: string; align: number }> = [];

  for (const [path, buf] of headers) {
    const result = checkElfAlignment(buf);
    if (!result) continue; // not a valid ELF or couldn't parse
    if (result.minAlign < PAGE_16KB) {
      nonCompliant.push({ path, align: result.minAlign });
    }
  }

  if (nonCompliant.length === 0) return;

  // Check for pageSizeCompat in manifest (Android 16 compat shim)
  const hasPageSizeCompat = manifest?.pageSizeCompat === true;

  const fileList = nonCompliant
    .map((f) => {
      const name = f.path.split("/").pop() ?? f.path;
      return `  ${name}: aligned to ${alignmentLabel(f.align)}, requires 16KB (2^14)`;
    })
    .join("\n");

  findings.push({
    scanner: "native-libs",
    ruleId: "native-libs-16kb-alignment",
    severity: hasPageSizeCompat ? "warning" : "critical",
    title: `${nonCompliant.length} native ${nonCompliant.length === 1 ? "library" : "libraries"} not 16KB aligned`,
    message:
      `Google Play requires 16KB page size alignment for all native libraries (enforced since Nov 2025).\n${fileList}` +
      (hasPageSizeCompat
        ? "\nandroid:pageSizeCompat is set, so the app will work via compatibility mode, but users on 16KB devices will see a compatibility dialog."
        : ""),
    suggestion:
      "Recompile with: -Wl,-z,max-page-size=16384\n" +
      "Or upgrade to NDK r28+ (16KB aligned by default).\n" +
      "Or set cmake flag: -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON (NDK r27).",
    policyUrl: "https://developer.android.com/guide/practices/page-sizes",
  });
}
