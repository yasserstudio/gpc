// Named exports only. No default export.

import type { ZipEntryInfo } from "./types.js";

/** `lib/<abi>/<name>.so` at the APK root or under an AAB module directory. */
const LIB_PATH_RE = /^(?:[^/]+\/)?lib\/([^/]+)\/[^/]+\.so$/;

/**
 * Bundle-level files Play never packages into device APKs: BUNDLE-METADATA/
 * (debug symbols, R8 mapping), the bundle's own signature, and BundleConfig.pb.
 * https://developer.android.com/guide/app-bundle/app-bundle-format
 */
function isBundleMetadata(path: string): boolean {
  return (
    path.startsWith("BUNDLE-METADATA/") ||
    path.startsWith("META-INF/") ||
    path === "BundleConfig.pb"
  );
}

/** ABI directory of a native library entry, or undefined if the entry is not one. */
export function nativeLibAbi(path: string): string | undefined {
  return LIB_PATH_RE.exec(path)?.[1];
}

/**
 * Entries that reach a device on first install. An APK ships whole. For an AAB,
 * bundle metadata and modules delivered later (on-demand, fast-follow) are dropped;
 * Play still splits what remains by ABI, density and language.
 */
export function firstInstallEntries(
  entries: readonly ZipEntryInfo[],
  isAppBundle: boolean,
  deferredModules: readonly string[] = [],
): ZipEntryInfo[] {
  if (!isAppBundle) return [...entries];
  const deferred = new Set(deferredModules);
  return entries.filter(
    (e) => !isBundleMetadata(e.path) && !deferred.has(e.path.split("/", 1)[0] ?? ""),
  );
}

/** The ABI whose native libraries are largest by `size`, or undefined if there are none. */
export function largestAbi(
  entries: readonly ZipEntryInfo[],
  size: (entry: ZipEntryInfo) => number,
): { abi: string; bytes: number } | undefined {
  const perAbi = new Map<string, number>();
  for (const entry of entries) {
    const abi = nativeLibAbi(entry.path);
    if (abi) perAbi.set(abi, (perAbi.get(abi) ?? 0) + size(entry));
  }
  let largest: { abi: string; bytes: number } | undefined;
  for (const [abi, bytes] of perAbi) {
    if (!largest || bytes > largest.bytes) largest = { abi, bytes };
  }
  return largest;
}
