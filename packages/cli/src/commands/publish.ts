import { appendFile } from "node:fs/promises";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig, getCacheDir } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import type { RetryLogEntry } from "@gpc-cli/api";
import { publish, generateNotesFromGit, writeAuditLog, createAuditEntry } from "@gpc-cli/core";
import { detectOutputFormat, formatOutput } from "@gpc-cli/core";
import { isDryRun } from "../dry-run.js";
import { isInteractive, promptSelect, promptInput } from "../prompt.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
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
    .option("--notes-from-git", "Generate release notes from git commit history")
    .option("--since <ref>", "Git ref to start from (tag, SHA) — used with --notes-from-git")
    .option("--name <name>", "Release name")
    .option("--mapping <file>", "ProGuard/R8 mapping file for deobfuscation")
    .option("--retry-log <path>", "Write retry log entries to file (JSONL)")
    .action(async (file: string, options) => {
      const noteSources = [options.notes, options.notesDir, options.notesFromGit].filter(Boolean);
      if (noteSources.length > 1) {
        console.error("Error: Cannot combine --notes, --notes-dir, and --notes-from-git. Use only one.");
        process.exit(2);
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = detectOutputFormat();

      // Interactive mode: prompt for missing options
      if (isInteractive(program)) {
        if (!options.track || options.track === "internal") {
          const tracks = ["internal", "alpha", "beta", "production"];
          options.track = await promptSelect("Select track:", tracks, "internal");
        }

        if (!options.rollout && options.track === "production") {
          const rolloutStr = await promptInput(
            "Staged rollout percentage (1-100, blank for full)",
            "100",
          );
          if (rolloutStr && rolloutStr !== "100") {
            options.rollout = rolloutStr;
          }
        }

        if (!options.notes && !options.notesDir && !options.notesFromGit) {
          const notes = await promptInput("Release notes (en-US, blank to skip)");
          if (notes) options.notes = notes;
        }
      }

      // Resolve git-based release notes before calling publish
      if (options.notesFromGit) {
        const gitNotes = await generateNotesFromGit({ since: options.since });
        options.notes = gitNotes.text;
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

      if (isDryRun(program)) {
        try {
          const result = await publish(client, packageName, file, {
            track: options.track,
            rolloutPercent: options.rollout ? Number(options.rollout) : undefined,
            notes: options.notes,
            notesDir: options.notesDir,
            releaseName: options.name,
            mappingFile: options.mapping,
            dryRun: true,
          });
          console.log(formatOutput(result, format));
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(4);
        }
        return;
      }

      const auditEntry = createAuditEntry(
        "publish",
        {
          file,
          track: options.track,
          rollout: options.rollout,
        },
        packageName,
      );

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
          auditEntry.success = false;
          auditEntry.error = "Validation failed";
          process.exit(1);
        }

        console.log(formatOutput(result, format));
        auditEntry.success = true;
      } catch (error) {
        auditEntry.success = false;
        auditEntry.error = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      } finally {
        auditEntry.durationMs = Date.now() - new Date(auditEntry.timestamp).getTime();
        writeAuditLog(auditEntry).catch(() => {});
      }
    });
}
