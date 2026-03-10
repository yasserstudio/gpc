import { appendFile } from "node:fs/promises";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import type { RetryLogEntry } from "@gpc-cli/api";
import { uploadRelease, getReleasesStatus, promoteRelease, updateRollout, readReleaseNotesFromDir, writeAuditLog, createAuditEntry } from "@gpc-cli/core";
import { detectOutputFormat, formatOutput } from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { isInteractive, promptSelect, promptInput, requireOption } from "../prompt.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

function createRetryLogger(retryLogPath?: string): ((entry: RetryLogEntry) => void) | undefined {
  if (!retryLogPath) return undefined;
  return (entry: RetryLogEntry) => {
    const line = JSON.stringify(entry) + "\n";
    appendFile(retryLogPath, line).catch(() => {});
  };
}

async function getClient(config: GpcConfig, retryLogPath?: string) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth, onRetry: createRetryLogger(retryLogPath) });
}

export function registerReleasesCommands(program: Command): void {
  const releases = program
    .command("releases")
    .description("Manage releases and rollouts");

  // Upload
  releases
    .command("upload <file>")
    .description("Upload AAB/APK and assign to a track")
    .option("--track <track>", "Target track", "internal")
    .option("--rollout <percent>", "Staged rollout percentage (1-100)")
    .option("--notes <text>", "Release notes (en-US)")
    .option("--name <name>", "Release name")
    .option("--mapping <file>", "ProGuard/R8 mapping file for deobfuscation")
    .option("--notes-dir <dir>", "Read release notes from directory (<dir>/<lang>.txt)")
    .option("--retry-log <path>", "Write retry log entries to file (JSONL)")
    .action(async (file: string, options) => {
      if (options.notes && options.notesDir) {
        console.error("Error: Cannot use both --notes and --notes-dir");
        process.exit(2);
      }
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()['app'], config);
      const format = detectOutputFormat();

      // Interactive mode: prompt for missing options
      if (isInteractive(program)) {
        if (!options.track || options.track === "internal") {
          const tracks = ["internal", "alpha", "beta", "production"];
          options.track = await promptSelect("Select track:", tracks, "internal");
        }

        if (!options.rollout && options.track === "production") {
          const rolloutStr = await promptInput("Staged rollout percentage (1-100, blank for full)", "100");
          if (rolloutStr && rolloutStr !== "100") {
            options.rollout = rolloutStr;
          }
        }

        if (!options.notes && !options.notesDir) {
          const notes = await promptInput("Release notes (en-US, blank to skip)");
          if (notes) options.notes = notes;
        }
      }

      if (isDryRun(program)) {
        printDryRun({
          command: "releases upload",
          action: "upload",
          target: file,
          details: { track: options.track, rollout: options.rollout },
        }, format, formatOutput);
        return;
      }

      const auditEntry = createAuditEntry("releases upload", {
        file,
        track: options.track,
        rollout: options.rollout,
      }, packageName);

      const client = await getClient(config, options.retryLog);

      try {
        let releaseNotes: { language: string; text: string }[] | undefined;
        if (options.notesDir) {
          releaseNotes = await readReleaseNotesFromDir(options.notesDir);
        } else if (options.notes) {
          releaseNotes = [{ language: "en-US", text: options.notes }];
        }

        const result = await uploadRelease(client, packageName, file, {
          track: options.track,
          userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
          releaseNotes,
          releaseName: options.name,
          mappingFile: options.mapping,
        });
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

  // Status
  releases
    .command("status")
    .description("Show current release status across tracks")
    .option("--track <track>", "Filter by track")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()['app'], config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const statuses = await getReleasesStatus(client, packageName, options.track);
        console.log(formatOutput(statuses, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Promote
  releases
    .command("promote")
    .description("Promote a release from one track to another")
    .option("--from <track>", "Source track")
    .option("--to <track>", "Target track")
    .option("--rollout <percent>", "Staged rollout percentage")
    .option("--notes <text>", "Release notes")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()['app'], config);
      const format = detectOutputFormat();
      const interactive = isInteractive(program);
      const tracks = ["internal", "alpha", "beta", "production"];

      options.from = await requireOption("from", options.from, {
        message: "Source track:",
        choices: tracks,
      }, interactive);

      options.to = await requireOption("to", options.to, {
        message: "Target track:",
        choices: tracks.filter((t: string) => t !== options.from),
      }, interactive);

      if (isDryRun(program)) {
        printDryRun({
          command: "releases promote",
          action: "promote",
          target: `${options.from} → ${options.to}`,
          details: { rollout: options.rollout },
        }, format, formatOutput);
        return;
      }

      const client = await getClient(config);

      try {
        const result = await promoteRelease(client, packageName, options.from, options.to, {
          userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
          releaseNotes: options.notes ? [{ language: "en-US", text: options.notes }] : undefined,
        });
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Rollout subcommands
  const rollout = releases
    .command("rollout")
    .description("Manage staged rollouts");

  for (const action of ["increase", "halt", "resume", "complete"] as const) {
    const cmd = rollout
      .command(action)
      .description(`${action.charAt(0).toUpperCase() + action.slice(1)} a staged rollout`)
      .option("--track <track>", "Track name");

    if (action === "increase") {
      cmd.option("--to <percent>", "New rollout percentage");
    }

    cmd.action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()['app'], config);
      const format = detectOutputFormat();
      const interactive = isInteractive(program);
      const tracks = ["internal", "alpha", "beta", "production"];

      options.track = await requireOption("track", options.track, {
        message: "Track:",
        choices: tracks,
      }, interactive);

      if (action === "increase") {
        options.to = await requireOption("to", options.to, {
          message: "New rollout percentage (1-100):",
        }, interactive);
      }

      if (isDryRun(program)) {
        printDryRun({
          command: `releases rollout ${action}`,
          action: action,
          target: options.track,
          details: { percentage: options.to },
        }, format, formatOutput);
        return;
      }

      const client = await getClient(config);

      try {
        const result = await updateRollout(
          client,
          packageName,
          options.track,
          action,
          options.to ? Number(options.to) / 100 : undefined,
        );
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
  }

  // Release notes
  releases
    .command("notes")
    .description("Set release notes")
    .argument("<action>", "Action: set")
    .option("--track <track>", "Track name")
    .option("--lang <language>", "Language code", "en-US")
    .option("--notes <text>", "Release notes text")
    .option("--file <path>", "Read notes from file")
    .action(async (action: string, options) => {
      if (action !== "set") {
        console.error("Usage: gpc releases notes set --track <track> --notes <text>");
        process.exit(2);
      }

      const interactive = isInteractive(program);
      const tracks = ["internal", "alpha", "beta", "production"];

      options.track = await requireOption("track", options.track, {
        message: "Track:",
        choices: tracks,
      }, interactive);

      let notesText = options.notes;
      if (options.file) {
        const { readFile } = await import("node:fs/promises");
        notesText = await readFile(options.file, "utf-8");
      }

      if (!notesText && interactive) {
        notesText = await promptInput("Release notes text:");
      }

      if (!notesText) {
        console.error("Provide --notes <text> or --file <path>");
        process.exit(2);
      }

      console.log(`Release notes set for ${options.track} (${options.lang})`);
    });
}
