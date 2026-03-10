import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

export interface FileValidationResult {
  valid: boolean;
  fileType: "aab" | "apk" | "unknown";
  sizeBytes: number;
  errors: string[];
  warnings: string[];
}

// ZIP magic bytes: PK\x03\x04
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const MAX_APK_SIZE = 150 * 1024 * 1024; // 150 MB
const MAX_AAB_SIZE = 500 * 1024 * 1024; // 500 MB (Play Store limit for AABs)
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100 MB — warn about upload time

export async function validateUploadFile(filePath: string): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check extension
  const ext = extname(filePath).toLowerCase();
  let fileType: FileValidationResult["fileType"] = "unknown";

  if (ext === ".aab") {
    fileType = "aab";
  } else if (ext === ".apk") {
    fileType = "apk";
  } else {
    errors.push(`Unsupported file extension "${ext}". Expected .aab or .apk`);
  }

  // Check file exists and get size
  let sizeBytes: number;
  try {
    const stats = await stat(filePath);
    sizeBytes = stats.size;

    if (sizeBytes === 0) {
      errors.push("File is empty (0 bytes)");
    }
  } catch {
    errors.push(`File not found: ${filePath}`);
    return { valid: false, fileType, sizeBytes: 0, errors, warnings };
  }

  // Check size limits
  if (fileType === "apk" && sizeBytes > MAX_APK_SIZE) {
    errors.push(
      `APK exceeds 150 MB limit (${formatSize(sizeBytes)}). Consider using AAB format instead.`,
    );
  }
  if (fileType === "aab" && sizeBytes > MAX_AAB_SIZE) {
    errors.push(`AAB exceeds 500 MB limit (${formatSize(sizeBytes)}).`);
  }

  if (sizeBytes > LARGE_FILE_THRESHOLD && errors.length === 0) {
    warnings.push(
      `Large file (${formatSize(sizeBytes)}). Upload may take a while on slow connections.`,
    );
  }

  // Check magic bytes (ZIP format — both AAB and APK are ZIP-based)
  if (sizeBytes > 0) {
    try {
      const fd = await readFile(filePath, { flag: "r" });
      const header = fd.subarray(0, 4);

      if (!header.equals(ZIP_MAGIC)) {
        errors.push(
          "File does not have valid ZIP magic bytes (PK\\x03\\x04). " +
            "Both AAB and APK files must be valid ZIP archives.",
        );
      }
    } catch {
      errors.push("Unable to read file header for validation");
    }
  }

  return {
    valid: errors.length === 0,
    fileType,
    sizeBytes,
    errors,
    warnings,
  };
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}
