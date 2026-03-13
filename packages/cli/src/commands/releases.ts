import { appendFile } from "node:fs/promises";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import type { RetryLogEntry } from "@gpc-cli/api";
import {
  uploadRelease,
  getReleasesStatus,
  promoteRelease,
  updateRollout,
  readReleaseNotesFromDir,
  generateNotesFromGit,
  writeAuditLog,
  createAuditEntry,
  uploadExternallyHosted,
  diffReleases,
} from "@gpc-cli/core";
import { formatOutput, sortResults, createSpinner } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
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

async function getClient(config: GpcConfig, retryLogPath?: string, uploadTimeout?: number) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth, onRetry: createRetryLogger(retryLogPath), uploadTimeout });
}

export function registerReleasesCommands(program: Command): void {
  const releases = program.command("releases").description("Manage releases and rollouts");

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
    .option("--notes-from-git", "Generate release notes from git commit history")
    .option("--since <ref>", "Git ref to start from (tag, SHA) — used with --notes-from-git")
    .option("--retry-log <path>", "Write retry log entries to file (JSONL)")
    .option("--timeout <ms>", "Upload timeout in milliseconds (auto-scales with file size by default)", parseInt)
    .action(async (file: string, options) => {
      const noteSources = [options.notes, options.notesDir, options.notesFromGit].filter(Boolean);
      if (noteSources.length > 1) {
        console.error("Error: Cannot combine --notes, --notes-dir, and --notes-from-git. Use only one.");
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

        if (!options.notes && !options.notesDir) {
          const notes = await promptInput("Release notes (en-US, blank to skip)");
          if (notes) options.notes = notes;
        }
      }

      const client = await getClient(config, options.retryLog, options.timeout);

      if (isDryRun(program)) {
        try {
          const result = await uploadRelease(client, packageName, file, {
            track: options.track,
            userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
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
        "releases upload",
        {
          file,
          track: options.track,
          rollout: options.rollout,
        },
        packageName,
      );

      const spinner = createSpinner("Uploading bundle...");
      if (!program.opts()["quiet"] && process.stderr.isTTY) spinner.start();

      try {
        let releaseNotes: { language: string; text: string }[] | undefined;
        if (options.notesFromGit) {
          const gitNotes = await generateNotesFromGit({ since: options.since });
          releaseNotes = [{ language: gitNotes.language, text: gitNotes.text }];
        } else if (options.notesDir) {
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
        spinner.stop("Upload complete");
        console.log(formatOutput(result, format));
        auditEntry.success = true;
      } catch (error) {
        spinner.fail("Upload failed");
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
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const statuses = await getReleasesStatus(client, packageName, options.track);
        const sorted = Array.isArray(statuses) ? sortResults(statuses, options.sort) : statuses;
        if (format !== "json" && Array.isArray(sorted)) {
          const rows = sorted.map((s: Record<string, unknown>) => ({
            track: s["track"] || "-",
            status: s["status"] || "-",
            name: s["name"] || "-",
            versionCodes: Array.isArray(s["versionCodes"]) ? (s["versionCodes"] as unknown[]).join(", ") : "-",
            userFraction: s["userFraction"] !== undefined ? String(s["userFraction"]) : "-",
          }));
          console.log(formatOutput(rows, format));
        } else {
          console.log(formatOutput(sorted, format));
        }
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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);
      const tracks = ["internal", "alpha", "beta", "production"];

      options.from = await requireOption(
        "from",
        options.from,
        {
          message: "Source track:",
          choices: tracks,
        },
        interactive,
      );

      options.to = await requireOption(
        "to",
        options.to,
        {
          message: "Target track:",
          choices: tracks.filter((t: string) => t !== options.from),
        },
        interactive,
      );

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "releases promote",
            action: "promote",
            target: `${options.from} → ${options.to}`,
            details: { rollout: options.rollout },
          },
          format,
          formatOutput,
        );
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
  const rollout = releases.command("rollout").description("Manage staged rollouts");

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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);
      const tracks = ["internal", "alpha", "beta", "production"];

      options.track = await requireOption(
        "track",
        options.track,
        {
          message: "Track:",
          choices: tracks,
        },
        interactive,
      );

      if (action === "increase") {
        options.to = await requireOption(
          "to",
          options.to,
          {
            message: "New rollout percentage (1-100):",
          },
          interactive,
        );
      }

      if (isDryRun(program)) {
        printDryRun(
          {
            command: `releases rollout ${action}`,
            action: action,
            target: options.track,
            details: { percentage: options.to },
          },
          format,
          formatOutput,
        );
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

      options.track = await requireOption(
        "track",
        options.track,
        {
          message: "Track:",
          choices: tracks,
        },
        interactive,
      );

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

  // Upload externally hosted APK
  releases
    .command("upload-external")
    .description("Upload an externally hosted APK configuration")
    .requiredOption("--url <url>", "External URL where the APK is hosted")
    .requiredOption("--file <config>", "Path to JSON config file with APK metadata")
    .action(async (options: { url: string; file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      try {
        const { readFile } = await import("node:fs/promises");
        const raw = await readFile(options.file, "utf-8");
        const apkConfig = JSON.parse(raw) as Record<string, unknown>;

        // Override with CLI-provided URL
        apkConfig["externallyHostedUrl"] = options.url;

        const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
        const client = createApiClient({ auth });
        const result = await uploadExternallyHosted(
          client,
          packageName,
          apkConfig as import("@gpc-cli/api").ExternallyHostedApk,
        );
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Diff
  releases
    .command("diff")
    .description("Compare releases between two tracks")
    .option("--from <track>", "Source track", "internal")
    .option("--to <track>", "Target track", "production")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await diffReleases(client, packageName, options.from, options.to);
        if (result.diffs.length === 0) {
          console.log(`No differences between ${result.fromTrack} and ${result.toTrack}.`);
        } else {
          if (format === "json") {
            console.log(formatOutput(result, format));
          } else {
            console.log(`Differences: ${result.fromTrack} vs ${result.toTrack}\n`);
            console.log(formatOutput(result.diffs, format));
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
