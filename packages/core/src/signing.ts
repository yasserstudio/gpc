import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { GpcError } from "./errors.js";

export interface KeystoreFingerprint {
  sha256: string;
  alias: string;
  keystorePath: string;
}

export interface ApiSigningFingerprint {
  sha256: string;
  versionCode: number;
}

export interface SigningKeyComparison {
  local?: KeystoreFingerprint;
  api?: ApiSigningFingerprint;
  match: boolean | null;
}

const SHA256_RE = /SHA-?256\s*:\s*([A-Fa-f0-9]{2}(?::[A-Fa-f0-9]{2}){31})/;
const ALIAS_RE = /Alias name:\s*(.+)/i;

export function normalizeFingerprint(fp: string): string {
  return fp.replace(/[:\s]/g, "").toLowerCase();
}

export function parseKeytoolOutput(stdout: string): { sha256: string; alias: string } {
  const sha256Match = SHA256_RE.exec(stdout);
  if (!sha256Match?.[1]) {
    throw new GpcError(
      "Could not find SHA-256 fingerprint in keytool output",
      "KEYTOOL_PARSE_ERROR",
      1,
      "Ensure the keystore contains a valid certificate entry",
    );
  }
  const aliasMatch = ALIAS_RE.exec(stdout);
  return {
    sha256: sha256Match[1].toUpperCase(),
    alias: aliasMatch?.[1]?.trim() ?? "unknown",
  };
}

export async function getKeystoreFingerprint(
  keystorePath: string,
  storePassword: string,
  keyAlias?: string,
): Promise<KeystoreFingerprint> {
  await access(keystorePath, constants.R_OK).catch(() => {
    throw new GpcError(
      `Keystore not found or not readable: ${keystorePath}`,
      "KEYSTORE_READ_ERROR",
      1,
      "Check the path and file permissions",
    );
  });

  const args = ["-list", "-v", "-keystore", keystorePath, "-storepass", storePassword];
  if (keyAlias) args.push("-alias", keyAlias);

  const stdout = await new Promise<string>((resolve, reject) => {
    execFile("keytool", args, { timeout: 10_000 }, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr || err.message;
        if (msg.includes("not found") || (err as NodeJS.ErrnoException).code === "ENOENT") {
          reject(
            new GpcError(
              "keytool not found",
              "KEYTOOL_NOT_FOUND",
              1,
              "Install a JDK (keytool ships with it) or add it to your PATH",
            ),
          );
          return;
        }
        if (msg.includes("password was incorrect") || msg.includes("Keystore was tampered")) {
          reject(
            new GpcError(
              "Keystore password is incorrect or the keystore is corrupted",
              "KEYSTORE_PASSWORD_ERROR",
              1,
              "Check --store-pass or GPC_STORE_PASSWORD",
            ),
          );
          return;
        }
        reject(
          new GpcError(
            `keytool failed: ${msg}`,
            "KEYTOOL_ERROR",
            1,
            "Check the keystore path and password",
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });

  const { sha256, alias } = parseKeytoolOutput(stdout);
  return { sha256, alias, keystorePath };
}

export async function getApiSigningFingerprint(
  accessToken: string,
  packageName: string,
  apiHost = "androidpublisher.googleapis.com",
): Promise<ApiSigningFingerprint | null> {
  const baseUrl = `https://${apiHost}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;

  const editResp = await fetch(`${baseUrl}/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(10_000),
  });
  if (!editResp.ok) return null;
  const edit = (await editResp.json()) as { id: string };

  try {
    const bundlesResp = await fetch(`${baseUrl}/edits/${edit.id}/bundles`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!bundlesResp.ok) return null;
    const bundlesData = (await bundlesResp.json()) as { bundles?: { versionCode: number }[] };
    const bundles = bundlesData.bundles ?? [];
    if (bundles.length === 0) return null;

    const latest = bundles.reduce((max, b) => (b.versionCode > max.versionCode ? b : max));

    const apksResp = await fetch(`${baseUrl}/generatedApks/${latest.versionCode}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!apksResp.ok) return null;
    const apksData = (await apksResp.json()) as {
      generatedApks?: { certificateSha256Fingerprint?: string }[];
    };

    const fp = apksData.generatedApks?.[0]?.certificateSha256Fingerprint;
    if (!fp) return null;

    return { sha256: fp.toUpperCase(), versionCode: latest.versionCode };
  } finally {
    await fetch(`${baseUrl}/edits/${edit.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5_000),
    }).catch(() => {});
  }
}

export function compareFingerprints(a: string, b: string): boolean {
  return normalizeFingerprint(a) === normalizeFingerprint(b);
}
