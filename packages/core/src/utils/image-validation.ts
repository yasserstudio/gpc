import { stat } from "node:fs/promises";
import { extname } from "node:path";

export interface ImageValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

// Google Play image size limits
const IMAGE_SIZE_LIMITS: Record<string, { maxBytes: number; label: string }> = {
  icon: { maxBytes: 1024 * 1024, label: "1 MB" },
  featureGraphic: { maxBytes: 1024 * 1024, label: "1 MB" },
  tvBanner: { maxBytes: 1024 * 1024, label: "1 MB" },
  phoneScreenshots: { maxBytes: 8 * 1024 * 1024, label: "8 MB" },
  sevenInchScreenshots: { maxBytes: 8 * 1024 * 1024, label: "8 MB" },
  tenInchScreenshots: { maxBytes: 8 * 1024 * 1024, label: "8 MB" },
  tvScreenshots: { maxBytes: 8 * 1024 * 1024, label: "8 MB" },
  wearScreenshots: { maxBytes: 8 * 1024 * 1024, label: "8 MB" },
};

const VALID_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const LARGE_IMAGE_THRESHOLD = 2 * 1024 * 1024; // 2 MB

export async function validateImage(
  filePath: string,
  imageType?: string,
): Promise<ImageValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check extension
  const ext = extname(filePath).toLowerCase();
  if (!VALID_EXTENSIONS.has(ext)) {
    errors.push(`Unsupported image format "${ext}". Use PNG or JPEG.`);
  }

  // Check file exists and size
  let sizeBytes = 0;
  try {
    const stats = await stat(filePath);
    sizeBytes = stats.size;

    if (sizeBytes === 0) {
      errors.push("Image file is empty (0 bytes)");
    }
  } catch {
    errors.push(`Image file not found: ${filePath}`);
    return { valid: false, errors, warnings };
  }

  // Check size limits per image type
  if (imageType && sizeBytes > 0) {
    const limit = IMAGE_SIZE_LIMITS[imageType];
    if (limit && sizeBytes > limit.maxBytes) {
      errors.push(`Image exceeds ${limit.label} limit for ${imageType} (${formatSize(sizeBytes)})`);
    }
  }

  // Warn about large images
  if (sizeBytes > LARGE_IMAGE_THRESHOLD && errors.length === 0) {
    warnings.push(
      `Large image (${formatSize(sizeBytes)}). Consider optimizing for faster upload and better store performance.`,
    );
  }

  // PNG optimization warning
  if (ext === ".png" && sizeBytes > 512 * 1024) {
    warnings.push("PNG file is over 512 KB. Consider compressing with tools like pngquant or optipng.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
