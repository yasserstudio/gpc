import type { Command } from "commander";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ANDROID_PACKAGE_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

function step(n: number, total: number, label: string, status: string): void {
  const padded = `Step ${n}/${total}  ${label}`.padEnd(50);
  console.log(`${padded}${status}`);
}

export function registerSetupCommand(program: Command): void {
  program
    .command("setup")
    .description("Guided first-time setup: auth, config, verification, and shell completion")
    .option("--auto", "Non-interactive setup from env vars and auto-detected credentials")
    .action(async (options: { auto?: boolean }) => {
      const { isInteractive, promptInput, promptSelect, promptConfirm } =
        await import("../prompt.js");
      const { loadConfig, initConfig, setConfigValue, getUserConfigPath } =
        await import("@gpc-cli/config");
      const { resolveAuth, loadServiceAccountKey } = await import("@gpc-cli/auth");

      const interactive = !options.auto && isInteractive(program);
      const total = 5;

      console.log("\nGPC — Setup");
      console.log("═".repeat(50));

      if (options.auto) {
        console.log("Running in auto mode (non-interactive)\n");
      }

      // ---------------------------------------------------------------
      // Step 1: Credentials
      // ---------------------------------------------------------------
      let saPath: string | undefined;
      let authOk = false;
      let email: string;

      if (options.auto) {
        // Auto mode: try env vars, existing config, then ADC
        try {
          const auth = await resolveAuth();
          email = auth.getClientEmail();
          await auth.getAccessToken();
          authOk = true;
          const method =
            process.env["GPC_SERVICE_ACCOUNT"] || process.env["GOOGLE_APPLICATION_CREDENTIALS"]
              ? "env"
              : "adc";
          step(1, total, "Authenticate", `✓ ${email} (${method})`);
        } catch {
          step(1, total, "Authenticate", "✗ No credentials found");
          console.log("\n  Set GPC_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS,");
          console.log("  or run `gpc setup` interactively.\n");
          process.exitCode = 1;
          return;
        }
      } else if (interactive) {
        // Check for existing credentials first
        try {
          const existing = await loadConfig();
          if (existing.auth?.serviceAccount) {
            const auth = await resolveAuth({
              serviceAccountPath: existing.auth.serviceAccount,
            });
            email = auth.getClientEmail();
            await auth.getAccessToken();
            authOk = true;
            step(1, total, "Authenticate", `✓ ${email} (existing config)`);
          }
        } catch {
          // No existing config or invalid credentials
        }

        if (!authOk) {
          const method = await promptSelect(
            "\nAuthentication method:",
            ["service-account", "adc"],
            "service-account",
          );

          if (method === "adc") {
            try {
              const auth = await resolveAuth();
              email = auth.getClientEmail();
              await auth.getAccessToken();
              authOk = true;
              step(1, total, "Authenticate", `✓ ${email} (ADC)`);
            } catch (err) {
              step(
                1,
                total,
                "Authenticate",
                `✗ ADC failed: ${err instanceof Error ? err.message : String(err)}`,
              );
              console.log("  Run: gcloud auth application-default login");
            }
          } else {
            // Service account with retry loop
            const commonPaths = [
              "~/gpc-service-account.json",
              "./service-account.json",
              "./gpc-service-account.json",
              "~/.config/gpc/service-account.json",
            ].map((p) => resolve(p.replace("~", process.env["HOME"] || "")));

            const autoDetected = commonPaths.find((p) => existsSync(p));
            const defaultHint = autoDetected ? ` (found: ${autoDetected})` : "";

            let attempts = 0;
            while (!authOk && attempts < 3) {
              const input = await promptInput(
                `Path to service account JSON key${defaultHint}`,
                autoDetected,
              );
              if (!input) {
                step(1, total, "Authenticate", "— skipped");
                break;
              }

              const absPath = resolve(input.replace("~", process.env["HOME"] || ""));
              if (!existsSync(absPath)) {
                console.log(`  File not found: ${absPath}`);
                attempts++;
                continue;
              }

              try {
                const key = await loadServiceAccountKey(absPath);
                const auth = await resolveAuth({ serviceAccountPath: absPath });
                await auth.getAccessToken();
                saPath = absPath;
                email = key.client_email;
                authOk = true;
                step(1, total, "Authenticate", `✓ ${email}`);
              } catch (err) {
                console.log(`  Auth failed: ${err instanceof Error ? err.message : String(err)}`);
                attempts++;
              }
            }

            if (!authOk && attempts >= 3) {
              step(1, total, "Authenticate", "✗ Failed after 3 attempts");
            }
          }
        }
      } else {
        step(1, total, "Authenticate", "— non-interactive, skipped");
      }

      // ---------------------------------------------------------------
      // Step 2: Package name
      // ---------------------------------------------------------------
      let packageName: string | undefined;

      if (options.auto) {
        packageName = process.env["GPC_APP"];
        if (packageName) {
          step(2, total, "Default app", `✓ ${packageName}`);
        } else {
          step(2, total, "Default app", "— GPC_APP not set (optional)");
        }
      } else if (interactive) {
        // Check existing config
        try {
          const existing = await loadConfig();
          if (existing.app) {
            const keep = await promptConfirm(`Keep existing app: ${existing.app}?`, true);
            if (keep) {
              packageName = existing.app;
            }
          }
        } catch {
          // No existing config
        }

        if (!packageName) {
          const input = await promptInput(
            "Default package name (e.g. com.example.app, blank to skip)",
          );
          if (input) {
            if (!ANDROID_PACKAGE_RE.test(input)) {
              console.log(`  Warning: "${input}" doesn't look like a valid Android package name`);
            }
            packageName = input;
          }
        }

        if (packageName) {
          step(2, total, "Default app", `✓ ${packageName}`);
        } else {
          step(2, total, "Default app", "— skipped (set later with: gpc config set app <pkg>)");
        }
      } else {
        step(2, total, "Default app", "— non-interactive, skipped");
      }

      // ---------------------------------------------------------------
      // Step 3: Write config
      // ---------------------------------------------------------------
      const configPayload: Record<string, unknown> = {};
      if (saPath) configPayload["auth"] = { serviceAccount: saPath };
      if (packageName) configPayload["app"] = packageName;

      const configPath = getUserConfigPath();
      const configExists = existsSync(configPath);

      if (Object.keys(configPayload).length > 0) {
        try {
          if (configExists) {
            if (saPath) await setConfigValue("auth.serviceAccount", saPath);
            if (packageName) await setConfigValue("app", packageName);
            step(3, total, "Save config", `✓ Updated ${configPath}`);
          } else {
            await initConfig(configPayload);
            step(3, total, "Save config", `✓ Created ${configPath}`);
          }
        } catch (err) {
          step(
            3,
            total,
            "Save config",
            `✗ Failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } else if (configExists) {
        step(3, total, "Save config", `✓ Existing config at ${configPath}`);
      } else if (options.auto) {
        step(3, total, "Save config", "— using env vars only");
      } else {
        step(3, total, "Save config", "— nothing to save");
      }

      // ---------------------------------------------------------------
      // Step 4: Shell completion
      // ---------------------------------------------------------------
      if (interactive) {
        const installCompletion = await promptConfirm("Install shell completions?", true);
        if (installCompletion) {
          const shell = process.env["SHELL"] || "";
          let completionHint = "";
          if (shell.includes("zsh")) {
            completionHint = "gpc completion zsh > ~/.zsh/completions/_gpc && compinit";
          } else if (shell.includes("bash")) {
            completionHint = "gpc completion bash >> ~/.bashrc && source ~/.bashrc";
          } else if (shell.includes("fish")) {
            completionHint = "gpc completion fish > ~/.config/fish/completions/gpc.fish";
          }

          if (completionHint) {
            console.log(`\n  Run: ${completionHint}\n`);
          } else {
            console.log("\n  Run: gpc completion --help\n");
          }
          step(4, total, "Shell completion", "✓ Instructions printed");
        } else {
          step(4, total, "Shell completion", "— skipped");
        }
      } else {
        step(4, total, "Shell completion", "— skipped (non-interactive)");
      }

      // ---------------------------------------------------------------
      // Step 5: Doctor verification
      // ---------------------------------------------------------------
      console.log("");
      try {
        const { spawnSync } = await import("node:child_process");
        const result = spawnSync("gpc", ["doctor"], {
          stdio: "pipe",
          encoding: "utf-8",
        });

        if (result.error) {
          step(5, total, "Verify (doctor)", "— gpc not in PATH, run: gpc doctor");
        } else if (result.status === 0) {
          step(5, total, "Verify (doctor)", "✓ All checks passed");
        } else {
          step(5, total, "Verify (doctor)", "⚠ Some checks need attention");
          if (result.stdout) {
            const lines = result.stdout.split("\n").filter((l: string) => l.includes("✗"));
            for (const line of lines.slice(0, 5)) {
              console.log(`  ${line.trim()}`);
            }
          }
          console.log("  Run: gpc doctor --fix");
        }
      } catch {
        step(5, total, "Verify (doctor)", "— run: gpc doctor");
      }

      // ---------------------------------------------------------------
      // Summary
      // ---------------------------------------------------------------
      console.log("\n" + "═".repeat(50));

      if (authOk) {
        console.log("\nReady! Here's what you can do next:\n");
        console.log("  gpc status              → app health snapshot");
        console.log("  gpc releases list       → current tracks and versions");
        console.log("  gpc reviews list        → recent user reviews");
        console.log("  gpc vitals overview     → crash and ANR rates");
        console.log("  gpc publish app.aab     → end-to-end upload and release");
        console.log("\nDocs: https://yasserstudio.github.io/gpc/");
      } else {
        console.log("\nSetup incomplete. Fix the issues above, then run `gpc setup` again.");
        console.log("Need help? Run `gpc doctor` for detailed diagnostics.");
        console.log("Full guide: https://yasserstudio.github.io/gpc/guide/authentication");
        process.exitCode = 1;
      }
    });
}
