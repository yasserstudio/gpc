import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Drives the REAL createProgram(); only the API client is mocked (T6).

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

const getClient = vi.fn();
vi.mock("../src/resolve.js", () => ({
  resolvePackageName: vi.fn().mockReturnValue("com.example.app"),
  getClient: (...a: unknown[]) => getClient(...a),
}));

async function runCli(...args: string[]): Promise<string> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  process.argv = argv;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    const { createProgram, runProgram } = await import("../src/program.js");
    const program = await createProgram();
    await runProgram(program, argv);
    return log.mock.calls.map((c) => String(c[0])).join("\n");
  } finally {
    process.argv = origArgv;
  }
}

const failure = (p: Promise<unknown>) =>
  p.then(
    () => undefined,
    (e: { code?: string; exitCode?: number }) => e,
  );

const cmd = ["purchases", "subscription", "cancel-transition", "tok-1"];

describe("purchases subscription cancel-transition", () => {
  const cancelPlanTransition = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    cancelPlanTransition.mockResolvedValue(undefined);
    getClient.mockResolvedValue({ purchases: { cancelPlanTransition } });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    getClient.mockReset();
    cancelPlanTransition.mockReset();
    process.exitCode = undefined;
  });

  it("calls cancelPlanTransition with the product and etag", async () => {
    const out = await runCli(...cmd, "--product-id", "premium", "--etag", "CgQIARAB", "--yes");
    expect(cancelPlanTransition).toHaveBeenCalledWith("com.example.app", "tok-1", {
      productId: "premium",
      etag: "CgQIARAB",
    });
    expect(out).toContain("cancelled");
  });

  it("--json prints a machine-readable result", async () => {
    const out = await runCli("--output", "json", ...cmd, "--product-id", "premium", "--yes");
    expect(JSON.parse(out)).toMatchObject({ productId: "premium", cancelled: true });
  });

  it("is labelled experimental in help", async () => {
    const { createProgram } = await import("../src/program.js");
    const program = await createProgram();
    const sub = program.commands
      .find((c) => c.name() === "purchases")!
      .commands.find((c) => c.name() === "subscription")!
      .commands.find((c) => c.name() === "cancel-transition")!;
    expect(sub.description()).toMatch(/experimental/i);
  });

  it("is a money confirm: non-interactive without --yes exits 2 and sends nothing", async () => {
    const err = await failure(runCli("--no-interactive", ...cmd, "--product-id", "premium"));
    expect(err).toMatchObject({ code: "CONFIRMATION_REQUIRED", exitCode: 2 });
    // Cancelling a pending change moves no money now; the suggestion must not claim it does.
    expect(err.suggestion).toContain("changes what the subscriber pays");
    expect(err.suggestion).not.toContain("moves money");
    expect(cancelPlanTransition).not.toHaveBeenCalled();
  });

  it("--dry-run is exempt from the money gate and sends nothing", async () => {
    const out = await runCli(
      "--no-interactive",
      "--dry-run",
      "--output",
      "json",
      ...cmd,
      "--product-id",
      "premium",
    );
    expect(getClient).not.toHaveBeenCalled();
    expect(out).toContain("premium");
  });

  it("--product-id is required (usage error, nothing sent)", async () => {
    const err = await failure(runCli(...cmd, "--yes"));
    expect(err?.exitCode).toBe(2);
    expect(cancelPlanTransition).not.toHaveBeenCalled();
  });

  it("a blank --product-id or --etag fails with exit 2 even on --dry-run", async () => {
    const err = await failure(runCli("--dry-run", ...cmd, "--product-id", " "));
    expect(err).toMatchObject({ code: "PRODUCT_ID_REQUIRED", exitCode: 2 });
    const err2 = await failure(
      runCli("--dry-run", ...cmd, "--product-id", "premium", "--etag", ""),
    );
    expect(err2).toMatchObject({ code: "SUBSCRIPTION_ETAG_BLANK", exitCode: 2 });
  });
});
