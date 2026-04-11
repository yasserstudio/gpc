import type { EnterpriseApiClient, CustomApp } from "@gpc-cli/api";

export type { CustomApp };

/**
 * Parameters for creating a private enterprise app via the Play Custom App
 * Publishing API. All fields are user-supplied inputs — the returned
 * `CustomApp.packageName` is assigned by Google.
 */
export interface CreateEnterpriseAppParams {
  /** Developer account ID (int64-shaped, from Play Console URL). */
  accountId: string;
  /** Path to the AAB or APK to upload. */
  bundlePath: string;
  /** Title for the Android app. Required. */
  title: string;
  /** Default listing language. Defaults to "en_US" when omitted. */
  languageCode?: string;
  /** Target enterprise organizations. Zero or more. */
  organizations?: Array<{
    organizationId: string;
    organizationName?: string;
  }>;
}

/**
 * Create and publish a private custom app. Orchestrates the input shape
 * expected by the CLI layer (flat params) into the shape the api-client
 * expects (accountId, bundlePath, metadata).
 *
 * Once created, the returned app is permanently private — it cannot be made
 * public. Subsequent operations (version uploads, tracks, listings) use the
 * regular Publisher API commands (`gpc releases`, `gpc tracks`, `gpc listings`)
 * against the returned `packageName`.
 */
export async function createEnterpriseApp(
  client: EnterpriseApiClient,
  params: CreateEnterpriseAppParams,
): Promise<CustomApp> {
  return client.apps.create(params.accountId, params.bundlePath, {
    title: params.title,
    languageCode: params.languageCode ?? "en_US",
    organizations: params.organizations,
  });
}

/**
 * One-shot publish wrapper — functionally identical to `createEnterpriseApp`
 * today but kept as a distinct function so the CLI `publish` subcommand has
 * a stable entry point for future divergence (e.g. post-create validation,
 * automatic first-release upload, analytics hooks).
 */
export async function publishEnterpriseApp(
  client: EnterpriseApiClient,
  params: CreateEnterpriseAppParams,
): Promise<CustomApp> {
  return createEnterpriseApp(client, params);
}
