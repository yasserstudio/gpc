import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock file validation to avoid needing real ZIP files
vi.mock("../src/utils/file-validation.js", () => ({
  validateUploadFile: vi.fn().mockResolvedValue({
    valid: true,
    fileType: "aab",
    sizeBytes: 1024,
    errors: [],
    warnings: [],
  }),
}));

import { validatePreSubmission } from "../src/commands/validate";
import { validateUploadFile } from "../src/utils/file-validation";

const mockedValidate = vi.mocked(validateUploadFile);

describe("validatePreSubmission", () => {
  const testDir = join(tmpdir(), "gpc-test-validate");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    mockedValidate.mockResolvedValue({
      valid: true,
      fileType: "aab",
      sizeBytes: 1024,
      errors: [],
      warnings: [],
    });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("passes with valid file and track", async () => {
    const result = await validatePreSubmission({
      filePath: "/tmp/app.aab",
      track: "internal",
    });

    expect(result.valid).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails when file validation fails", async () => {
    mockedValidate.mockResolvedValue({
      valid: false,
      fileType: "unknown",
      sizeBytes: 0,
      errors: ["File not found"],
      warnings: [],
    });

    const result = await validatePreSubmission({ filePath: "/bad/file.zip" });

    expect(result.valid).toBe(false);
    expect(result.checks.find((c) => c.name === "file")?.passed).toBe(false);
  });

  it("fails when mapping file does not exist", async () => {
    const result = await validatePreSubmission({
      filePath: "/tmp/app.aab",
      mappingFile: "/does/not/exist/mapping.txt",
    });

    expect(result.valid).toBe(false);
    expect(result.checks.find((c) => c.name === "mapping")?.passed).toBe(false);
  });

  it("passes when mapping file exists", async () => {
    const mappingPath = join(testDir, "mapping.txt");
    await writeFile(mappingPath, "mapping content");

    const result = await validatePreSubmission({
      filePath: "/tmp/app.aab",
      mappingFile: mappingPath,
    });

    expect(result.checks.find((c) => c.name === "mapping")?.passed).toBe(true);
  });

  it("validates standard track names", async () => {
    for (const track of ["internal", "alpha", "beta", "production"]) {
      const result = await validatePreSubmission({ filePath: "/tmp/app.aab", track });
      expect(result.checks.find((c) => c.name === "track")?.passed).toBe(true);
    }
  });

  it("rejects invalid track names", async () => {
    const result = await validatePreSubmission({
      filePath: "/tmp/app.aab",
      track: "invalid track!",
    });

    expect(result.checks.find((c) => c.name === "track")?.passed).toBe(false);
  });

  it("validates release notes length", async () => {
    const result = await validatePreSubmission({
      filePath: "/tmp/app.aab",
      notes: [{ language: "en-US", text: "a".repeat(501) }],
    });

    expect(result.checks.find((c) => c.name === "notes")?.passed).toBe(false);
  });

  it("reads notes from directory", async () => {
    await writeFile(join(testDir, "en-US.txt"), "Bug fixes");

    const result = await validatePreSubmission({
      filePath: "/tmp/app.aab",
      notesDir: testDir,
    });

    expect(result.checks.find((c) => c.name === "notes-dir")?.passed).toBe(true);
    expect(result.checks.find((c) => c.name === "notes")?.passed).toBe(true);
  });

  it("surfaces file validation warnings in result.warnings", async () => {
    mockedValidate.mockResolvedValue({
      valid: true,
      fileType: "aab",
      sizeBytes: 110 * 1024 * 1024,
      errors: [],
      warnings: ["Large file (110.0 MB). Upload may take a while on slow connections."],
    });

    const result = await validatePreSubmission({ filePath: "/tmp/big.aab", track: "internal" });

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Large file");
  });

  it("reports multiple failures together", async () => {
    mockedValidate.mockResolvedValue({
      valid: false,
      fileType: "unknown",
      sizeBytes: 0,
      errors: ["Bad file"],
      warnings: [],
    });

    const result = await validatePreSubmission({
      filePath: "/bad.zip",
      track: "invalid!",
      mappingFile: "/missing.txt",
    });

    expect(result.valid).toBe(false);
    const failed = result.checks.filter((c) => !c.passed);
    expect(failed.length).toBeGreaterThanOrEqual(3);
  });
});
