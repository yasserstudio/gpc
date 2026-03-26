import { access } from "node:fs/promises";
import { join } from "node:path";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import {
  detectFastlane,
  generateMigrationPlan,
  writeMigrationOutput,
  formatOutput,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

const WARN = "\u26A0";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function registerMigrateCommands(program: Command): void {
  const migrate = program.command("migrate").description("Migrate from other tools to GPC");

  migrate
    .command("fastlane")
    .description("Migrate from Fastlane to GPC")
    .option("--dir <path>", "Directory containing Fastlane files", ".")
    .option("--output <path>", "Output directory for migration files", ".")
    .option("--dry-run", "Preview migration plan without writing any files")
    .action(async (options: { dir: string; output: string; dryRun?: boolean }) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      const dryRun = options.dryRun ?? false;

      const detection = await detectFastlane(options.dir);

      if (format === "json") {
        if (!detection.hasFastfile && !detection.hasAppfile && !detection.hasMetadata) {
          console.log(formatOutput({ detection, plan: null, files: [] }, format));
          return;
        }
        const plan = generateMigrationPlan(detection);
        if (!dryRun) {
          const files = await writeMigrationOutput(plan, options.output);
          console.log(formatOutput({ detection, plan, files }, format));
        } else {
          console.log(formatOutput({ detection, plan, files: [] }, format));
        }
        return;
      }

      // Human-readable output
      console.log("Fastlane Detection Results:\n");
      console.log(`  Fastfile:  ${detection.hasFastfile ? "found" : "not found"}`);
      console.log(`  Appfile:   ${detection.hasAppfile ? "found" : "not found"}`);
      console.log(`  Metadata:  ${detection.hasMetadata ? "found" : "not found"}`);
      console.log(`  Gemfile:   ${detection.hasGemfile ? "found" : "not found"}`);

      if (detection.packageName) {
        console.log(`  Package:   ${detection.packageName}`);
      }

      if (detection.lanes.length > 0) {
        console.log(`\n  Lanes (${detection.lanes.length}):`);
        for (const lane of detection.lanes) {
          const equiv = lane.gpcEquivalent ? ` → ${lane.gpcEquivalent}` : " (no equivalent)";
          console.log(`    ${lane.name}${equiv}`);
        }
      }

      if (detection.metadataLanguages.length > 0) {
        console.log(`\n  Metadata languages: ${detection.metadataLanguages.join(", ")}`);
      }

      if (detection.parseWarnings.length > 0) {
        console.log("");
        for (const w of detection.parseWarnings) {
          console.log(`  ${WARN} ${w}`);
        }
      }

      if (!detection.hasFastfile && !detection.hasAppfile && !detection.hasMetadata) {
        console.log("\nNo Fastlane files detected in this directory. Nothing to migrate.");
        console.log("  Try: gpc migrate fastlane --dir <path-to-your-android-project>");
        return;
      }

      const plan = generateMigrationPlan(detection);

      if (dryRun) {
        console.log("\nMigration Plan (dry run — nothing written):\n");

        if (plan.warnings.length > 0) {
          console.log("Warnings:");
          for (const w of plan.warnings) {
            console.log(`  ${WARN} ${w}`);
          }
          console.log("");
        }

        console.log("Checklist:");
        for (const item of plan.checklist) {
          console.log(`  [ ] ${item}`);
        }

        if (Object.keys(plan.config).length > 0) {
          console.log("\n.gpcrc.json (would be written):");
          console.log(JSON.stringify(plan.config, null, 2).replace(/^/gm, "  "));
        }

        console.log(
          "\nRun without --dry-run to write MIGRATION.md" +
            (Object.keys(plan.config).length > 0 ? " and .gpcrc.json" : "") +
            ".",
        );
        return;
      }

      // Conflict check — abort before clobbering existing .gpcrc.json unless --yes
      if (
        Object.keys(plan.config).length > 0 &&
        (await fileExists(join(options.output, ".gpcrc.json")))
      ) {
        const hasYes = process.argv.includes("--yes") || process.argv.includes("-y");

        if (!hasYes) {
          console.log(
            `\n${WARN} .gpcrc.json already exists and will be overwritten. Use --dry-run to preview first.`,
          );
          console.log("Aborting. Pass --yes to overwrite without confirmation.");
          return;
        }

        console.log(
          `\n${WARN} .gpcrc.json already exists in ${options.output} — overwriting (--yes passed).`,
        );
      }

      const files = await writeMigrationOutput(plan, options.output);

      console.log("\nMigration files written:");
      for (const file of files) {
        console.log(`  ${file}`);
      }

      if (plan.warnings.length > 0) {
        console.log("\nWarnings:");
        for (const w of plan.warnings) {
          console.log(`  ${WARN} ${w}`);
        }
      }

      console.log("\nMigration Checklist:");
      for (const item of plan.checklist) {
        console.log(`  [ ] ${item}`);
      }

      console.log(
        "\nNext step: open MIGRATION.md and work through the checklist. Run `gpc doctor` when done.",
      );
    });
}
