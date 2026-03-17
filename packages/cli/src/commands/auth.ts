import type { Command } from "commander";
import { resolveAuth, loadServiceAccountKey, clearTokenCache, AuthError } from "@gpc-cli/auth";
import { loadConfig, getCacheDir } from "@gpc-cli/config";
import { formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

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
          console.log("Usage: gpc auth login --service-account <path>");
          console.log("");
          console.log("Authentication methods:");
          console.log("  --service-account <path>  Service account JSON key file");
          console.log("  --adc                     Application Default Credentials");
          console.log("");
          console.log("Options:");
          console.log("  --profile <name>          Store under a named profile");
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
