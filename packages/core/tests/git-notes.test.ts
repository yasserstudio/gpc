import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateNotesFromGit } from "../src/utils/git-notes";

vi.mock("node:child_process", () => {
  const fn = vi.fn();
  return { execFile: fn };
});

import { execFile } from "node:child_process";

const mockExecFile = execFile as unknown as ReturnType<typeof vi.fn>;

function setupExecFile(calls: Record<string, { stdout?: string; error?: Error }>) {
  mockExecFile.mockImplementation(
    (_cmd: string, args: string[], callback: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      const key = args.join(" ");
      for (const [pattern, result] of Object.entries(calls)) {
        if (key.includes(pattern)) {
          if (result.error) {
            callback(result.error, { stdout: "", stderr: result.error.message });
          } else {
            callback(null, { stdout: result.stdout || "", stderr: "" });
          }
          return;
        }
      }
      callback(null, { stdout: "", stderr: "" });
    },
  );
}

describe("generateNotesFromGit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses conventional commits and groups by type", async () => {
    setupExecFile({
      "describe --tags": { stdout: "v1.0.0\n" },
      "log": {
        stdout: [
          "feat(cli): add dry-run mode",
          "fix(api): rate limiter accuracy",
          "perf: faster startup time",
          "feat: auto-update checker",
        ].join("\n") + "\n",
      },
    });

    const result = await generateNotesFromGit();

    expect(result.language).toBe("en-US");
    expect(result.commitCount).toBe(4);
    expect(result.since).toBe("v1.0.0");
    expect(result.text).toContain("New:");
    expect(result.text).toContain("\u2022 add dry-run mode");
    expect(result.text).toContain("\u2022 auto-update checker");
    expect(result.text).toContain("Fixed:");
    expect(result.text).toContain("\u2022 rate limiter accuracy");
    expect(result.text).toContain("Improved:");
    expect(result.text).toContain("\u2022 faster startup time");
  });

  it("strips scope from commit messages", async () => {
    setupExecFile({
      "describe --tags": { stdout: "v2.0.0\n" },
      "log": { stdout: "feat(core): enhanced validation\n" },
    });

    const result = await generateNotesFromGit();

    expect(result.text).toContain("\u2022 enhanced validation");
    expect(result.text).not.toContain("(core)");
  });

  it("groups non-conventional commits under Changes", async () => {
    setupExecFile({
      "describe --tags": { stdout: "v1.0.0\n" },
      "log": {
        stdout: ["update dependencies", "bump version", "feat: new feature"].join("\n") + "\n",
      },
    });

    const result = await generateNotesFromGit();

    expect(result.text).toContain("New:");
    expect(result.text).toContain("Changes:");
    expect(result.text).toContain("\u2022 update dependencies");
    expect(result.text).toContain("\u2022 bump version");
  });

  it("truncates to maxLength with ellipsis", async () => {
    const longCommits = Array.from({ length: 50 }, (_, i) => `feat: feature number ${i + 1} with a long description`);
    setupExecFile({
      "describe --tags": { stdout: "v1.0.0\n" },
      "log": { stdout: longCommits.join("\n") + "\n" },
    });

    const result = await generateNotesFromGit({ maxLength: 100 });

    expect(result.text.length).toBeLessThanOrEqual(100);
    expect(result.text).toMatch(/\.\.\.$/);
  });

  it("uses custom since ref", async () => {
    setupExecFile({
      "log": { stdout: "fix: a bug\n" },
    });

    const result = await generateNotesFromGit({ since: "abc123" });

    expect(result.since).toBe("abc123");
    // Should NOT call git describe since `since` was provided
    const describeCall = mockExecFile.mock.calls.find(
      (call: unknown[]) => (call[1] as string[]).includes("describe"),
    );
    expect(describeCall).toBeUndefined();
  });

  it("defaults language to en-US", async () => {
    setupExecFile({
      "describe --tags": { stdout: "v1.0.0\n" },
      "log": { stdout: "fix: something\n" },
    });

    const result = await generateNotesFromGit();

    expect(result.language).toBe("en-US");
  });

  it("accepts custom language", async () => {
    setupExecFile({
      "describe --tags": { stdout: "v1.0.0\n" },
      "log": { stdout: "fix: something\n" },
    });

    const result = await generateNotesFromGit({ language: "de-DE" });

    expect(result.language).toBe("de-DE");
  });

  it("throws when no git tags found and no since specified", async () => {
    const err = new Error("fatal: No names found");
    setupExecFile({
      "describe --tags": { error: err },
    });

    await expect(generateNotesFromGit()).rejects.toThrow("No git tags found");
  });

  it("throws when git is not available", async () => {
    const err = Object.assign(new Error("spawn git ENOENT"), { code: "ENOENT" });
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], callback: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
        callback(err, { stdout: "", stderr: "" });
      },
    );

    await expect(generateNotesFromGit()).rejects.toThrow("git is not available");
  });

  it("returns empty message when no commits since tag", async () => {
    setupExecFile({
      "describe --tags": { stdout: "v3.0.0\n" },
      "log": { stdout: "\n" },
    });

    const result = await generateNotesFromGit();

    expect(result.commitCount).toBe(0);
    expect(result.text).toBe("No changes since last release.");
  });

  it("respects default maxLength of 500", async () => {
    const longCommits = Array.from({ length: 200 }, (_, i) => `feat: this is feature ${i + 1} with description`);
    setupExecFile({
      "describe --tags": { stdout: "v1.0.0\n" },
      "log": { stdout: longCommits.join("\n") + "\n" },
    });

    const result = await generateNotesFromGit();

    expect(result.text.length).toBeLessThanOrEqual(500);
  });

  it("orders sections: New, Fixed, Improved, Changes", async () => {
    setupExecFile({
      "describe --tags": { stdout: "v1.0.0\n" },
      "log": {
        stdout: [
          "update readme",
          "perf: speed up",
          "fix: a crash",
          "feat: a feature",
        ].join("\n") + "\n",
      },
    });

    const result = await generateNotesFromGit();

    const newIdx = result.text.indexOf("New:");
    const fixedIdx = result.text.indexOf("Fixed:");
    const improvedIdx = result.text.indexOf("Improved:");
    const changesIdx = result.text.indexOf("Changes:");

    expect(newIdx).toBeLessThan(fixedIdx);
    expect(fixedIdx).toBeLessThan(improvedIdx);
    expect(improvedIdx).toBeLessThan(changesIdx);
  });
});
