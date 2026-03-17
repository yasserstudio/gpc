import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readReleaseNotesFromDir, validateReleaseNotes } from "../src/utils/release-notes";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("readReleaseNotesFromDir", () => {
  const testDir = join(tmpdir(), "gpc-test-release-notes");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("reads .txt files as release notes", async () => {
    await writeFile(join(testDir, "en-US.txt"), "Bug fixes and improvements");
    await writeFile(join(testDir, "de-DE.txt"), "Fehlerbehebungen");

    const notes = await readReleaseNotesFromDir(testDir);

    expect(notes).toHaveLength(2);
    expect(notes.find((n) => n.language === "en-US")?.text).toBe("Bug fixes and improvements");
    expect(notes.find((n) => n.language === "de-DE")?.text).toBe("Fehlerbehebungen");
  });

  it("skips non-.txt files", async () => {
    await writeFile(join(testDir, "en-US.txt"), "Notes");
    await writeFile(join(testDir, "README.md"), "Ignore me");

    const notes = await readReleaseNotesFromDir(testDir);

    expect(notes).toHaveLength(1);
    expect(notes[0]!.language).toBe("en-US");
  });

  it("skips empty files", async () => {
    await writeFile(join(testDir, "en-US.txt"), "Notes");
    await writeFile(join(testDir, "fr-FR.txt"), "   ");

    const notes = await readReleaseNotesFromDir(testDir);

    expect(notes).toHaveLength(1);
  });

  it("handles empty directory", async () => {
    const notes = await readReleaseNotesFromDir(testDir);
    expect(notes).toEqual([]);
  });

  it("throws for nonexistent directory", async () => {
    await expect(readReleaseNotesFromDir("/does/not/exist")).rejects.toThrow("not found");
  });

  it("trims whitespace from notes", async () => {
    await writeFile(join(testDir, "en-US.txt"), "  Hello world  \n");

    const notes = await readReleaseNotesFromDir(testDir);

    expect(notes[0]!.text).toBe("Hello world");
  });
});

describe("validateReleaseNotes", () => {
  it("passes for valid notes under 500 chars", () => {
    const result = validateReleaseNotes([
      { language: "en-US", text: "Bug fixes" },
      { language: "de-DE", text: "Fixes" },
    ]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("warns for notes over 500 chars (does not fail)", () => {
    const result = validateReleaseNotes([{ language: "en-US", text: "a".repeat(501) }]);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings[0]).toContain("501 chars");
  });

  it("detects duplicate language codes", () => {
    const result = validateReleaseNotes([
      { language: "en-US", text: "First" },
      { language: "en-US", text: "Second" },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Duplicate");
  });

  it("passes for exactly 500 chars", () => {
    const result = validateReleaseNotes([{ language: "en-US", text: "a".repeat(500) }]);

    expect(result.valid).toBe(true);
  });
});
