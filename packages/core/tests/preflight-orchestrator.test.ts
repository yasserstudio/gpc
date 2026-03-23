import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock the AAB reader to avoid needing real AAB files
vi.mock("../src/preflight/aab-reader.js", () => ({
  readAab: vi.fn(),
}));

import { runPreflight } from "../src/preflight/orchestrator";
import { readAab } from "../src/preflight/aab-reader";
import type { ParsedManifest, ZipEntryInfo } from "../src/preflight/types";

const mockedReadAab = vi.mocked(readAab);

function cleanManifest(overrides: Partial<ParsedManifest> = {}): ParsedManifest {
  return {
    packageName: "com.example.app",
    versionCode: 42,
    versionName: "1.0.0",
    minSdk: 24,
    targetSdk: 35,
    debuggable: false,
    testOnly: false,
    usesCleartextTraffic: false,
    extractNativeLibs: true,
    permissions: [],
    features: [],
    activities: [],
    services: [],
    receivers: [],
    providers: [],
    ...overrides,
  };
}

const cleanEntries: ZipEntryInfo[] = [
  { path: "base/dex/classes.dex", compressedSize: 500_000, uncompressedSize: 1_000_000 },
  { path: "base/manifest/AndroidManifest.xml", compressedSize: 2000, uncompressedSize: 5000 },
];

describe("runPreflight orchestrator", () => {
  const tmpDir = join(tmpdir(), "gpc-test-preflight");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
    mockedReadAab.mockResolvedValue({
      manifest: cleanManifest(),
      entries: cleanEntries,
    });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("passes with a clean AAB", async () => {
    const result = await runPreflight({ aabPath: "/fake/app.aab" });
    expect(result.passed).toBe(true);
    expect(result.scanners.length).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("fails when debuggable is true", async () => {
    mockedReadAab.mockResolvedValue({
      manifest: cleanManifest({ debuggable: true }),
      entries: cleanEntries,
    });

    const result = await runPreflight({ aabPath: "/fake/app.aab" });
    expect(result.passed).toBe(false);
    expect(result.summary.critical).toBeGreaterThan(0);
  });

  it("filters scanners by name", async () => {
    const result = await runPreflight({
      aabPath: "/fake/app.aab",
      scanners: ["manifest"],
    });
    expect(result.scanners).toEqual(["manifest"]);
  });

  it("respects failOn threshold", async () => {
    mockedReadAab.mockResolvedValue({
      manifest: cleanManifest({ usesCleartextTraffic: true, targetSdk: 35 }),
      entries: cleanEntries,
    });

    // Default failOn is "error" — warning shouldn't fail
    const result1 = await runPreflight({ aabPath: "/fake/app.aab", failOn: "error" });
    expect(result1.passed).toBe(true);
    expect(result1.summary.warning).toBeGreaterThan(0);

    // With failOn "warning" — should fail
    const result2 = await runPreflight({ aabPath: "/fake/app.aab", failOn: "warning" });
    expect(result2.passed).toBe(false);
  });

  it("loads config from .preflightrc.json", async () => {
    const configPath = join(tmpDir, ".preflightrc.json");
    await writeFile(configPath, JSON.stringify({
      targetSdkMinimum: 34,
      disabledRules: ["cleartext-traffic"],
    }));

    mockedReadAab.mockResolvedValue({
      manifest: cleanManifest({ targetSdk: 34, usesCleartextTraffic: true }),
      entries: cleanEntries,
    });

    const result = await runPreflight({
      aabPath: "/fake/app.aab",
      configPath,
    });

    // targetSdk 34 should pass with minimum 34
    expect(result.findings.find((f) => f.ruleId === "targetSdk-below-minimum")).toBeUndefined();
    // cleartext-traffic should be filtered out
    expect(result.findings.find((f) => f.ruleId === "cleartext-traffic")).toBeUndefined();
  });

  it("applies severity overrides from config", async () => {
    const configPath = join(tmpDir, ".preflightrc.json");
    await writeFile(configPath, JSON.stringify({
      severityOverrides: { "targetSdk-below-minimum": "warning" },
    }));

    mockedReadAab.mockResolvedValue({
      manifest: cleanManifest({ targetSdk: 33 }),
      entries: cleanEntries,
    });

    const result = await runPreflight({
      aabPath: "/fake/app.aab",
      configPath,
      failOn: "error",
    });

    // targetSdk finding should be downgraded to warning, so it passes with failOn=error
    const f = result.findings.find((f) => f.ruleId === "targetSdk-below-minimum");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
    expect(result.passed).toBe(true);
  });

  it("sorts findings by severity (critical first)", async () => {
    mockedReadAab.mockResolvedValue({
      manifest: cleanManifest({
        debuggable: true,
        usesCleartextTraffic: true,
        targetSdk: 35,
        minSdk: 19,
      }),
      entries: cleanEntries,
    });

    const result = await runPreflight({ aabPath: "/fake/app.aab" });
    const severities = result.findings.map((f) => f.severity);
    // critical should come before warning, warning before info
    const criticalIdx = severities.indexOf("critical");
    const warningIdx = severities.indexOf("warning");
    const infoIdx = severities.indexOf("info");
    if (criticalIdx !== -1 && warningIdx !== -1) {
      expect(criticalIdx).toBeLessThan(warningIdx);
    }
    if (warningIdx !== -1 && infoIdx !== -1) {
      expect(warningIdx).toBeLessThan(infoIdx);
    }
  });

  it("returns correct summary counts", async () => {
    mockedReadAab.mockResolvedValue({
      manifest: cleanManifest({
        debuggable: true,
        versionCode: 0,
        minSdk: 19,
      }),
      entries: cleanEntries,
    });

    const result = await runPreflight({ aabPath: "/fake/app.aab" });
    expect(result.summary.critical).toBeGreaterThanOrEqual(1); // debuggable
    expect(result.summary.error).toBeGreaterThanOrEqual(1); // versionCode
    expect(result.summary.info).toBeGreaterThanOrEqual(1); // minSdk
  });

  it("skips scanners when context is not available", async () => {
    // No AAB provided, no metadata, no source — no scanners should run
    const result = await runPreflight({});
    expect(result.scanners).toEqual([]);
    expect(result.findings).toEqual([]);
    expect(result.passed).toBe(true);
  });
});
