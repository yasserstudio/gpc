import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

import {
  listReviews,
  getReview,
  replyToReview,
  exportReviews,
  analyzeReviews,
  formatOutput,
  maybePaginate,
  sortResults,
  GpcError,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { isInteractive, requireOption } from "../prompt.js";

const MAX_REPLY_CHARS = 350;

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
    .option("--all", "Auto-paginate to fetch all reviews (API returns last 7 days only)")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await listReviews(client, packageName, {
        stars: options.stars,
        language: options.lang,
        since: options.since,
        translationLanguage: options.translateTo,
        maxResults: options.max,
        limit: options.limit,
        nextPage: options.nextPage,
        all: options.all,
      });
      if (Array.isArray(result) && result.length === 0 && format !== "json") {
        console.log("No reviews found.");
        return;
      }
      const sorted = sortResults(result, options.sort);
      if (format !== "json" && Array.isArray(sorted)) {
        const rows = sorted.map((r: unknown) => {
          const rv = r as Record<string, unknown>;
          const comments = rv["comments"] as Record<string, unknown>[] | undefined;
          const userComment = comments?.[0]?.["userComment"] as Record<string, unknown> | undefined;
          return {
            reviewId: rv["reviewId"] || "-",
            author: rv["authorName"] || "-",
            stars: userComment?.["starRating"] || "-",
            text: String(userComment?.["text"] || "-").slice(0, 80),
            lastModified: userComment?.["lastModified"]
              ? String((userComment["lastModified"] as Record<string, unknown>)?.["seconds"] || "-")
              : "-",
            thumbsUp: userComment?.["thumbsUpCount"] || 0,
          };
        });
        await maybePaginate(formatOutput(rows, format));
      } else {
        await maybePaginate(formatOutput(sorted, format));
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

      const result = await getReview(client, packageName, reviewId, options.translateTo);
      console.log(formatOutput(result, format));
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

      if (options.text.length > MAX_REPLY_CHARS) {
        throw new GpcError(
          `Reply text exceeds ${MAX_REPLY_CHARS} characters (${options.text.length} chars). Google Play will reject this reply.`,
          "REVIEWS_USAGE_ERROR",
          2,
          `Shorten your reply to ${MAX_REPLY_CHARS} characters or fewer.`,
        );
      }

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

      const result = await replyToReview(client, packageName, reviewId, options.text);
      if (format !== "json") {
        const charCount = options.text.length;
        console.log(`Reply sent (${charCount}/350 chars)`);
      }
      console.log(formatOutput(result, format));
    });

  reviews
    .command("analyze")
    .description("Analyze reviews: sentiment, topics, keywords, rating distribution")
    .option("--stars <n>", "Filter by star rating (1-5)", parseInt)
    .option("--lang <code>", "Filter by reviewer language")
    .option("--since <date>", "Filter reviews after date (ISO 8601)")
    .option("--max <n>", "Maximum number of reviews to analyze", parseInt)
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await analyzeReviews(client, packageName, {
        stars: options.stars,
        language: options.lang,
        since: options.since,
        maxResults: options.max,
      });

      if (format === "json") {
        console.log(formatOutput(result, format));
        return;
      }

      console.log(`\nReview Analysis — ${packageName}`);
      console.log(`${"─".repeat(50)}`);
      console.log(`Total reviews:   ${result.totalReviews}`);
      console.log(
        `Average rating:  ${result.avgRating > 0 ? result.avgRating.toFixed(2) + " ★" : "N/A"}`,
      );
      console.log(`\nSentiment:`);
      console.log(
        `  Positive: ${result.sentiment.positive}  Negative: ${result.sentiment.negative}  Neutral: ${result.sentiment.neutral}`,
      );
      console.log(`  Avg score: ${result.sentiment.avgScore} (range -1 to +1)`);

      if (result.topics.length > 0) {
        console.log(`\nTop topics:`);
        for (const t of result.topics.slice(0, 8)) {
          const bar = t.avgScore > 0.1 ? "+" : t.avgScore < -0.1 ? "-" : "~";
          console.log(`  [${bar}] ${t.topic.padEnd(20)} ${t.count} reviews`);
        }
      }

      if (result.keywords.length > 0) {
        console.log(
          `\nTop keywords: ${result.keywords
            .slice(0, 10)
            .map((k) => k.word)
            .join(", ")}`,
        );
      }

      if (Object.keys(result.ratingDistribution).length > 0) {
        console.log(`\nRating distribution:`);
        for (let star = 5; star >= 1; star--) {
          const count = result.ratingDistribution[star] ?? 0;
          if (count > 0) console.log(`  ${star}★  ${count}`);
        }
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
    });
}
