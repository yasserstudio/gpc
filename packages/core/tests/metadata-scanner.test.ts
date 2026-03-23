import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { metadataScanner } from "../src/preflight/scanners/metadata-scanner";
import type { PreflightContext } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeCtx(metadataDir: string): PreflightContext {
  return { metadataDir, config: { ...DEFAULT_PREFLIGHT_CONFIG } };
}

describe("metadataScanner", () => {
  const tmpDir = join(tmpdir(), "gpc-test-metadata-scanner");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("passes with valid metadata", async () => {
    const langDir = join(tmpDir, "en-US");
    await mkdir(langDir, { recursive: true });
    await writeFile(join(langDir, "title.txt"), "My App");
    await writeFile(join(langDir, "short_description.txt"), "A great app");
    await writeFile(join(langDir, "full_description.txt"), "Full description here");
    await writeFile(join(langDir, "privacy_policy_url.txt"), "https://example.com/privacy");

    const ssDir = join(langDir, "images", "phoneScreenshots");
    await mkdir(ssDir, { recursive: true });
    await writeFile(join(ssDir, "1.png"), "fake");
    await writeFile(join(ssDir, "2.png"), "fake");
    await writeFile(join(ssDir, "3.png"), "fake");
    await writeFile(join(ssDir, "4.png"), "fake");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const errors = findings.filter((f) => f.severity === "error");
    const warnings = findings.filter((f) => f.severity === "warning");
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("flags title over 30 characters", async () => {
    const langDir = join(tmpDir, "en-US");
    await mkdir(langDir, { recursive: true });
    await writeFile(join(langDir, "title.txt"), "A".repeat(35));
    await writeFile(join(langDir, "privacy_policy_url.txt"), "https://example.com");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "listing-title-over-limit");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
    expect(f!.message).toContain("35");
  });

  it("flags short description over 80 characters", async () => {
    const langDir = join(tmpDir, "en-US");
    await mkdir(langDir, { recursive: true });
    await writeFile(join(langDir, "title.txt"), "App");
    await writeFile(join(langDir, "short_description.txt"), "A".repeat(85));
    await writeFile(join(langDir, "privacy_policy_url.txt"), "https://example.com");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "listing-shortDescription-over-limit");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
  });

  it("flags missing title", async () => {
    const langDir = join(tmpDir, "en-US");
    await mkdir(langDir, { recursive: true });
    await writeFile(join(langDir, "short_description.txt"), "Description");
    await writeFile(join(langDir, "privacy_policy_url.txt"), "https://example.com");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "listing-missing-title");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
  });

  it("flags missing privacy policy URL", async () => {
    const langDir = join(tmpDir, "en-US");
    await mkdir(langDir, { recursive: true });
    await writeFile(join(langDir, "title.txt"), "My App");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "listing-no-privacy-policy");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("flags no screenshots", async () => {
    const langDir = join(tmpDir, "en-US");
    await mkdir(langDir, { recursive: true });
    await writeFile(join(langDir, "title.txt"), "My App");
    await writeFile(join(langDir, "privacy_policy_url.txt"), "https://example.com");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "listing-no-screenshots");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("warns on few phone screenshots", async () => {
    const langDir = join(tmpDir, "en-US");
    await mkdir(langDir, { recursive: true });
    await writeFile(join(langDir, "title.txt"), "My App");
    await writeFile(join(langDir, "privacy_policy_url.txt"), "https://example.com");

    const ssDir = join(langDir, "images", "phoneScreenshots");
    await mkdir(ssDir, { recursive: true });
    await writeFile(join(ssDir, "1.png"), "fake");
    await writeFile(join(ssDir, "2.png"), "fake");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "listing-few-screenshots");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
  });

  it("reports error for nonexistent metadata directory", async () => {
    const findings = await metadataScanner.scan(makeCtx("/nonexistent/path"));
    const f = findings.find((f) => f.ruleId === "metadata-dir-not-found");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
  });

  it("reports error when no locale directories exist", async () => {
    // tmpDir exists but has no locale subdirs
    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "no-locales-found");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("error");
  });

  it("scans multiple locales", async () => {
    for (const lang of ["en-US", "fr-FR", "ja-JP"]) {
      const langDir = join(tmpDir, lang);
      await mkdir(langDir, { recursive: true });
      await writeFile(join(langDir, "title.txt"), `Title ${lang}`);
    }
    await writeFile(join(tmpDir, "en-US", "privacy_policy_url.txt"), "https://example.com");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const summary = findings.find((f) => f.ruleId === "metadata-summary");
    expect(summary).toBeDefined();
    expect(summary!.message).toContain("en-US");
    expect(summary!.message).toContain("fr-FR");
    expect(summary!.message).toContain("ja-JP");
  });

  it("reports near-limit fields as info", async () => {
    const langDir = join(tmpDir, "en-US");
    await mkdir(langDir, { recursive: true });
    // 25 chars = 83% of 30 limit → should trigger "warn" status from lintListing
    await writeFile(join(langDir, "title.txt"), "A".repeat(25));
    await writeFile(join(langDir, "privacy_policy_url.txt"), "https://example.com");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "listing-title-near-limit");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
  });

  it("ignores non-locale directories", async () => {
    await mkdir(join(tmpDir, ".git"), { recursive: true });
    await mkdir(join(tmpDir, "node_modules"), { recursive: true });
    await writeFile(join(tmpDir, "README.md"), "readme");

    const findings = await metadataScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "no-locales-found");
    expect(f).toBeDefined();
  });
});
