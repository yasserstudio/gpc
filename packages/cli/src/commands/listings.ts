import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

import type { ImageType } from "@gpc-cli/api";
import {
  getListings,
  updateListing,
  deleteListing,
  pullListings,
  pushListings,
  diffListingsEnhanced,
  lintLocalListings,
  analyzeRemoteListings,
  listImages,
  uploadImage,
  deleteImage,
  exportImages,
  syncImages,
  getCountryAvailability,
  formatOutput,
  createSpinner,
  GpcError,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { isInteractive, requireOption, requireConfirm } from "../prompt.js";
import { green, red } from "../colors.js";
import { buildCommitOptions } from "../commit-options.js";

const VALID_IMAGE_TYPES: ImageType[] = [
  "phoneScreenshots",
  "sevenInchScreenshots",
  "tenInchScreenshots",
  "tvScreenshots",
  "wearScreenshots",
  "icon",
  "featureGraphic",
  "tvBanner",
];

function validateImageType(type: string): ImageType {
  if (!VALID_IMAGE_TYPES.includes(type as ImageType)) {
    throw new GpcError(
      `Invalid image type "${type}". Valid types: ${VALID_IMAGE_TYPES.join(", ")}`,
      "LISTINGS_USAGE_ERROR",
      2,
      `Use one of: ${VALID_IMAGE_TYPES.join(", ")}`,
    );
  }
  return type as ImageType;
}

export function registerListingsCommands(program: Command): void {
  const listings = program.command("listings").description("Manage store listings and metadata");

  // Get
  listings
    .command("get")
    .description("Get store listing(s)")
    .option("--lang <language>", "Language code (BCP 47)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getListings(client, packageName, options.lang);
      console.log(formatOutput(result, format));
    });

  // Update
  listings
    .command("update")
    .description("Update a store listing")
    .option("--lang <language>", "Language code (BCP 47)")
    .option("--title <text>", "App title")
    .option("--short <text>", "Short description")
    .option("--full <text>", "Full description")
    .option("--full-file <path>", "Read full description from file")
    .option("--video <url>", "Video URL")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const interactive = isInteractive(program);

      options.lang = await requireOption(
        "lang",
        options.lang,
        {
          message: "Language code (BCP 47):",
          default: "en-US",
        },
        interactive,
      );
      const format = getOutputFormat(program, config);

      const data: Record<string, string> = {};
      if (options["title"]) data["title"] = options["title"];
      if (options["short"]) data["shortDescription"] = options["short"];
      if (options["full"]) data["fullDescription"] = options["full"];
      if (options["fullFile"]) {
        const { readFile } = await import("node:fs/promises");
        data["fullDescription"] = (await readFile(options["fullFile"], "utf-8")).trimEnd();
      }
      if (options["video"]) data["video"] = options["video"];

      if (Object.keys(data).length === 0) {
        throw new GpcError(
          "Provide at least one field to update (--title, --short, --full, --full-file, --video).",
          "LISTINGS_USAGE_ERROR",
          2,
          "Pass at least one of: --title, --short, --full, --full-file, --video",
        );
      }

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "listings update",
            action: "update listing for",
            target: options.lang,
            details: data,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const result = await updateListing(
        client,
        packageName,
        options.lang,
        data,
        buildCommitOptions(options),
      );
      console.log(formatOutput(result, format));
    });

  // Delete
  listings
    .command("delete")
    .description("Delete a store listing for a language")
    .option("--lang <language>", "Language code (BCP 47)")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const interactive = isInteractive(program);

      options.lang = await requireOption(
        "lang",
        options.lang,
        {
          message: "Language code (BCP 47):",
        },
        interactive,
      );

      await requireConfirm(`Delete listing for "${options.lang}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "listings delete",
            action: "delete listing for",
            target: options.lang,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      await deleteListing(client, packageName, options.lang, buildCommitOptions(options));
      console.log(`Listing for "${options.lang}" deleted.`);
    });

  // Pull
  listings
    .command("pull")
    .description("Download listings to Fastlane-format directory")
    .option("--dir <path>", "Target directory (default: metadata)", "metadata")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await pullListings(client, packageName, options.dir);
      console.log(
        formatOutput(
          {
            directory: options.dir,
            languages: result.listings.map((l) => l.language),
            count: result.listings.length,
          },
          format,
        ),
      );
    });

  // Push
  listings
    .command("push")
    .description("Upload listings from Fastlane-format directory")
    .option("--dir <path>", "Source directory (default: metadata)", "metadata")
    .option("--force", "Push even if fields exceed character limits")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const spinner = createSpinner("Pushing listings...");
      if (!program.opts()["quiet"] && process.stderr.isTTY) spinner.start();

      try {
        const dryRun = isDryRun(program);
        const result = await pushListings(client, packageName, options.dir, {
          dryRun,
          force: options.force,
          commitOptions: buildCommitOptions(options),
        });
        spinner.stop(dryRun ? "Dry-run complete (no changes made)" : "Listings pushed");
        console.log(formatOutput(result, format));
      } catch (error) {
        spinner.fail("Push failed");
        throw error;
      }
    });

  // Diff (enhanced: --lang filter, word-level inline diff)
  listings
    .command("diff")
    .description("Compare local Fastlane-format metadata against remote listings")
    .option("--dir <path>", "Local metadata directory", "metadata")
    .option("--lang <language>", "Filter diff to a specific language")
    .option("--word-diff", "Show word-level inline diff for fullDescription")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const diffs = await diffListingsEnhanced(client, packageName, options.dir, {
        lang: options.lang,
        wordLevel: options.wordDiff,
      });

      if (diffs.length === 0) {
        if (format === "json") {
          console.log(formatOutput([], format));
        } else {
          console.log("No differences found.");
        }
        return;
      }

      if (format === "json") {
        console.log(formatOutput(diffs, format));
      } else {
        for (const diff of diffs) {
          const charInfo = (diff as unknown as Record<string, unknown>)["chars"]
            ? ` (${(diff as unknown as Record<string, unknown>)["chars"]} chars)`
            : "";
          console.log(`[${diff.language}] ${diff.field}:${charInfo}`);
          if ((diff as unknown as Record<string, unknown>)["diffSummary"]) {
            console.log(`  ${(diff as unknown as Record<string, unknown>)["diffSummary"]}`);
          } else {
            console.log(green(`  + local:  ${diff.local || "(empty)"}`));
            console.log(red(`  - remote: ${diff.remote || "(empty)"}`));
          }
        }
      }
    });

  // Lint (local, no API)
  listings
    .command("lint")
    .description("Lint local listing metadata for Play Store character limits (no API)")
    .option("--dir <path>", "Metadata directory", "metadata")
    .action(async (options) => {
      const format = getOutputFormat(program, await loadConfig());
      const results = await lintLocalListings(options.dir);
      if (format === "json") {
        console.log(formatOutput(results, format));
        return;
      }
      let hasErrors = false;
      for (const r of results) {
        console.log(`\n[${r.language}]  ${r.valid ? green("✓ valid") : red("✗ over limit")}`);
        const rows = r.fields.map((f) => ({
          field: f.field,
          chars: f.chars,
          limit: f.limit,
          pct: `${f.pct}%`,
          status: f.status === "ok" ? green("✓") : f.status === "warn" ? "⚠" : red("✗"),
        }));
        console.log(formatOutput(rows, "table"));
        if (!r.valid) hasErrors = true;
      }
      if (hasErrors) {
        process.exitCode = 1;
      }
    });

  // Analyze (live, fetches remote)
  listings
    .command("analyze")
    .description("Analyze live Play Store listings for character limit compliance")
    .option("--expected <locales>", "Comma-separated list of expected locale codes")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const spinner = createSpinner("Fetching remote listings...");
      if (!program.opts()["quiet"] && process.stderr.isTTY) spinner.start();

      try {
        const expectedLocales = options.expected
          ? (options.expected as string).split(",").map((s: string) => s.trim())
          : undefined;
        const { results, missingLocales } = await analyzeRemoteListings(client, packageName, {
          expectedLocales,
        });
        spinner.stop("Done");

        if (format === "json") {
          console.log(formatOutput({ results, missingLocales }, format));
          return;
        }

        let hasErrors = false;
        for (const r of results) {
          console.log(`\n[${r.language}]  ${r.valid ? green("✓ valid") : red("✗ over limit")}`);
          const rows = r.fields.map((f) => ({
            field: f.field,
            chars: f.chars,
            limit: f.limit,
            pct: `${f.pct}%`,
            status: f.status === "ok" ? green("✓") : f.status === "warn" ? "⚠" : red("✗"),
          }));
          console.log(formatOutput(rows, "table"));
          if (!r.valid) hasErrors = true;
        }

        if (missingLocales && missingLocales.length > 0) {
          console.log(`\nMissing locales: ${missingLocales.join(", ")}`);
        }

        if (hasErrors) {
          process.exitCode = 1;
        }
      } catch (error) {
        spinner.fail("Analysis failed");
        throw error;
      }
    });

  // Images subcommand
  const images = listings.command("images").description("Manage listing images");

  // Images list
  images
    .command("list")
    .description("List images for a language and type")
    .option("--lang <language>", "Language code (BCP 47)")
    .option("--type <type>", "Image type")
    .option("--limit <n>", "Maximum results to return")
    .option("--next-page <token>", "Pagination token for next page")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const interactive = isInteractive(program);

      options.lang = await requireOption(
        "lang",
        options.lang,
        {
          message: "Language code (BCP 47):",
          default: "en-US",
        },
        interactive,
      );

      options.type = await requireOption(
        "type",
        options.type,
        {
          message: "Image type:",
          choices: VALID_IMAGE_TYPES as unknown as string[],
        },
        interactive,
      );

      const client = await getClient(config);
      const format = getOutputFormat(program, config);
      const imageType = validateImageType(options.type);

      const result = await listImages(client, packageName, options.lang, imageType);
      console.log(formatOutput(result, format));
    });

  // Images upload
  images
    .command("upload <file>")
    .description("Upload an image")
    .option("--lang <language>", "Language code (BCP 47)")
    .option("--type <type>", "Image type")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (file: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const interactive = isInteractive(program);

      options.lang = await requireOption(
        "lang",
        options.lang,
        {
          message: "Language code (BCP 47):",
          default: "en-US",
        },
        interactive,
      );

      options.type = await requireOption(
        "type",
        options.type,
        {
          message: "Image type:",
          choices: VALID_IMAGE_TYPES as unknown as string[],
        },
        interactive,
      );

      const client = await getClient(config);
      const format = getOutputFormat(program, config);
      const imageType = validateImageType(options.type);

      const spinner = createSpinner("Uploading image...");
      if (!program.opts()["quiet"] && process.stderr.isTTY) spinner.start();

      try {
        const result = await uploadImage(
          client,
          packageName,
          options.lang,
          imageType,
          file,
          buildCommitOptions(options),
        );
        spinner.stop("Image uploaded");
        console.log(formatOutput(result, format));
      } catch (error) {
        spinner.fail("Image upload failed");
        throw error;
      }
    });

  // Images delete
  images
    .command("delete")
    .description("Delete an image")
    .option("--lang <language>", "Language code (BCP 47)")
    .option("--type <type>", "Image type")
    .option("--id <imageId>", "Image ID to delete")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const interactive = isInteractive(program);

      options.lang = await requireOption(
        "lang",
        options.lang,
        {
          message: "Language code (BCP 47):",
        },
        interactive,
      );

      options.type = await requireOption(
        "type",
        options.type,
        {
          message: "Image type:",
          choices: VALID_IMAGE_TYPES as unknown as string[],
        },
        interactive,
      );

      options.id = await requireOption(
        "id",
        options.id,
        {
          message: "Image ID to delete:",
        },
        interactive,
      );

      await requireConfirm(`Delete image "${options.id}"?`, program);

      const client = await getClient(config);
      const imageType = validateImageType(options.type);

      await deleteImage(
        client,
        packageName,
        options.lang,
        imageType,
        options.id,
        buildCommitOptions(options),
      );
      console.log(`Image "${options.id}" deleted.`);
    });

  // Images export
  images
    .command("export")
    .description("Export all images to a local directory")
    .option("--dir <path>", "Output directory", "images")
    .option("--lang <language>", "Language code (BCP 47) — export only this language")
    .option("--type <type>", "Image type — export only this type")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const exportOpts: { lang?: string; type?: ImageType } = {};
      if (options.lang) exportOpts.lang = options.lang;
      if (options.type) {
        exportOpts.type = validateImageType(options.type);
      }

      const spinner = createSpinner("Exporting images...");
      if (!program.opts()["quiet"] && process.stderr.isTTY) spinner.start();

      try {
        const result = await exportImages(client, packageName, options.dir, exportOpts);
        spinner.stop("Images exported");
        console.log(formatOutput(result, format));
      } catch (error) {
        spinner.fail("Image export failed");
        throw error;
      }
    });

  images
    .command("sync")
    .description("Sync local images to Google Play by SHA-256 hash (upload only changed)")
    .option("--dir <path>", "Local images directory", "images")
    .option("--lang <language>", "Sync only this language")
    .option("--type <type>", "Sync only this image type", undefined)
    .option("--delete", "Delete remote images not present locally")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (options: Record<string, unknown>) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const imageType = options["type"] ? validateImageType(options["type"] as string) : undefined;

      const result = await syncImages(client, packageName, options["dir"] as string, {
        lang: options["lang"] as string | undefined,
        type: imageType,
        delete: !!options["delete"],
        dryRun: isDryRun(program),
        commitOptions: buildCommitOptions(options),
      });

      if (format === "json") {
        console.log(formatOutput(result, "json"));
        return;
      }

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "listings images sync",
            action: "sync images in",
            target: options["dir"] as string,
            details: result as unknown as Record<string, unknown>,
          },
          format,
          formatOutput,
        );
      }

      if (result.total === 0) {
        console.log("No images found to sync.");
        return;
      }

      const parts: string[] = [];
      if (result.skipped > 0) parts.push(`${result.skipped} skipped (unchanged)`);
      if (result.uploaded > 0) parts.push(`${result.uploaded} uploaded`);
      if (result.deleted > 0) parts.push(`${result.deleted} deleted`);
      console.log(`Synced ${result.total} images: ${parts.join(", ")}`);
    });

  // Availability
  listings
    .command("availability")
    .description("Get country availability for a track")
    .option("--track <track>", "Track name", "production")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getCountryAvailability(client, packageName, options.track);
      const countries = (result as unknown as Record<string, unknown>)["countryTargeting"] as
        | unknown[]
        | undefined;
      if (
        format !== "json" &&
        (!countries || (Array.isArray(countries) && countries.length === 0)) &&
        Object.keys(result as object).length === 0
      ) {
        console.log("No availability data.");
        return;
      }
      console.log(formatOutput(result, format));
    });
}
