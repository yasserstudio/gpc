import { extname } from "node:path";
import type { PlayApiClient, InternalAppSharingArtifact } from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import { validateUploadFile } from "../utils/file-validation.js";

export interface InternalSharingUploadResult {
  downloadUrl: string;
  sha256: string;
  certificateFingerprint: string;
  fileType: "bundle" | "apk";
}

export async function uploadInternalSharing(
  client: PlayApiClient,
  packageName: string,
  filePath: string,
  fileType?: "bundle" | "apk",
): Promise<InternalSharingUploadResult> {
  // Auto-detect file type from extension if not provided
  const resolvedType = fileType ?? detectFileType(filePath);

  // Validate the file
  const validation = await validateUploadFile(filePath);
  if (!validation.valid) {
    throw new GpcError(
      `File validation failed:\n${validation.errors.join("\n")}`,
      "INTERNAL_SHARING_INVALID_FILE",
      2,
      "Check that the file is a valid AAB or APK and is not corrupted.",
    );
  }

  let artifact: InternalAppSharingArtifact;
  if (resolvedType === "bundle") {
    artifact = await client.internalAppSharing.uploadBundle(packageName, filePath);
  } else {
    artifact = await client.internalAppSharing.uploadApk(packageName, filePath);
  }

  return {
    downloadUrl: artifact.downloadUrl,
    sha256: artifact.sha256,
    certificateFingerprint: artifact.certificateFingerprint,
    fileType: resolvedType,
  };
}

function detectFileType(filePath: string): "bundle" | "apk" {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".aab") return "bundle";
  if (ext === ".apk") return "apk";
  throw new GpcError(
    `Cannot detect file type from extension "${ext}". Use --type to specify bundle or apk.`,
    "INTERNAL_SHARING_UNKNOWN_TYPE",
    2,
    "Use --type bundle for .aab files or --type apk for .apk files.",
  );
}
