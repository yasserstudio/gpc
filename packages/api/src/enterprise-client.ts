import { stat } from "node:fs/promises";
import { createHttpClient } from "./http.js";
import { PlayApiError } from "./errors.js";
import type { ApiClientOptions } from "./types.js";

/**
 * A private ("custom") app published via the Google Play Custom App Publishing API.
 * Once created, these apps are PERMANENTLY private — they cannot be made public.
 *
 * Source: `https://playcustomapp.googleapis.com/$discovery/rest?version=v1`
 */
export interface CustomApp {
  /** Output only. Package name Google assigns to the created custom app. */
  readonly packageName?: string;
  /** Title for the Android app. Required in practice. */
  title: string;
  /** Default listing language in BCP 47 format (e.g. "en_US"). */
  languageCode?: string;
  /** Organizations to which the custom app should be made available. */
  organizations?: Array<{
    /** ID of the enterprise organization (required when included). */
    organizationId: string;
    /** Human-readable organization name (optional). */
    organizationName?: string;
  }>;
}

/** Input metadata for `apps.create` — `packageName` is output-only and excluded. */
export type CustomAppCreateMetadata = Omit<CustomApp, "packageName">;

export interface EnterpriseApiClient {
  apps: {
    /**
     * Create and publish a new private custom app. Performs a resumable
     * upload: the initial POST carries the metadata JSON, subsequent chunks
     * stream the bundle binary. Returns the created `CustomApp` with the
     * assigned `packageName`.
     *
     * The created app is permanently private and cannot be made public.
     *
     * @param accountId - Developer account ID (int64, from Play Console URL)
     * @param bundlePath - Path to the AAB or APK to upload
     * @param metadata - CustomApp metadata (title, languageCode, organizations)
     */
    create(
      accountId: string,
      bundlePath: string,
      metadata: CustomAppCreateMetadata,
    ): Promise<CustomApp>;
  };
}

/** Validate that the account ID is numeric (int64-shaped). Throws on invalid. */
function assertAccountId(accountId: string): void {
  if (!/^\d+$/.test(accountId)) {
    throw new PlayApiError(
      `Developer account ID must be numeric (got "${accountId}").`,
      "ENTERPRISE_INVALID_ACCOUNT_ID",
      undefined,
      [
        "Find your developer account ID in the Play Console URL:",
        "  https://play.google.com/console/developers/[ID]",
        "The ID is a long integer, not your Workspace or Cloud Identity organization ID.",
      ].join("\n"),
    );
  }
}

/** Verify the bundle file exists before starting the upload. Throws on missing. */
async function assertBundleExists(bundlePath: string): Promise<void> {
  try {
    await stat(bundlePath);
  } catch {
    throw new PlayApiError(
      `Bundle file not found: ${bundlePath}`,
      "ENTERPRISE_BUNDLE_NOT_FOUND",
      undefined,
      "Verify the path to your AAB or APK is correct.",
    );
  }
}

/** Detect the content type from the file extension. */
function detectContentType(bundlePath: string): string {
  const lower = bundlePath.toLowerCase();
  if (lower.endsWith(".aab")) {
    return "application/octet-stream";
  }
  if (lower.endsWith(".apk")) {
    return "application/vnd.android.package-archive";
  }
  // Default: octet-stream. Google's Custom App API accepts any content type.
  return "application/octet-stream";
}

export function createEnterpriseClient(options: ApiClientOptions): EnterpriseApiClient {
  // The Custom App Publishing API has no non-upload endpoints — all operations
  // go through the upload base URL via `http.uploadCustomApp`. We still need
  // an HttpClient instance to access the upload helper, which internally
  // resolves the correct URL from CUSTOM_APP_UPLOAD_BASE_URL.
  const http = createHttpClient(options);

  return {
    apps: {
      async create(accountId, bundlePath, metadata) {
        assertAccountId(accountId);
        await assertBundleExists(bundlePath);

        const contentType = detectContentType(bundlePath);
        const path = `/${accountId}/customApps`;

        const { data } = await http.uploadCustomApp<CustomApp>(
          path,
          bundlePath,
          metadata,
          contentType,
        );
        return data;
      },
    },
  };
}
