import { describe, it, expect, vi, afterEach } from "vitest";
import type { AppStatus } from "@gpc-cli/core";

// A cached status must be rated against the thresholds of the current run, not
// the ones saved with it. Drives the real createProgram().

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
  };
});

const resolveAuth = vi.fn();
vi.mock("@gpc-cli/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/auth")>();
  return { ...actual, resolveAuth };
});

// Saved by an earlier `gpc status --threshold crashes=50` (0.5 as a fraction).
const cached: AppStatus = {
  packageName: "com.example.app",
  fetchedAt: new Date().toISOString(),
  cached: true,
  sections: ["releases", "vitals", "reviews"],
  releases: [],
  vitals: {
    windowDays: 7,
    crashes: { value: 0.005, threshold: 0.5, status: "ok" },
    anr: { value: 0.001, threshold: 0.01, status: "ok" },
    slowStarts: { value: 0.01, threshold: 0.05, status: "ok" },
    slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
  },
  reviews: {
    windowDays: 30,
    averageRating: undefined,
    previousAverageRating: undefined,
    totalNew: 0,
    positivePercent: undefined,
  },
};

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    loadStatusCache: vi.fn(async () => cached),
    saveStatusCache: vi.fn(),
  };
});

async function runCli(...args: string[]): Promise<AppStatus> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  process.argv = argv;
  try {
    const { createProgram } = await import("../src/program.js");
    const program = await createProgram();
    await program.parseAsync(argv);
    return JSON.parse(String(log.mock.calls[0]?.[0])) as AppStatus;
  } finally {
    process.argv = origArgv;
    log.mockRestore();
  }
}

describe("gpc status served from cache", () => {
  afterEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it("applies --threshold to a cached status", async () => {
    const out = await runCli("status", "-o", "json", "--threshold", "crashes=0.1");
    expect(out.vitals.crashes).toMatchObject({ threshold: 0.001, status: "breach" });
    expect(process.exitCode).toBe(6);
    expect(resolveAuth).not.toHaveBeenCalled();
  });

  it("uses the default threshold, not the one saved by an earlier run", async () => {
    const out = await runCli("status", "-o", "json");
    expect(out.vitals.crashes).toMatchObject({ threshold: 0.02, status: "ok" });
  });

  it("applies --threshold with --cached", async () => {
    const out = await runCli("status", "-o", "json", "--cached", "--threshold", "crashes=0.1");
    expect(out.vitals.crashes).toMatchObject({ threshold: 0.001, status: "breach" });
    expect(process.exitCode).toBe(6);
  });
});
