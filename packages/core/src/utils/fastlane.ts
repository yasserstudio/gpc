import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Listing } from "@gpc-cli/api";

const FILE_MAP: Record<string, keyof Omit<Listing, "language">> = {
  "title.txt": "title",
  "short_description.txt": "shortDescription",
  "full_description.txt": "fullDescription",
  "video.txt": "video",
};

const FIELD_TO_FILE: Record<string, string> = Object.fromEntries(
  Object.entries(FILE_MAP).map(([file, field]) => [field, file]),
);

export interface ListingDiff {
  language: string;
  field: string;
  local: string;
  remote: string;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readListingsFromDir(dir: string): Promise<Listing[]> {
  const listings: Listing[] = [];

  if (!(await exists(dir))) return listings;

  const entries = await readdir(dir);
  for (const lang of entries) {
    const langDir = join(dir, lang);
    const langStat = await stat(langDir);
    if (!langStat.isDirectory()) continue;

    const listing: Listing = {
      language: lang,
      title: "",
      shortDescription: "",
      fullDescription: "",
    };

    for (const [fileName, field] of Object.entries(FILE_MAP)) {
      const filePath = join(langDir, fileName);
      if (await exists(filePath)) {
        const content = await readFile(filePath, "utf-8");
        (listing as unknown as Record<string, string>)[field] = content.trimEnd();
      }
    }

    listings.push(listing);
  }

  return listings;
}

export async function writeListingsToDir(dir: string, listings: Listing[]): Promise<void> {
  for (const listing of listings) {
    const langDir = join(dir, listing.language);
    await mkdir(langDir, { recursive: true });

    for (const [field, fileName] of Object.entries(FIELD_TO_FILE)) {
      const value = (listing as unknown as Record<string, string>)[field];
      if (value !== undefined && value !== "") {
        await writeFile(join(langDir, fileName), value + "\n", "utf-8");
      }
    }
  }
}

export function diffListings(local: Listing[], remote: Listing[]): ListingDiff[] {
  const diffs: ListingDiff[] = [];
  const remoteMap = new Map(remote.map((l) => [l.language, l]));
  const localMap = new Map(local.map((l) => [l.language, l]));

  // Check all local listings against remote
  for (const localListing of local) {
    const remoteListing = remoteMap.get(localListing.language);
    for (const [field] of Object.entries(FIELD_TO_FILE)) {
      const localVal = (
        (localListing as unknown as Record<string, string>)[field] ?? ""
      ).toString();
      const remoteVal = remoteListing
        ? ((remoteListing as unknown as Record<string, string>)[field] ?? "").toString()
        : "";
      if (localVal !== remoteVal) {
        diffs.push({
          language: localListing.language,
          field,
          local: localVal,
          remote: remoteVal,
        });
      }
    }
  }

  // Check for remote-only languages
  for (const remoteListing of remote) {
    if (!localMap.has(remoteListing.language)) {
      for (const [field] of Object.entries(FIELD_TO_FILE)) {
        const remoteVal = (
          (remoteListing as unknown as Record<string, string>)[field] ?? ""
        ).toString();
        if (remoteVal) {
          diffs.push({
            language: remoteListing.language,
            field,
            local: "",
            remote: remoteVal,
          });
        }
      }
    }
  }

  return diffs;
}
