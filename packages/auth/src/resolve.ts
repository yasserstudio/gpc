import { google } from "googleapis";
import { AuthError } from "./errors.js";
import { createServiceAccountAuth, loadServiceAccountKey } from "./service-account.js";
import type { AuthClient, AuthOptions } from "./types.js";

const ANDROID_PUBLISHER_SCOPE =
  "https://www.googleapis.com/auth/androidpublisher";

async function tryApplicationDefaultCredentials(): Promise<AuthClient | null> {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: [ANDROID_PUBLISHER_SCOPE],
    });

    const client = await auth.getClient();
    const projectId = await auth.getProjectId().catch(() => undefined);
    const email = (client as { email?: string }).email;

    return {
      async getAccessToken(): Promise<string> {
        const { token } = await client.getAccessToken();
        if (!token) {
          throw new AuthError(
            "Application Default Credentials returned an empty token.",
            "AUTH_TOKEN_FAILED",
            "Verify your ADC configuration with: gcloud auth application-default print-access-token",
          );
        }
        return token;
      },

      getProjectId(): string | undefined {
        return projectId ?? undefined;
      },

      getClientEmail(): string {
        return email ?? "unknown";
      },
    };
  } catch {
    return null;
  }
}

export async function resolveAuth(
  options?: AuthOptions,
): Promise<AuthClient> {
  // 1. Explicit options
  if (options?.serviceAccountJson) {
    const key = await loadServiceAccountKey(options.serviceAccountJson);
    return createServiceAccountAuth(key);
  }

  if (options?.serviceAccountPath) {
    const key = await loadServiceAccountKey(options.serviceAccountPath);
    return createServiceAccountAuth(key);
  }

  // 2. Environment variable
  const envValue = process.env["GPC_SERVICE_ACCOUNT"];
  if (envValue) {
    const key = await loadServiceAccountKey(envValue);
    return createServiceAccountAuth(key);
  }

  // 3. Application Default Credentials
  const adcClient = await tryApplicationDefaultCredentials();
  if (adcClient) {
    return adcClient;
  }

  throw new AuthError(
    "No credentials found. Could not authenticate with the Google Play Developer API.",
    "AUTH_NO_CREDENTIALS",
    [
      "Provide credentials using one of these methods:",
      "  1. Pass serviceAccountPath or serviceAccountJson in options",
      "  2. Set the GPC_SERVICE_ACCOUNT environment variable to a file path or raw JSON",
      "  3. Configure Application Default Credentials: gcloud auth application-default login",
    ].join("\n"),
  );
}
