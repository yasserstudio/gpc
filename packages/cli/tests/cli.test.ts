import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { createProgram } from "../src/program";

// Mock external dependencies to avoid real file/API operations
vi.mock("@gpc/auth", () => ({
  resolveAuth: vi.fn(),
  loadServiceAccountKey: vi.fn(),
  AuthError: class AuthError extends Error {
    suggestion?: string;
  },
}));

vi.mock("@gpc/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
  setConfigValue: vi.fn().mockResolvedValue(undefined),
  getUserConfigPath: vi.fn().mockReturnValue("/home/user/.config/gpc/config.toml"),
  initConfig: vi.fn().mockResolvedValue("/home/user/.config/gpc/config.toml"),
}));

vi.mock("@gpc/core", () => ({
  detectOutputFormat: vi.fn().mockReturnValue("table"),
  formatOutput: vi.fn().mockImplementation((data: unknown) => JSON.stringify(data)),
  uploadRelease: vi.fn().mockResolvedValue({}),
  getReleasesStatus: vi.fn().mockResolvedValue([]),
  promoteRelease: vi.fn().mockResolvedValue({}),
  updateRollout: vi.fn().mockResolvedValue({}),
  listTracks: vi.fn().mockResolvedValue([]),
  getListings: vi.fn().mockResolvedValue([]),
  updateListing: vi.fn().mockResolvedValue({}),
  deleteListing: vi.fn().mockResolvedValue(undefined),
  pullListings: vi.fn().mockResolvedValue({ listings: [] }),
  pushListings: vi.fn().mockResolvedValue({ updated: 0, languages: [] }),
  listImages: vi.fn().mockResolvedValue([]),
  uploadImage: vi.fn().mockResolvedValue({}),
  deleteImage: vi.fn().mockResolvedValue(undefined),
  getCountryAvailability: vi.fn().mockResolvedValue({}),
  updateAppDetails: vi.fn().mockResolvedValue({}),
  getAppInfo: vi.fn().mockResolvedValue({}),
  listReviews: vi.fn().mockResolvedValue([]),
  getReview: vi.fn().mockResolvedValue({}),
  replyToReview: vi.fn().mockResolvedValue({}),
  exportReviews: vi.fn().mockResolvedValue("[]"),
  getVitalsOverview: vi.fn().mockResolvedValue({}),
  getVitalsCrashes: vi.fn().mockResolvedValue({ rows: [] }),
  getVitalsAnr: vi.fn().mockResolvedValue({ rows: [] }),
  getVitalsStartup: vi.fn().mockResolvedValue({ rows: [] }),
  getVitalsRendering: vi.fn().mockResolvedValue({ rows: [] }),
  getVitalsBattery: vi.fn().mockResolvedValue({ rows: [] }),
  getVitalsMemory: vi.fn().mockResolvedValue({ rows: [] }),
  getVitalsAnomalies: vi.fn().mockResolvedValue({ anomalies: [] }),
  searchVitalsErrors: vi.fn().mockResolvedValue({ errorIssues: [] }),
  checkThreshold: vi.fn().mockReturnValue({ breached: false, value: 0, threshold: 0 }),
  listSubscriptions: vi.fn().mockResolvedValue({ subscriptions: [] }),
  getSubscription: vi.fn().mockResolvedValue({}),
  createSubscription: vi.fn().mockResolvedValue({}),
  updateSubscription: vi.fn().mockResolvedValue({}),
  deleteSubscription: vi.fn().mockResolvedValue(undefined),
  activateBasePlan: vi.fn().mockResolvedValue({}),
  deactivateBasePlan: vi.fn().mockResolvedValue({}),
  deleteBasePlan: vi.fn().mockResolvedValue(undefined),
  migratePrices: vi.fn().mockResolvedValue({}),
  listOffers: vi.fn().mockResolvedValue({ subscriptionOffers: [] }),
  getOffer: vi.fn().mockResolvedValue({}),
  createOffer: vi.fn().mockResolvedValue({}),
  updateOffer: vi.fn().mockResolvedValue({}),
  deleteOffer: vi.fn().mockResolvedValue(undefined),
  activateOffer: vi.fn().mockResolvedValue({}),
  deactivateOffer: vi.fn().mockResolvedValue({}),
  listInAppProducts: vi.fn().mockResolvedValue({ inappproduct: [] }),
  getInAppProduct: vi.fn().mockResolvedValue({}),
  createInAppProduct: vi.fn().mockResolvedValue({}),
  updateInAppProduct: vi.fn().mockResolvedValue({}),
  deleteInAppProduct: vi.fn().mockResolvedValue(undefined),
  syncInAppProducts: vi.fn().mockResolvedValue({ created: 0, updated: 0, unchanged: 0, skus: [] }),
  getProductPurchase: vi.fn().mockResolvedValue({}),
  acknowledgeProductPurchase: vi.fn().mockResolvedValue(undefined),
  consumeProductPurchase: vi.fn().mockResolvedValue(undefined),
  getSubscriptionPurchase: vi.fn().mockResolvedValue({}),
  cancelSubscriptionPurchase: vi.fn().mockResolvedValue(undefined),
  deferSubscriptionPurchase: vi.fn().mockResolvedValue({}),
  revokeSubscriptionPurchase: vi.fn().mockResolvedValue(undefined),
  listVoidedPurchases: vi.fn().mockResolvedValue({ voidedPurchases: [] }),
  refundOrder: vi.fn().mockResolvedValue(undefined),
  convertRegionPrices: vi.fn().mockResolvedValue({ convertedRegionPrices: {} }),
}));

vi.mock("@gpc/api", () => ({
  createApiClient: vi.fn().mockReturnValue({
    edits: { insert: vi.fn(), get: vi.fn(), validate: vi.fn(), commit: vi.fn(), delete: vi.fn() },
    details: { get: vi.fn() },
    bundles: { list: vi.fn(), upload: vi.fn() },
    tracks: { list: vi.fn(), get: vi.fn(), update: vi.fn() },
    reviews: { list: vi.fn(), get: vi.fn(), reply: vi.fn() },
  }),
  createReportingClient: vi.fn().mockReturnValue({
    queryMetricSet: vi.fn(),
    getAnomalies: vi.fn(),
    searchErrorIssues: vi.fn(),
    searchErrorReports: vi.fn(),
  }),
}));

describe("createProgram", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a Commander program instance", () => {
    expect(program).toBeInstanceOf(Command);
  });

  it('has name "gpc"', () => {
    expect(program.name()).toBe("gpc");
  });

  it('has version "0.0.0"', () => {
    expect(program.version()).toBe("0.0.0");
  });

  it("has all expected commands registered", () => {
    const commandNames = program.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain("auth");
    expect(commandNames).toContain("config");
    expect(commandNames).toContain("doctor");
    expect(commandNames).toContain("docs");
    expect(commandNames).toContain("releases");
    expect(commandNames).toContain("tracks");
    expect(commandNames).toContain("status");
    expect(commandNames).toContain("listings");
    expect(commandNames).toContain("apps");
    expect(commandNames).toContain("reviews");
    expect(commandNames).toContain("vitals");
    expect(commandNames).toContain("subscriptions");
    expect(commandNames).toContain("iap");
    expect(commandNames).toContain("purchases");
    expect(commandNames).toContain("pricing");
  });

  it("has all expected global options", () => {
    const optionFlags = program.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--output");
    expect(optionFlags).toContain("--verbose");
    expect(optionFlags).toContain("--quiet");
    expect(optionFlags).toContain("--app");
    expect(optionFlags).toContain("--profile");
    expect(optionFlags).toContain("--no-color");
    expect(optionFlags).toContain("--no-interactive");
  });
});

describe("command parsing", () => {
  let program: Command;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    program = await createProgram();
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gpc --help does not throw an unhandled error", async () => {
    try {
      await program.parseAsync(["node", "test", "--help"]);
    } catch (err: unknown) {
      // Commander throws CommanderError with code "commander.helpDisplayed"
      expect((err as { code: string }).code).toBe("commander.helpDisplayed");
    }
  });

  it('gpc --version outputs "0.0.0"', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    try {
      await program.parseAsync(["node", "test", "--version"]);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("commander.version");
    }

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("0.0.0");
  });

  it("gpc auth --help shows auth subcommands", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    // Subcommands inherit exitOverride, but in some Commander versions they
    // write help to stdout without throwing. Handle both cases.
    let threw = false;
    try {
      await program.parseAsync(["node", "test", "auth", "--help"]);
    } catch {
      threw = true;
    }

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    // Whether it threw or not, help text should have been written
    expect(output).toContain("login");
    expect(output).toContain("status");
    expect(output).toContain("logout");
    expect(output).toContain("whoami");
  });

  it("gpc config --help shows config subcommands", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    let threw = false;
    try {
      await program.parseAsync(["node", "test", "config", "--help"]);
    } catch {
      threw = true;
    }

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("init");
    expect(output).toContain("show");
    expect(output).toContain("set");
    expect(output).toContain("path");
  });
});

describe("auth subcommands", () => {
  let program: Command;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    program = await createProgram();
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gpc auth login without flags shows usage help", async () => {
    await program.parseAsync(["node", "test", "auth", "login"]);

    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("Usage: gpc auth login --service-account <path>");
    expect(output).toContain("--adc");
  });
});

describe("config subcommands", () => {
  let program: Command;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    program = await createProgram();
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gpc config path outputs a path string", async () => {
    await program.parseAsync(["node", "test", "config", "path"]);

    expect(logSpy).toHaveBeenCalled();
    const output = String(logSpy.mock.calls[0]![0]);
    expect(output).toContain("/");
    expect(output).toContain("gpc");
  });
});

describe("releases subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("releases command has all expected subcommands", () => {
    const releasesCmd = program.commands.find((cmd) => cmd.name() === "releases");
    expect(releasesCmd).toBeDefined();
    const subcommandNames = releasesCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("upload");
    expect(subcommandNames).toContain("status");
    expect(subcommandNames).toContain("promote");
    expect(subcommandNames).toContain("rollout");
    expect(subcommandNames).toContain("notes");
  });
});

describe("tracks subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks command has list subcommand", () => {
    const tracksCmd = program.commands.find((cmd) => cmd.name() === "tracks");
    expect(tracksCmd).toBeDefined();
    const subcommandNames = tracksCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
  });
});

describe("releases rollout subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rollout command has all expected subcommands", () => {
    const releasesCmd = program.commands.find((cmd) => cmd.name() === "releases");
    expect(releasesCmd).toBeDefined();
    const rolloutCmd = releasesCmd!.commands.find((cmd) => cmd.name() === "rollout");
    expect(rolloutCmd).toBeDefined();
    const subcommandNames = rolloutCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("increase");
    expect(subcommandNames).toContain("halt");
    expect(subcommandNames).toContain("resume");
    expect(subcommandNames).toContain("complete");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – listings subcommands
// ---------------------------------------------------------------------------
describe("listings subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("listings command has all expected subcommands", () => {
    const listingsCmd = program.commands.find((cmd) => cmd.name() === "listings");
    expect(listingsCmd).toBeDefined();
    const subcommandNames = listingsCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("get");
    expect(subcommandNames).toContain("update");
    expect(subcommandNames).toContain("delete");
    expect(subcommandNames).toContain("pull");
    expect(subcommandNames).toContain("push");
    expect(subcommandNames).toContain("images");
    expect(subcommandNames).toContain("availability");
  });

  it("listings images command has list/upload/delete subcommands", () => {
    const listingsCmd = program.commands.find((cmd) => cmd.name() === "listings");
    const imagesCmd = listingsCmd!.commands.find((cmd) => cmd.name() === "images");
    expect(imagesCmd).toBeDefined();
    const subcommandNames = imagesCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
    expect(subcommandNames).toContain("upload");
    expect(subcommandNames).toContain("delete");
  });

  it("listings --help shows description", async () => {
    program.exitOverride();
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await program.parseAsync(["node", "test", "listings", "--help"]);
    } catch {
      // Commander throws on help display
    }

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Manage store listings");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – apps subcommands
// ---------------------------------------------------------------------------
describe("apps subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("apps command has info, update, and list subcommands", () => {
    const appsCmd = program.commands.find((cmd) => cmd.name() === "apps");
    expect(appsCmd).toBeDefined();
    const subcommandNames = appsCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("info");
    expect(subcommandNames).toContain("update");
    expect(subcommandNames).toContain("list");
  });

  it("apps update command has expected options", () => {
    const appsCmd = program.commands.find((cmd) => cmd.name() === "apps");
    const updateCmd = appsCmd!.commands.find((cmd) => cmd.name() === "update");
    expect(updateCmd).toBeDefined();
    const optionFlags = updateCmd!.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--email");
    expect(optionFlags).toContain("--phone");
    expect(optionFlags).toContain("--website");
    expect(optionFlags).toContain("--default-lang");
  });
});

// ---------------------------------------------------------------------------
// Phase 5 – reviews subcommands
// ---------------------------------------------------------------------------
describe("reviews subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reviews command has all expected subcommands", () => {
    const reviewsCmd = program.commands.find((cmd) => cmd.name() === "reviews");
    expect(reviewsCmd).toBeDefined();
    const subcommandNames = reviewsCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
    expect(subcommandNames).toContain("get");
    expect(subcommandNames).toContain("reply");
    expect(subcommandNames).toContain("export");
  });

  it("reviews list has expected options", () => {
    const reviewsCmd = program.commands.find((cmd) => cmd.name() === "reviews");
    const listCmd = reviewsCmd!.commands.find((cmd) => cmd.name() === "list");
    expect(listCmd).toBeDefined();
    const optionFlags = listCmd!.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--stars");
    expect(optionFlags).toContain("--lang");
    expect(optionFlags).toContain("--since");
    expect(optionFlags).toContain("--translate-to");
    expect(optionFlags).toContain("--max");
  });
});

// ---------------------------------------------------------------------------
// Phase 5 – vitals subcommands
// ---------------------------------------------------------------------------
describe("vitals subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("vitals command has all expected subcommands", () => {
    const vitalsCmd = program.commands.find((cmd) => cmd.name() === "vitals");
    expect(vitalsCmd).toBeDefined();
    const subcommandNames = vitalsCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("overview");
    expect(subcommandNames).toContain("crashes");
    expect(subcommandNames).toContain("anr");
    expect(subcommandNames).toContain("startup");
    expect(subcommandNames).toContain("rendering");
    expect(subcommandNames).toContain("battery");
    expect(subcommandNames).toContain("memory");
    expect(subcommandNames).toContain("anomalies");
    expect(subcommandNames).toContain("errors");
  });

  it("vitals metric commands have threshold option", () => {
    const vitalsCmd = program.commands.find((cmd) => cmd.name() === "vitals");
    const crashesCmd = vitalsCmd!.commands.find((cmd) => cmd.name() === "crashes");
    expect(crashesCmd).toBeDefined();
    const optionFlags = crashesCmd!.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--dim");
    expect(optionFlags).toContain("--days");
    expect(optionFlags).toContain("--threshold");
  });

  it("vitals errors has search subcommand", () => {
    const vitalsCmd = program.commands.find((cmd) => cmd.name() === "vitals");
    const errorsCmd = vitalsCmd!.commands.find((cmd) => cmd.name() === "errors");
    expect(errorsCmd).toBeDefined();
    const subcommandNames = errorsCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("search");
  });

  it("vitals --help shows description", async () => {
    program.exitOverride();
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await program.parseAsync(["node", "test", "vitals", "--help"]);
    } catch {
      // Commander throws on help display
    }

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("vitals");
  });
});

// ---------------------------------------------------------------------------
// Phase 6 – subscriptions subcommands
// ---------------------------------------------------------------------------
describe("subscriptions subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("subscriptions command has all expected subcommands", () => {
    const subsCmd = program.commands.find((cmd) => cmd.name() === "subscriptions");
    expect(subsCmd).toBeDefined();
    const subcommandNames = subsCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
    expect(subcommandNames).toContain("get");
    expect(subcommandNames).toContain("create");
    expect(subcommandNames).toContain("update");
    expect(subcommandNames).toContain("delete");
    expect(subcommandNames).toContain("base-plans");
    expect(subcommandNames).toContain("offers");
  });
});

// ---------------------------------------------------------------------------
// Phase 6 – iap subcommands
// ---------------------------------------------------------------------------
describe("iap subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("iap command has all expected subcommands", () => {
    const iapCmd = program.commands.find((cmd) => cmd.name() === "iap");
    expect(iapCmd).toBeDefined();
    const subcommandNames = iapCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
    expect(subcommandNames).toContain("get");
    expect(subcommandNames).toContain("create");
    expect(subcommandNames).toContain("update");
    expect(subcommandNames).toContain("delete");
    expect(subcommandNames).toContain("sync");
  });
});

// ---------------------------------------------------------------------------
// Phase 6 – purchases subcommands
// ---------------------------------------------------------------------------
describe("purchases subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("purchases command has all expected subcommands", () => {
    const purchasesCmd = program.commands.find((cmd) => cmd.name() === "purchases");
    expect(purchasesCmd).toBeDefined();
    const subcommandNames = purchasesCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("get");
    expect(subcommandNames).toContain("acknowledge");
    expect(subcommandNames).toContain("consume");
    expect(subcommandNames).toContain("subscription");
    expect(subcommandNames).toContain("voided");
    expect(subcommandNames).toContain("orders");
  });
});

// ---------------------------------------------------------------------------
// Phase 6 – pricing subcommands
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Phase 9 – dry-run helper
// ---------------------------------------------------------------------------
describe("isDryRun", () => {
  it("returns false when no --dry-run flag", async () => {
    const { isDryRun } = await import("../src/dry-run.js");
    const fakeProgram = { opts: () => ({}) } as any;
    expect(isDryRun(fakeProgram)).toBe(false);
  });

  it("walks parent chain to find root program opts", async () => {
    const { isDryRun } = await import("../src/dry-run.js");
    const root = { opts: () => ({ dryRun: true }), parent: null } as any;
    const child = { opts: () => ({}), parent: root } as any;
    expect(isDryRun(child)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 9 – dry-run option
// ---------------------------------------------------------------------------
describe("dry-run option", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("program has --dry-run option", () => {
    const optionFlags = program.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--dry-run");
  });
});

// ---------------------------------------------------------------------------
// Phase 9 – lazy loading / command structure
// ---------------------------------------------------------------------------
describe("createProgram command structure", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createProgram registers auth command with expected subcommands", () => {
    const authCmd = program.commands.find((cmd) => cmd.name() === "auth");
    expect(authCmd).toBeDefined();
    const subNames = authCmd!.commands.map((cmd) => cmd.name());
    expect(subNames).toContain("login");
    expect(subNames).toContain("status");
    expect(subNames).toContain("logout");
    expect(subNames).toContain("whoami");
  });
});

// ---------------------------------------------------------------------------
// Phase 9 – networking
// ---------------------------------------------------------------------------
describe("setupNetworking", () => {
  const originalCaCert = process.env["GPC_CA_CERT"];
  const originalNodeCa = process.env["NODE_EXTRA_CA_CERTS"];

  afterEach(() => {
    if (originalCaCert !== undefined) {
      process.env["GPC_CA_CERT"] = originalCaCert;
    } else {
      delete process.env["GPC_CA_CERT"];
    }
    if (originalNodeCa !== undefined) {
      process.env["NODE_EXTRA_CA_CERTS"] = originalNodeCa;
    } else {
      delete process.env["NODE_EXTRA_CA_CERTS"];
    }
    vi.restoreAllMocks();
  });

  it("maps GPC_CA_CERT to NODE_EXTRA_CA_CERTS", async () => {
    delete process.env["NODE_EXTRA_CA_CERTS"];
    process.env["GPC_CA_CERT"] = "/path/to/ca-bundle.crt";

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();

    expect(process.env["NODE_EXTRA_CA_CERTS"]).toBe("/path/to/ca-bundle.crt");
  });
});

describe("pricing subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pricing command has convert subcommand", () => {
    const pricingCmd = program.commands.find((cmd) => cmd.name() === "pricing");
    expect(pricingCmd).toBeDefined();
    const subcommandNames = pricingCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("convert");
  });
});
