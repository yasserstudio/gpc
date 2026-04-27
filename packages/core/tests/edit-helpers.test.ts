import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateAndCommit, commitWithRescue } from "../src/utils/edit-helpers.js";
import { PlayApiError } from "@gpc-cli/api";

function mockClient() {
  return {
    edits: {
      validate: vi.fn().mockResolvedValue({}),
      commit: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Parameters<typeof validateAndCommit>[0];
}

describe("commitWithRescue", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  it("commits normally on success", async () => {
    await commitWithRescue(client, "com.example", "edit1");
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit1", undefined);
  });

  it("passes commitOptions through", async () => {
    const opts = { changesInReviewBehavior: "CANCEL_IN_REVIEW_AND_SUBMIT" as const };
    await commitWithRescue(client, "com.example", "edit1", opts);
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit1", opts);
  });

  it("auto-retries with changesNotSentForReview on rescue error", async () => {
    const rescueError = new PlayApiError(
      "changes not sent for review",
      "API_CHANGES_NOT_SENT_FOR_REVIEW",
      403,
    );
    vi.mocked(client.edits.commit).mockRejectedValueOnce(rescueError);

    const warnSpy = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    await commitWithRescue(client, "com.example", "edit1");

    expect(client.edits.commit).toHaveBeenCalledTimes(2);
    expect(client.edits.commit).toHaveBeenLastCalledWith("com.example", "edit1", {
      changesNotSentForReview: true,
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("auto-setting"), "AutoRescueWarning");
    warnSpy.mockRestore();
  });

  it("does not retry if changesNotSentForReview was already set", async () => {
    const rescueError = new PlayApiError(
      "changes not sent for review",
      "API_CHANGES_NOT_SENT_FOR_REVIEW",
      403,
    );
    vi.mocked(client.edits.commit).mockRejectedValueOnce(rescueError);

    await expect(
      commitWithRescue(client, "com.example", "edit1", { changesNotSentForReview: true }),
    ).rejects.toThrow(rescueError);

    expect(client.edits.commit).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-rescue errors", async () => {
    const otherError = new PlayApiError("conflict", "API_EDIT_CONFLICT", 409);
    vi.mocked(client.edits.commit).mockRejectedValueOnce(otherError);

    await expect(commitWithRescue(client, "com.example", "edit1")).rejects.toThrow(otherError);
    expect(client.edits.commit).toHaveBeenCalledTimes(1);
  });

  it("rethrows when retry itself fails", async () => {
    const rescueError = new PlayApiError(
      "changes not sent for review",
      "API_CHANGES_NOT_SENT_FOR_REVIEW",
      403,
    );
    const retryError = new PlayApiError("internal error", "API_INTERNAL", 500);
    vi.mocked(client.edits.commit)
      .mockRejectedValueOnce(rescueError)
      .mockRejectedValueOnce(retryError);

    const warnSpy = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    await expect(commitWithRescue(client, "com.example", "edit1")).rejects.toThrow(retryError);
    expect(client.edits.commit).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it("preserves changesInReviewBehavior on rescue retry", async () => {
    const rescueError = new PlayApiError(
      "changes not sent for review",
      "API_CHANGES_NOT_SENT_FOR_REVIEW",
      403,
    );
    vi.mocked(client.edits.commit).mockRejectedValueOnce(rescueError);

    const warnSpy = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    await commitWithRescue(client, "com.example", "edit1", {
      changesInReviewBehavior: "BLOCK_UNTIL_IN_REVIEW_CHANGES_DONE" as "CANCEL_IN_REVIEW_AND_SUBMIT",
    });

    expect(client.edits.commit).toHaveBeenLastCalledWith("com.example", "edit1", {
      changesInReviewBehavior: "BLOCK_UNTIL_IN_REVIEW_CHANGES_DONE",
      changesNotSentForReview: true,
    });
    warnSpy.mockRestore();
  });
});

describe("validateAndCommit", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  it("calls validate then commit on success", async () => {
    await validateAndCommit(client, "com.example", "edit1");

    expect(client.edits.validate).toHaveBeenCalledWith("com.example", "edit1");
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit1", undefined);
  });

  it("skips validate when changesNotSentForReview is true", async () => {
    await validateAndCommit(client, "com.example", "edit1", {
      changesNotSentForReview: true,
    });

    expect(client.edits.validate).not.toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit1", {
      changesNotSentForReview: true,
    });
  });

  it("auto-rescues through commitWithRescue on 403", async () => {
    const rescueError = new PlayApiError(
      "changes not sent for review",
      "API_CHANGES_NOT_SENT_FOR_REVIEW",
      403,
    );
    vi.mocked(client.edits.commit).mockRejectedValueOnce(rescueError);

    const warnSpy = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    await validateAndCommit(client, "com.example", "edit1");

    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});
