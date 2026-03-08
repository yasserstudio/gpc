import { appendFile } from "node:fs/promises";
import type { Command } from "commander";
import { loadConfig, getCacheDir } from "@gpc/config";
import { resolveAuth } from "@gpc/auth";
import { createApiClient } from "@gpc/api";
import type { RetryLogEntry } from "@gpc/api";
import { publish } from "@gpc/core";
import { detectOutputFormat, formatOutput } from "@gpc/core";
import { isDryRun, printDryRun } from "../dry-run.js";

function resolvePackageName(packageArg: string | undefined, config: any): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

export function registerPublishCommand(program: Command): void {
  program
    .command("publish <file>")
    .description("Validate, upload, and release in one step")
    .option("--track <track>", "Target track", "internal")
    .option("--rollout <percent>", "Staged rollout percentage (1-100)")
    .option("--notes <text>", "Release notes (en-US)")
    .option("--notes-dir <dir>", "Read release notes from directory (<dir>/<lang>.txt)")
    .option("--name <name>", "Release name")
    .option("--mapping <file>", "ProGuard/R8 mapping file for deobfuscation")
    .option("--retry-log <path>", "Write retry log entries to file (JSONL)")
    .action(async (file: string, options) => {
      if (options.notes && options.notesDir) {
        console.error("Error: Cannot use both --notes and --notes-dir");
        process.exit(2);
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const format = detectOutputFormat();

      if (isDryRun(program)) {
        printDryRun({
          command: "publish",
          action: "publish",
          target: file,
          details: { track: options.track, rollout: options.rollout },
        }, format, formatOutput);
        return;
      }

      let onRetry: ((entry: RetryLogEntry) => void) | undefined;
      if (options.retryLog) {
        onRetry = (entry: RetryLogEntry) => {
          appendFile(options.retryLog, JSON.stringify(entry) + "\n").catch(() => {});
        };
      }

      const auth = await resolveAuth({
        serviceAccountPath: config.auth?.serviceAccount,
        cachePath: getCacheDir(),
      });
      const client = createApiClient({ auth, onRetry });

      try {
        const result = await publish(client, packageName, file, {
          track: options.track,
          rolloutPercent: options.rollout ? Number(options.rollout) : undefined,
          notes: options.notes,
          notesDir: options.notesDir,
          releaseName: options.name,
          mappingFile: options.mapping,
        });

        if (!result.upload) {
          console.error("Validation failed:");
          for (const check of result.validation.checks) {
            const icon = check.passed ? "✓" : "✗";
            console.error(`  ${icon} ${check.name}: ${check.message}`);
          }
          process.exit(1);
        }

        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
