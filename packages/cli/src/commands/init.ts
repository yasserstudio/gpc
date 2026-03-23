// Named exports only. No default export.

import type { Command } from "commander";
import { initProject } from "@gpc-cli/core";
import { isInteractive, promptInput, promptSelect } from "../prompt.js";
import { green, dim, yellow } from "../colors.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Scaffold project config, metadata, and CI templates")
    .option("--app <package>", "Android package name (e.g. com.example.app)")
    .option("--ci <platform>", "Generate CI template: github, gitlab")
    .option("--force", "Overwrite existing files")
    .action(async (options) => {
      let app = options["app"] as string | undefined;
      let ci = options["ci"] as "github" | "gitlab" | undefined;

      // Interactive prompts when TTY
      if (isInteractive(program) && !app) {
        app = await promptInput("Package name (e.g. com.example.app)");
        if (!app) app = undefined;
      }

      if (isInteractive(program) && !ci) {
        const ciChoice = await promptSelect("Generate CI template?", ["none", "github", "gitlab"]);
        if (ciChoice !== "none") ci = ciChoice as "github" | "gitlab";
      }

      if (ci && ci !== "github" && ci !== "gitlab") {
        console.error(`Error: Invalid --ci value "${ci}". Use: github, gitlab`);
        process.exit(2);
      }

      const result = await initProject({
        dir: process.cwd(),
        app: app || undefined,
        ci,
        skipExisting: !options["force"],
      });

      if (result.created.length === 0 && result.skipped.length > 0) {
        console.log(yellow("⚠ All files already exist. Use --force to overwrite."));
        for (const f of result.skipped) {
          console.log(`  ${dim("skip")} ${f}`);
        }
        return;
      }

      for (const f of result.created) {
        console.log(`  ${green("✓")} ${f}`);
      }
      for (const f of result.skipped) {
        console.log(`  ${dim("skip")} ${f}`);
      }

      console.log("");
      console.log(
        `${green("✓")} Project initialized (${result.created.length} file${result.created.length === 1 ? "" : "s"} created)`,
      );

      if (result.created.some((f) => f.includes(".gpcrc.json"))) {
        console.log(dim("\nNext steps:"));
        console.log(dim("  1. gpc auth login --service-account path/to/key.json"));
        console.log(dim("  2. gpc doctor"));
        console.log(dim("  3. gpc status"));
      }
    });
}
