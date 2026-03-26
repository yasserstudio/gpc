import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";

function step(n: number, total: number, label: string, status: string): void {
  const padded = `Step ${n}/${total}  ${label}`.padEnd(48);
  console.log(`${padded}${status}`);
}

export function registerQuickstartCommand(program: Command): void {
  program
    .command("quickstart")
    .description("Guided setup: verify credentials, config, and show next steps")
    .action(async () => {
      console.log("\nGPC — Quick Start Setup");
      console.log("══════════════════════════════════════════════════════");

      const total = 4;
      let allPassed = true;

      // Step 1: Check for existing config
      let config: Awaited<ReturnType<typeof loadConfig>> | null = null;
      try {
        config = await loadConfig();
        const profileInfo = config.profile ? `profile "${config.profile}"` : "default config";
        step(1, total, "Checking for existing config...", `✓ Found ${profileInfo}`);
      } catch {
        step(1, total, "Checking for existing config...", "⚠ No config found");
        console.log("\n  Run: gpc config init");
        console.log("  Or:  gpc auth login  (runs interactive setup)");
        allPassed = false;
      }

      // Step 2: Verify credentials
      if (config) {
        try {
          const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
          const email = auth.getClientEmail();
          step(2, total, "Verifying credentials...", `✓ ${email}`);
        } catch {
          step(2, total, "Verifying credentials...", "✗ Auth failed — run: gpc auth login");
          allPassed = false;
        }
      } else {
        step(2, total, "Verifying credentials...", "— skipped (no config)");
        allPassed = false;
      }

      // Step 3: Check package name
      const packageName = config?.app ?? (program.opts()["app"] as string | undefined);
      if (packageName) {
        step(3, total, "Checking package name...", `✓ ${packageName}`);
      } else {
        step(3, total, "Checking package name...", "⚠ Not set — run: gpc config set app <package>");
        allPassed = false;
      }

      // Step 4: Run doctor inline
      if (allPassed) {
        try {
          const { spawnSync } = await import("node:child_process");
          // Use "gpc" directly — process.execPath + process.argv[1] fails when
          // installed via Homebrew (Bun-compiled binary can't be re-run under Node)
          const result = spawnSync("gpc", ["doctor"], {
            stdio: "pipe",
            encoding: "utf-8",
          });
          if (result.error) {
            // gpc not found in PATH (ENOENT) or other spawn error
            step(4, total, "Running doctor...", "\u2014 could not find gpc in PATH. Run: gpc doctor");
          } else if (result.status === 0) {
            step(4, total, "Running doctor...", "\u2713 All checks passed");
          } else {
            step(4, total, "Running doctor...", "\u26A0 Some checks failed \u2014 run: gpc doctor");
            allPassed = false;
          }
        } catch {
          step(4, total, "Running doctor...", "\u2014 run: gpc doctor");
        }
      } else {
        step(4, total, "Running doctor...", "\u2014 skipped");
      }

      console.log("");

      if (allPassed) {
        console.log("Ready. Here's what you can do next:");
        console.log("");
        console.log("  gpc status              → app health snapshot");
        console.log("  gpc releases list       → current tracks and versions");
        console.log("  gpc reviews list        → recent user reviews");
        console.log("  gpc vitals overview     → crash and ANR rates");
        console.log("  gpc publish app.aab     → end-to-end upload and release");
        console.log("");
        console.log("Docs: https://yasserstudio.github.io/gpc/");
      } else {
        console.log("Fix the issues above, then run 'gpc quickstart' again.");
        console.log("Need help? Run 'gpc doctor' for detailed diagnostics.");
        process.exitCode = 1;
      }
    });
}
