import type { PlayApiClient, EditCommitOptions } from "@gpc-cli/api";
import { PlayApiError } from "@gpc-cli/api";

export interface CommitResult {
  rescued: boolean;
}

const REVIEW_FLAG_DROPPED_WARNING =
  "Google Play no longer accepts --changes-not-sent-for-review for this app (no rejected update).\n" +
  "Committing normally instead; the changes will be sent for review.";

const REVIEW_PENDING_WARNING =
  "Changes committed but NOT sent for review (app has a rejected update).\n" +
  "Next step: Open Google Play Console > Publishing overview > Send for review";

export async function commitWithRescue(
  client: PlayApiClient,
  packageName: string,
  editId: string,
  commitOptions?: EditCommitOptions,
): Promise<CommitResult> {
  try {
    await client.edits.commit(packageName, editId, commitOptions);
    return { rescued: false };
  } catch (error) {
    if (
      error instanceof PlayApiError &&
      error.code === "API_CHANGES_NOT_SENT_FOR_REVIEW" &&
      !commitOptions?.changesNotSentForReview
    ) {
      console.error(`\n  WARNING: ${REVIEW_PENDING_WARNING}\n`);
      await client.edits.commit(packageName, editId, {
        ...commitOptions,
        changesNotSentForReview: true,
      });
      return { rescued: true };
    }
    if (
      error instanceof PlayApiError &&
      error.code === "API_CHANGES_NOT_SENT_FOR_REVIEW_NOT_ALLOWED" &&
      commitOptions?.changesNotSentForReview
    ) {
      console.error(`\n  WARNING: ${REVIEW_FLAG_DROPPED_WARNING}\n`);
      const { changesNotSentForReview: _dropped, ...rest } = commitOptions;
      await client.edits.commit(packageName, editId, rest);
      return { rescued: true };
    }
    throw error;
  }
}

export async function validateAndCommit(
  client: PlayApiClient,
  packageName: string,
  editId: string,
  commitOptions?: EditCommitOptions,
): Promise<CommitResult> {
  let rescuedFromValidate = false;
  if (!commitOptions?.changesNotSentForReview) {
    try {
      await client.edits.validate(packageName, editId);
    } catch (error) {
      if (error instanceof PlayApiError && error.code === "API_CHANGES_NOT_SENT_FOR_REVIEW") {
        console.error(`\n  WARNING: ${REVIEW_PENDING_WARNING}\n`);
        rescuedFromValidate = true;
      } else {
        throw error;
      }
    }
  }

  if (rescuedFromValidate) {
    await client.edits.commit(packageName, editId, {
      ...commitOptions,
      changesNotSentForReview: true,
    });
    return { rescued: true };
  }
  return commitWithRescue(client, packageName, editId, commitOptions);
}
