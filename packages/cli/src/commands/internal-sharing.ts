import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import {
  uploadInternalSharing,
  formatOutput,
  createSpinner,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth });
}

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
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const fileType = opts.type as "bundle" | "apk" | undefined;

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
