import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyzeBundle, compareBundles } from "../src/commands/bundle-analysis.js";
import type { BundleAnalysis } from "../src/commands/bundle-analysis.js";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Builds a minimal ZIP buffer with central directory entries.
 * Files have zero-length content — only the CD metadata matters for analysis.
 */
function buildTestZip(files: { name: string; compressedSize: number; uncompressedSize: number }[]): Buffer {
  const localHeaders: Buffer[] = [];
  const cdEntries: Buffer[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf-8");

    // Local file header (30 bytes + filename)
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0); // Local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt32LE(file.compressedSize, 18);
    local.writeUInt32LE(file.uncompressedSize, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    nameBytes.copy(local, 30);
    localHeaders.push(local);

    // Central directory entry (46 bytes + filename)
    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0); // CD signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt32LE(file.compressedSize, 20);
    cd.writeUInt32LE(file.uncompressedSize, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt16LE(0, 30); // extra length
    cd.writeUInt16LE(0, 32); // comment length
    cd.writeUInt32LE(localOffset, 42); // local header offset
    nameBytes.copy(cd, 46);
    cdEntries.push(cd);

    localOffset += local.length;
  }

  const cdOffset = localOffset;
  const cdBuffer = Buffer.concat(cdEntries);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(files.length, 8); // total entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(cdBuffer.length, 12); // CD size
  eocd.writeUInt32LE(cdOffset, 16); // CD offset

  return Buffer.concat([...localHeaders, cdBuffer, eocd]);
}

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `gpc-bundle-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("analyzeBundle", () => {
  it("parses a minimal AAB with base module", async () => {
    const zip = buildTestZip([
      { name: "base/dex/classes.dex", compressedSize: 5000, uncompressedSize: 10000 },
      { name: "base/manifest/AndroidManifest.xml", compressedSize: 500, uncompressedSize: 800 },
      { name: "base/res/drawable/icon.png", compressedSize: 2000, uncompressedSize: 3000 },
      { name: "BundleConfig.pb", compressedSize: 100, uncompressedSize: 200 },
    ]);
    const filePath = join(testDir, "app.aab");
    await writeFile(filePath, zip);

    const result = await analyzeBundle(filePath);

    expect(result.fileType).toBe("aab");
    expect(result.entryCount).toBe(4);
    expect(result.totalCompressed).toBe(7600);
    expect(result.totalUncompressed).toBe(14000);

    // Module detection
    const moduleNames = result.modules.map((m) => m.name);
    expect(moduleNames).toContain("base");
    expect(moduleNames).toContain("(root)");

    const baseModule = result.modules.find((m) => m.name === "base")!;
    expect(baseModule.compressedSize).toBe(7500); // 5000 + 500 + 2000
    expect(baseModule.entries).toBe(3);
  });

  it("detects feature modules in AAB", async () => {
    const zip = buildTestZip([
      { name: "base/dex/classes.dex", compressedSize: 3000, uncompressedSize: 6000 },
      { name: "feature_camera/dex/classes.dex", compressedSize: 1000, uncompressedSize: 2000 },
      { name: "feature_camera/assets/model.bin", compressedSize: 500, uncompressedSize: 500 },
    ]);
    const filePath = join(testDir, "app.aab");
    await writeFile(filePath, zip);

    const result = await analyzeBundle(filePath);
    const moduleNames = result.modules.map((m) => m.name);
    expect(moduleNames).toContain("base");
    expect(moduleNames).toContain("feature_camera");

    const featureModule = result.modules.find((m) => m.name === "feature_camera")!;
    expect(featureModule.compressedSize).toBe(1500);
    expect(featureModule.entries).toBe(2);
  });

  it("treats APK entries as root module", async () => {
    const zip = buildTestZip([
      { name: "classes.dex", compressedSize: 4000, uncompressedSize: 8000 },
      { name: "res/drawable/icon.png", compressedSize: 1000, uncompressedSize: 1500 },
      { name: "lib/arm64-v8a/libnative.so", compressedSize: 3000, uncompressedSize: 5000 },
    ]);
    const filePath = join(testDir, "app.apk");
    await writeFile(filePath, zip);

    const result = await analyzeBundle(filePath);
    expect(result.fileType).toBe("apk");
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0]!.name).toBe("(root)");
  });

  it("detects all categories correctly", async () => {
    const zip = buildTestZip([
      { name: "classes.dex", compressedSize: 100, uncompressedSize: 200 },
      { name: "res/layout/main.xml", compressedSize: 100, uncompressedSize: 200 },
      { name: "assets/fonts/roboto.ttf", compressedSize: 100, uncompressedSize: 200 },
      { name: "lib/armeabi-v7a/libnative.so", compressedSize: 100, uncompressedSize: 200 },
      { name: "AndroidManifest.xml", compressedSize: 100, uncompressedSize: 200 },
      { name: "META-INF/CERT.RSA", compressedSize: 100, uncompressedSize: 200 },
      { name: "kotlin/kotlin.kotlin_builtins", compressedSize: 100, uncompressedSize: 200 },
    ]);
    const filePath = join(testDir, "app.apk");
    await writeFile(filePath, zip);

    const result = await analyzeBundle(filePath);
    const catNames = result.categories.map((c) => c.name).sort();
    expect(catNames).toEqual(["assets", "dex", "manifest", "native-libs", "other", "resources", "signing"]);
  });

  it("handles resources.pb in AAB", async () => {
    const zip = buildTestZip([
      { name: "base/resources.pb", compressedSize: 200, uncompressedSize: 400 },
    ]);
    const filePath = join(testDir, "app.aab");
    await writeFile(filePath, zip);

    const result = await analyzeBundle(filePath);
    const entry = result.entries[0]!;
    expect(entry.category).toBe("resources");
    expect(entry.module).toBe("base");
  });

  it("throws on invalid file", async () => {
    const filePath = join(testDir, "not-a-zip.aab");
    await writeFile(filePath, Buffer.from("not a zip file"));

    await expect(analyzeBundle(filePath)).rejects.toThrow("EOCD signature not found");
  });

  it("throws on missing file", async () => {
    await expect(analyzeBundle(join(testDir, "missing.aab"))).rejects.toThrow("File not found");
  });

  it("handles empty ZIP (no entries)", async () => {
    const zip = buildTestZip([]);
    const filePath = join(testDir, "empty.apk");
    await writeFile(filePath, zip);

    const result = await analyzeBundle(filePath);
    expect(result.entryCount).toBe(0);
    expect(result.totalCompressed).toBe(0);
    expect(result.modules).toHaveLength(0);
    expect(result.categories).toHaveLength(0);
  });
});

describe("compareBundles", () => {
  it("computes size deltas between two analyses", () => {
    const before: BundleAnalysis = {
      filePath: "old.aab",
      fileType: "aab",
      totalCompressed: 10000,
      totalUncompressed: 20000,
      entryCount: 5,
      modules: [
        { name: "base", compressedSize: 8000, uncompressedSize: 16000, entries: 4 },
        { name: "(root)", compressedSize: 2000, uncompressedSize: 4000, entries: 1 },
      ],
      categories: [
        { name: "dex", compressedSize: 6000, uncompressedSize: 12000, entries: 2 },
        { name: "resources", compressedSize: 4000, uncompressedSize: 8000, entries: 3 },
      ],
      entries: [],
    };

    const after: BundleAnalysis = {
      filePath: "new.aab",
      fileType: "aab",
      totalCompressed: 12000,
      totalUncompressed: 24000,
      entryCount: 6,
      modules: [
        { name: "base", compressedSize: 9000, uncompressedSize: 18000, entries: 4 },
        { name: "feature_x", compressedSize: 1500, uncompressedSize: 3000, entries: 1 },
        { name: "(root)", compressedSize: 1500, uncompressedSize: 3000, entries: 1 },
      ],
      categories: [
        { name: "dex", compressedSize: 7000, uncompressedSize: 14000, entries: 3 },
        { name: "resources", compressedSize: 3000, uncompressedSize: 6000, entries: 2 },
        { name: "native-libs", compressedSize: 2000, uncompressedSize: 4000, entries: 1 },
      ],
      entries: [],
    };

    const comparison = compareBundles(before, after);

    expect(comparison.sizeDelta).toBe(2000);
    expect(comparison.sizeDeltaPercent).toBe(20);

    // Module deltas
    const baseDelta = comparison.moduleDeltas.find((m) => m.module === "base");
    expect(baseDelta?.delta).toBe(1000);

    const featureDelta = comparison.moduleDeltas.find((m) => m.module === "feature_x");
    expect(featureDelta?.before).toBe(0);
    expect(featureDelta?.after).toBe(1500);
    expect(featureDelta?.delta).toBe(1500);

    // Category deltas
    const dexDelta = comparison.categoryDeltas.find((c) => c.category === "dex");
    expect(dexDelta?.delta).toBe(1000);

    const nativeDelta = comparison.categoryDeltas.find((c) => c.category === "native-libs");
    expect(nativeDelta?.before).toBe(0);
    expect(nativeDelta?.after).toBe(2000);
  });

  it("handles zero before size for percent calculation", () => {
    const before: BundleAnalysis = {
      filePath: "empty.aab", fileType: "aab",
      totalCompressed: 0, totalUncompressed: 0, entryCount: 0,
      modules: [], categories: [], entries: [],
    };
    const after: BundleAnalysis = {
      filePath: "new.aab", fileType: "aab",
      totalCompressed: 5000, totalUncompressed: 10000, entryCount: 2,
      modules: [{ name: "base", compressedSize: 5000, uncompressedSize: 10000, entries: 2 }],
      categories: [{ name: "dex", compressedSize: 5000, uncompressedSize: 10000, entries: 2 }],
      entries: [],
    };

    const comparison = compareBundles(before, after);
    expect(comparison.sizeDeltaPercent).toBe(0);
    expect(comparison.sizeDelta).toBe(5000);
  });

  it("threshold detection — analyze returns size for checking", async () => {
    const zip = buildTestZip([
      { name: "classes.dex", compressedSize: 160 * 1024 * 1024, uncompressedSize: 200 * 1024 * 1024 },
    ]);
    const filePath = join(testDir, "large.apk");
    await writeFile(filePath, zip);

    const result = await analyzeBundle(filePath);
    // 160 MB compressed — threshold of 150 MB should breach
    const thresholdBytes = 150 * 1024 * 1024;
    expect(result.totalCompressed > thresholdBytes).toBe(true);
  });
});
