import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import {
  listReviews,
  getReview,
  replyToReview,
  exportReviews,
  formatOutput,
  sortResults,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { isInteractive, requireOption } from "../prompt.js";

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

export function registerReviewsCommands(program: Command): void {
  const reviews = program.command("reviews").description("Manage user reviews and ratings");

  reviews
    .command("list")
    .description("List user reviews")
    .option("--stars <n>", "Filter by star rating (1-5)", parseInt)
    .option("--lang <code>", "Filter by reviewer language")
    .option("--since <date>", "Filter reviews after date (ISO 8601)")
    .option("--translate-to <lang>", "Translate reviews to language")
    .option("--max <n>", "Maximum number of reviews per page", parseInt)
    .option("--limit <n>", "Maximum total results", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listReviews(client, packageName, {
          stars: options.stars,
          language: options.lang,
          since: options.since,
          translationLanguage: options.translateTo,
          maxResults: options.max,
          limit: options.limit,
          nextPage: options.nextPage,
        });
        const sorted = sortResults(result, options.sort);
        console.log(formatOutput(sorted, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  reviews
    .command("get <review-id>")
    .description("Get a single review")
    .option("--translate-to <lang>", "Translate review to language")
    .action(async (reviewId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await getReview(client, packageName, reviewId, options.translateTo);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  reviews
    .command("reply <review-id>")
    .description("Reply to a review")
    .option("--text <text>", "Reply text (max 350 chars)")
    .action(async (reviewId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);

      options.text = await requireOption(
        "text",
        options.text,
        {
          message: "Reply text (max 350 chars):",
        },
        interactive,
      );

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "reviews reply",
            action: "reply to",
            target: reviewId,
            details: { text: options.text },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await replyToReview(client, packageName, reviewId, options.text);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  reviews
    .command("export")
    .description("Export reviews to JSON or CSV")
    .option("--format <type>", "Output format: json or csv", "json")
    .option("--stars <n>", "Filter by star rating (1-5)", parseInt)
    .option("--lang <code>", "Filter by reviewer language")
    .option("--since <date>", "Filter reviews after date (ISO 8601)")
    .option("--translate-to <lang>", "Translate reviews to language")
    .option("--output <file>", "Write output to file instead of stdout")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);

      try {
        const result = await exportReviews(client, packageName, {
          format: options.format as "json" | "csv",
          stars: options.stars,
          language: options.lang,
          since: options.since,
          translationLanguage: options.translateTo,
        });

        if (options.output) {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(options.output, result, "utf-8");
          console.log(`Reviews exported to ${options.output}`);
        } else {
          console.log(result);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
