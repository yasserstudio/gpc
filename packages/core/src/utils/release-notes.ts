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
      errors.push(
        `Release notes for "${note.language}" exceed ${MAX_NOTES_LENGTH} chars (${note.text.length} chars)`,
      );
      warnings.push(
        `Release notes for "${note.language}" are ${note.text.length} chars (max ${MAX_NOTES_LENGTH})`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
