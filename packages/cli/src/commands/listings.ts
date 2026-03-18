import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import type { ImageType } from "@gpc-cli/api";
import {
  getListings,
  updateListing,
  deleteListing,
  pullListings,
  pushListings,
  diffListingsCommand,
  listImages,
  uploadImage,
  deleteImage,
  exportImages,
  getCountryAvailability,
  formatOutput,
  createSpinner,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { isInteractive, requireOption, requireConfirm } from "../prompt.js";
import { green, red } from "../colors.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth });
}

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
    console.error(`Error: Invalid image type "${type}".`);
    console.error(`Valid types: ${VALID_IMAGE_TYPES.join(", ")}`);
    process.exit(2);
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

      try {
        const result = await getListings(client, packageName, options.lang);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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

      try {
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
          console.error(
            "Error: Provide at least one field to update (--title, --short, --full, --full-file, --video).",
          );
          process.exit(2);
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
        const result = await updateListing(client, packageName, options.lang, data);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Delete
  listings
    .command("delete")
    .description("Delete a store listing for a language")
    .option("--lang <language>", "Language code (BCP 47)")
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

      try {
        await deleteListing(client, packageName, options.lang);
        console.log(`Listing for "${options.lang}" deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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

      try {
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
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Push
  listings
    .command("push")
    .description("Upload listings from Fastlane-format directory")
    .option("--dir <path>", "Source directory (default: metadata)", "metadata")
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
        });
        spinner.stop(dryRun ? "Dry-run complete (no changes made)" : "Listings pushed");
        console.log(formatOutput(result, format));
      } catch (error) {
        spinner.fail("Push failed");
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Diff
  listings
    .command("diff")
    .description("Compare local Fastlane-format metadata against remote listings")
    .option("--dir <path>", "Local metadata directory", "metadata")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const diffs = await diffListingsCommand(client, packageName, options.dir);

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
            console.log(`[${diff.language}] ${diff.field}:`);
            console.log(green(`+ local:  ${diff.local || "(empty)"}`));
            console.log(red(`- remote: ${diff.remote || "(empty)"}`));
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
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

      try {
        const result = await listImages(client, packageName, options.lang, imageType);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Images upload
  images
    .command("upload <file>")
    .description("Upload an image")
    .option("--lang <language>", "Language code (BCP 47)")
    .option("--type <type>", "Image type")
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
        const result = await uploadImage(client, packageName, options.lang, imageType, file);
        spinner.stop("Image uploaded");
        console.log(formatOutput(result, format));
      } catch (error) {
        spinner.fail("Image upload failed");
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Images delete
  images
    .command("delete")
    .description("Delete an image")
    .option("--lang <language>", "Language code (BCP 47)")
    .option("--type <type>", "Image type")
    .option("--id <imageId>", "Image ID to delete")
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

      try {
        await deleteImage(client, packageName, options.lang, imageType, options.id);
        console.log(`Image "${options.id}" deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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

      try {
        const result = await getCountryAvailability(client, packageName, options.track);
        const countries = (result as Record<string, unknown>)["countryTargeting"] as unknown[] | undefined;
        if (format !== "json" && (!countries || (Array.isArray(countries) && countries.length === 0)) && Object.keys(result as object).length === 0) {
          console.log("No availability data.");
          return;
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
