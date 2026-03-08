import type { Command } from "commander";
import { validatePreSubmission, readReleaseNotesFromDir } from "@gpc/core";
import { detectOutputFormat, formatOutput } from "@gpc/core";

export function registerValidateCommand(program: Command): void {
  program
    .command("validate <file>")
    .description("Pre-submission validation checks")
    .option("--track <track>", "Target track to validate")
    .option("--mapping <file>", "ProGuard/R8 mapping file")
    .option("--notes <text>", "Release notes (en-US)")
    .option("--notes-dir <dir>", "Read release notes from directory (<dir>/<lang>.txt)")
    .action(async (file: string, options) => {
      if (options.notes && options.notesDir) {
        console.error("Error: Cannot use both --notes and --notes-dir");
        process.exit(2);
      }

      const format = detectOutputFormat();

      let notes: { language: string; text: string }[] | undefined;
      if (options.notesDir) {
        try {
          notes = await readReleaseNotesFromDir(options.notesDir);
        } catch (err) {
          console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }
      } else if (options.notes) {
        notes = [{ language: "en-US", text: options.notes }];
      }

      const result = await validatePreSubmission({
        filePath: file,
        mappingFile: options.mapping,
        track: options.track,
        notes,
      });

      console.log(formatOutput(result, format));
      process.exit(result.valid ? 0 : 1);
    });
}
