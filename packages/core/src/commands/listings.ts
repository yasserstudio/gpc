import type {
  PlayApiClient,
  Listing,
  Image,
  ImageType,
  AppDetails,
  CountryAvailability,
} from "@gpc-cli/api";
import { isValidBcp47 } from "../utils/bcp47.js";
import { validateImage } from "../utils/image-validation.js";
import { readListingsFromDir, writeListingsToDir, diffListings } from "../utils/fastlane.js";
import type { ListingDiff } from "../utils/fastlane.js";

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
    throw new Error(`Invalid language tag "${lang}". Must be a valid Google Play BCP 47 code.`);
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
): Promise<Listing> {
  validateLanguage(language);
  const edit = await client.edits.insert(packageName);
  try {
    const listing = await client.listings.patch(packageName, edit.id, language, data);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
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
): Promise<void> {
  validateLanguage(language);
  const edit = await client.edits.insert(packageName);
  try {
    await client.listings.delete(packageName, edit.id, language);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
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

export async function pushListings(
  client: PlayApiClient,
  packageName: string,
  dir: string,
  options?: { dryRun?: boolean },
): Promise<PushResult | DryRunResult> {
  const localListings = await readListingsFromDir(dir);

  if (localListings.length === 0) {
    throw new Error(`No listings found in directory "${dir}"`);
  }

  // Validate all languages
  for (const listing of localListings) {
    validateLanguage(listing.language);
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

    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);

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
): Promise<Image> {
  validateLanguage(language);

  // Validate image before upload
  const imageCheck = await validateImage(filePath, imageType);
  if (!imageCheck.valid) {
    throw new Error(`Image validation failed: ${imageCheck.errors.join("; ")}`);
  }
  if (imageCheck.warnings.length > 0) {
    for (const w of imageCheck.warnings) {
      console.warn(`Warning: ${w}`);
    }
  }

  const edit = await client.edits.insert(packageName);
  try {
    const image = await client.images.upload(packageName, edit.id, language, imageType, filePath);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
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
): Promise<void> {
  validateLanguage(language);
  const edit = await client.edits.insert(packageName);
  try {
    await client.images.delete(packageName, edit.id, language, imageType, imageId);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
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

export async function updateAppDetails(
  client: PlayApiClient,
  packageName: string,
  details: Partial<AppDetails>,
): Promise<AppDetails> {
  const edit = await client.edits.insert(packageName);
  try {
    const result = await client.details.patch(packageName, edit.id, details);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
    return result;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}
