import { GpcError } from "./errors.js";
import { normalizeFingerprint } from "./signing.js";

export interface SigningConsistencyResult {
  currentVersionCode: number;
  currentFingerprint: string;
  previousVersionCode?: number;
  previousFingerprint?: string;
  consistent: boolean;
  firstRelease: boolean;
}

export async function checkSigningConsistency(
  accessToken: string,
  packageName: string,
  apiHost = "androidpublisher.googleapis.com",
): Promise<SigningConsistencyResult> {
  const baseUrl = `https://${apiHost}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;

  const editResp = await fetch(`${baseUrl}/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(10_000),
  });
  if (!editResp.ok) {
    const body = (await editResp.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new GpcError(
      `Failed to create edit: ${body.error?.message ?? `HTTP ${editResp.status}`}`,
      "EDIT_CREATE_FAILED",
      4,
      "Check your credentials and app access permissions",
    );
  }
  const edit = (await editResp.json()) as { id: string };

  try {
    const bundlesResp = await fetch(`${baseUrl}/edits/${edit.id}/bundles`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!bundlesResp.ok) {
      throw new GpcError(
        `Failed to list bundles: HTTP ${bundlesResp.status}`,
        "BUNDLES_LIST_FAILED",
        4,
        "Check your API permissions for this app",
      );
    }
    const bundlesData = (await bundlesResp.json()) as { bundles?: { versionCode: number }[] };
    const bundles = (bundlesData.bundles ?? []).sort((a, b) => b.versionCode - a.versionCode);

    if (bundles.length === 0) {
      throw new GpcError(
        "No bundles found for this app",
        "NO_BUNDLES",
        4,
        "Upload at least one AAB with 'gpc publish' before checking signing consistency",
      );
    }

    const currentVc = bundles[0]!.versionCode;
    const currentFp = await fetchFingerprint(baseUrl, accessToken, currentVc);

    if (bundles.length === 1) {
      return {
        currentVersionCode: currentVc,
        currentFingerprint: currentFp,
        consistent: true,
        firstRelease: true,
      };
    }

    const previousVc = bundles[1]!.versionCode;
    const previousFp = await fetchFingerprint(baseUrl, accessToken, previousVc);

    const consistent = normalizeFingerprint(currentFp) === normalizeFingerprint(previousFp);

    return {
      currentVersionCode: currentVc,
      currentFingerprint: currentFp,
      previousVersionCode: previousVc,
      previousFingerprint: previousFp,
      consistent,
      firstRelease: false,
    };
  } finally {
    await fetch(`${baseUrl}/edits/${edit.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5_000),
    }).catch(() => {});
  }
}

async function fetchFingerprint(
  baseUrl: string,
  accessToken: string,
  versionCode: number,
): Promise<string> {
  const resp = await fetch(`${baseUrl}/generatedApks/${versionCode}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    throw new GpcError(
      `Failed to get generated APKs for versionCode ${versionCode}: HTTP ${resp.status}`,
      "GENERATED_APKS_FAILED",
      4,
      "Check your API permissions for this app",
    );
  }
  const data = (await resp.json()) as {
    generatedApks?: { certificateSha256Fingerprint?: string }[];
  };
  const fp = data.generatedApks?.[0]?.certificateSha256Fingerprint;
  if (!fp) {
    throw new GpcError(
      `No signing certificate found for versionCode ${versionCode}`,
      "NO_SIGNING_CERT",
      4,
      "The app may not be enrolled in Play App Signing",
    );
  }
  return fp.toUpperCase();
}
