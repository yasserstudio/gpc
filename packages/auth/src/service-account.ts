import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JWT } from "google-auth-library";
import { AuthError } from "./errors.js";
import { getCachedToken, setCachedToken } from "./token-cache.js";
import type { AuthClient, ServiceAccountKey } from "./types.js";

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

const REQUIRED_FIELDS: readonly (keyof ServiceAccountKey)[] = [
  "type",
  "private_key",
  "client_email",
];

function validateServiceAccountKey(data: unknown): asserts data is ServiceAccountKey {
  if (typeof data !== "object" || data === null) {
    throw new AuthError(
      "Service account key must be a JSON object.",
      "AUTH_INVALID_KEY",
      "Ensure the file contains valid JSON with the required service account fields.",
    );
  }

  const record = data as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (typeof record[field] !== "string" || record[field] === "") {
      throw new AuthError(
        `Service account key is missing required field: "${field}".`,
        "AUTH_INVALID_KEY",
        `Download a fresh service account key from the Google Cloud Console. The key must include: ${REQUIRED_FIELDS.join(", ")}.`,
      );
    }
  }

  if (record["type"] !== "service_account") {
    throw new AuthError(
      `Invalid key type "${String(record["type"])}". Expected "service_account".`,
      "AUTH_INVALID_KEY",
      "Ensure you are using a service account key, not an OAuth client or API key.",
    );
  }
}

export async function loadServiceAccountKey(pathOrJson: string): Promise<ServiceAccountKey> {
  let raw: string;

  const trimmed = pathOrJson.trim();

  if (trimmed.startsWith("{")) {
    raw = trimmed;
  } else {
    const absolutePath = resolve(trimmed);
    try {
      raw = await readFile(absolutePath, "utf-8");
    } catch (err) {
      const code =
        err instanceof Error && "code" in err && err.code === "ENOENT"
          ? "AUTH_FILE_NOT_FOUND"
          : "AUTH_INVALID_KEY";

      throw new AuthError(
        `Failed to read service account key file: ${absolutePath}`,
        code,
        code === "AUTH_FILE_NOT_FOUND"
          ? `File not found. Check that the path is correct: ${absolutePath}`
          : "Ensure the file is readable and contains valid JSON.",
      );
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AuthError(
      "Failed to parse service account key as JSON.",
      "AUTH_INVALID_KEY",
      "Ensure the value is valid JSON. If passing a file path, check that the path points to a JSON file.",
    );
  }

  validateServiceAccountKey(parsed);
  return parsed;
}

const TOKEN_EXPIRY_SECONDS = 3600; // Google OAuth2 tokens expire in 1 hour

export function createServiceAccountAuth(key: ServiceAccountKey, cachePath?: string): AuthClient {
  const jwtClient = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [ANDROID_PUBLISHER_SCOPE],
  });

  return {
    async getAccessToken(): Promise<string> {
      // Check cache first
      if (cachePath) {
        const cached = await getCachedToken(cachePath, key.client_email);
        if (cached) return cached;
      }

      try {
        const { token } = await jwtClient.getAccessToken();
        if (!token) {
          throw new Error("Token response was empty.");
        }

        // Cache the token
        if (cachePath) {
          await setCachedToken(cachePath, key.client_email, token, TOKEN_EXPIRY_SECONDS).catch(
            () => {},
          );
        }

        return token;
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        const safeMsg = rawMsg.length > 150 ? rawMsg.slice(0, 150) + "..." : rawMsg;
        throw new AuthError(
          `Failed to obtain access token: ${safeMsg}`,
          "AUTH_TOKEN_FAILED",
          "Verify that the service account key is valid and not expired. Check that the private key has not been revoked.",
        );
      }
    },

    getProjectId(): string | undefined {
      return key.project_id || undefined;
    },

    getClientEmail(): string {
      return key.client_email;
    },
  };
}
