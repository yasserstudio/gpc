import { writeFile } from "node:fs/promises";
import type { PlayApiClient, GeneratedApk } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export async function listGeneratedApks(
  client: PlayApiClient,
  packageName: string,
  versionCode: number,
): Promise<GeneratedApk[]> {
  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    throw new GpcError(
      `Invalid version code: ${versionCode}`,
      "GENERATED_APKS_INVALID_VERSION",
      2,
      "Provide a positive integer version code.",
    );
  }
  return client.generatedApks.list(packageName, versionCode);
}

export async function downloadGeneratedApk(
  client: PlayApiClient,
  packageName: string,
  versionCode: number,
  apkId: string,
  outputPath: string,
): Promise<{ path: string; sizeBytes: number }> {
  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    throw new GpcError(
      `Invalid version code: ${versionCode}`,
      "GENERATED_APKS_INVALID_VERSION",
      2,
      "Provide a positive integer version code.",
    );
  }

  if (!apkId) {
    throw new GpcError(
      "APK ID is required",
      "GENERATED_APKS_MISSING_ID",
      2,
      "Provide the generated APK ID. Use 'gpc generated-apks list <version-code>' to see available APKs.",
    );
  }

  const buffer = await client.generatedApks.download(packageName, versionCode, apkId);
  const bytes = new Uint8Array(buffer);
  await writeFile(outputPath, bytes);

  return { path: outputPath, sizeBytes: bytes.byteLength };
}
