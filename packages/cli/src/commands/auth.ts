import type { Command } from "commander";
import { createInterface } from "node:readline";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveAuth, loadServiceAccountKey, clearTokenCache, AuthError } from "@gpc-cli/auth";
import { loadConfig, getCacheDir, deleteConfigValue, setConfigValue } from "@gpc-cli/config";
import { formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function askQuestion(
  rl: ReturnType<typeof createInterface>,
  question: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

/** Resolve a path to absolute (prevents CWD-dependent config). */
function toAbsolutePath(pathStr: string): string {
  return resolve(pathStr);
}

/** Verify that the saved credentials can acquire a token. */
async function verifyToken(serviceAccountPath?: string): Promise<{ email: string; ok: boolean; error?: string }> {
  try {
    const client = await resolveAuth({ serviceAccountPath });
    const email = client.getClientEmail();
    await client.getAccessToken();
    return { email, ok: true };
  } catch (err) {
    const email = "unknown";
    const msg = err instanceof Error ? err.message : String(err);
    return { email, ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Interactive login wizard
// ---------------------------------------------------------------------------

async function runLoginWizard(program: Command): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log("\nGPC Authentication Setup");
    console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");

    // Step 1: auth method
    console.log("\nAuthentication methods:");
    console.log("  1. Service account key file (recommended)");
    console.log("  2. Application Default Credentials (ADC)");
    const method = await askQuestion(rl, "\nSelect method [1]: ");
    const useAdc = method === "2";

    if (useAdc) {
      const client = await resolveAuth();
      const email = client.getClientEmail();
      // Verify token works
      await client.getAccessToken();
      outputLoginResult(program, { account: email, method: "adc", verified: true });
      return;
    }

    // Step 2: credentials path with validation loop
    let saPath = "";
    while (!saPath) {
      const input = await askQuestion(rl, "\nPath to service account JSON key: ");
      if (!input) {
        console.log("  Path is required.");
        continue;
      }
      try {
        await access(input);
        saPath = toAbsolutePath(input);
      } catch {
        console.log(`  File not found: ${input}`);
      }
    }

    // Step 3: optional profile name
    const profileName = await askQuestion(rl, "\nProfile name (optional, press Enter to skip): ");

    // Step 4: default package name
    const packageName = await askQuestion(
      rl,
      "Default package name (optional, e.g. com.example.app): ",
    );

    // Apply settings
    const key = await loadServiceAccountKey(saPath);

    if (profileName) {
      const { setProfileConfig } = await import("@gpc-cli/config");
      await setProfileConfig(profileName, {
        auth: { serviceAccount: saPath },
        ...(packageName && { app: packageName }),
      });
    } else {
      await setConfigValue("auth.serviceAccount", saPath);
      if (packageName) await setConfigValue("app", packageName);
    }

    // Verify token
    const verification = await verifyToken(saPath);

    outputLoginResult(program, {
      account: key.client_email,
      project: key.project_id,
      method: "service-account",
      profile: profileName || undefined,
      verified: verification.ok,
      verifyError: verification.error,
    });
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Structured login output
// ---------------------------------------------------------------------------

interface LoginResult {
  account: string;
  project?: string;
  method: string;
  profile?: string;
  verified: boolean;
  verifyError?: string;
}

function outputLoginResult(program: Command, result: LoginResult): void {
  const parentOpts = program.opts() ?? {};
  const jsonMode = !!(parentOpts["json"] || parentOpts["output"] === "json");

  if (jsonMode) {
    console.log(
      JSON.stringify({
        success: true,
        account: result.account,
        project: result.project,
        method: result.method,
        profile: result.profile,
        verified: result.verified,
        ...(result.verifyError && { verifyError: result.verifyError }),
      }),
    );
    return;
  }

  if (result.profile) {
    console.log(`\nProfile "${result.profile}" configured with ${result.account}`);
  } else if (result.method === "adc") {
    console.log(`\nAuthenticated via Application Default Credentials`);
    console.log(`Account: ${result.account}`);
  } else {
    console.log(`\nAuthenticated as ${result.account}`);
  }
  if (result.project) console.log(`Project: ${result.project}`);

  if (result.verified) {
    console.log("Verified: token acquired successfully");
  } else if (result.verifyError) {
    console.log(`Warning: token verification failed: ${result.verifyError}`);
    console.log("Credentials saved, but check your setup with: gpc doctor");
  }

  if (!result.verifyError) {
    console.log("\nRun 'gpc doctor' to verify your full setup.");
  }
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Manage authentication");

  auth
    .command("login")
    .description("Authenticate with Google Play Developer API")
    .option("--service-account <path>", "Path to service account JSON key file")
    .option("--adc", "Use Application Default Credentials")
    .option("--profile <name>", "Store credentials under a named profile")
    .action(async (options: { serviceAccount?: string; adc?: boolean; profile?: string }) => {
      if (options.serviceAccount) {
        const absolutePath = toAbsolutePath(options.serviceAccount);
        const key = await loadServiceAccountKey(absolutePath);

        if (options.profile) {
          const { setProfileConfig } = await import("@gpc-cli/config");
          await setProfileConfig(options.profile, {
            auth: { serviceAccount: absolutePath },
          });
        } else {
          await setConfigValue("auth.serviceAccount", absolutePath);
        }

        // Verify token works
        const verification = await verifyToken(absolutePath);

        outputLoginResult(program, {
          account: key.client_email,
          project: key.project_id,
          method: "service-account",
          profile: options.profile,
          verified: verification.ok,
          verifyError: verification.error,
        });
      } else if (options.adc) {
        const client = await resolveAuth();
        const email = client.getClientEmail();
        await client.getAccessToken();
        outputLoginResult(program, { account: email, method: "adc", verified: true });
      } else {
        // Interactive wizard when no flags provided and in interactive mode
        const opts = program.opts();
        const interactive =
          opts["interactive"] !== false && opts["ci"] !== true && process.stdin.isTTY;
        if (interactive) {
          await runLoginWizard(program);
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
    });

  auth
    .command("status")
    .description("Show current authentication status")
    .action(async () => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      try {
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
          cachePath: getCacheDir(),
        });
        const data = {
          authenticated: true,
          account: client.getClientEmail(),
          project: client.getProjectId(),
          ...(config.profile && { profile: config.profile }),
        };
        console.log(formatOutput(data, format));
      } catch (error) {
        if (error instanceof AuthError) {
          const data = {
            authenticated: false,
            error: error.message,
            suggestion: error.suggestion,
          };
          console.log(formatOutput(data, format));
        }
        throw error; // Let error handler set exit code 3
      }
    });

  auth
    .command("logout")
    .description("Clear stored credentials and token cache")
    .option("--profile <name>", "Clear credentials for a specific profile")
    .action(async (options: { profile?: string }) => {
      if (options.profile) {
        const { deleteProfile } = await import("@gpc-cli/config");
        const deleted = await deleteProfile(options.profile);
        if (deleted) {
          console.log(`Profile "${options.profile}" removed.`);
        } else {
          console.log(`Profile "${options.profile}" not found.`);
        }
      } else {
        await deleteConfigValue("auth.serviceAccount");
        console.log("Credentials cleared.");
      }
      await clearTokenCache(getCacheDir());
      console.log("Token cache cleared.");
    });

  auth
    .command("whoami")
    .description("Show current authenticated identity")
    .action(async () => {
      const config = await loadConfig();
      const client = await resolveAuth({
        serviceAccountPath: config.auth?.serviceAccount,
        cachePath: getCacheDir(),
      });
      console.log(client.getClientEmail());
    });

  auth
    .command("switch <profile>")
    .description("Switch to a named profile")
    .action(async (profile: string) => {
      // loadConfig with the profile will throw ConfigError if profile doesn't exist
      const config = await loadConfig({ profile });
      await setConfigValue("profile", profile);
      console.log(`Switched to profile "${profile}"`);
      if (config.auth?.serviceAccount) {
        console.log(`Service account: ${config.auth.serviceAccount}`);
      }
    });

  auth
    .command("token")
    .description("Print the current access token (useful for manual API calls)")
    .action(async () => {
      const config = await loadConfig();
      const authClient = await resolveAuth({
        serviceAccountPath: config.auth?.serviceAccount,
        cachePath: getCacheDir(),
      });
      const token = await authClient.getAccessToken();
      console.log(token);
    });

  auth
    .command("setup-gcp")
    .description("Step-by-step guide to create a Google Cloud service account")
    .action(() => {
      console.log("\nGPC \u2014 Google Cloud Service Account Setup");
      console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
      console.log("\nStep 1: Open the Google Cloud Console");
      console.log("  https://console.cloud.google.com/iam-admin/serviceaccounts");
      console.log("\nStep 2: Create a service account");
      console.log("  \u2022 Click 'Create Service Account'");
      console.log("  \u2022 Name it: gpc-deploy (or any name you like)");
      console.log("  \u2022 Description: GPC Google Play Console access");
      console.log("\nStep 3: Grant roles");
      console.log("  No GCP roles needed \u2014 permissions are managed in Google Play Console.");
      console.log("\nStep 4: Download the JSON key");
      console.log("  \u2022 Click your new service account \u2192 Keys \u2192 Add Key \u2192 Create new key \u2192 JSON");
      console.log("  \u2022 Save as: ~/gpc-service-account.json");
      console.log("\nStep 5: Add to Google Play Console");
      console.log("  https://play.google.com/console/developers");
      console.log("  \u2022 Users and Permissions \u2192 Invite new users");
      console.log("  \u2022 Paste the service account email (ends with @...gserviceaccount.com)");
      console.log("  \u2022 Grant: Release manager + View app info + Reply to reviews");
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
