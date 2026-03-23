import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

import { uploadInternalSharing, formatOutput, createSpinner } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";



export function registerInternalSharingCommands(program: Command): void {
  const cmd = program
    .command("internal-sharing")
    .description("Upload bundles or APKs for instant internal sharing");

  cmd
    .command("upload <file>")
    .description("Upload a bundle or APK for internal app sharing")
    .option("--type <type>", "File type: bundle or apk (auto-detected from extension)")
    .action(async (file: string, opts: { type?: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      const fileType = opts.type as "bundle" | "apk" | undefined;

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "internal-sharing upload",
            action: "upload for internal sharing",
            target: file,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const spinner = createSpinner("Uploading for internal sharing...");
      if (!program.opts()["quiet"] && process.stderr.isTTY) spinner.start();

      try {
        const result = await uploadInternalSharing(client, packageName, file, fileType);
        spinner.stop("Upload complete");
        console.log(formatOutput(result, format));
      } catch (error) {
        spinner.fail("Upload failed");
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
