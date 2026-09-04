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
    const result = await commitWithRescue(client, "com.example", "edit1");
    expect(result.rescued).toBe(false);
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit1", undefined);
  });

  it("passes commitOptions through", async () => {
    const opts = { changesInReviewBehavior: "CANCEL_IN_REVIEW_AND_SUBMIT" as const };
    const result = await commitWithRescue(client, "com.example", "edit1", opts);
    expect(result.rescued).toBe(false);
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit1", opts);
  });

  it("auto-retries with changesNotSentForReview on rescue error", async () => {
    const rescueError = new PlayApiError(
      "changes not sent for review",
      "API_CHANGES_NOT_SENT_FOR_REVIEW",
      403,
    );
    vi.mocked(client.edits.commit).mockRejectedValueOnce(rescueError);

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await commitWithRescue(client, "com.example", "edit1");

    expect(result.rescued).toBe(true);
    expect(client.edits.commit).toHaveBeenCalledTimes(2);
    expect(client.edits.commit).toHaveBeenLastCalledWith("com.example", "edit1", {
      changesNotSentForReview: true,
    });
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("NOT sent for review"));
    errSpy.mockRestore();
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

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(commitWithRescue(client, "com.example", "edit1")).rejects.toThrow(retryError);
    expect(client.edits.commit).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });

  it("preserves changesInReviewBehavior on rescue retry", async () => {
    const rescueError = new PlayApiError(
      "changes not sent for review",
      "API_CHANGES_NOT_SENT_FOR_REVIEW",
      403,
    );
    vi.mocked(client.edits.commit).mockRejectedValueOnce(rescueError);

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await commitWithRescue(client, "com.example", "edit1", {
      changesInReviewBehavior:
        "BLOCK_UNTIL_IN_REVIEW_CHANGES_DONE" as "CANCEL_IN_REVIEW_AND_SUBMIT",
    });

    expect(client.edits.commit).toHaveBeenLastCalledWith("com.example", "edit1", {
      changesInReviewBehavior: "BLOCK_UNTIL_IN_REVIEW_CHANGES_DONE",
      changesNotSentForReview: true,
    });
    errSpy.mockRestore();
  });
});

describe("validateAndCommit", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  it("calls validate then commit on success", async () => {
    const result = await validateAndCommit(client, "com.example", "edit1");

    expect(result.rescued).toBe(false);
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

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await validateAndCommit(client, "com.example", "edit1");

    expect(result.rescued).toBe(true);
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });

  it("auto-rescues when validate throws API_CHANGES_NOT_SENT_FOR_REVIEW", async () => {
    const rescueError = new PlayApiError(
      "changes not sent for review",
      "API_CHANGES_NOT_SENT_FOR_REVIEW",
      403,
    );
    vi.mocked(client.edits.validate).mockRejectedValueOnce(rescueError);

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await validateAndCommit(client, "com.example", "edit1");

    expect(result.rescued).toBe(true);
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit1", {
      changesNotSentForReview: true,
    });
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("NOT sent for review"));
    errSpy.mockRestore();
  });

  it("rethrows non-rescue errors from validate", async () => {
    const otherError = new PlayApiError("bad request", "API_BAD_REQUEST", 400);
    vi.mocked(client.edits.validate).mockRejectedValueOnce(otherError);

    await expect(validateAndCommit(client, "com.example", "edit1")).rejects.toThrow(otherError);
    expect(client.edits.commit).not.toHaveBeenCalled();
  });
});

describe("commitWithRescue — flag no longer accepted", () => {
  it("retries WITHOUT changesNotSentForReview when Play says it must not be set", async () => {
    const client = mockClient();
    const notAllowed = new PlayApiError(
      "must not be set to true",
      "API_CHANGES_NOT_SENT_FOR_REVIEW_NOT_ALLOWED",
      400,
    );
    vi.mocked(client.edits.commit).mockRejectedValueOnce(notAllowed);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await commitWithRescue(client, "com.example", "edit1", {
      changesNotSentForReview: true,
    });

    expect(result.rescued).toBe(true);
    expect(client.edits.commit).toHaveBeenCalledTimes(2);
    expect(client.edits.commit).toHaveBeenLastCalledWith("com.example", "edit1", {});
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("no longer accepts"));
    errSpy.mockRestore();
  });

  it("does not retry the NOT_ALLOWED error when the flag was never set", async () => {
    const client = mockClient();
    const notAllowed = new PlayApiError(
      "must not be set to true",
      "API_CHANGES_NOT_SENT_FOR_REVIEW_NOT_ALLOWED",
      400,
    );
    vi.mocked(client.edits.commit).mockRejectedValueOnce(notAllowed);
    await expect(commitWithRescue(client, "com.example", "edit1")).rejects.toBe(notAllowed);
    expect(client.edits.commit).toHaveBeenCalledTimes(1);
  });
});
