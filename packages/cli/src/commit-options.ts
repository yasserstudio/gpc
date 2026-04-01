import type { EditCommitOptions } from "@gpc-cli/api";

export function buildCommitOptions(opts: Record<string, unknown>): EditCommitOptions | undefined {
  const notSent = !!opts.changesNotSentForReview;
  const errorIfReview = !!opts.errorIfInReview;
  if (!notSent && !errorIfReview) return undefined;
  return {
    ...(notSent && { changesNotSentForReview: true }),
    ...(errorIfReview && { changesInReviewBehavior: "ERROR_IF_IN_REVIEW" as const }),
  };
}
