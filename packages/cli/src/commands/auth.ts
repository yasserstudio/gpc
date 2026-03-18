import type { Command } from "commander";
import { createInterface } from "node:readline";
import { access } from "node:fs/promises";
import { resolveAuth, loadServiceAccountKey, clearTokenCache, AuthError } from "@gpc-cli/auth";
import { loadConfig, getCacheDir } from "@gpc-cli/config";
import { formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

async function askQuestion(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function runLoginWizard(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log("\nGPC Authentication Setup");
    console.log("─────────────────────────");

    // Step 1: auth method
    console.log("\nAuthentication methods:");
    console.log("  1. Service account key file (recommended)");
    console.log("  2. Application Default Credentials (ADC)");
    const method = await askQuestion(rl, "\nSelect method [1]: ");
    const useAdc = method === "2";

    if (useAdc) {
      const { resolveAuth: ra } = await import("@gpc-cli/auth");
      const client = await ra();
      console.log(`\nAuthenticated via Application Default Credentials`);
      console.log(`Account: ${client.getClientEmail()}`);
      return;
    }

    // Step 2: credentials path with validation loop
    let saPath = "";
    while (!saPath) {
      const input = await askQuestion(rl, "\nPath to service account JSON key: ");
      if (!input) { console.log("  Path is required."); continue; }
      try {
        await access(input);
        saPath = input;
      } catch {
        console.log(`  File not found: ${input}`);
      }
    }

    // Step 3: optional profile name
    const profileName = await askQuestion(rl, "\nProfile name (optional, press Enter to skip): ");

    // Step 4: default package name
    const packageName = await askQuestion(rl, "Default package name (optional, e.g. com.example.app): ");

    // Apply settings
    const { loadServiceAccountKey: loadKey } = await import("@gpc-cli/auth");
    const key = await loadKey(saPath);

    if (profileName) {
      const { setProfileConfig } = await import("@gpc-cli/config");
      await setProfileConfig(profileName, { auth: { serviceAccount: saPath }, ...(packageName && { app: packageName }) });
      console.log(`\nProfile "${profileName}" configured with ${key.client_email}`);
    } else {
      const { setConfigValue } = await import("@gpc-cli/config");
      await setConfigValue("auth.serviceAccount", saPath);
      if (packageName) await setConfigValue("app", packageName);
      console.log(`\nAuthenticated as ${key.client_email}`);
    }
    console.log(`Project: ${key.project_id}`);
    console.log("\nRun 'gpc doctor' to verify your setup.");
  } finally {
    rl.close();
  }
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Manage authentication");

  auth
    .command("login")
    .description("Authenticate with Google Play Developer API")
    .option("--service-account <path>", "Path to service account JSON key file")
    .option("--adc", "Use Application Default Credentials")
    .option("--profile <name>", "Store credentials under a named profile")
    .action(async (options: { serviceAccount?: string; adc?: boolean; profile?: string }) => {
      try {
        if (options.serviceAccount) {
          const key = await loadServiceAccountKey(options.serviceAccount);

          if (options.profile) {
            const { setProfileConfig } = await import("@gpc-cli/config");
            await setProfileConfig(options.profile, {
              auth: { serviceAccount: options.serviceAccount },
            });
            console.log(`Profile "${options.profile}" configured with ${key.client_email}`);
          } else {
            const { setConfigValue } = await import("@gpc-cli/config");
            await setConfigValue("auth.serviceAccount", options.serviceAccount);
            console.log(`Authenticated as ${key.client_email}`);
          }
          console.log(`Project: ${key.project_id}`);
        } else if (options.adc) {
          const client = await resolveAuth();
          console.log(`Authenticated via Application Default Credentials`);
          console.log(`Account: ${client.getClientEmail()}`);
        } else {
          // Interactive wizard when no flags provided and in interactive mode
          const opts = program.opts();
          const interactive = opts["interactive"] !== false && opts["ci"] !== true && process.stdin.isTTY;
          if (interactive) {
            await runLoginWizard();
          } else {
            console.log("Usage: gpc auth login --service-account <path>");
            console.log("");
            console.log("Authentication methods:");
            console.log("  --service-account <path>  Service account JSON key file");
            console.log("  --adc                     Application Default Credentials");
            console.log("");
            console.log("Options:");
            console.log("  --profile <name>          Store under a named profile");
          }
        }
      } catch (error) {
        if (error instanceof AuthError) {
          console.error(`Error: ${error.message}`);
          if (error.suggestion) console.error(`Suggestion: ${error.suggestion}`);
          process.exit(3);
        }
        throw error;
      }
    });

  auth
    .command("status")
    .description("Show current authentication status")
    .action(async () => {
      const config = await loadConfig();
      try {
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
          cachePath: getCacheDir(),
        });
        const format = getOutputFormat(program, config);
        const data = {
          authenticated: true,
          account: client.getClientEmail(),
          project: client.getProjectId(),
          ...(config.profile && { profile: config.profile }),
        };
        console.log(formatOutput(data, format));
      } catch (error) {
        if (error instanceof AuthError) {
          const format = getOutputFormat(program, config);
          const data = {
            authenticated: false,
            error: error.message,
            suggestion: error.suggestion,
          };
          console.log(formatOutput(data, format));
          process.exit(3);
        }
        throw error;
      }
    });

  auth
    .command("logout")
    .description("Clear stored credentials and token cache")
    .action(async () => {
      const { setConfigValue } = await import("@gpc-cli/config");
      await setConfigValue("auth.serviceAccount", "");
      await clearTokenCache(getCacheDir());
      console.log("Credentials and token cache cleared.");
    });

  auth
    .command("whoami")
    .description("Show current authenticated identity")
    .action(async () => {
      try {
        const config = await loadConfig();
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
          cachePath: getCacheDir(),
        });
        console.log(client.getClientEmail());
      } catch {
        console.error("Not authenticated. Run: gpc auth login");
        process.exit(3);
      }
    });

  auth
    .command("switch <profile>")
    .description("Switch to a named profile")
    .action(async (profile: string) => {
      try {
        // Verify profile exists
        const config = await loadConfig({ profile });
        const { setConfigValue } = await import("@gpc-cli/config");
        await setConfigValue("profile", profile);
        console.log(`Switched to profile "${profile}"`);
        if (config.auth?.serviceAccount) {
          console.log(`Service account: ${config.auth.serviceAccount}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(2);
      }
    });

  auth
    .command("token")
    .description("Print the current access token (useful for manual API calls)")
    .action(async () => {
      try {
        const config = await loadConfig();
        const authClient = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
          cachePath: getCacheDir(),
        });
        const token = await authClient.getAccessToken();
        console.log(token);
      } catch (error) {
        if (error instanceof AuthError) {
          console.error(`Error: ${error.message}`);
          process.exit(3);
        }
        throw error;
      }
    });

  auth
    .command("setup-gcp")
    .description("Step-by-step guide to create a Google Cloud service account")
    .action(() => {
      console.log("\nGPC — Google Cloud Service Account Setup");
      console.log("═══════════════════════════════════════════");
      console.log("\nStep 1: Open the Google Cloud Console");
      console.log("  https://console.cloud.google.com/iam-admin/serviceaccounts");
      console.log("\nStep 2: Create a service account");
      console.log("  • Click 'Create Service Account'");
      console.log("  • Name it: gpc-deploy (or any name you like)");
      console.log("  • Description: GPC Google Play Console access");
      console.log("\nStep 3: Grant roles");
      console.log("  No GCP roles needed — permissions are managed in Google Play Console.");
      console.log("\nStep 4: Download the JSON key");
      console.log("  • Click your new service account → Keys → Add Key → Create new key → JSON");
      console.log("  • Save as: ~/gpc-service-account.json");
      console.log("\nStep 5: Add to Google Play Console");
      console.log("  https://play.google.com/console/developers");
      console.log("  • Users and Permissions → Invite new users");
      console.log("  • Paste the service account email (ends with @...gserviceaccount.com)");
      console.log("  • Grant: Release manager + View app info + Reply to reviews");
      console.log("\nStep 6: Authenticate");
      console.log("  gpc auth login --service-account ~/gpc-service-account.json");
      console.log("\nStep 7: Verify");
      console.log("  gpc doctor");
      console.log("\nSee full docs: https://yasserstudio.github.io/gpc/guide/authentication");
    });

  auth
    .command("profiles")
    .description("List configured profiles")
    .action(async () => {
      const { listProfiles } = await import("@gpc-cli/config");
      const config = await loadConfig();
      const profiles = await listProfiles();
      const format = getOutputFormat(program, config);

      if (profiles.length === 0) {
        console.log(
          "No profiles configured. Use: gpc auth login --service-account <path> --profile <name>",
        );
        return;
      }

      const data = profiles.map((name) => ({
        name,
        active: name === config.profile,
      }));
      console.log(formatOutput(data, format));
    });
}
