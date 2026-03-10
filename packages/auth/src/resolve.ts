import { GoogleAuth } from "google-auth-library";
import { AuthError } from "./errors.js";
import { createServiceAccountAuth, loadServiceAccountKey } from "./service-account.js";
import type { AuthClient, AuthOptions } from "./types.js";

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

async function tryApplicationDefaultCredentials(): Promise<AuthClient | null> {
  try {
    const auth = new GoogleAuth({
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

export async function resolveAuth(options?: AuthOptions): Promise<AuthClient> {
  // 1. Explicit options
  if (options?.serviceAccountJson) {
    const key = await loadServiceAccountKey(options.serviceAccountJson);
    return createServiceAccountAuth(key, options?.cachePath);
  }

  if (options?.serviceAccountPath) {
    const key = await loadServiceAccountKey(options.serviceAccountPath);
    return createServiceAccountAuth(key, options?.cachePath);
  }

  // 2. GPC_SERVICE_ACCOUNT environment variable
  const envValue = process.env["GPC_SERVICE_ACCOUNT"];
  if (envValue) {
    const key = await loadServiceAccountKey(envValue);
    return createServiceAccountAuth(key, options?.cachePath);
  }

  // 3. GOOGLE_APPLICATION_CREDENTIALS environment variable
  const gacPath = process.env["GOOGLE_APPLICATION_CREDENTIALS"];
  if (gacPath) {
    try {
      const key = await loadServiceAccountKey(gacPath);
      return createServiceAccountAuth(key, options?.cachePath);
    } catch {
      // Fall through to ADC which also reads GOOGLE_APPLICATION_CREDENTIALS
    }
  }

  // 4. Application Default Credentials
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
      "  3. Set GOOGLE_APPLICATION_CREDENTIALS to a service account key file",
      "  4. Configure Application Default Credentials: gcloud auth application-default login",
    ].join("\n"),
  );
}
