import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import type { PlayApiClient, ImageType, EditCommitOptions, Image } from "@gpc-cli/api";
import { PlayApiError } from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import { sha256File } from "../utils/hash.js";
import { validateImage } from "../utils/image-validation.js";
import { validateAndCommit } from "../utils/edit-helpers.js";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

const ALL_IMAGE_TYPES: ImageType[] = [
  "icon",
  "featureGraphic",
  "tvBanner",
  "phoneScreenshots",
  "sevenInchScreenshots",
  "tenInchScreenshots",
  "tvScreenshots",
  "wearScreenshots",
];

export interface ImageSyncOptions {
  lang?: string;
  type?: ImageType;
  delete?: boolean;
  dryRun?: boolean;
  commitOptions?: EditCommitOptions;
}

export interface ImageSyncDetail {
  language: string;
  imageType: ImageType;
  file: string;
  action: "upload" | "skip" | "delete";
  reason?: string;
}

export interface ImageSyncResult {
  uploaded: number;
  skipped: number;
  deleted: number;
  total: number;
  details: ImageSyncDetail[];
}

async function scanLocalImages(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

async function scanLanguages(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export async function syncImages(
  client: PlayApiClient,
  packageName: string,
  dir: string,
  options?: ImageSyncOptions,
): Promise<ImageSyncResult> {
  const details: ImageSyncDetail[] = [];
  let uploaded = 0;
  let skipped = 0;
  let deleted = 0;

  const languages = options?.lang ? [options.lang] : await scanLanguages(dir);
  if (languages.length === 0) {
    throw new GpcError(
      `No language directories found in "${dir}"`,
      "IMAGE_SYNC_EMPTY",
      1,
      "The directory should contain subdirectories named by language code (e.g., en-US/) with image type subdirectories inside.",
    );
  }

  const imageTypes = options?.type ? [options.type] : ALL_IMAGE_TYPES;

  const edit = await client.edits.insert(packageName);
  try {
    for (const language of languages) {
      for (const imageType of imageTypes) {
        const localDir = join(dir, language, imageType);
        const localFiles = await scanLocalImages(localDir);

        let remoteImages: Image[];
        try {
          remoteImages = await client.images.list(packageName, edit.id, language, imageType);
        } catch (error) {
          // 404 means no images for this language/type combo -- treat as empty
          if (error instanceof PlayApiError && error.statusCode === 404) {
            remoteImages = [];
          } else {
            throw error;
          }
        }

        const remoteSha256Set = new Set(remoteImages.map((img) => img.sha256.toLowerCase()));

        const localHashes = new Map<string, string>();
        for (const file of localFiles) {
          const hash = await sha256File(join(localDir, file));
          localHashes.set(file, hash);
        }

        const localSha256Set = new Set(localHashes.values());

        // Delete first when --delete is active (avoids hitting per-type image count limits)
        if (options?.delete) {
          for (const img of remoteImages) {
            if (!localSha256Set.has(img.sha256.toLowerCase())) {
              if (!options?.dryRun) {
                await client.images.delete(packageName, edit.id, language, imageType, img.id);
              }
              deleted++;
              details.push({
                language,
                imageType,
                file: img.id,
                action: "delete",
                reason: "not in local",
              });
            }
          }
        }

        // Upload local files whose hash is not in remote
        for (const file of localFiles) {
          const hash = localHashes.get(file)!;
          if (remoteSha256Set.has(hash)) {
            skipped++;
            details.push({ language, imageType, file, action: "skip", reason: "sha256 match" });
          } else {
            if (!options?.dryRun) {
              const filePath = join(localDir, file);
              const check = await validateImage(filePath, imageType);
              if (!check.valid) {
                throw new GpcError(
                  `Image validation failed for ${language}/${imageType}/${file}: ${check.errors.join("; ")}`,
                  "IMAGE_INVALID",
                  2,
                  "Check image dimensions, file size, and format.",
                );
              }
              await client.images.upload(packageName, edit.id, language, imageType, filePath);
            }
            uploaded++;
            details.push({ language, imageType, file, action: "upload", reason: "new or changed" });
          }
        }
      }
    }

    if (options?.dryRun || (uploaded === 0 && deleted === 0)) {
      await client.edits.delete(packageName, edit.id).catch(() => {});
    } else {
      await validateAndCommit(client, packageName, edit.id, options?.commitOptions);
    }

    return {
      uploaded,
      skipped,
      deleted,
      total: uploaded + skipped + deleted,
      details,
    };
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}
