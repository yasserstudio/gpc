import type {
  PlayApiClient,
  Listing,
  Image,
  ImageType,
  AppDetails,
  CountryAvailability,
  EditCommitOptions,
} from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import { isValidBcp47 } from "../utils/bcp47.js";
import { validateImage } from "../utils/image-validation.js";
import { validateAndCommit } from "../utils/edit-helpers.js";
import { readListingsFromDir, writeListingsToDir, diffListings } from "../utils/fastlane.js";
import type { ListingDiff } from "../utils/fastlane.js";
import { lintListings, wordDiff, formatWordDiff } from "../utils/listing-text.js";
import type { ListingLintResult } from "../utils/listing-text.js";

export interface ListingsResult {
  listings: Listing[];
}

export interface PushResult {
  updated: number;
  languages: string[];
}

export interface DryRunResult {
  diffs: ListingDiff[];
}

function validateLanguage(lang: string): void {
  if (!isValidBcp47(lang)) {
    throw new GpcError(
      `Invalid language tag "${lang}". Must be a valid Google Play BCP 47 code.`,
      "LISTING_INVALID_LANGUAGE",
      2,
      "Use a valid BCP 47 language code such as en-US, de-DE, or ja-JP. See the Google Play Console for supported language codes.",
    );
  }
}

export async function getListings(
  client: PlayApiClient,
  packageName: string,
  language?: string,
): Promise<Listing[]> {
  const edit = await client.edits.insert(packageName);
  try {
    let listings: Listing[];
    if (language) {
      validateLanguage(language);
      const listing = await client.listings.get(packageName, edit.id, language);
      listings = [listing];
    } else {
      listings = await client.listings.list(packageName, edit.id);
    }
    await client.edits.delete(packageName, edit.id);
    return listings;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function updateListing(
  client: PlayApiClient,
  packageName: string,
  language: string,
  data: Partial<Omit<Listing, "language">>,
  commitOptions?: EditCommitOptions,
): Promise<Listing> {
  validateLanguage(language);
  const edit = await client.edits.insert(packageName);
  try {
    const listing = await client.listings.patch(packageName, edit.id, language, data);
    await validateAndCommit(client, packageName, edit.id, commitOptions);
    return listing;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function deleteListing(
  client: PlayApiClient,
  packageName: string,
  language: string,
  commitOptions?: EditCommitOptions,
): Promise<void> {
  validateLanguage(language);
  const edit = await client.edits.insert(packageName);
  try {
    await client.listings.delete(packageName, edit.id, language);
    await validateAndCommit(client, packageName, edit.id, commitOptions);
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function pullListings(
  client: PlayApiClient,
  packageName: string,
  dir: string,
): Promise<ListingsResult> {
  const edit = await client.edits.insert(packageName);
  try {
    const listings = await client.listings.list(packageName, edit.id);
    await client.edits.delete(packageName, edit.id);
    await writeListingsToDir(dir, listings);
    return { listings };
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

/** Lint local listing directory against Play Store character limits (no API call). */
export async function lintLocalListings(dir: string): Promise<ListingLintResult[]> {
  const localListings = await readListingsFromDir(dir);
  return lintListings(
    localListings.map((l) => ({
      language: l.language,
      fields: {
        title: l.title,
        shortDescription: l.shortDescription,
        fullDescription: l.fullDescription,
        video: l.video,
      },
    })),
  );
}

/** Analyze live Play Store listings for character limit compliance (requires API). */
export async function analyzeRemoteListings(
  client: PlayApiClient,
  packageName: string,
  options?: { expectedLocales?: string[] },
): Promise<{ results: ListingLintResult[]; missingLocales?: string[] }> {
  const listings = await getListings(client, packageName);

  const results = lintListings(
    listings.map((l) => ({
      language: l.language,
      fields: {
        title: l.title,
        shortDescription: l.shortDescription,
        fullDescription: l.fullDescription,
        video: (l as unknown as Record<string, unknown>)["video"] as string | undefined,
      },
    })),
  );

  let missingLocales: string[] | undefined;
  if (options?.expectedLocales) {
    const present = new Set(listings.map((l) => l.language));
    missingLocales = options.expectedLocales.filter((loc) => !present.has(loc));
  }

  return { results, missingLocales };
}

/** Enhanced diff: word-level inline diff for fullDescription, optional language filter. */
export async function diffListingsEnhanced(
  client: PlayApiClient,
  packageName: string,
  dir: string,
  options?: { lang?: string; wordLevel?: boolean },
): Promise<ListingDiff[]> {
  const allDiffs = await diffListingsCommand(client, packageName, dir);
  let result = allDiffs;
  if (options?.lang) {
    result = allDiffs.filter((d) => d.language === options.lang);
  }
  if (options?.wordLevel) {
    return result.map((d) => {
      if (d.field === "fullDescription" && d.local && d.remote) {
        const diff = wordDiff(d.remote, d.local);
        return { ...d, diffSummary: formatWordDiff(diff) };
      }
      return d;
    });
  }
  return result;
}

export async function pushListings(
  client: PlayApiClient,
  packageName: string,
  dir: string,
  options?: { dryRun?: boolean; force?: boolean; commitOptions?: EditCommitOptions },
): Promise<PushResult | DryRunResult> {
  const localListings = await readListingsFromDir(dir);

  if (localListings.length === 0) {
    throw new GpcError(
      `No listings found in directory "${dir}"`,
      "LISTING_DIR_EMPTY",
      1,
      `The directory must contain subdirectories named by language code (e.g., en-US/) with listing metadata files. Pull existing listings first with: gpc listings pull --dir "${dir}"`,
    );
  }

  // Validate all languages
  for (const listing of localListings) {
    validateLanguage(listing.language);
  }

  // Preflight lint: block push if any field exceeds limits (unless --force)
  if (!options?.force) {
    const lintResults = lintListings(
      localListings.map((l) => ({
        language: l.language,
        fields: {
          title: l.title,
          shortDescription: l.shortDescription,
          fullDescription: l.fullDescription,
          video: (l as unknown as Record<string, unknown>)["video"] as string | undefined,
        },
      })),
    );
    const overLimit = lintResults.filter((r) => !r.valid);
    if (overLimit.length > 0) {
      const details = overLimit
        .map((r) => {
          const over = r.fields.filter((f) => f.status === "over");
          return `${r.language}: ${over.map((f) => `${f.field} (${f.chars}/${f.limit})`).join(", ")}`;
        })
        .join("\n");
      throw new GpcError(
        `Listing push blocked: field(s) exceed character limits:\n${details}`,
        "LISTING_CHAR_LIMIT_EXCEEDED",
        1,
        "Fix the character limit violations listed above, or use --force to push anyway.",
      );
    }
  }

  const edit = await client.edits.insert(packageName);
  try {
    if (options?.dryRun) {
      const remoteListings = await client.listings.list(packageName, edit.id);
      await client.edits.delete(packageName, edit.id);
      const diffs = diffListings(localListings, remoteListings);
      return { diffs };
    }

    for (const listing of localListings) {
      const { language, ...data } = listing;
      await client.listings.update(packageName, edit.id, language, data);
    }

    await validateAndCommit(client, packageName, edit.id, options?.commitOptions);

    return {
      updated: localListings.length,
      languages: localListings.map((l) => l.language),
    };
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function listImages(
  client: PlayApiClient,
  packageName: string,
  language: string,
  imageType: ImageType,
): Promise<Image[]> {
  validateLanguage(language);
  const edit = await client.edits.insert(packageName);
  try {
    const images = await client.images.list(packageName, edit.id, language, imageType);
    await client.edits.delete(packageName, edit.id);
    return images;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function uploadImage(
  client: PlayApiClient,
  packageName: string,
  language: string,
  imageType: ImageType,
  filePath: string,
  commitOptions?: EditCommitOptions,
): Promise<Image> {
  validateLanguage(language);

  // Validate image before upload
  const imageCheck = await validateImage(filePath, imageType);
  if (!imageCheck.valid) {
    throw new GpcError(
      `Image validation failed: ${imageCheck.errors.join("; ")}`,
      "IMAGE_INVALID",
      2,
      "Check image dimensions, file size, and format. Google Play requires PNG or JPEG images within specific size limits per image type.",
    );
  }
  for (const w of imageCheck.warnings) {
    process.emitWarning?.(w, "ImageUploadWarning");
  }

  const edit = await client.edits.insert(packageName);
  try {
    const image = await client.images.upload(packageName, edit.id, language, imageType, filePath);
    await validateAndCommit(client, packageName, edit.id, commitOptions);
    return image;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function deleteImage(
  client: PlayApiClient,
  packageName: string,
  language: string,
  imageType: ImageType,
  imageId: string,
  commitOptions?: EditCommitOptions,
): Promise<void> {
  validateLanguage(language);
  const edit = await client.edits.insert(packageName);
  try {
    await client.images.delete(packageName, edit.id, language, imageType, imageId);
    await validateAndCommit(client, packageName, edit.id, commitOptions);
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function diffListingsCommand(
  client: PlayApiClient,
  packageName: string,
  dir: string,
): Promise<ListingDiff[]> {
  const localListings = await readListingsFromDir(dir);

  const edit = await client.edits.insert(packageName);
  try {
    const remoteListings = await client.listings.list(packageName, edit.id);
    await client.edits.delete(packageName, edit.id);
    return diffListings(localListings, remoteListings);
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function getCountryAvailability(
  client: PlayApiClient,
  packageName: string,
  track: string,
): Promise<CountryAvailability> {
  const edit = await client.edits.insert(packageName);
  try {
    const availability = await client.countryAvailability.get(packageName, edit.id, track);
    await client.edits.delete(packageName, edit.id);
    return availability;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export interface ExportImagesOptions {
  lang?: string;
  type?: ImageType;
}

export interface ExportImagesSummary {
  languages: number;
  images: number;
  totalSize: number;
}

const ALL_IMAGE_TYPES: ImageType[] = [
  "phoneScreenshots",
  "sevenInchScreenshots",
  "tenInchScreenshots",
  "tvScreenshots",
  "wearScreenshots",
  "icon",
  "featureGraphic",
  "tvBanner",
];

export async function exportImages(
  client: PlayApiClient,
  packageName: string,
  dir: string,
  options?: ExportImagesOptions,
): Promise<ExportImagesSummary> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const edit = await client.edits.insert(packageName);
  try {
    // Determine languages
    let languages: string[];
    if (options?.lang) {
      validateLanguage(options.lang);
      languages = [options.lang];
    } else {
      const listings = await client.listings.list(packageName, edit.id);
      languages = listings.map((l) => l.language);
    }

    const imageTypes: ImageType[] = options?.type ? [options.type] : ALL_IMAGE_TYPES;

    let totalImages = 0;
    let totalSize = 0;

    // Collect all download tasks
    const tasks: Array<{ language: string; imageType: ImageType; url: string; index: number }> = [];

    for (const language of languages) {
      for (const imageType of imageTypes) {
        const images = await client.images.list(packageName, edit.id, language, imageType);
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img && img.url) {
            tasks.push({ language, imageType, url: img.url, index: i + 1 });
          }
        }
      }
    }

    // Process downloads with concurrency limit of 5
    const concurrency = 5;
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (task) => {
          const dirPath = join(dir, task.language, task.imageType);
          await mkdir(dirPath, { recursive: true });

          const response = await fetch(task.url);
          if (!response.ok) {
            throw new GpcError(
              `Failed to download image: HTTP ${response.status} for ${task.imageType} (${task.language})`,
              "LISTINGS_IMAGE_DOWNLOAD_FAILED",
              4,
              "Check that the image URL is still valid. Re-run the export to retry.",
            );
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const filePath = join(dirPath, `${task.index}.png`);
          await writeFile(filePath, buffer);

          return buffer.length;
        }),
      );

      for (const size of results) {
        totalImages++;
        totalSize += size;
      }
    }

    await client.edits.delete(packageName, edit.id);

    return {
      languages: languages.length,
      images: totalImages,
      totalSize,
    };
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function updateAppDetails(
  client: PlayApiClient,
  packageName: string,
  details: Partial<AppDetails>,
  commitOptions?: EditCommitOptions,
): Promise<AppDetails> {
  const edit = await client.edits.insert(packageName);
  try {
    const result = await client.details.patch(packageName, edit.id, details);
    await validateAndCommit(client, packageName, edit.id, commitOptions);
    return result;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}
