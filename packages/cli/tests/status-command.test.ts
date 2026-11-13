import { describe, it, expect, vi, afterEach } from "vitest";

// An unusable rate threshold must stop `gpc status` before any credentials are
// loaded or any API is called. Drives the real createProgram().

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({
      app: "com.example.app",
      vitals: { thresholds: { crashRate: 2 } },
    }),
  };
});

const resolveAuth = vi.fn();
vi.mock("@gpc-cli/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/auth")>();
  return { ...actual, resolveAuth };
});

async function runCli(...args: string[]): Promise<void> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  process.argv = argv;
  try {
    const { createProgram } = await import("../src/program.js");
    const program = await createProgram();
    await program.parseAsync(argv);
  } finally {
    process.argv = origArgv;
  }
}

describe("gpc status threshold validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it("rejects a config crashRate of 2 before authenticating", async () => {
    await expect(runCli("status")).rejects.toMatchObject({ code: "THRESHOLD_INVALID" });
    expect(resolveAuth).not.toHaveBeenCalled();
  });

  it("rejects --threshold anr=150 before authenticating", async () => {
    await expect(runCli("status", "--threshold", "anr=150")).rejects.toMatchObject({
      code: "THRESHOLD_INVALID",
    });
    expect(resolveAuth).not.toHaveBeenCalled();
  });
});
