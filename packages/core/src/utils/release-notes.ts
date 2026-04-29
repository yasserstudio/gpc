import { readdir, readFile, stat } from "node:fs/promises";
import { extname, basename, join } from "node:path";
import { GpcError } from "../errors.js";

export interface ReleaseNote {
  language: string;
  text: string;
}

export interface ReleaseNotesValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MAX_NOTES_LENGTH = 500;

export async function readReleaseNotesFromDir(dir: string): Promise<ReleaseNote[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    throw new GpcError(
      `Release notes directory not found: ${dir}`,
      "RELEASE_NOTES_DIR_NOT_FOUND",
      1,
      `Create the directory and add .txt files named by language code (e.g., en-US.txt). Path: ${dir}`,
    );
  }

  const notes: ReleaseNote[] = [];

  for (const entry of entries) {
    if (extname(entry) !== ".txt") continue;

    const language = basename(entry, ".txt");
    const filePath = join(dir, entry);

    const stats = await stat(filePath);
    if (!stats.isFile()) continue;

    const text = (await readFile(filePath, "utf-8")).trim();
    if (text.length === 0) continue;

    notes.push({ language, text });
  }

  return notes;
}

const LOCALE_PATTERN = /^[a-z]{2}(-[A-Z]{2,3})?$/;

export async function isVersionedNotesDir(dir: string): Promise<boolean> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (!LOCALE_PATTERN.test(entry)) continue;
    const entryPath = join(dir, entry);
    const stats = await stat(entryPath);
    if (stats.isDirectory()) return true;
  }
  return false;
}

export async function readReleaseNotesForVersion(
  dir: string,
  versionCode: number,
): Promise<ReleaseNote[]> {
  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    throw new GpcError(
      `Invalid version code: ${versionCode}`,
      "INVALID_VERSION_CODE",
      2,
      "Version code must be a positive integer.",
    );
  }

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    throw new GpcError(
      `Release notes directory not found: ${dir}`,
      "RELEASE_NOTES_DIR_NOT_FOUND",
      1,
      `Create the directory with language subdirectories containing {versionCode}.txt or default.txt. Path: ${dir}`,
    );
  }

  const notes: ReleaseNote[] = [];

  for (const entry of entries) {
    const entryPath = join(dir, entry);
    const stats = await stat(entryPath);
    if (!stats.isDirectory()) continue;

    const language = entry;
    const versionFile = join(entryPath, `${versionCode}.txt`);
    const defaultFile = join(entryPath, "default.txt");

    let text: string | undefined;
    try {
      text = (await readFile(versionFile, "utf-8")).trim();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code !== "ENOENT") throw err;
      try {
        text = (await readFile(defaultFile, "utf-8")).trim();
      } catch (err2: unknown) {
        if (err2 && typeof err2 === "object" && "code" in err2 && err2.code !== "ENOENT")
          throw err2;
        continue;
      }
    }

    if (text && text.length > 0) {
      notes.push({ language, text });
    }
  }

  return notes;
}

export function validateReleaseNotes(notes: ReleaseNote[]): ReleaseNotesValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seen = new Set<string>();
  for (const note of notes) {
    if (seen.has(note.language)) {
      errors.push(`Duplicate language code: ${note.language}`);
    }
    seen.add(note.language);

    if (note.text.length > MAX_NOTES_LENGTH) {
      warnings.push(
        `Release notes for "${note.language}" are ${note.text.length} chars (max ${MAX_NOTES_LENGTH}) — Google Play will reject notes exceeding this limit`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
