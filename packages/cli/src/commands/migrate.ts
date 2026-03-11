import type { Command } from "commander";
import {
  detectFastlane,
  generateMigrationPlan,
  writeMigrationOutput,
  detectOutputFormat,
  formatOutput,
} from "@gpc-cli/core";

export function registerMigrateCommands(program: Command): void {
  const migrate = program.command("migrate").description("Migrate from other tools to GPC");

  migrate
    .command("fastlane")
    .description("Migrate from Fastlane to GPC")
    .option("--dir <path>", "Directory containing Fastlane files", ".")
    .option("--output <path>", "Output directory for migration files", ".")
    .action(async (options) => {
      const format = detectOutputFormat();

      try {
        const detection = await detectFastlane(options.dir);

        // Show detection results
        if (format === "json") {
          console.log(formatOutput(detection, format));
        } else {
          console.log("Fastlane Detection Results:");
          console.log(`  Fastfile:  ${detection.hasFastfile ? "found" : "not found"}`);
          console.log(`  Appfile:   ${detection.hasAppfile ? "found" : "not found"}`);
          console.log(`  Metadata:  ${detection.hasMetadata ? "found" : "not found"}`);
          console.log(`  Gemfile:   ${detection.hasGemfile ? "found" : "not found"}`);

          if (detection.packageName) {
            console.log(`  Package:   ${detection.packageName}`);
          }

          if (detection.lanes.length > 0) {
            console.log(`\n  Lanes found: ${detection.lanes.length}`);
            for (const lane of detection.lanes) {
              const equiv = lane.gpcEquivalent ? ` -> ${lane.gpcEquivalent}` : " (no equivalent)";
              console.log(`    - ${lane.name}${equiv}`);
            }
          }

          if (detection.metadataLanguages.length > 0) {
            console.log(`\n  Metadata languages: ${detection.metadataLanguages.join(", ")}`);
          }
        }

        if (
          !detection.hasFastfile &&
          !detection.hasAppfile &&
          !detection.hasMetadata
        ) {
          if (format !== "json") {
            console.log("\nNo Fastlane files detected. Nothing to migrate.");
          }
          return;
        }

        // Generate migration plan
        const plan = generateMigrationPlan(detection);

        // Write output files
        const files = await writeMigrationOutput(plan, options.output);

        if (format === "json") {
          console.log(formatOutput({ detection, plan, files }, format));
        } else {
          console.log("\nMigration files written:");
          for (const file of files) {
            console.log(`  ${file}`);
          }

          if (plan.warnings.length > 0) {
            console.log("\nWarnings:");
            for (const warning of plan.warnings) {
              console.log(`  - ${warning}`);
            }
          }

          console.log("\nMigration Checklist:");
          for (const item of plan.checklist) {
            console.log(`  [ ] ${item}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
