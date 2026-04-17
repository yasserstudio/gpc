import type { PlayApiClient } from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import { isValidBcp47 } from "../utils/bcp47.js";

export interface ResolveLocalesOptions {
  client?: PlayApiClient;
  packageName?: string;
}

export async function resolveLocales(
  input: string,
  options: ResolveLocalesOptions = {},
): Promise<string[]> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new GpcError(
      "--locales is empty",
      "CHANGELOG_LOCALES_REQUIRED",
      2,
      "Pass a comma-separated list (e.g., --locales en-US,fr-FR) or --locales auto.",
    );
  }

  if (trimmed === "auto") {
    const { client, packageName } = options;
    if (!client || !packageName) {
      throw new GpcError(
        "--locales auto requires an authenticated API client and --app",
        "CHANGELOG_LOCALES_AUTO_NO_APP",
        2,
        "Pass --app <package> or set config.app, and ensure credentials are configured.",
      );
    }
    const edit = await client.edits.insert(packageName);
    try {
      const listings = await client.listings.list(packageName, edit.id);
      await client.edits.delete(packageName, edit.id);
      const langs = listings.map((l) => l.language);
      if (langs.length === 0) {
        throw new GpcError(
          `No Play Store listings found for ${packageName}`,
          "CHANGELOG_LOCALES_EMPTY",
          1,
          "Create at least one listing in Play Console, or pass --locales explicitly.",
        );
      }
      return langs;
    } catch (error) {
      await client.edits.delete(packageName, edit.id).catch(() => {});
      throw error;
    }
  }

  const locales = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (locales.length === 0) {
    throw new GpcError(
      "--locales parsed to an empty list",
      "CHANGELOG_LOCALES_REQUIRED",
      2,
      "Pass a comma-separated list (e.g., --locales en-US,fr-FR) or --locales auto.",
    );
  }

  const invalid = locales.filter((l) => !isValidBcp47(l));
  if (invalid.length > 0) {
    throw new GpcError(
      `Invalid locale(s): ${invalid.join(", ")}`,
      "CHANGELOG_LOCALES_INVALID",
      2,
      "Use BCP 47 codes recognized by Google Play (e.g., en-US, fr-FR, de-DE).",
    );
  }

  return locales;
}
