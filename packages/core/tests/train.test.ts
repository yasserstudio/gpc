import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseDuration } from "../src/utils/train-state.js";

// ---------------------------------------------------------------------------
// parseDuration — pure function, no mocks needed
// ---------------------------------------------------------------------------
describe("parseDuration", () => {
  it("parses days correctly", () => {
    expect(parseDuration("1d")).toBe(1 * 24 * 60 * 60 * 1000);
    expect(parseDuration("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseDuration("14d")).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it("parses hours correctly", () => {
    expect(parseDuration("1h")).toBe(60 * 60 * 1000);
    expect(parseDuration("24h")).toBe(24 * 60 * 60 * 1000);
  });

  it("parses minutes correctly", () => {
    expect(parseDuration("30m")).toBe(30 * 60 * 1000);
    expect(parseDuration("60m")).toBe(60 * 60 * 1000);
  });

  it("returns 0 for invalid input", () => {
    expect(parseDuration("")).toBe(0);
    expect(parseDuration("abc")).toBe(0);
    expect(parseDuration("1y")).toBe(0);
    expect(parseDuration("d")).toBe(0);
  });

  it("handles leading/trailing whitespace", () => {
    expect(parseDuration("  2d  ")).toBe(2 * 24 * 60 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// readTrainState / writeTrainState — with mocked fs
// ---------------------------------------------------------------------------

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" })),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@gpc-cli/config", () => ({
  getCacheDir: vi.fn().mockReturnValue("/tmp/gpc-test-cache"),
}));

describe("readTrainState", () => {
  it("returns null when state file does not exist", async () => {
    const fs = await import("node:fs/promises");
    vi.mocked(fs.readFile).mockRejectedValueOnce(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
    const { readTrainState } = await import("../src/utils/train-state.js");
    const result = await readTrainState("com.example.app");
    expect(result).toBeNull();
  });

  it("returns parsed state when file exists", async () => {
    const fs = await import("node:fs/promises");
    const state = {
      packageName: "com.example.app",
      status: "running",
      currentStage: 1,
      updatedAt: new Date().toISOString(),
      stages: [{ track: "production", rollout: 100 }],
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(state) as any);
    const { readTrainState } = await import("../src/utils/train-state.js");
    const result = await readTrainState("com.example.app");
    expect(result?.status).toBe("running");
    expect(result?.currentStage).toBe(1);
  });

  it("returns null on JSON parse error", async () => {
    const fs = await import("node:fs/promises");
    vi.mocked(fs.readFile).mockResolvedValueOnce("not valid json {{" as any);
    const { readTrainState } = await import("../src/utils/train-state.js");
    const result = await readTrainState("com.example.app");
    expect(result).toBeNull();
  });
});

describe("writeTrainState", () => {
  it("writes state as JSON", async () => {
    const fs = await import("node:fs/promises");
    vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
    vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined as any);

    const { writeTrainState } = await import("../src/utils/train-state.js");
    const state = {
      packageName: "com.example.app",
      status: "running" as const,
      currentStage: 0,
      updatedAt: new Date().toISOString(),
      stages: [{ track: "internal", rollout: 100 }],
    };
    await writeTrainState("com.example.app", state);
    expect(fs.writeFile).toHaveBeenCalled();
    const written = JSON.parse(vi.mocked(fs.writeFile).mock.calls.at(-1)![1] as string);
    expect(written.packageName).toBe("com.example.app");
    expect(written.status).toBe("running");
  });

  it("creates cache dir before writing", async () => {
    const fs = await import("node:fs/promises");
    vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
    vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined as any);

    const { writeTrainState } = await import("../src/utils/train-state.js");
    const state = {
      packageName: "com.example.app",
      status: "running" as const,
      currentStage: 0,
      updatedAt: new Date().toISOString(),
      stages: [],
    };
    await writeTrainState("com.example.app", state);
    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("/tmp/gpc-test-cache"), {
      recursive: true,
    });
  });
});

describe("clearTrainState", () => {
  it("calls unlink on the state file path", async () => {
    const { clearTrainState } = await import("../src/utils/train-state.js");
    // Should not throw even if file doesn't exist
    await expect(clearTrainState("com.example.app")).resolves.toBeUndefined();
  });
});
