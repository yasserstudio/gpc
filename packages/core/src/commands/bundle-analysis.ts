import { readFile, stat } from "node:fs/promises";

export interface BundleEntry {
  path: string;
  module: string;
  category: string;
  compressedSize: number;
  uncompressedSize: number;
}

export interface BundleAnalysis {
  filePath: string;
  fileType: "aab" | "apk";
  totalCompressed: number;
  totalUncompressed: number;
  entryCount: number;
  modules: { name: string; compressedSize: number; uncompressedSize: number; entries: number }[];
  categories: { name: string; compressedSize: number; uncompressedSize: number; entries: number }[];
  entries: BundleEntry[];
}

export interface BundleComparison {
  before: { path: string; totalCompressed: number };
  after: { path: string; totalCompressed: number };
  sizeDelta: number;
  sizeDeltaPercent: number;
  moduleDeltas: { module: string; before: number; after: number; delta: number }[];
  categoryDeltas: { category: string; before: number; after: number; delta: number }[];
}

const EOCD_SIGNATURE = 0x06054b50;
const CD_SIGNATURE = 0x02014b50;

/** Known AAB module subdirs that distinguish feature modules from arbitrary top-level dirs. */
const MODULE_SUBDIRS = new Set(["dex", "manifest", "res", "assets", "lib", "resources.pb", "root"]);

function detectCategory(path: string): string {
  const lower = path.toLowerCase();
  // dex files
  if (lower.endsWith(".dex") || /\/dex\/[^/]+\.dex$/.test(lower)) return "dex";
  // resources
  if (
    lower === "resources.arsc" ||
    lower.endsWith("/resources.arsc") ||
    lower.endsWith("/resources.pb") ||
    /^(([^/]+\/)?res\/)/.test(lower)
  ) return "resources";
  // assets
  if (/^(([^/]+\/)?assets\/)/.test(lower)) return "assets";
  // native libs
  if (/^(([^/]+\/)?lib\/)/.test(lower)) return "native-libs";
  // manifest
  if (
    lower === "androidmanifest.xml" ||
    lower.endsWith("/androidmanifest.xml") ||
    /^(([^/]+\/)?manifest\/)/.test(lower)
  ) return "manifest";
  // signing
  if (lower.startsWith("meta-inf/") || lower === "meta-inf") return "signing";
  return "other";
}

function detectModule(path: string, isAab: boolean): string {
  if (!isAab) return "(root)";

  const slashIdx = path.indexOf("/");
  if (slashIdx === -1) return "(root)";

  const topDir = path.substring(0, slashIdx);
  const rest = path.substring(slashIdx + 1);

  // "base/" module
  if (topDir === "base") return "base";

  // Root-level metadata
  if (topDir === "BUNDLE-METADATA" || topDir === "META-INF") return "(root)";
  if (path === "BundleConfig.pb") return "(root)";

  // Check if subdirectory matches known module structure
  const subDir = rest.split("/")[0] || "";
  if (MODULE_SUBDIRS.has(subDir)) return topDir;

  return "(root)";
}

interface CentralDirectoryEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
}

function parseCentralDirectory(buf: Buffer): CentralDirectoryEntry[] {
  // Find EOCD — scan backwards from end (minimum EOCD is 22 bytes)
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 65557; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Not a valid ZIP file: EOCD signature not found");
  }

  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  let cdOffset = buf.readUInt32LE(eocdOffset + 16);

  // Handle ZIP64 — if offset is 0xFFFFFFFF, look for ZIP64 EOCD locator
  if (cdOffset === 0xffffffff) {
    // ZIP64 end of central directory locator is 20 bytes before EOCD
    const zip64LocatorOffset = eocdOffset - 20;
    if (zip64LocatorOffset >= 0 && buf.readUInt32LE(zip64LocatorOffset) === 0x07064b50) {
      // ZIP64 EOCD is at offset stored in locator bytes 8-15
      const zip64EocdOffset = Number(buf.readBigUInt64LE(zip64LocatorOffset + 8));
      if (zip64EocdOffset >= 0 && zip64EocdOffset < buf.length) {
        cdOffset = Number(buf.readBigUInt64LE(zip64EocdOffset + 48));
      }
    }
  }

  const entries: CentralDirectoryEntry[] = [];
  let pos = cdOffset;
  const end = cdOffset + cdSize;

  while (pos < end && pos + 46 <= buf.length) {
    const sig = buf.readUInt32LE(pos);
    if (sig !== CD_SIGNATURE) break;

    const compressedSize = buf.readUInt32LE(pos + 20);
    const uncompressedSize = buf.readUInt32LE(pos + 24);
    const filenameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);

    const filename = buf.toString("utf-8", pos + 46, pos + 46 + filenameLen);

    // Skip directory entries (trailing slash)
    if (!filename.endsWith("/")) {
      entries.push({ filename, compressedSize, uncompressedSize });
    }

    pos += 46 + filenameLen + extraLen + commentLen;
  }

  return entries;
}

function detectFileType(filePath: string): "aab" | "apk" {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".aab")) return "aab";
  return "apk";
}

export async function analyzeBundle(filePath: string): Promise<BundleAnalysis> {
  const fileInfo = await stat(filePath).catch(() => null);
  if (!fileInfo || !fileInfo.isFile()) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buf = await readFile(filePath);
  const cdEntries = parseCentralDirectory(buf);
  const fileType = detectFileType(filePath);
  const isAab = fileType === "aab";

  const entries: BundleEntry[] = cdEntries.map((e) => ({
    path: e.filename,
    module: detectModule(e.filename, isAab),
    category: detectCategory(e.filename),
    compressedSize: e.compressedSize,
    uncompressedSize: e.uncompressedSize,
  }));

  // Aggregate by module
  const moduleMap = new Map<string, { compressedSize: number; uncompressedSize: number; entries: number }>();
  for (const entry of entries) {
    const existing = moduleMap.get(entry.module) ?? { compressedSize: 0, uncompressedSize: 0, entries: 0 };
    existing.compressedSize += entry.compressedSize;
    existing.uncompressedSize += entry.uncompressedSize;
    existing.entries += 1;
    moduleMap.set(entry.module, existing);
  }

  // Aggregate by category
  const categoryMap = new Map<string, { compressedSize: number; uncompressedSize: number; entries: number }>();
  for (const entry of entries) {
    const existing = categoryMap.get(entry.category) ?? { compressedSize: 0, uncompressedSize: 0, entries: 0 };
    existing.compressedSize += entry.compressedSize;
    existing.uncompressedSize += entry.uncompressedSize;
    existing.entries += 1;
    categoryMap.set(entry.category, existing);
  }

  const modules = [...moduleMap.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.compressedSize - a.compressedSize);

  const categories = [...categoryMap.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.compressedSize - a.compressedSize);

  const totalCompressed = entries.reduce((sum, e) => sum + e.compressedSize, 0);
  const totalUncompressed = entries.reduce((sum, e) => sum + e.uncompressedSize, 0);

  return {
    filePath,
    fileType,
    totalCompressed,
    totalUncompressed,
    entryCount: entries.length,
    modules,
    categories,
    entries,
  };
}

export function compareBundles(before: BundleAnalysis, after: BundleAnalysis): BundleComparison {
  const sizeDelta = after.totalCompressed - before.totalCompressed;
  const sizeDeltaPercent = before.totalCompressed > 0
    ? Math.round(((sizeDelta / before.totalCompressed) * 100) * 10) / 10
    : 0;

  // Module deltas
  const allModules = new Set([
    ...before.modules.map((m) => m.name),
    ...after.modules.map((m) => m.name),
  ]);
  const moduleDeltas = [...allModules].map((module) => {
    const b = before.modules.find((m) => m.name === module)?.compressedSize ?? 0;
    const a = after.modules.find((m) => m.name === module)?.compressedSize ?? 0;
    return { module, before: b, after: a, delta: a - b };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // Category deltas
  const allCategories = new Set([
    ...before.categories.map((c) => c.name),
    ...after.categories.map((c) => c.name),
  ]);
  const categoryDeltas = [...allCategories].map((category) => {
    const b = before.categories.find((c) => c.name === category)?.compressedSize ?? 0;
    const a = after.categories.find((c) => c.name === category)?.compressedSize ?? 0;
    return { category, before: b, after: a, delta: a - b };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    before: { path: before.filePath, totalCompressed: before.totalCompressed },
    after: { path: after.filePath, totalCompressed: after.totalCompressed },
    sizeDelta,
    sizeDeltaPercent,
    moduleDeltas,
    categoryDeltas,
  };
}

/** Return the top N largest files by compressed size. */
export function topFiles(
  analysis: BundleAnalysis,
  n: number = 20,
): BundleEntry[] {
  return [...analysis.entries]
    .sort((a, b) => b.compressedSize - a.compressedSize)
    .slice(0, n);
}

export interface BundleSizeConfig {
  maxTotalCompressed?: number;
  modules?: Record<string, { maxCompressed: number }>;
}

export interface BundleSizeCheckResult {
  passed: boolean;
  violations: Array<{ subject: string; actual: number; max: number }>;
}

/** Check bundle analysis against .bundlesize.json thresholds. */
export async function checkBundleSize(
  analysis: BundleAnalysis,
  configPath: string = ".bundlesize.json",
): Promise<BundleSizeCheckResult> {
  let config: BundleSizeConfig;
  try {
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw) as BundleSizeConfig;
  } catch {
    return { passed: true, violations: [] };
  }

  const violations: BundleSizeCheckResult["violations"] = [];

  if (config.maxTotalCompressed !== undefined && analysis.totalCompressed > config.maxTotalCompressed) {
    violations.push({
      subject: "total",
      actual: analysis.totalCompressed,
      max: config.maxTotalCompressed,
    });
  }

  if (config.modules) {
    for (const [moduleName, threshold] of Object.entries(config.modules)) {
      const mod = analysis.modules.find((m) => m.name === moduleName);
      if (mod && mod.compressedSize > threshold.maxCompressed) {
        violations.push({
          subject: `module:${moduleName}`,
          actual: mod.compressedSize,
          max: threshold.maxCompressed,
        });
      }
    }
  }

  return { passed: violations.length === 0, violations };
}
