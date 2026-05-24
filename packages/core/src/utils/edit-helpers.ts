import type { PlayApiClient, EditCommitOptions } from "@gpc-cli/api";
import { PlayApiError } from "@gpc-cli/api";

export async function commitWithRescue(
  client: PlayApiClient,
  packageName: string,
  editId: string,
  commitOptions?: EditCommitOptions,
): Promise<void> {
  try {
    await client.edits.commit(packageName, editId, commitOptions);
  } catch (error) {
    if (
      error instanceof PlayApiError &&
      error.code === "API_CHANGES_NOT_SENT_FOR_REVIEW" &&
      !commitOptions?.changesNotSentForReview
    ) {
      process.emitWarning(
        "App has a rejected update — auto-setting changesNotSentForReview=true",
        "AutoRescueWarning",
      );
      await client.edits.commit(packageName, editId, {
        ...commitOptions,
        changesNotSentForReview: true,
      });
      return;
    }
    throw error;
  }
}

export async function validateAndCommit(
  client: PlayApiClient,
  packageName: string,
  editId: string,
  commitOptions?: EditCommitOptions,
): Promise<void> {
  let rescuedFromValidate = false;
  if (!commitOptions?.changesNotSentForReview) {
    try {
      await client.edits.validate(packageName, editId);
    } catch (error) {
      if (error instanceof PlayApiError && error.code === "API_CHANGES_NOT_SENT_FOR_REVIEW") {
        process.emitWarning(
          "App has a rejected update — auto-setting changesNotSentForReview=true",
          "AutoRescueWarning",
        );
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
  } else {
    await commitWithRescue(client, packageName, editId, commitOptions);
  }
}
