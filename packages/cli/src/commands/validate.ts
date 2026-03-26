import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { validatePreSubmission, readReleaseNotesFromDir } from "@gpc-cli/core";
import { formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { green, red, yellow } from "../colors.js";

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
        const err = new Error("Cannot use both --notes and --notes-dir");
        Object.assign(err, { code: "USAGE_ERROR", exitCode: 2, suggestion: "Use either --notes or --notes-dir, not both." });
        throw err;
      }

      const config = await loadConfig();
      const format = getOutputFormat(program, config);

      let notes: { language: string; text: string }[] | undefined;
      if (options.notesDir) {
        notes = await readReleaseNotesFromDir(options.notesDir);
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
          passed: c.passed ? green("✓ pass") : red("✗ FAIL"),
          message: c.message,
        }));
        console.log(formatOutput(checkRows, format));
        if (result.warnings.length > 0) {
          console.log("\nWarnings:");
          for (const w of result.warnings) {
            console.log(`  ${yellow("⚠")} ${w}`);
          }
        }
        console.log(`\n${result.valid ? green("✓ Valid") : red("✗ Invalid")}`);
      }
      if (!result.valid) {
        process.exitCode = 1;
      }
    });
}
