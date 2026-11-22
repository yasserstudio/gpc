import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { Argument, Option } from "commander";
import { loadConfig } from "@gpc-cli/config";

import type { Subscription, BasePlanMigratePricesRequest, SubscriptionOffer } from "@gpc-cli/api";
import {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  activateBasePlan,
  deactivateBasePlan,
  deleteBasePlan,
  migratePrices,
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  activateOffer,
  deactivateOffer,
  diffSubscription,
  getSubscriptionAnalytics,
  formatOutput,
  sortResults,
  maybePaginate,
  annotateListResult,
  moreResultsFooter,
  retentionOfferTemplate,
  prepareRetentionOffer,
  prepareRetentionOfferUpdate,
  parseRetentionFlags,
  parseRetentionUpdateFlags,
  GpcError,
} from "@gpc-cli/core";
import type { RetentionFlagInput, RetentionUpdateInput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";
import { readJsonFile } from "../json.js";

interface OfferCreateOptions {
  file?: string;
  retention?: "cohort" | "per-user";
  offerId?: string;
  discount?: string;
  periods?: string;
  minDuration?: string;
  multipleClaims?: boolean;
  cooldown?: string;
  regions?: string;
  start?: string;
  end?: string;
  activate?: boolean;
  regionsVersion?: string;
}

interface OfferUpdateOptions {
  file?: string;
  updateMask?: string;
  start?: string;
  end?: string;
  minDuration?: string;
  multipleClaims?: boolean;
  cooldown?: string;
  regionsVersion?: string;
}

function usageError(message: string, suggestion: string): GpcError {
  return new GpcError(message, "USAGE_ERROR", 2, suggestion);
}

const CREATE_RETENTION_FLAGS: [keyof OfferCreateOptions, string][] = [
  ["offerId", "--offer-id"],
  ["discount", "--discount"],
  ["periods", "--periods"],
  ["minDuration", "--min-duration"],
  ["multipleClaims", "--multiple-claims"],
  ["cooldown", "--cooldown"],
  ["regions", "--regions"],
  ["start", "--start"],
  ["end", "--end"],
];

/** An offer comes from a JSON file or from flags, never both. */
type OfferSource<T> = { file: string; flags?: undefined } | { file?: undefined; flags: T };

/** Pick `--file` or `--retention` for offers create. Throws a usage error on a bad mix. */
function retentionCreateInput(options: OfferCreateOptions): OfferSource<RetentionFlagInput> {
  const used = CREATE_RETENTION_FLAGS.filter(([key]) => options[key] !== undefined).map(
    ([, flag]) => flag,
  );
  if (options.file !== undefined) {
    if (options.retention !== undefined || used.length > 0) {
      const flags = options.retention !== undefined ? ["--retention", ...used] : used;
      throw usageError(
        `--file cannot be used with ${flags.join(", ")}.`,
        "Use --file for an offer written as JSON, or --retention to build a retention offer from flags.",
      );
    }
    return { file: options.file };
  }
  if (options.retention === undefined) {
    if (used.length > 0) {
      throw usageError(
        `These flags need --retention cohort or --retention per-user: ${used.join(", ")}.`,
        "Add --retention, or use --file for other offer types.",
      );
    }
    throw usageError(
      "Give --file or --retention.",
      "Use --file offer.json, or build a retention offer with --retention cohort --offer-id <id> --discount 0.5.",
    );
  }
  const { offerId, discount } = options;
  if (offerId === undefined || discount === undefined) {
    const missing = [offerId === undefined && "--offer-id", discount === undefined && "--discount"];
    throw usageError(
      `--retention needs ${missing.filter(Boolean).join(" and ")}.`,
      "For example: --retention cohort --offer-id winback --discount 0.5",
    );
  }
  return {
    flags: {
      kind: options.retention,
      offerId,
      discount,
      periods: options.periods,
      minDuration: options.minDuration,
      multipleClaims: options.multipleClaims,
      cooldown: options.cooldown,
      regions: options.regions,
      start: options.start,
      end: options.end,
    },
  };
}

const UPDATE_RETENTION_FLAGS: [keyof RetentionUpdateInput, string][] = [
  ["start", "--start"],
  ["end", "--end"],
  ["minDuration", "--min-duration"],
  ["multipleClaims", "--multiple-claims"],
  ["cooldown", "--cooldown"],
];

/** Pick `--file` or flags for offers update. Throws a usage error on a bad mix. */
function retentionUpdateInput(options: OfferUpdateOptions): OfferSource<RetentionUpdateInput> {
  const used = UPDATE_RETENTION_FLAGS.filter(([key]) => options[key] !== undefined).map(
    ([, flag]) => flag,
  );
  if (used.length === 0) {
    if (options.file === undefined) {
      throw usageError(
        "Give --file, or at least one of --start, --end, --min-duration, --multiple-claims, --cooldown.",
        "Use --file offer.json to update any field, or a flag to change one setting.",
      );
    }
    return { file: options.file };
  }
  if (options.file !== undefined) {
    throw usageError(
      `--file cannot be used with ${used.join(", ")}.`,
      "Use --file for a JSON offer, or the flags alone.",
    );
  }
  if (options.updateMask !== undefined) {
    throw usageError(
      `--update-mask cannot be used with ${used.join(", ")}.`,
      "The flags set the update mask. Remove --update-mask.",
    );
  }
  return {
    flags: {
      start: options.start,
      end: options.end,
      minDuration: options.minDuration,
      multipleClaims: options.multipleClaims,
      cooldown: options.cooldown,
    },
  };
}

export function registerSubscriptionsCommands(program: Command): void {
  const subs = program.command("subscriptions").description("Manage subscriptions and base plans");

  subs
    .command("list")
    .description("List subscriptions")
    .addOption(new Option("--page-size <n>", "Results per page").argParser(parseInt).hideHelp())
    .addOption(new Option("--page-token <token>", "Page token").hideHelp())
    .option("--limit <n>", "Maximum total results", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await listSubscriptions(client, packageName, {
        pageSize: options.pageSize,
        pageToken: options.pageToken,
        limit: options.limit,
        nextPage: options.nextPage,
      });
      if (options.sort) {
        result.subscriptions = sortResults(result.subscriptions, options.sort);
      }
      const subs = result.subscriptions || [];
      if (format !== "json") {
        if (subs.length === 0) {
          console.log("No subscriptions found.");
          return;
        }
        const summary = subs.map((s: Subscription) => ({
          productId: s.productId,
          basePlans: s.basePlans?.length || 0,
          listings: s.listings ? s.listings.length : 0,
          firstBasePlanState: s.basePlans?.[0]?.state || "-",
        }));
        await maybePaginate(formatOutput(summary, format));
        const footer = moreResultsFooter(result.nextPageToken);
        if (footer) console.log(footer);
      } else {
        await maybePaginate(
          formatOutput(
            annotateListResult(
              { ...result, subscriptions: subs },
              "subscriptions",
              "No subscriptions found",
            ),
            format,
          ),
        );
      }
    });

  subs
    .command("get <product-id>")
    .description("Get a subscription")
    .action(async (productId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getSubscription(client, packageName, productId);
      if (format !== "json") {
        const s = result as unknown as Record<string, unknown>;
        const basePlans = s["basePlans"] as Array<Record<string, unknown>> | undefined;
        const listings = s["listings"] as
          Record<string, unknown> | Array<Record<string, unknown>> | undefined;
        const listingLanguages = listings
          ? Array.isArray(listings)
            ? listings.map((l) => l["languageCode"] || l["language"] || "?").join(", ")
            : Object.keys(listings).join(", ")
          : "-";
        const listingCount = listings
          ? Array.isArray(listings)
            ? listings.length
            : Object.keys(listings).length
          : 0;
        const summary = {
          productId: s["productId"],
          basePlans: basePlans?.length || 0,
          basePlanIds: basePlans?.map((bp) => bp["basePlanId"]).join(", ") || "-",
          listings: listingCount,
          listingLanguages,
          taxCategory: (s["taxAndComplianceSettings"] as Record<string, unknown>)?.[
            "taxRateInfoByRegionCode"
          ]
            ? "configured"
            : "-",
        };
        console.log(formatOutput(summary, format));
      } else {
        console.log(formatOutput(result, format));
      }
    });

  subs
    .command("create")
    .description("Create a subscription from JSON file")
    .requiredOption("--file <path>", "JSON file with subscription data")
    .option("--activate", "Activate all base plans after creation")
    .option("--regions-version <version>", "Regional pricing version (default 2022/02)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions create",
            action: "create",
            target: `subscription from ${options.file}`,
            details: {
              ...(options.activate ? { activate: true } : {}),
              ...(options.regionsVersion ? { regionsVersion: options.regionsVersion } : {}),
            },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const data = await readJsonFile(options.file);
      const result = await createSubscription(
        client,
        packageName,
        data as Subscription,
        options.regionsVersion,
      );

      if (options.activate && result.basePlans) {
        for (const bp of result.basePlans) {
          if (bp.state === "DRAFT") {
            await activateBasePlan(client, packageName, result.productId, bp.basePlanId);
            console.error(`Activated base plan: ${bp.basePlanId}`);
          }
        }
        // Re-fetch to get updated state
        const updated = await getSubscription(client, packageName, result.productId);
        console.log(formatOutput(updated, format));
      } else {
        console.log(formatOutput(result, format));
      }
    });

  subs
    .command("update <product-id>")
    .description("Update a subscription from JSON file")
    .requiredOption("--file <path>", "JSON file with subscription data")
    .option("--update-mask <fields>", "Comma-separated field mask")
    .option("--regions-version <version>", "Regional pricing version (default 2022/02)")
    .action(async (productId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions update",
            action: "update",
            target: productId,
            details: {
              file: options.file,
              updateMask: options.updateMask,
              ...(options.regionsVersion ? { regionsVersion: options.regionsVersion } : {}),
            },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const data = await readJsonFile(options.file);
      const result = await updateSubscription(
        client,
        packageName,
        productId,
        data as Subscription,
        options.updateMask,
        options.regionsVersion,
      );
      console.log(formatOutput(result, format));
    });

  subs
    .command("delete <product-id>")
    .description("Delete a subscription")
    .action(async (productId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Delete subscription "${productId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "subscriptions delete",
            action: "delete",
            target: productId,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      await deleteSubscription(client, packageName, productId);
      console.log(`Subscription ${productId} deleted.`);
    });

  // --- Base Plans ---
  const basePlans = subs.command("base-plans").description("Manage base plans");

  basePlans
    .command("activate <product-id> <base-plan-id>")
    .description("Activate a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions base-plans activate",
            action: "activate",
            target: `${productId}/${basePlanId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await activateBasePlan(client, packageName, productId, basePlanId);
      console.log(formatOutput(result, format));
    });

  basePlans
    .command("deactivate <product-id> <base-plan-id>")
    .description("Deactivate a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions base-plans deactivate",
            action: "deactivate",
            target: `${productId}/${basePlanId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await deactivateBasePlan(client, packageName, productId, basePlanId);
      console.log(formatOutput(result, format));
    });

  basePlans
    .command("delete <product-id> <base-plan-id>")
    .description("Delete a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(
        `Delete base plan "${basePlanId}" from subscription "${productId}"?`,
        program,
      );

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "subscriptions base-plans delete",
            action: "delete",
            target: `${productId}/${basePlanId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      await deleteBasePlan(client, packageName, productId, basePlanId);
      console.log(`Base plan ${basePlanId} deleted.`);
    });

  basePlans
    .command("migrate-prices <product-id> <base-plan-id>")
    .description("Migrate base plan prices")
    .requiredOption("--file <path>", "JSON file with migration data")
    .action(
      async (
        productId: string,
        basePlanId: string,
        options: { file: string; updateMask?: string },
      ) => {
        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const format = getOutputFormat(program, config);

        if (isDryRun(program)) {
          printDryRun(
            {
              command: "subscriptions base-plans migrate-prices",
              action: "migrate prices for",
              target: `${productId}/${basePlanId}`,
              details: { file: options.file },
            },
            format,
            formatOutput,
          );
          return;
        }

        const client = await getClient(config);

        const data = await readJsonFile(options.file);
        await migratePrices(
          client,
          packageName,
          productId,
          basePlanId,
          data as BasePlanMigratePricesRequest,
        );
        console.log(formatOutput({ success: true }, format));
      },
    );

  // --- Offers ---
  const offers = subs.command("offers").description("Manage subscription offers");

  offers
    .command("list <product-id> <base-plan-id>")
    .description("List offers for a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await listOffers(client, packageName, productId, basePlanId);
      const offers_list = (result as unknown as Record<string, unknown>)["subscriptionOffers"] as
        Array<Record<string, unknown>> | undefined;
      if (format !== "json") {
        if (!offers_list || offers_list.length === 0) {
          console.log("No offers found.");
          return;
        }
        const summary = offers_list.map((o) => ({
          offerId: o["offerId"],
          basePlanId: o["basePlanId"],
          state: o["state"] || "-",
          phases: (o["phases"] as unknown[])?.length || 0,
          regionalConfigs: (o["regionalConfigs"] as unknown[])?.length || 0,
        }));
        console.log(formatOutput(summary, format));
      } else {
        console.log(formatOutput(result, format));
      }
    });

  offers
    .command("template")
    .description("Print starter JSON for `offers create --file` (offline, no API call)")
    .addArgument(new Argument("<kind>", "Offer kind").choices(["retention"]))
    .option("--per-user", "Per-user retention offer (retentionPerUserRule) instead of cohort")
    .action((_kind: string, options: { perUser?: boolean }) => {
      console.log(JSON.stringify(retentionOfferTemplate(options.perUser === true), null, 2));
    });

  offers
    .command("get <product-id> <base-plan-id> <offer-id>")
    .description("Get an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getOffer(client, packageName, productId, basePlanId, offerId);
      console.log(formatOutput(result, format));
    });

  offers
    .command("create <product-id> <base-plan-id>")
    .description("Create an offer from a JSON file, or a retention offer from flags")
    .option("--file <path>", "JSON file with offer data")
    .addOption(
      new Option("--retention <kind>", "Build a retention offer from flags").choices([
        "cohort",
        "per-user",
      ]),
    )
    .option("--offer-id <id>", "Offer ID (with --retention)")
    .option(
      "--discount <fraction>",
      "Discount as a fraction, e.g. 0.5 for 50% off (with --retention)",
    )
    .option("--periods <n>", "Billing periods the discount lasts (default 1)")
    .option("--min-duration <days>", "Days subscribed before the offer shows, e.g. 90d (cohort)")
    .option("--multiple-claims", "Let a user claim the offer more than once (cohort)")
    .option("--cooldown <days>", "Days between claims, e.g. 180d (cohort, with --multiple-claims)")
    .option("--regions <codes>", "Comma-separated region codes (default: all base plan regions)")
    .option("--start <time>", "RFC 3339 time the offer becomes available")
    .option("--end <time>", "RFC 3339 time the offer stops being available")
    .option("--activate", "Activate the offer after creating it")
    .option("--regions-version <version>", "Regional pricing version (default 2022/02)")
    .action(async (productId: string, basePlanId: string, options: OfferCreateOptions) => {
      const source = retentionCreateInput(options);
      // Bad flag values exit 2 before credentials are needed.
      if (source.flags) parseRetentionFlags(source.flags);
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (source.file !== undefined && isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions offers create",
            action: "create offer for",
            target: `${productId}/${basePlanId}`,
            details: {
              file: options.file,
              ...(options.regionsVersion ? { regionsVersion: options.regionsVersion } : {}),
            },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const data =
        source.file !== undefined
          ? ((await readJsonFile(source.file)) as SubscriptionOffer)
          : await prepareRetentionOffer(client, packageName, productId, basePlanId, source.flags);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions offers create",
            action: "create offer for",
            target: `${productId}/${basePlanId}`,
            details: { offer: data },
          },
          format,
          formatOutput,
        );
        if (format !== "json") console.log(`\nOffer to send:\n${JSON.stringify(data, null, 2)}`);
        return;
      }

      const created = await createOffer(
        client,
        packageName,
        productId,
        basePlanId,
        data,
        options.regionsVersion,
      );
      // Name the app, so the command acts on the same app when pasted.
      const activateCommand = `gpc subscriptions offers activate ${productId} ${basePlanId} ${created.offerId} --app ${packageName}`;
      if (!options.activate) {
        console.log(formatOutput(created, format));
        if (format !== "json") {
          console.log(`\nThe offer is a draft. To activate it, run:\n  ${activateCommand}`);
        }
        return;
      }
      let activated;
      try {
        activated = await activateOffer(
          client,
          packageName,
          productId,
          basePlanId,
          created.offerId,
        );
      } catch (err) {
        // The create went through, so a rerun of this command would fail on a
        // duplicate offer ID. Say the draft exists and how to finish.
        const e = err as { message?: string; code?: string; exitCode?: number };
        throw new GpcError(
          `Offer "${created.offerId}" was created as a draft, but activating it failed: ${e.message ?? String(err)}`,
          e.code ?? "OFFER_ACTIVATE_FAILED",
          e.exitCode ?? 4,
          `To activate the draft, run: ${activateCommand}`,
        );
      }
      console.log(formatOutput(activated, format));
    });

  offers
    .command("update <product-id> <base-plan-id> <offer-id>")
    .description("Update an offer from a JSON file, or a retention offer from flags")
    .option("--file <path>", "JSON file with offer data")
    .option("--update-mask <fields>", "Comma-separated field mask (with --file)")
    .option("--start <time>", "RFC 3339 time the offer becomes available")
    .option("--end <time>", "RFC 3339 time the offer stops being available")
    .option("--min-duration <days>", "Days subscribed before the offer shows, e.g. 90d (cohort)")
    .option("--multiple-claims", "Let a user claim the offer more than once (cohort)")
    .option("--no-multiple-claims", "Let a user claim the offer only once (cohort)")
    .option("--cooldown <days>", "Days between claims, e.g. 180d (cohort)")
    .option("--regions-version <version>", "Regional pricing version (default 2022/02)")
    .action(
      async (
        productId: string,
        basePlanId: string,
        offerId: string,
        options: OfferUpdateOptions,
      ) => {
        const source = retentionUpdateInput(options);
        if (source.flags) parseRetentionUpdateFlags(source.flags);
        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const format = getOutputFormat(program, config);

        if (source.file !== undefined && isDryRun(program)) {
          printDryRun(
            {
              command: "subscriptions offers update",
              action: "update offer",
              target: `${productId}/${basePlanId}/${offerId}`,
              details: {
                file: options.file,
                updateMask: options.updateMask,
                regionsVersion: options.regionsVersion,
              },
            },
            format,
            formatOutput,
          );
          return;
        }

        const client = await getClient(config);
        let data: SubscriptionOffer;
        let updateMask = options.updateMask;
        if (source.file !== undefined) {
          data = (await readJsonFile(source.file)) as SubscriptionOffer;
        } else {
          const prepared = await prepareRetentionOfferUpdate(
            client,
            packageName,
            productId,
            basePlanId,
            offerId,
            source.flags,
          );
          data = prepared.offer;
          updateMask = prepared.updateMask;
        }

        if (isDryRun(program)) {
          printDryRun(
            {
              command: "subscriptions offers update",
              action: "update offer",
              target: `${productId}/${basePlanId}/${offerId}`,
              details: { offer: data, updateMask },
            },
            format,
            formatOutput,
          );
          if (format !== "json") {
            console.log(
              `\nUpdate mask: ${updateMask}\nOffer to send:\n${JSON.stringify(data, null, 2)}`,
            );
          }
          return;
        }

        const result = await updateOffer(
          client,
          packageName,
          productId,
          basePlanId,
          offerId,
          data,
          updateMask,
          options.regionsVersion,
        );
        console.log(formatOutput(result, format));
      },
    );

  offers
    .command("delete <product-id> <base-plan-id> <offer-id>")
    .description("Delete an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Delete offer "${offerId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "subscriptions offers delete",
            action: "delete offer",
            target: `${productId}/${basePlanId}/${offerId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      await deleteOffer(client, packageName, productId, basePlanId, offerId);
      console.log(`Offer ${offerId} deleted.`);
    });

  offers
    .command("activate <product-id> <base-plan-id> <offer-id>")
    .description("Activate an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions offers activate",
            action: "activate offer",
            target: `${productId}/${basePlanId}/${offerId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await activateOffer(client, packageName, productId, basePlanId, offerId);
      console.log(formatOutput(result, format));
    });

  offers
    .command("deactivate <product-id> <base-plan-id> <offer-id>")
    .description("Deactivate an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions offers deactivate",
            action: "deactivate offer",
            target: `${productId}/${basePlanId}/${offerId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await deactivateOffer(client, packageName, productId, basePlanId, offerId);
      console.log(formatOutput(result, format));
    });

  offers
    .command("batch-get <product-id> <base-plan-id>")
    .description("Batch get multiple offers (max 100)")
    .requiredOption("--ids <offer-ids>", "Comma-separated offer IDs")
    .action(async (productId: string, basePlanId: string, options: { ids: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const offerIds = options.ids.split(",").map((id) => id.trim());
      const result = await client.subscriptions.batchGetOffers(
        packageName,
        productId,
        basePlanId,
        offerIds,
      );
      console.log(formatOutput(result, format));
    });

  offers
    .command("batch-update-states <product-id> <base-plan-id>")
    .description("Batch activate or deactivate multiple offers (max 100)")
    .requiredOption("--file <path>", "JSON file with state transition requests")
    .action(async (productId: string, basePlanId: string, options: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions offers batch-update-states",
            action: "batch update offer states",
            target: `${productId}/${basePlanId}`,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const requests = await readJsonFile(options.file);
      const result = await client.subscriptions.batchUpdateOfferStates(
        packageName,
        productId,
        basePlanId,
        requests as {
          requests: Array<{
            activateSubscriptionOfferRequest?: { offerId: string };
            deactivateSubscriptionOfferRequest?: { offerId: string };
          }>;
        },
      );
      console.log(formatOutput(result, format));
    });

  // --- Diff ---
  subs
    .command("diff <product-id>")
    .description("Compare local JSON file against remote subscription")
    .requiredOption("--file <path>", "Local JSON file to compare against remote")
    .action(async (productId: string, options: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const localData = (await readJsonFile(options.file)) as Subscription;
      const diffs = await diffSubscription(client, packageName, productId, localData);
      if (diffs.length === 0) {
        console.log("No differences found.");
      } else {
        console.log(formatOutput(diffs, format));
      }
    });

  subs
    .command("analytics")
    .description("Subscription catalog analytics: active plans, offer counts, state breakdown")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getSubscriptionAnalytics(client, packageName);

      if (format === "json") {
        console.log(formatOutput(result, format));
        return;
      }

      console.log(`\nSubscription Analytics — ${packageName}`);
      console.log(`${"─".repeat(50)}`);
      console.log(`Total subscriptions:  ${result.totalSubscriptions}`);
      console.log(`Active subscriptions: ${result.activeCount}`);
      console.log(`Active base plans:    ${result.activeBasePlans}`);
      console.log(`Draft base plans:     ${result.trialBasePlans}`);
      console.log(`Inactive base plans:  ${result.pausedBasePlans}`);
      console.log(`Total offers:         ${result.offerCount}`);

      if (result.byProductId.length > 0) {
        console.log(`\nBy product:`);
        console.log(formatOutput(result.byProductId, format));
      }
    });
}
