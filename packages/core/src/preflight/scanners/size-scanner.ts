// Named exports only. No default export.

import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";
import { firstInstallEntries, largestAbi, nativeLibAbi } from "../bundle-layout.js";

const MB = 1024 * 1024;
/** https://support.google.com/googleplay/android-developer/answer/9859372 */
const PLAY_MOBILE_DATA_DIALOG_MB = 200;
const mb = (bytes: number): string => (bytes / MB).toFixed(1);

export const sizeScanner: PreflightScanner = {
  name: "size",
  description: "Analyzes app bundle size and warns on large downloads",
  requires: ["zipEntries"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const entries = ctx.zipEntries;
    if (!entries) {
      throw new Error('The "size" scanner requires zipEntries in the preflight context');
    }
    const findings: PreflightFinding[] = [];
    const maxMb = ctx.config.maxDownloadSizeMb;

    const totalCompressed = entries.reduce((sum, e) => sum + e.compressedSize, 0);
    const totalUncompressed = entries.reduce((sum, e) => sum + e.uncompressedSize, 0);

    // An APK is downloaded whole. From an AAB, Play builds split APKs and a device
    // downloads the install-time modules for its own ABI only (#116), so the
    // estimate keeps one ABI (the largest) and drops bundle metadata such as debug
    // symbols. Every density and language is still counted, so it errs high.
    const bundle = ctx.isAppBundle ?? false;
    const installed = firstInstallEntries(entries, bundle, ctx.deferredModules);
    const nativeAbi = bundle ? largestAbi(installed, (e) => e.compressedSize) : undefined;
    const delivered = bundle
      ? installed.filter((e) => {
          const abi = nativeLibAbi(e.path);
          return !abi || abi === nativeAbi?.abi;
        })
      : installed;
    const downloadBytes = delivered.reduce((sum, e) => sum + e.compressedSize, 0);

    if (downloadBytes / MB > maxMb) {
      const size = bundle
        ? `Estimated download for one device is ${mb(downloadBytes)} MB${nativeAbi ? ` (with ${nativeAbi.abi} native libraries)` : ""}`
        : `The APK is ${mb(downloadBytes)} MB compressed`;
      findings.push({
        scanner: "size",
        ruleId: "size-over-limit",
        severity: "warning",
        title: `Download size exceeds ${maxMb} MB`,
        message:
          `${size}, above your ${maxMb} MB threshold.` +
          (downloadBytes > PLAY_MOBILE_DATA_DIALOG_MB * MB
            ? ` Google Play shows users on mobile data a large-download dialog for apps over ${PLAY_MOBILE_DATA_DIALOG_MB} MB, which can reduce install rates.`
            : ""),
        suggestion: bundle
          ? "Remove unused resources, enable R8, and move large or optional content into fast-follow or on-demand asset packs or feature modules."
          : "Publish an Android App Bundle so each device downloads only its own ABI and screen density, remove unused resources, and enable R8.",
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/9859372",
      });
    }

    // Per-category breakdown of what one device downloads
    const categories = new Map<
      string,
      { compressed: number; uncompressed: number; count: number }
    >();
    for (const entry of delivered) {
      const cat = detectCategory(entry.path);
      const existing = categories.get(cat) ?? { compressed: 0, uncompressed: 0, count: 0 };
      existing.compressed += entry.compressedSize;
      existing.uncompressed += entry.uncompressedSize;
      existing.count += 1;
      categories.set(cat, existing);
    }

    // Large native libs
    const nativeLibs = categories.get("native-libs");
    if (nativeLibs && nativeLibs.compressed > 50 * MB) {
      findings.push({
        scanner: "size",
        ruleId: "size-large-native",
        severity: "warning",
        title: "Large native libraries",
        message: nativeAbi
          ? `Native libraries for ${nativeAbi.abi} are ${mb(nativeLibs.compressed)} MB (compressed), and each device on that ABI downloads all of them.`
          : `Native libraries are ${mb(nativeLibs.compressed)} MB (compressed) across every ABI in the APK.`,
        suggestion:
          "Review which native libraries are bundled. Consider using dynamic feature modules for optional native code.",
      });
    }

    // Large assets
    const assets = categories.get("assets");
    if (assets && assets.compressed > 30 * 1024 * 1024) {
      findings.push({
        scanner: "size",
        ruleId: "size-large-assets",
        severity: "info",
        title: "Large assets directory",
        message: `Assets are ${mb(assets.compressed)} MB (compressed). Consider using Play Asset Delivery for large assets.`,
        suggestion:
          "Move large assets to Play Asset Delivery (install-time, fast-follow, or on-demand packs).",
        policyUrl: "https://developer.android.com/guide/playcore/asset-delivery",
      });
    }

    // Summary
    const breakdown = [...categories.entries()]
      .sort((a, b) => b[1].compressed - a[1].compressed)
      .map(([cat, data]) => `${cat}: ${mb(data.compressed)} MB`)
      .join(", ");

    findings.push({
      scanner: "size",
      ruleId: "size-summary",
      severity: "info",
      title: bundle
        ? `Estimated download: ${mb(downloadBytes)} MB per device (bundle file ${mb(totalCompressed)} MB compressed, ${mb(totalUncompressed)} MB uncompressed)`
        : `Total size: ${mb(totalCompressed)} MB compressed, ${mb(totalUncompressed)} MB uncompressed`,
      message: bundle
        ? `${delivered.length} of ${entries.length} files reach one device. Breakdown: ${breakdown}`
        : `${entries.length} files. Breakdown: ${breakdown}`,
    });

    return findings;
  },
};

function detectCategory(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".dex") || /\/dex\//.test(lower)) return "dex";
  if (nativeLibAbi(path)) return "native-libs";
  if (/(?:^|\/)res\//.test(lower) || /(?:^|\/)resources\.(?:pb|arsc)$/.test(lower))
    return "resources";
  if (/(?:^|\/)assets\//.test(lower)) return "assets";
  if (lower.includes("androidmanifest.xml") || /\/manifest\//.test(lower)) return "manifest";
  if (lower.startsWith("meta-inf/")) return "signing";
  return "other";
}
