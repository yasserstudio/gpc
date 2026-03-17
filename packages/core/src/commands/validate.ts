import { stat } from "node:fs/promises";
import { validateUploadFile } from "../utils/file-validation.js";
import { readReleaseNotesFromDir, validateReleaseNotes } from "../utils/release-notes.js";

export interface ValidateOptions {
  filePath: string;
  mappingFile?: string;
  track?: string;
  notes?: { language: string; text: string }[];
  notesDir?: string;
}

export interface ValidateCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface ValidateResult {
  valid: boolean;
  checks: ValidateCheck[];
  warnings: string[];
}

const STANDARD_TRACKS = new Set([
  "internal",
  "alpha",
  "beta",
  "production",
  // Form factor tracks
  "wear:internal",
  "wear:alpha",
  "wear:beta",
  "wear:production",
  "automotive:internal",
  "automotive:alpha",
  "automotive:beta",
  "automotive:production",
  "tv:internal",
  "tv:alpha",
  "tv:beta",
  "tv:production",
  "android_xr:internal",
  "android_xr:alpha",
  "android_xr:beta",
  "android_xr:production",
]);
const TRACK_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_:-]*$/;

export async function validatePreSubmission(options: ValidateOptions): Promise<ValidateResult> {
  const checks: ValidateCheck[] = [];

  const resultWarnings: string[] = [];

  // 1. File validation
  const fileResult = await validateUploadFile(options.filePath);
  checks.push({
    name: "file",
    passed: fileResult.valid,
    message: fileResult.valid
      ? `Valid ${fileResult.fileType.toUpperCase()} (${formatSize(fileResult.sizeBytes)})`
      : fileResult.errors.join("; "),
  });
  // Surface file validation warnings (e.g. large file upload time notice)
  for (const w of fileResult.warnings) {
    resultWarnings.push(w);
  }

  // 2. Mapping file
  if (options.mappingFile) {
    try {
      const stats = await stat(options.mappingFile);
      checks.push({
        name: "mapping",
        passed: stats.isFile(),
        message: stats.isFile()
          ? `Mapping file found (${formatSize(stats.size)})`
          : "Mapping path is not a file",
      });
    } catch {
      checks.push({
        name: "mapping",
        passed: false,
        message: `Mapping file not found: ${options.mappingFile}`,
      });
    }
  }

  // 3. Track validation
  if (options.track) {
    const isValid = STANDARD_TRACKS.has(options.track) || TRACK_PATTERN.test(options.track);
    checks.push({
      name: "track",
      passed: isValid,
      message: isValid
        ? `Track "${options.track}" is valid`
        : `Invalid track name "${options.track}". Use: internal, alpha, beta, production, or a custom track ID`,
    });
  }

  // 4. Release notes validation
  let resolvedNotes = options.notes;
  if (options.notesDir) {
    try {
      resolvedNotes = await readReleaseNotesFromDir(options.notesDir);
      checks.push({
        name: "notes-dir",
        passed: true,
        message: `Read release notes for ${resolvedNotes.length} language(s)`,
      });
    } catch (err) {
      checks.push({
        name: "notes-dir",
        passed: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (resolvedNotes && resolvedNotes.length > 0) {
    const notesResult = validateReleaseNotes(resolvedNotes);
    checks.push({
      name: "notes",
      passed: notesResult.valid,
      message: notesResult.valid
        ? `Release notes valid (${resolvedNotes.length} language(s))`
        : notesResult.errors.join("; "),
    });
    for (const w of notesResult.warnings) resultWarnings.push(w);
  }

  return {
    valid: checks.every((c) => c.passed),
    checks,
    warnings: resultWarnings,
  };
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
