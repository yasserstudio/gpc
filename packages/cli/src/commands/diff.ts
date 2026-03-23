// Named exports only. No default export.

import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import { getReleasesStatus, diffReleases, diffListingsCommand, formatOutput } from "@gpc-cli/core";
import type { ReleaseDiff } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { green, red, yellow, dim, bold } from "../colors.js";

function resolvePackageName(cliApp: string | undefined, config: { app?: string }): string {
  const pkg = cliApp || config.app || process.env["GPC_APP"];
  if (!pkg) {
    console.error("Error: No package name. Use --app, set GPC_APP, or add 'app' to .gpcrc.json");
    process.exit(2);
  }
  return pkg;
}

export function registerDiffCommand(program: Command): void {
  program
    .command("diff")
    .description("Preview current release state and pending changes (read-only)")
    .option("--from <track>", "Compare releases from this track")
    .option("--to <track>", "Compare releases to this track")
    .option("--metadata <dir>", "Compare local metadata directory vs remote listings")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
      const client = createApiClient({ auth });

      try {
        const sections: Record<string, unknown> = {};

        // Always show release status across all tracks
        const releases = await getReleasesStatus(client, packageName);
        sections["releases"] = releases;

        // Track-to-track diff if specified
        let trackDiff: { fromTrack: string; toTrack: string; diffs: ReleaseDiff[] } | undefined;
        if (options.from && options.to) {
          trackDiff = await diffReleases(client, packageName, options.from, options.to);
          sections["trackDiff"] = trackDiff;
        }

        // Metadata diff if specified
        let metadataDiff: unknown;
        if (options.metadata) {
          metadataDiff = await diffListingsCommand(client, packageName, options.metadata);
          sections["metadata"] = metadataDiff;
        }

        if (format === "json") {
          console.log(formatOutput(sections, format));
          return;
        }

        // Human-readable output
        console.log(bold("GPC Diff — Current State"));
        console.log("");

        // Release status
        console.log(bold("Releases"));
        if (releases.length === 0) {
          console.log(dim("  No releases found"));
        } else {
          for (const r of releases) {
            const statusColor =
              r.status === "completed" ? green : r.status === "inProgress" ? yellow : dim;
            const fraction = r.userFraction
              ? ` ${yellow(`${Math.round(r.userFraction * 100)}%`)}`
              : "";
            const versions = r.versionCodes.join(", ");
            console.log(
              `  ${r.track.padEnd(14)} ${statusColor(r.status.padEnd(12))} v${versions}${fraction}`,
            );
          }
        }
        console.log("");

        // Track diff
        if (trackDiff) {
          console.log(bold(`Track Diff: ${trackDiff.fromTrack} → ${trackDiff.toTrack}`));
          if (trackDiff.diffs.length === 0) {
            console.log(dim("  No differences"));
          } else {
            for (const d of trackDiff.diffs) {
              console.log(
                `  ${d.field.padEnd(16)} ${red(d.track1Value || "(empty)")} → ${green(d.track2Value || "(empty)")}`,
              );
            }
          }
          console.log("");
        }

        // Metadata diff
        if (metadataDiff && Array.isArray(metadataDiff)) {
          console.log(bold("Metadata Diff (local vs remote)"));
          if (metadataDiff.length === 0) {
            console.log(dim("  No differences — local matches remote"));
          } else {
            for (const d of metadataDiff as Array<{
              language: string;
              field: string;
              status: string;
            }>) {
              const icon =
                d.status === "added" ? green("+") : d.status === "removed" ? red("-") : yellow("~");
              console.log(`  ${icon} ${d.language}/${d.field}: ${d.status}`);
            }
          }
          console.log("");
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
