import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { validatePreSubmission, readReleaseNotesFromDir } from "@gpc-cli/core";
import { formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

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

      const config = await loadConfig();
      const format = getOutputFormat(program, config);

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

      if (format === "json") {
        console.log(formatOutput(result, format));
      } else {
        const checkRows = result.checks.map((c) => ({
          check: c.name,
          passed: c.passed ? "pass" : "FAIL",
          message: c.message,
        }));
        console.log(formatOutput(checkRows, format));
        if (result.warnings.length > 0) {
          console.log("\nWarnings:");
          for (const w of result.warnings) {
            console.log(`  ${w}`);
          }
        }
        console.log(`\n${result.valid ? "Valid" : "Invalid"}`);
      }
      process.exit(result.valid ? 0 : 1);
    });
}
