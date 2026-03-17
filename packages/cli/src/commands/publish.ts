import { appendFile, stat } from "node:fs/promises";
import type { GpcConfig, OutputFormat } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig, getCacheDir } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import type { RetryLogEntry } from "@gpc-cli/api";
import {
  publish,
  generateNotesFromGit,
  writeAuditLog,
  createAuditEntry,
  formatOutput,
} from "@gpc-cli/core";
import type { PublishResult, DryRunPublishResult } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun } from "../dry-run.js";
import { isInteractive, promptSelect, promptInput } from "../prompt.js";

const PASS = "\u2713";
const FAIL = "\u2717";
const WARN = "\u26A0";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

// ---------------------------------------------------------------------------
// Output formatters
// ---------------------------------------------------------------------------

function formatChecks(checks: { name: string; passed: boolean; message: string }[]): string[] {
  return checks.map((c) => `  ${c.passed ? PASS : FAIL} ${c.message}`);
}

function formatValidationOutput(result: PublishResult, format: OutputFormat): string {
  if (format !== "table") {
    return formatOutput({ success: false, validation: result.validation }, format);
  }
  const lines = ["Validation failed:\n", ...formatChecks(result.validation.checks)];
  for (const w of result.validation.warnings) {
    lines.push(`  ${WARN} ${w}`);
  }
  return lines.join("\n");
}

function formatPublishOutput(result: PublishResult, format: OutputFormat): string {
  if (format !== "table") return formatOutput(result, format);

  const upload = result.upload!;
  const rollout =
    upload.status === "inProgress" && "userFraction" in upload
      ? ` (${Math.round(Number((upload as Record<string, unknown>)["userFraction"]) * 100)}% rollout)`
      : "";

  const lines = [
    "Published successfully\n",
    ...formatChecks(result.validation.checks),
  ];
  for (const w of result.validation.warnings) {
    lines.push(`  ${WARN} ${w}`);
  }
  lines.push("");
  lines.push(`  versionCode   ${upload.versionCode}`);
  lines.push(`  track         ${upload.track}`);
  lines.push(`  status        ${upload.status}${rollout}`);
  return lines.join("\n");
}

function formatDryRunOutput(result: DryRunPublishResult, format: OutputFormat): string {
  if (format !== "table") return formatOutput(result, format);

  const lines = [
    "Dry run — no changes made\n",
    ...formatChecks(result.validation.checks),
  ];
  for (const w of result.validation.warnings) {
    lines.push(`  ${WARN} ${w}`);
  }

  const u = result.upload;
  lines.push("");
  lines.push(`  Track     ${u.track}`);

  if (u.currentReleases.length === 0) {
    lines.push(`  Current   (no releases on this track)`);
  } else {
    for (const r of u.currentReleases) {
      const fraction = r.userFraction !== undefined ? ` (${Math.round(r.userFraction * 100)}%)` : "";
      lines.push(`  Current   ${r.versionCodes.join(", ")} · ${r.status}${fraction}`);
    }
  }
  const plannedFraction =
    u.plannedRelease.userFraction !== undefined
      ? ` (${Math.round(u.plannedRelease.userFraction * 100)}%)`
      : "";
  lines.push(`  Would be  (new bundle) · ${u.plannedRelease.status}${plannedFraction}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

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
      try {
        await stat(file);
      } catch {
        console.error(`Error: File not found: ${file}`);
        process.exit(2);
      }

      const noteSources = [options.notes, options.notesDir, options.notesFromGit].filter(Boolean);
      if (noteSources.length > 1) {
        console.error(
          "Error: Cannot combine --notes, --notes-dir, and --notes-from-git. Use only one.",
        );
        process.exit(2);
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

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

      // Rollout range guard
      if (options.rollout !== undefined) {
        const rollout = Number(options.rollout);
        if (!Number.isFinite(rollout) || rollout < 1 || rollout > 100) {
          console.error(
            `Error: --rollout must be a number between 1 and 100 (got: ${options.rollout})`,
          );
          process.exit(2);
        }
      }

      // Resolve git-based release notes before calling publish
      if (options.notesFromGit) {
        const gitNotes = await generateNotesFromGit({ since: options.since });
        options.notes = gitNotes.text;
        if (gitNotes.truncated) {
          console.error(
            `${WARN} Release notes truncated to 500 characters (${gitNotes.commitCount} commits from ${gitNotes.since}).`,
          );
        }
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
          console.log(formatDryRunOutput(result as DryRunPublishResult, format));
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(4);
        }
        return;
      }

      const auditEntry = createAuditEntry(
        "publish",
        { file, track: options.track, rollout: options.rollout },
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
          console.log(formatValidationOutput(result as PublishResult, format));
          auditEntry.success = false;
          auditEntry.error = "Validation failed";
          process.exit(1);
        }

        console.log(formatPublishOutput(result as PublishResult, format));
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
