import type { Command } from "commander";
import { resolveAuth, loadServiceAccountKey, AuthError } from "@gpc/auth";
import { loadConfig } from "@gpc/config";
import { detectOutputFormat, formatOutput } from "@gpc/core";

export function registerAuthCommands(program: Command): void {
  const auth = program
    .command("auth")
    .description("Manage authentication");

  auth
    .command("login")
    .description("Authenticate with Google Play Developer API")
    .option("--service-account <path>", "Path to service account JSON key file")
    .option("--adc", "Use Application Default Credentials")
    .action(async (options: { serviceAccount?: string; adc?: boolean }) => {
      try {
        if (options.serviceAccount) {
          const key = await loadServiceAccountKey(options.serviceAccount);
          const { setConfigValue } = await import("@gpc/config");
          await setConfigValue("auth.serviceAccount", options.serviceAccount);
          console.log(`Authenticated as ${key.client_email}`);
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
          console.log("OAuth device flow coming in v0.1.1");
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
      try {
        const config = await loadConfig();
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
        });
        const format = detectOutputFormat();
        const data = {
          authenticated: true,
          account: client.getClientEmail(),
          project: client.getProjectId(),
        };
        console.log(formatOutput(data, format));
      } catch (error) {
        if (error instanceof AuthError) {
          const format = detectOutputFormat();
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
    .description("Clear stored credentials")
    .action(async () => {
      const { setConfigValue } = await import("@gpc/config");
      await setConfigValue("auth.serviceAccount", "");
      console.log("Credentials cleared.");
    });

  auth
    .command("whoami")
    .description("Show current authenticated identity")
    .action(async () => {
      try {
        const config = await loadConfig();
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
        });
        console.log(client.getClientEmail());
      } catch {
        console.error("Not authenticated. Run: gpc auth login");
        process.exit(3);
      }
    });
}
