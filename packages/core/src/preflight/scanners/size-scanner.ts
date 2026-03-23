// Named exports only. No default export.

import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";

export const sizeScanner: PreflightScanner = {
  name: "size",
  description: "Analyzes app bundle size and warns on large downloads",
  requires: ["zipEntries"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const entries = ctx.zipEntries!;
    const findings: PreflightFinding[] = [];
    const maxMb = ctx.config.maxDownloadSizeMb;

    // Total compressed size (approximate download size)
    const totalCompressed = entries.reduce((sum, e) => sum + e.compressedSize, 0);
    const totalUncompressed = entries.reduce((sum, e) => sum + e.uncompressedSize, 0);
    const compressedMb = totalCompressed / (1024 * 1024);
    const uncompressedMb = totalUncompressed / (1024 * 1024);

    if (compressedMb > maxMb) {
      findings.push({
        scanner: "size",
        ruleId: "size-over-limit",
        severity: "warning",
        title: `Download size exceeds ${maxMb} MB`,
        message: `Compressed size is ${compressedMb.toFixed(1)} MB. Downloads over ${maxMb} MB show a mobile data warning to users, which reduces install rates.`,
        suggestion:
          "Use Android App Bundles for split APKs, remove unused resources, enable R8/ProGuard, and compress assets.",
        policyUrl: "https://developer.android.com/topic/performance/reduce-apk-size",
      });
    }

    // Per-category breakdown
    const categories = new Map<
      string,
      { compressed: number; uncompressed: number; count: number }
    >();
    for (const entry of entries) {
      const cat = detectCategory(entry.path);
      const existing = categories.get(cat) ?? { compressed: 0, uncompressed: 0, count: 0 };
      existing.compressed += entry.compressedSize;
      existing.uncompressed += entry.uncompressedSize;
      existing.count += 1;
      categories.set(cat, existing);
    }

    // Large native libs
    const nativeLibs = categories.get("native-libs");
    if (nativeLibs && nativeLibs.compressed > 50 * 1024 * 1024) {
      findings.push({
        scanner: "size",
        ruleId: "size-large-native",
        severity: "warning",
        title: "Large native libraries",
        message: `Native libraries are ${(nativeLibs.compressed / (1024 * 1024)).toFixed(1)} MB (compressed). This is the largest contributor to download size.`,
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
        message: `Assets are ${(assets.compressed / (1024 * 1024)).toFixed(1)} MB (compressed). Consider using Play Asset Delivery for large assets.`,
        suggestion:
          "Move large assets to Play Asset Delivery (install-time, fast-follow, or on-demand packs).",
        policyUrl: "https://developer.android.com/guide/playcore/asset-delivery",
      });
    }

    // Summary
    const breakdown = [...categories.entries()]
      .sort((a, b) => b[1].compressed - a[1].compressed)
      .map(([cat, data]) => `${cat}: ${(data.compressed / (1024 * 1024)).toFixed(1)} MB`)
      .join(", ");

    findings.push({
      scanner: "size",
      ruleId: "size-summary",
      severity: "info",
      title: `Total size: ${compressedMb.toFixed(1)} MB compressed, ${uncompressedMb.toFixed(1)} MB uncompressed`,
      message: `${entries.length} files. Breakdown: ${breakdown}`,
    });

    return findings;
  },
};

function detectCategory(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".dex") || /\/dex\//.test(lower)) return "dex";
  if (/\/lib\/[^/]+\/[^/]+\.so$/.test(lower)) return "native-libs";
  if (/\/res\//.test(lower) || lower.endsWith("/resources.pb") || lower.endsWith("/resources.arsc"))
    return "resources";
  if (/\/assets\//.test(lower)) return "assets";
  if (lower.includes("androidmanifest.xml") || /\/manifest\//.test(lower)) return "manifest";
  if (lower.startsWith("meta-inf/")) return "signing";
  return "other";
}
