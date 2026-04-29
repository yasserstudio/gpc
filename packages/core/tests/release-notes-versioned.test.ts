import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readReleaseNotesForVersion, isVersionedNotesDir } from "../src/utils/release-notes.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "gpc-notes-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("isVersionedNotesDir", () => {
  it("returns true when directory contains subdirectories", async () => {
    await mkdir(join(tmp, "en-US"));
    expect(await isVersionedNotesDir(tmp)).toBe(true);
  });

  it("returns false when directory contains only files", async () => {
    await writeFile(join(tmp, "en-US.txt"), "notes");
    expect(await isVersionedNotesDir(tmp)).toBe(false);
  });

  it("returns false for nonexistent directory", async () => {
    expect(await isVersionedNotesDir("/nonexistent")).toBe(false);
  });

  it("ignores non-locale subdirectories like .git or node_modules", async () => {
    await mkdir(join(tmp, ".git"));
    await mkdir(join(tmp, "node_modules"));
    expect(await isVersionedNotesDir(tmp)).toBe(false);
  });

  it("detects locale subdirectory even alongside non-locale dirs", async () => {
    await mkdir(join(tmp, ".DS_Store_dir"));
    await mkdir(join(tmp, "en-US"));
    expect(await isVersionedNotesDir(tmp)).toBe(true);
  });
});

describe("readReleaseNotesForVersion", () => {
  it("reads versionCode.txt when present", async () => {
    await mkdir(join(tmp, "en-US"));
    await writeFile(join(tmp, "en-US", "42.txt"), "Bug fixes and improvements");

    const notes = await readReleaseNotesForVersion(tmp, 42);
    expect(notes).toEqual([{ language: "en-US", text: "Bug fixes and improvements" }]);
  });

  it("falls back to default.txt when versionCode.txt is missing", async () => {
    await mkdir(join(tmp, "en-US"));
    await writeFile(join(tmp, "en-US", "default.txt"), "General update");

    const notes = await readReleaseNotesForVersion(tmp, 99);
    expect(notes).toEqual([{ language: "en-US", text: "General update" }]);
  });

  it("prefers versionCode.txt over default.txt", async () => {
    await mkdir(join(tmp, "en-US"));
    await writeFile(join(tmp, "en-US", "42.txt"), "Specific notes");
    await writeFile(join(tmp, "en-US", "default.txt"), "Default notes");

    const notes = await readReleaseNotesForVersion(tmp, 42);
    expect(notes).toEqual([{ language: "en-US", text: "Specific notes" }]);
  });

  it("skips language dir with neither versionCode.txt nor default.txt", async () => {
    await mkdir(join(tmp, "fr-FR"));

    const notes = await readReleaseNotesForVersion(tmp, 42);
    expect(notes).toEqual([]);
  });

  it("handles mixed languages with different resolution paths", async () => {
    await mkdir(join(tmp, "en-US"));
    await mkdir(join(tmp, "de-DE"));
    await mkdir(join(tmp, "fr-FR"));
    await writeFile(join(tmp, "en-US", "42.txt"), "English specific");
    await writeFile(join(tmp, "de-DE", "default.txt"), "German default");
    // fr-FR has no files

    const notes = await readReleaseNotesForVersion(tmp, 42);
    const langs = notes.map((n) => n.language).sort();
    expect(langs).toEqual(["de-DE", "en-US"]);
    expect(notes.find((n) => n.language === "en-US")!.text).toBe("English specific");
    expect(notes.find((n) => n.language === "de-DE")!.text).toBe("German default");
  });

  it("throws on missing directory", async () => {
    await expect(readReleaseNotesForVersion("/nonexistent", 42)).rejects.toThrow(
      "Release notes directory not found",
    );
  });

  it("skips empty files", async () => {
    await mkdir(join(tmp, "en-US"));
    await writeFile(join(tmp, "en-US", "42.txt"), "  ");

    const notes = await readReleaseNotesForVersion(tmp, 42);
    expect(notes).toEqual([]);
  });

  it("ignores non-directory entries", async () => {
    await mkdir(join(tmp, "en-US"));
    await writeFile(join(tmp, "en-US", "42.txt"), "Notes");
    await writeFile(join(tmp, "README.md"), "ignore me");

    const notes = await readReleaseNotesForVersion(tmp, 42);
    expect(notes).toEqual([{ language: "en-US", text: "Notes" }]);
  });

  it("rejects invalid versionCode (0)", async () => {
    await expect(readReleaseNotesForVersion(tmp, 0)).rejects.toThrow("Invalid version code");
  });

  it("rejects negative versionCode", async () => {
    await expect(readReleaseNotesForVersion(tmp, -1)).rejects.toThrow("Invalid version code");
  });

  it("rejects NaN versionCode", async () => {
    await expect(readReleaseNotesForVersion(tmp, NaN)).rejects.toThrow("Invalid version code");
  });
});
