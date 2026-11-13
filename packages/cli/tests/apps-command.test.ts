import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `gpc apps info` used to read only its positional [package] and fall back to the
// config app, so `--app` (a root global option) was ignored. These tests drive the
// REAL createProgram(): a synthetic root without the global -a/--app cannot
// reproduce the collision.

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.profileapp" }),
  };
});

vi.mock("@gpc-cli/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/auth")>();
  return {
    ...actual,
    resolveAuth: vi.fn().mockResolvedValue({
      getClientEmail: () => "sa@example.iam.gserviceaccount.com",
      getAccessToken: vi.fn().mockResolvedValue({ token: "tok" }),
    }),
  };
});

const getAppInfo = vi.fn().mockResolvedValue({ packageName: "com.example.app" });

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return { ...actual, getAppInfo };
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

describe("gpc apps info package resolution", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it("--app after the subcommand wins over the profile's app", async () => {
    await runCli("apps", "info", "--app", "com.example.other");
    expect(getAppInfo).toHaveBeenCalledWith(expect.anything(), "com.example.other");
  });

  it("-a before the subcommand wins over the profile's app", async () => {
    await runCli("-a", "com.example.other", "apps", "info");
    expect(getAppInfo).toHaveBeenCalledWith(expect.anything(), "com.example.other");
  });

  it("the positional package wins over --app", async () => {
    await runCli("apps", "info", "com.example.positional", "--app", "com.example.other");
    expect(getAppInfo).toHaveBeenCalledWith(expect.anything(), "com.example.positional");
  });

  it("falls back to the configured app when neither is given", async () => {
    await runCli("apps", "info");
    expect(getAppInfo).toHaveBeenCalledWith(expect.anything(), "com.example.profileapp");
  });

  it("rejects a malformed --app before any API call", async () => {
    await expect(runCli("apps", "info", "--app", "=com.example.other")).rejects.toMatchObject({
      code: "INVALID_PACKAGE_NAME",
    });
    expect(getAppInfo).not.toHaveBeenCalled();
  });
});
