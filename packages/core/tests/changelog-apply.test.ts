import { describe, it, expect, vi } from "vitest";
import { applyReleaseNotes } from "../src/commands/releases.js";

function mockClient(opts: {
  releases?: any[];
  updateFn?: (...args: any[]) => Promise<any>;
  validateFn?: (...args: any[]) => Promise<any>;
  commitFn?: (...args: any[]) => Promise<any>;
  insertError?: Error;
}) {
  const calls: Record<string, any[]> = {};
  return {
    edits: {
      insert: vi.fn(async () => {
        if (opts.insertError) throw opts.insertError;
        return { id: "edit-1" };
      }),
      validate: opts.validateFn ?? vi.fn(async () => ({ id: "edit-1" })),
      commit: opts.commitFn ?? vi.fn(async () => ({ id: "edit-1" })),
      delete: vi.fn(async () => {}),
    },
    tracks: {
      get: vi.fn(async () => ({
        track: "production",
        releases: opts.releases ?? [],
      })),
      update: opts.updateFn ?? vi.fn(async (_pkg: string, _eid: string, _track: string, release: any) => {
        calls.lastUpdate = release;
        return { track: "production", releases: [release] };
      }),
    },
    _calls: calls,
  } as any;
}

const NOTES = [
  { language: "en-US", text: "Bug fixes" },
  { language: "fr-FR", text: "Corrections" },
];

describe("applyReleaseNotes", () => {
  it("writes notes to draft release and commits", async () => {
    const client = mockClient({
      releases: [
        { status: "completed", versionCodes: ["90"], releaseNotes: [] },
        { status: "draft", versionCodes: ["91"], releaseNotes: [] },
      ],
    });

    const result = await applyReleaseNotes(client, "com.example", "production", NOTES);

    expect(result.track).toBe("production");
    expect(result.versionCodes).toEqual(["91"]);
    expect(result.localeCount).toBe(2);
    expect(result.releaseNotes).toEqual(NOTES);
    expect(client.tracks.update).toHaveBeenCalled();
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("throws RELEASE_NO_DRAFT when no draft exists", async () => {
    const client = mockClient({
      releases: [{ status: "completed", versionCodes: ["90"] }],
    });

    await expect(
      applyReleaseNotes(client, "com.example", "production", NOTES),
    ).rejects.toMatchObject({ code: "RELEASE_NO_DRAFT" });
  });

  it("throws RELEASE_NO_DRAFT when track has no releases", async () => {
    const client = mockClient({ releases: [] });

    await expect(
      applyReleaseNotes(client, "com.example", "beta", NOTES),
    ).rejects.toMatchObject({ code: "RELEASE_NO_DRAFT" });
  });

  it("preserves existing draft fields", async () => {
    let capturedRelease: any;
    const client = mockClient({
      releases: [
        {
          status: "draft",
          versionCodes: ["91"],
          name: "v1.2.3",
          userFraction: 0.1,
          inAppUpdatePriority: 5,
          releaseNotes: [{ language: "en-US", text: "old" }],
        },
      ],
      updateFn: vi.fn(async (_p: string, _e: string, _t: string, release: any) => {
        capturedRelease = release;
        return { track: "production", releases: [release] };
      }),
    });

    await applyReleaseNotes(client, "com.example", "production", NOTES);

    expect(capturedRelease.versionCodes).toEqual(["91"]);
    expect(capturedRelease.name).toBe("v1.2.3");
    expect(capturedRelease.userFraction).toBe(0.1);
    expect(capturedRelease.inAppUpdatePriority).toBe(5);
    expect(capturedRelease.releaseNotes).toEqual(NOTES);
  });

  it("cleans up edit on API error", async () => {
    const client = mockClient({
      releases: [{ status: "draft", versionCodes: ["91"] }],
      updateFn: vi.fn(async () => {
        throw new Error("API error");
      }),
    });

    await expect(
      applyReleaseNotes(client, "com.example", "production", NOTES),
    ).rejects.toThrow("API error");
    expect(client.edits.delete).toHaveBeenCalled();
  });

  it("applies empty notes array (clears notes)", async () => {
    const client = mockClient({
      releases: [
        {
          status: "draft",
          versionCodes: ["91"],
          releaseNotes: [{ language: "en-US", text: "old" }],
        },
      ],
    });

    const result = await applyReleaseNotes(client, "com.example", "production", []);
    expect(result.localeCount).toBe(0);
    expect(result.releaseNotes).toEqual([]);
  });

  it("selects draft over other statuses", async () => {
    const client = mockClient({
      releases: [
        { status: "inProgress", versionCodes: ["89"] },
        { status: "completed", versionCodes: ["90"] },
        { status: "draft", versionCodes: ["91"] },
      ],
    });

    const result = await applyReleaseNotes(client, "com.example", "production", NOTES);
    expect(result.versionCodes).toEqual(["91"]);
  });

  it("passes commitOptions through", async () => {
    const client = mockClient({
      releases: [{ status: "draft", versionCodes: ["91"] }],
    });

    await applyReleaseNotes(client, "com.example", "production", NOTES, {
      changesNotSentForReview: true,
    });

    expect(client.edits.validate).not.toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalledWith(
      "com.example",
      "edit-1",
      { changesNotSentForReview: true },
    );
  });
});
