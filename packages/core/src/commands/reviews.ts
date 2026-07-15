import type { PlayApiClient, Review, ReviewsListOptions, ReviewReplyResponse } from "@gpc-cli/api";
import { paginateAll } from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import { analyzeReviews as analyzeReviewsSentiment } from "../utils/sentiment.js";
import type { ReviewAnalysis } from "../utils/sentiment.js";
import { sortResults } from "../utils/sort.js";

/** Named sort presets for `reviews list --sort`. */
export const REVIEW_SORT_PRESETS = ["newest", "oldest", "rating"] as const;
export type ReviewSortPreset = (typeof REVIEW_SORT_PRESETS)[number];

function reviewTimestamp(r: Review): number {
  const secs = Number(r.comments?.[0]?.userComment?.lastModified?.seconds);
  return Number.isFinite(secs) ? secs : 0;
}

function reviewRating(r: Review): number {
  return r.comments?.[0]?.userComment?.starRating ?? 0;
}

/**
 * Sort reviews by a named preset (`newest` | `oldest` | `rating`) or, for any
 * other spec, fall back to the generic field-based `sortResults`. Presets are
 * required because rating and date live under `comments[0].userComment.*`,
 * which the generic dot-path sorter cannot index into. Does not mutate input.
 *
 * Note: this orders the fetched window only (the API returns recent reviews,
 * bounded by `--max`), not all-time.
 */
export function sortReviews(reviews: Review[], spec?: string): Review[] {
  switch (spec) {
    case "newest":
      return [...reviews].sort((a, b) => reviewTimestamp(b) - reviewTimestamp(a));
    case "oldest":
      return [...reviews].sort((a, b) => reviewTimestamp(a) - reviewTimestamp(b));
    case "rating":
      return [...reviews].sort((a, b) => reviewRating(b) - reviewRating(a));
    default:
      return sortResults(reviews, spec);
  }
}

export interface ReviewsFilterOptions {
  stars?: number;
  language?: string;
  since?: string;
  translationLanguage?: string;
  maxResults?: number;
  limit?: number;
  nextPage?: string;
  all?: boolean;
}

export interface ReviewExportOptions extends ReviewsFilterOptions {
  format?: "json" | "csv";
}

export async function listReviews(
  client: PlayApiClient,
  packageName: string,
  options?: ReviewsFilterOptions,
): Promise<{ reviews: Review[]; nextPageToken?: string }> {
  let reviews: Review[];
  let nextPageToken: string | undefined;

  if (options?.all) {
    // Auto-paginate all pages
    const { items, nextPageToken: token } = await paginateAll<Review>(
      async (pageToken) => {
        const apiOptions: ReviewsListOptions = { token: pageToken };
        if (options?.translationLanguage)
          apiOptions.translationLanguage = options.translationLanguage;
        if (options?.maxResults) apiOptions.maxResults = options.maxResults;
        const response = await client.reviews.list(packageName, apiOptions);
        return {
          items: response.reviews || [],
          nextPageToken: response.tokenPagination?.nextPageToken,
        };
      },
      { limit: options?.limit },
    );
    reviews = items;
    nextPageToken = token;
  } else {
    // Single page (default)
    const apiOptions: ReviewsListOptions = {};
    if (options?.translationLanguage) apiOptions.translationLanguage = options.translationLanguage;
    if (options?.maxResults) apiOptions.maxResults = options.maxResults;
    if (options?.nextPage) apiOptions.token = options.nextPage;

    const response = await client.reviews.list(packageName, apiOptions);
    reviews = response.reviews || [];
    nextPageToken = response.tokenPagination?.nextPageToken;
  }

  // Client-side filters
  if (options?.stars !== undefined) {
    reviews = reviews.filter((r) => {
      const userComment = r.comments?.[0]?.userComment;
      return userComment && userComment.starRating === options.stars;
    });
  }

  if (options?.language) {
    reviews = reviews.filter((r) => {
      const userComment = r.comments?.[0]?.userComment;
      return userComment?.reviewerLanguage === options.language;
    });
  }

  if (options?.since) {
    const sinceTime = new Date(options.since).getTime() / 1000;
    reviews = reviews.filter((r) => {
      const userComment = r.comments?.[0]?.userComment;
      return userComment && Number(userComment.lastModified.seconds) >= sinceTime;
    });
  }

  return { reviews, nextPageToken };
}

export async function getReview(
  client: PlayApiClient,
  packageName: string,
  reviewId: string,
  translationLanguage?: string,
): Promise<Review> {
  return client.reviews.get(packageName, reviewId, translationLanguage);
}

const MAX_REPLY_LENGTH = 350;

export async function replyToReview(
  client: PlayApiClient,
  packageName: string,
  reviewId: string,
  replyText: string,
): Promise<ReviewReplyResponse> {
  if (replyText.length > MAX_REPLY_LENGTH) {
    throw new GpcError(
      `Reply text exceeds ${MAX_REPLY_LENGTH} characters (${replyText.length}). Google Play limits replies to ${MAX_REPLY_LENGTH} characters.`,
      "REVIEW_REPLY_TOO_LONG",
      2,
      `Shorten your reply to ${MAX_REPLY_LENGTH} characters or fewer. Current length: ${replyText.length}.`,
    );
  }
  if (replyText.length === 0) {
    throw new GpcError(
      "Reply text cannot be empty.",
      "REVIEW_REPLY_EMPTY",
      2,
      "Provide a non-empty reply text with --text or -t.",
    );
  }
  return client.reviews.reply(packageName, reviewId, replyText);
}

export async function exportReviews(
  client: PlayApiClient,
  packageName: string,
  options?: ReviewExportOptions,
): Promise<string> {
  const { items: allReviews } = await paginateAll<Review>(async (pageToken) => {
    const apiOptions: ReviewsListOptions = { token: pageToken };
    if (options?.translationLanguage) apiOptions.translationLanguage = options.translationLanguage;
    const response = await client.reviews.list(packageName, apiOptions);
    return {
      items: response.reviews || [],
      nextPageToken: response.tokenPagination?.nextPageToken,
    };
  });

  let filtered = allReviews;

  if (options?.stars !== undefined) {
    filtered = filtered.filter((r) => {
      const uc = r.comments?.[0]?.userComment;
      return uc && uc.starRating === options.stars;
    });
  }

  if (options?.language) {
    filtered = filtered.filter((r) => {
      const uc = r.comments?.[0]?.userComment;
      return uc?.reviewerLanguage === options.language;
    });
  }

  if (options?.since) {
    const sinceTime = new Date(options.since).getTime() / 1000;
    filtered = filtered.filter((r) => {
      const uc = r.comments?.[0]?.userComment;
      return uc && Number(uc.lastModified.seconds) >= sinceTime;
    });
  }

  if (options?.format === "csv") {
    return reviewsToCsv(filtered);
  }

  return JSON.stringify(filtered, null, 2);
}

function reviewsToCsv(reviews: Review[]): string {
  const header = "reviewId,authorName,starRating,text,language,date,device,appVersionName";
  const rows = reviews.map((r) => {
    const uc = r.comments?.[0]?.userComment;
    const fields = [
      r.reviewId,
      csvEscape(r.authorName),
      uc?.starRating ?? "",
      csvEscape(uc?.text ?? ""),
      uc?.reviewerLanguage ?? "",
      uc ? new Date(Number(uc.lastModified.seconds) * 1000).toISOString() : "",
      csvEscape(uc?.device ?? ""),
      csvEscape(uc?.appVersionName ?? ""),
    ];
    return fields.join(",");
  });
  return [header, ...rows].join("\n");
}

function csvEscape(value: string): string {
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export { ReviewAnalysis };

/** Fetch reviews and run local sentiment/topic/keyword analysis. */
export async function analyzeReviews(
  client: PlayApiClient,
  packageName: string,
  options?: ReviewsFilterOptions,
): Promise<ReviewAnalysis> {
  const { reviews } = await listReviews(client, packageName, options);

  const items = reviews.map((r) => {
    const uc = r.comments?.[0]?.userComment;
    return {
      text: uc?.text ?? "",
      rating: uc?.starRating,
    };
  });

  return analyzeReviewsSentiment(items);
}
