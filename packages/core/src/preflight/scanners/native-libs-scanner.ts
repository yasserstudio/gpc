// Named exports only. No default export.

import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";

const KNOWN_ABIS = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"] as const;

/** Regex to match native library paths in AAB or APK. */
const LIB_PATH_RE = /^(?:[^/]+\/)?lib\/([^/]+)\/[^/]+\.so$/;

export const nativeLibsScanner: PreflightScanner = {
  name: "native-libs",
  description: "Checks native library architectures for 64-bit compliance",
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

    // No native libraries — nothing to check
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
        message: "App includes armeabi-v7a (32-bit ARM) native libraries but is missing arm64-v8a (64-bit ARM). Google Play requires 64-bit support for all apps with native code.",
        suggestion: "Build your native libraries for arm64-v8a. In build.gradle: ndk { abiFilters 'armeabi-v7a', 'arm64-v8a' }",
        policyUrl: "https://developer.android.com/google/play/requirements/64-bit",
      });
    }

    if (has32x86 && !has64x86) {
      findings.push({
        scanner: "native-libs",
        ruleId: "missing-x86_64",
        severity: "warning",
        title: "Missing x86_64 native libraries",
        message: "App includes x86 (32-bit) native libraries but is missing x86_64 (64-bit). While ARM is required, x86_64 is recommended for emulator and Chromebook support.",
        suggestion: "Add x86_64 to your ABI filters if you support x86: ndk { abiFilters 'x86', 'x86_64' }",
        policyUrl: "https://developer.android.com/google/play/requirements/64-bit",
      });
    }

    // Report detected ABIs
    const detectedAbis = KNOWN_ABIS.filter((abi) => abisFound.has(abi));
    const unknownAbis = [...abisFound].filter((abi) => !(KNOWN_ABIS as readonly string[]).includes(abi));

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
        suggestion: "Consider using Android App Bundles to deliver only the required ABI per device. Review if all native libraries are necessary.",
      });
    }

    return findings;
  },
};
