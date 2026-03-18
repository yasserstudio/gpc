import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { createProgram } from "../src/program";

// Mock external dependencies to avoid real file/API operations
vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn(),
  loadServiceAccountKey: vi.fn(),
  AuthError: class AuthError extends Error {
    suggestion?: string;
  },
}));

vi.mock("@gpc-cli/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
  setConfigValue: vi.fn().mockResolvedValue(undefined),
  getUserConfigPath: vi.fn().mockReturnValue("/home/user/.config/gpc/config.toml"),
  initConfig: vi.fn().mockResolvedValue("/home/user/.config/gpc/config.toml"),
  getConfigDir: vi.fn().mockReturnValue("/home/user/.config/gpc"),
}));

vi.mock("@gpc-cli/core", () => {
  // Inline PluginManager mock for CLI tests
  class MockPluginManager {
    private plugins: any[] = [];
    private commands: any[] = [];
    async load() {}
    async runBeforeCommand() {}
    async runAfterCommand() {}
    async runOnError() {}
    async runBeforeRequest() {}
    async runAfterResponse() {}
    getRegisteredCommands() {
      return [...this.commands];
    }
    getLoadedPlugins() {
      return [...this.plugins];
    }
    hasRequestHooks() {
      return false;
    }
    reset() {
      this.plugins = [];
      this.commands = [];
    }
    // Test helpers
    _addPlugin(p: any) {
      this.plugins.push(p);
    }
    _addCommand(c: any) {
      this.commands.push(c);
    }
  }

  return {
    PluginManager: MockPluginManager,
    discoverPlugins: vi.fn().mockResolvedValue([]),
    detectOutputFormat: vi.fn().mockReturnValue("table"),
    formatOutput: vi.fn().mockImplementation((data: unknown) => JSON.stringify(data)),
    uploadRelease: vi.fn().mockResolvedValue({}),
    getReleasesStatus: vi.fn().mockResolvedValue([]),
    promoteRelease: vi.fn().mockResolvedValue({}),
    updateRollout: vi.fn().mockResolvedValue({}),
    listTracks: vi.fn().mockResolvedValue([]),
    createTrack: vi.fn().mockResolvedValue({ track: "custom", releases: [] }),
    updateTrackConfig: vi.fn().mockResolvedValue({ track: "beta", releases: [] }),
    uploadExternallyHosted: vi.fn().mockResolvedValue({ externallyHostedApk: { versionCode: 1 } }),
    getListings: vi.fn().mockResolvedValue([]),
    updateListing: vi.fn().mockResolvedValue({}),
    deleteListing: vi.fn().mockResolvedValue(undefined),
    pullListings: vi.fn().mockResolvedValue({ listings: [] }),
    pushListings: vi.fn().mockResolvedValue({ updated: 0, languages: [] }),
    listImages: vi.fn().mockResolvedValue([]),
    uploadImage: vi.fn().mockResolvedValue({}),
    deleteImage: vi.fn().mockResolvedValue(undefined),
    exportImages: vi.fn().mockResolvedValue({ languages: 1, images: 5, totalSize: 50000 }),
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
    syncInAppProducts: vi
      .fn()
      .mockResolvedValue({ created: 0, updated: 0, unchanged: 0, skus: [] }),
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
    // v0.9.7 – listings diff
    diffListingsCommand: vi.fn().mockResolvedValue({ diffs: [] }),
    // v0.9.7 – sort utility
    sortResults: vi.fn().mockImplementation((data: unknown[]) => data),
    // v0.9.29 – spinner
    createSpinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn(), fail: vi.fn(), update: vi.fn() }),
    // v0.9.7 – app recovery
    listRecoveryActions: vi.fn().mockResolvedValue([]),
    cancelRecoveryAction: vi.fn().mockResolvedValue({}),
    deployRecoveryAction: vi.fn().mockResolvedValue({}),
    createRecoveryAction: vi.fn().mockResolvedValue({}),
    addRecoveryTargeting: vi.fn().mockResolvedValue({}),
    // v0.9.7 – data safety
    getDataSafety: vi.fn().mockResolvedValue({}),
    updateDataSafety: vi.fn().mockResolvedValue({}),
    exportDataSafety: vi.fn().mockResolvedValue({}),
    importDataSafety: vi.fn().mockResolvedValue({}),
    // v0.9.7 – external transactions
    createExternalTransaction: vi.fn().mockResolvedValue({}),
    getExternalTransaction: vi.fn().mockResolvedValue({}),
    refundExternalTransaction: vi.fn().mockResolvedValue({}),
    // v0.9.7 – git-based release notes
    generateNotesFromGit: vi.fn().mockResolvedValue({ language: "en-US", text: "notes", commitCount: 1, since: "v1.0.0" }),
    // device tiers
    listDeviceTiers: vi.fn().mockResolvedValue([]),
    getDeviceTier: vi.fn().mockResolvedValue({}),
    createDeviceTier: vi.fn().mockResolvedValue({}),
    // v0.9.7 – webhooks
    sendWebhook: vi.fn().mockResolvedValue(undefined),
    formatSlackPayload: vi.fn().mockReturnValue({}),
    formatDiscordPayload: vi.fn().mockReturnValue({}),
    formatCustomPayload: vi.fn().mockReturnValue({}),
    // v0.9.7 – audit
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
    createAuditEntry: vi.fn().mockReturnValue({}),
    initAudit: vi.fn().mockResolvedValue(undefined),
    listAuditEvents: vi.fn().mockResolvedValue([]),
    searchAuditEvents: vi.fn().mockResolvedValue([]),
    clearAuditLog: vi.fn().mockResolvedValue({ deleted: 3, remaining: 0 }),
    // one-time products (OTP)
    listOneTimeProducts: vi.fn().mockResolvedValue({ oneTimeProducts: [] }),
    getOneTimeProduct: vi.fn().mockResolvedValue({}),
    createOneTimeProduct: vi.fn().mockResolvedValue({}),
    updateOneTimeProduct: vi.fn().mockResolvedValue({}),
    deleteOneTimeProduct: vi.fn().mockResolvedValue(undefined),
    listOneTimeOffers: vi.fn().mockResolvedValue({ oneTimeOffers: [] }),
    getOneTimeOffer: vi.fn().mockResolvedValue({}),
    createOneTimeOffer: vi.fn().mockResolvedValue({}),
    updateOneTimeOffer: vi.fn().mockResolvedValue({}),
    deleteOneTimeOffer: vi.fn().mockResolvedValue(undefined),
    // internal sharing & generated APKs
    uploadInternalSharing: vi.fn().mockResolvedValue({ downloadUrl: "", sha256: "", certificateFingerprint: "", fileType: "bundle" }),
    listGeneratedApks: vi.fn().mockResolvedValue([]),
    downloadGeneratedApk: vi.fn().mockResolvedValue({ path: "/tmp/out.apk", sizeBytes: 1024 }),
    // migrate
    detectFastlane: vi.fn().mockResolvedValue({ hasFastfile: false, hasAppfile: false, hasMetadata: false, hasGemfile: false, lanes: [], metadataLanguages: [] }),
    generateMigrationPlan: vi.fn().mockReturnValue({ config: {}, checklist: [], warnings: [] }),
    writeMigrationOutput: vi.fn().mockResolvedValue([]),
    // v0.9.35 new exports
    getVitalsLmk: vi.fn().mockResolvedValue({ rows: [] }),
    compareVitalsTrend: vi.fn().mockResolvedValue({ metric: "crashRateMetricSet", current: 0, previous: 0, changePercent: 0, direction: "unchanged" }),
    compareVersionVitals: vi.fn().mockResolvedValue({ v1: { versionCode: "1" }, v2: { versionCode: "2" }, regressions: [] }),
    watchVitalsWithAutoHalt: vi.fn().mockReturnValue(() => {}),
    analyzeReviews: vi.fn().mockResolvedValue({ totalReviews: 0, avgRating: 0, sentiment: { positive: 0, negative: 0, neutral: 0, avgScore: 0 }, topics: [], keywords: [], ratingDistribution: {} }),
    maybePaginate: vi.fn().mockResolvedValue(undefined),
    listGrants: vi.fn().mockResolvedValue([]),
    createGrant: vi.fn().mockResolvedValue({}),
    updateGrant: vi.fn().mockResolvedValue({}),
    deleteGrant: vi.fn().mockResolvedValue(undefined),
    startTrain: vi.fn().mockResolvedValue({ status: "running", currentStage: 0 }),
    getTrainStatus: vi.fn().mockResolvedValue(null),
    pauseTrain: vi.fn().mockResolvedValue(null),
    abortTrain: vi.fn().mockResolvedValue(undefined),
    advanceTrain: vi.fn().mockResolvedValue(null),
    getQuotaUsage: vi.fn().mockResolvedValue({ dailyCallsUsed: 0, dailyCallsLimit: 200000, dailyCallsRemaining: 200000, minuteCallsUsed: 0, minuteCallsLimit: 3000, minuteCallsRemaining: 3000, topCommands: [] }),
    getSubscriptionAnalytics: vi.fn().mockResolvedValue({ totalSubscriptions: 0, activeCount: 0, activeBasePlans: 0, trialBasePlans: 0, pausedBasePlans: 0, canceledBasePlans: 0, offerCount: 0, byProductId: [] }),
    diffSubscription: vi.fn().mockResolvedValue([]),
    listLeaderboards: vi.fn().mockResolvedValue([]),
    listAchievements: vi.fn().mockResolvedValue([]),
    listEvents: vi.fn().mockResolvedValue([]),
    listEnterpriseApps: vi.fn().mockResolvedValue([]),
    createEnterpriseApp: vi.fn().mockResolvedValue({}),
    analyzeBundle: vi.fn().mockResolvedValue({ filePath: "test.aab", fileType: "aab", totalCompressed: 0, totalUncompressed: 0, entryCount: 0, modules: [], categories: [], entries: [] }),
    compareBundles: vi.fn().mockReturnValue({ before: { path: "a.aab", totalCompressed: 0 }, after: { path: "b.aab", totalCompressed: 0 }, sizeDelta: 0, sizeDeltaPercent: 0, moduleDeltas: [], categoryDeltas: [] }),
    topFiles: vi.fn().mockReturnValue([]),
    checkBundleSize: vi.fn().mockResolvedValue({ passed: true, violations: [] }),
    refundSubscriptionV2: vi.fn().mockResolvedValue(undefined),
    lintListings: vi.fn().mockReturnValue([]),
    lintListing: vi.fn().mockReturnValue({ valid: true, fields: [] }),
    wordDiff: vi.fn().mockReturnValue([]),
    formatWordDiff: vi.fn().mockReturnValue(""),
    lintLocalListings: vi.fn().mockResolvedValue([]),
    analyzeRemoteListings: vi.fn().mockResolvedValue({ results: [], missingLocales: [] }),
    diffListingsEnhanced: vi.fn().mockResolvedValue([]),
    scaffoldPlugin: vi.fn().mockResolvedValue({ dir: "./gpc-plugin-test", files: [] }),
    DEFAULT_LIMITS: { title: 30, shortDescription: 80, fullDescription: 4000, video: 256 },
    // status
    getAppStatus: vi.fn().mockResolvedValue({ packageName: "com.example.app", fetchedAt: new Date().toISOString(), cached: false, sections: ["releases", "vitals", "reviews"], releases: [], vitals: { windowDays: 7, crashes: { value: undefined, threshold: 2, status: "unknown" }, anr: { value: undefined, threshold: 0.5, status: "unknown" }, slowStarts: { value: undefined, threshold: 25, status: "unknown" }, slowRender: { value: undefined, threshold: 50, status: "unknown" } }, reviews: { windowDays: 7, averageRating: undefined, previousAverageRating: undefined, totalNew: 0, positivePercent: undefined }, thresholdBreached: false }),
    formatStatusTable: vi.fn().mockReturnValue(""),
    formatStatusSummary: vi.fn().mockReturnValue(""),
    computeStatusDiff: vi.fn().mockReturnValue({ releases: [], vitals: {}, reviews: {} }),
    formatStatusDiff: vi.fn().mockReturnValue(""),
    loadStatusCache: vi.fn().mockResolvedValue(null),
    saveStatusCache: vi.fn().mockResolvedValue(undefined),
    statusHasBreach: vi.fn().mockReturnValue(false),
    runWatchLoop: vi.fn().mockResolvedValue(undefined),
    trackBreachState: vi.fn().mockReturnValue(false),
    sendNotification: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@gpc-cli/api", () => ({
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
  createUsersClient: vi.fn().mockReturnValue({
    grants: { list: vi.fn().mockResolvedValue({ grants: [] }), create: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }),
  createGamesClient: vi.fn().mockReturnValue({
    leaderboards: { list: vi.fn().mockResolvedValue({}), get: vi.fn(), getScores: vi.fn() },
    achievements: { list: vi.fn().mockResolvedValue({}), reveal: vi.fn() },
    events: { list: vi.fn().mockResolvedValue({}) },
  }),
  createEnterpriseClient: vi.fn().mockReturnValue({
    apps: { create: vi.fn(), list: vi.fn().mockResolvedValue({}) },
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
    expect(commandNames).toContain("recovery");
    expect(commandNames).toContain("data-safety");
    expect(commandNames).toContain("external-transactions");
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
    expect(optionFlags).toContain("--notify");
    expect(optionFlags).toContain("--ci");
    expect(optionFlags).toContain("--json");
    expect(optionFlags).toContain("--apps");
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
    expect(subcommandNames).toContain("upload-external");
  });

  it("releases upload-external has --url and --file options", () => {
    const releasesCmd = program.commands.find((cmd) => cmd.name() === "releases");
    const uploadExtCmd = releasesCmd!.commands.find((cmd) => cmd.name() === "upload-external");
    expect(uploadExtCmd).toBeDefined();
    const optionFlags = uploadExtCmd!.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--url");
    expect(optionFlags).toContain("--file");
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

  it("tracks command has list, create, update subcommands", () => {
    const tracksCmd = program.commands.find((cmd) => cmd.name() === "tracks");
    expect(tracksCmd).toBeDefined();
    const subcommandNames = tracksCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
    expect(subcommandNames).toContain("create");
    expect(subcommandNames).toContain("update");
  });

  it("tracks update has --file required option", () => {
    const tracksCmd = program.commands.find((cmd) => cmd.name() === "tracks");
    const updateCmd = tracksCmd!.commands.find((cmd) => cmd.name() === "update");
    expect(updateCmd).toBeDefined();
    const optionFlags = updateCmd!.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--file");
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

  it("listings images command has list/upload/delete/export subcommands", () => {
    const listingsCmd = program.commands.find((cmd) => cmd.name() === "listings");
    const imagesCmd = listingsCmd!.commands.find((cmd) => cmd.name() === "images");
    expect(imagesCmd).toBeDefined();
    const subcommandNames = imagesCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
    expect(subcommandNames).toContain("upload");
    expect(subcommandNames).toContain("export");
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
// migrate subcommands
// ---------------------------------------------------------------------------
describe("migrate subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("migrate command has fastlane subcommand", () => {
    const migrateCmd = program.commands.find((cmd) => cmd.name() === "migrate");
    expect(migrateCmd).toBeDefined();
    const subcommandNames = migrateCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("fastlane");
  });

  it("migrate fastlane has --dir and --output options", () => {
    const migrateCmd = program.commands.find((cmd) => cmd.name() === "migrate");
    const fastlaneCmd = migrateCmd!.commands.find((cmd) => cmd.name() === "fastlane");
    expect(fastlaneCmd).toBeDefined();
    const optionFlags = fastlaneCmd!.options.map((opt) => opt.long ?? opt.short);
    expect(optionFlags).toContain("--dir");
    expect(optionFlags).toContain("--output");
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
// Regression: gpc audit clear --dry-run must not delete entries (v0.9.27 fix)
// ---------------------------------------------------------------------------
describe("audit clear --dry-run regression", () => {
  it("passes dryRun=true to clearAuditLog when --dry-run flag is set on root program", async () => {
    const core = await import("@gpc-cli/core");
    const clearMock = vi.mocked(core.clearAuditLog);
    clearMock.mockResolvedValue({ deleted: 2, remaining: 0 });

    // Mock requireConfirm to avoid TTY requirement
    const promptModule = await import("../src/prompt.js");
    vi.spyOn(promptModule, "requireConfirm").mockResolvedValue(undefined);

    const prog = await createProgram();
    // Simulate global --dry-run consumed at the root level (the bug: opts.dryRun undefined in action)
    prog.setOptionValue("dryRun", true);
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => output.push(args.join(" ")));

    await prog.parseAsync(["node", "test", "audit", "clear"]);

    expect(clearMock).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(output.some((l) => l.includes("[dry-run]"))).toBe(true);

    vi.restoreAllMocks();
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

// ---------------------------------------------------------------------------
// Phase 8 – plugins command
// ---------------------------------------------------------------------------
describe("plugins command", () => {
  let program: Command;
  let logSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plugins list shows 'No plugins loaded' when none configured", async () => {
    program = await createProgram();
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await program.parseAsync(["node", "test", "plugins", "list"]);

    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("No plugins loaded");
  });

  it("plugins list shows loaded plugins", async () => {
    const { PluginManager } = await import("@gpc-cli/core");
    const manager = new PluginManager() as any;
    manager._addPlugin({ name: "@gpc-cli/plugin-ci", version: "0.8.0", trusted: true });
    manager._addPlugin({ name: "gpc-plugin-slack", version: "1.0.0", trusted: false });

    program = await createProgram(manager);
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await program.parseAsync(["node", "test", "plugins", "list"]);

    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("@gpc-cli/plugin-ci@0.8.0");
    expect(output).toContain("trusted");
    expect(output).toContain("gpc-plugin-slack@1.0.0");
    expect(output).toContain("third-party");
  });

  it("plugins command is registered", async () => {
    program = await createProgram();
    const commandNames = program.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain("plugins");
  });

  it("plugins list outputs JSON when --output json", async () => {
    const { PluginManager } = await import("@gpc-cli/core");
    const manager = new PluginManager() as any;
    manager._addPlugin({ name: "@gpc-cli/plugin-ci", version: "0.8.0", trusted: true });

    program = await createProgram(manager);
    program.exitOverride();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await program.parseAsync(["node", "test", "--output", "json", "plugins", "list"]);

    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    const parsed = JSON.parse(output);
    expect(parsed).toEqual([{ name: "@gpc-cli/plugin-ci", version: "0.8.0", trusted: true }]);
  });
});

// ---------------------------------------------------------------------------
// Phase 8 – plugin commands registration
// ---------------------------------------------------------------------------
describe("plugin commands registration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers plugin-defined commands on the program", async () => {
    const { PluginManager } = await import("@gpc-cli/core");
    const manager = new PluginManager() as any;
    manager._addCommand({
      name: "deploy",
      description: "Deploy to Play Store",
      action: vi.fn(),
    });

    const program = await createProgram(manager);
    const commandNames = program.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain("deploy");
  });

  it("plugin commands show in plugins list", async () => {
    const { PluginManager } = await import("@gpc-cli/core");
    const manager = new PluginManager() as any;
    manager._addPlugin({ name: "gpc-plugin-deploy", version: "1.0.0", trusted: false });
    manager._addCommand({
      name: "deploy",
      description: "Deploy to Play Store",
      action: vi.fn(),
    });

    const program = await createProgram(manager);
    program.exitOverride();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await program.parseAsync(["node", "test", "plugins", "list"]);

    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("deploy");
    expect(output).toContain("Deploy to Play Store");
  });
});

// ---------------------------------------------------------------------------
// Phase 8 – plugins init/approve/revoke subcommands
// ---------------------------------------------------------------------------
describe("plugins subcommands structure", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plugins command has init, approve, revoke subcommands", () => {
    const pluginsCmd = program.commands.find((cmd) => cmd.name() === "plugins");
    expect(pluginsCmd).toBeDefined();
    const subcommandNames = pluginsCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
    expect(subcommandNames).toContain("init");
    expect(subcommandNames).toContain("approve");
    expect(subcommandNames).toContain("revoke");
  });
});

// ---------------------------------------------------------------------------
// v0.9.7 – recovery subcommands
// ---------------------------------------------------------------------------
describe("recovery subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recovery command has list, cancel, deploy subcommands", () => {
    const recoveryCmd = program.commands.find((cmd) => cmd.name() === "recovery");
    expect(recoveryCmd).toBeDefined();
    const subcommandNames = recoveryCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("list");
    expect(subcommandNames).toContain("cancel");
    expect(subcommandNames).toContain("deploy");
  });
});

// ---------------------------------------------------------------------------
// v0.9.7 – data-safety subcommands
// ---------------------------------------------------------------------------
describe("data-safety subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("data-safety command has get, update, export subcommands", () => {
    const dataSafetyCmd = program.commands.find((cmd) => cmd.name() === "data-safety");
    expect(dataSafetyCmd).toBeDefined();
    const subcommandNames = dataSafetyCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("get");
    expect(subcommandNames).toContain("update");
    expect(subcommandNames).toContain("export");
  });
});

// ---------------------------------------------------------------------------
// v0.9.7 – external-transactions subcommands
// ---------------------------------------------------------------------------
describe("external-transactions subcommands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("external-transactions command has create, get, refund subcommands", () => {
    const extTxnCmd = program.commands.find((cmd) => cmd.name() === "external-transactions");
    expect(extTxnCmd).toBeDefined();
    const subcommandNames = extTxnCmd!.commands.map((cmd) => cmd.name());
    expect(subcommandNames).toContain("create");
    expect(subcommandNames).toContain("get");
    expect(subcommandNames).toContain("refund");
  });
});

// ---------------------------------------------------------------------------
// v0.9.33 – mock for updater (detectInstallMethod used by version command)
// ---------------------------------------------------------------------------
vi.mock("../src/updater.js", () => ({
  detectInstallMethod: vi.fn().mockReturnValue("npm"),
}));

// ---------------------------------------------------------------------------
// v0.9.29 – module-level mocks for file system and child_process
// (vi.mock calls are hoisted, so placement here is fine)
// ---------------------------------------------------------------------------
vi.mock("node:fs/promises", () => ({
  // Only stat and appendFile are used by the releases upload action.
  // Avoid importOriginal to prevent vi.restoreAllMocks() from restoring to real fs functions.
  stat: vi.fn().mockResolvedValue({ size: 5 * 1024 * 1024 }),
  appendFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFile: vi.fn().mockImplementation(
      (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
        if (typeof cb === "function") cb(null);
      },
    ),
  };
});

// ---------------------------------------------------------------------------
// v0.9.29 – releases upload --rollout validation
// ---------------------------------------------------------------------------
describe("releases upload --rollout validation", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    // Re-establish stat mock after previous test's vi.restoreAllMocks() may have cleared it
    const fsPromises = await import("node:fs/promises");
    vi.mocked(fsPromises.stat).mockResolvedValue({ size: 5 * 1024 * 1024 } as any);
  });

  afterEach(() => vi.restoreAllMocks());

  it("--rollout 0 exits 2 before auth", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "upload", "app.aab", "--rollout", "0"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("--rollout must be a number between 1 and 100"));
  });

  it("--rollout 101 exits 2 before auth", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "upload", "app.aab", "--rollout", "101"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("--rollout must be a number between 1 and 100"));
  });

  it("--rollout abc exits 2", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "upload", "app.aab", "--rollout", "abc"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it("invalid file extension exits 2 before auth", async () => {
    // Extension check runs after stat (stat succeeds with 5MB mock), still exits 2 before auth
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "upload", "myapp.ipa"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Expected .aab or .apk file"),
    );
  });

  it("spinner message includes filename and size in MB", async () => {
    // beforeEach establishes stat at 5MB; just verify the spinner picks it up
    const core = await import("@gpc-cli/core");
    const spinnerMock = { start: vi.fn(), stop: vi.fn(), fail: vi.fn(), update: vi.fn() };
    vi.mocked(core.createSpinner).mockReturnValueOnce(spinnerMock as any);

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "upload", "my-app.aab"]);

    const createSpinnerMock = vi.mocked(core.createSpinner);
    const spinnerArg = createSpinnerMock.mock.calls.at(-1)?.[0] as string | undefined;
    expect(spinnerArg).toContain("my-app.aab");
    expect(spinnerArg).toMatch(/\d+\.\d+ MB/);
  });
});

// ---------------------------------------------------------------------------
// v0.9.29 – releases promote validation
// ---------------------------------------------------------------------------
describe("releases promote validation", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("--from internal --to internal exits 2 (same track)", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "promote", "--from", "internal", "--to", "internal"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("must be different tracks"));
  });

  it("--rollout 0 exits 2", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "promote", "--from", "internal", "--to", "production", "--rollout", "0"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("--rollout must be a number between 1 and 100"));
  });

  it("--rollout 101 exits 2", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "promote", "--from", "internal", "--to", "production", "--rollout", "101"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// v0.9.29 – releases rollout increase --to validation
// ---------------------------------------------------------------------------
describe("releases rollout increase --to validation", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("--to 0 exits 2", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "rollout", "increase", "--track", "production", "--to", "0"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("--to must be a number between 1 and 100"));
  });

  it("--to 101 exits 2", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "rollout", "increase", "--track", "production", "--to", "101"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it("dry-run with --to 25 shows '25%' in details output", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const program = await createProgram();
    await program.parseAsync([
      "node", "gpc", "--app", "com.example.app", "--dry-run",
      "releases", "rollout", "increase", "--track", "production", "--to", "25",
    ]);

    // printDryRun calls formatOutput(data, format) — formatOutput mock returns JSON.stringify(data)
    // the data includes details: { percentage: "25%" }
    const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("25%");
  });
});

// ---------------------------------------------------------------------------
// v0.9.29 – releases status userFraction display
// ---------------------------------------------------------------------------
describe("releases status userFraction display", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders userFraction 0.1 as '10%'", async () => {
    const core = await import("@gpc-cli/core");
    vi.mocked(core.getReleasesStatus).mockResolvedValueOnce([
      { track: "production", status: "completed", name: "v1.0", versionCodes: ["100"], userFraction: 0.1 },
    ] as any);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "status"]);

    // formatOutput mock returns JSON.stringify(data); check what it was called with
    const formatOutputMock = vi.mocked(core.formatOutput);
    const rowsArg = formatOutputMock.mock.calls.at(-1)?.[0] as unknown[];
    expect(rowsArg).toEqual(expect.arrayContaining([
      expect.objectContaining({ userFraction: "10%" }),
    ]));
  });

  it("renders undefined userFraction as '—'", async () => {
    const core = await import("@gpc-cli/core");
    vi.mocked(core.getReleasesStatus).mockResolvedValueOnce([
      { track: "internal", status: "completed", name: "v1.0", versionCodes: ["100"] },
    ] as any);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "status"]);

    const formatOutputMock = vi.mocked(core.formatOutput);
    const rowsArg = formatOutputMock.mock.calls.at(-1)?.[0] as unknown[];
    expect(rowsArg).toEqual(expect.arrayContaining([
      expect.objectContaining({ userFraction: "—" }),
    ]));
  });

  it("sorts production before internal by default", async () => {
    const core = await import("@gpc-cli/core");
    vi.mocked(core.getReleasesStatus).mockResolvedValueOnce([
      { track: "internal", status: "completed", name: "v1", versionCodes: ["101"] },
      { track: "production", status: "completed", name: "v1", versionCodes: ["100"] },
    ] as any);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "status"]);

    const formatOutputMock = vi.mocked(core.formatOutput);
    const rowsArg = formatOutputMock.mock.calls.at(-1)?.[0] as Array<{ track: string }>;
    expect(rowsArg).toBeDefined();
    const prodIdx = rowsArg!.findIndex((r) => r.track === "production");
    const internalIdx = rowsArg!.findIndex((r) => r.track === "internal");
    expect(prodIdx).toBeLessThan(internalIdx);
  });
});

// ---------------------------------------------------------------------------
// v0.9.29 – releases notes set honest stub
// ---------------------------------------------------------------------------
describe("releases notes set honest stub", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("exits 1 with 'not yet implemented' message", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "notes", "set", "--track", "internal", "--notes", "Test notes"]),
    ).rejects.toThrow("process.exit(1)");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("not implemented"));
  });

  it("error message includes suggestion to use --notes with upload/publish", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "releases", "notes", "set", "--track", "internal", "--notes", "Test notes"]),
    ).rejects.toThrow("process.exit(1)");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("gpc releases upload"));
  });
});

// ---------------------------------------------------------------------------
// v0.9.29 – gpc status --days validation
// ---------------------------------------------------------------------------
describe("gpc status --days validation", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("--days 0 exits 2", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "status", "--days", "0"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("--days must be a positive integer"));
  });

  it("--days -1 exits 2", async () => {
    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "--app", "com.example.app", "status", "--days", "-1"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// v0.9.29 – gpc status --watch + --since-last warning
// ---------------------------------------------------------------------------
describe("gpc status --watch + --since-last warning", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits stderr warning when --since-last used with --watch", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const core = await import("@gpc-cli/core");
    // runWatchLoop is not in the mock — stub it here so the test doesn't hang
    (core as any).runWatchLoop = vi.fn().mockResolvedValue(undefined);

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "--app", "com.example.app", "status", "--watch", "10", "--since-last"]);

    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(stderrOutput).toContain("--since-last is not supported with --watch");
  });
});

// ---------------------------------------------------------------------------
// v0.9.29 – gpc docs routing and --list
// ---------------------------------------------------------------------------
describe("gpc docs routing", () => {
  afterEach(() => vi.restoreAllMocks());

  it("gpc docs releases calls execFile with URL containing 'commands/releases'", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const childProcess = await import("node:child_process");
    const execFileMock = vi.mocked(childProcess.execFile);

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "docs", "releases"]);

    expect(execFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.stringContaining("commands/releases")]),
      expect.any(Function),
    );
  });

  it("gpc docs bogus exits 2 with 'Unknown topic' message", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    const program = await createProgram();
    await expect(
      program.parseAsync(["node", "gpc", "docs", "bogus-topic"]),
    ).rejects.toThrow("process.exit(2)");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown topic"));
  });

  it("gpc docs --list prints available topics to stdout", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "docs", "--list"]);

    const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("Available topics:");
    expect(output).toContain("gpc docs releases");
    expect(output).toContain("gpc docs status");
  });
});

// ---------------------------------------------------------------------------
// v0.9.29 – audit list human-readable timestamps
// ---------------------------------------------------------------------------
describe("audit list human-readable timestamps", () => {
  afterEach(() => vi.restoreAllMocks());

  it("formats recent audit entry with relative time (not raw ISO)", async () => {
    const core = await import("@gpc-cli/core");
    const recentTs = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    vi.mocked(core.listAuditEvents).mockResolvedValueOnce([
      { timestamp: recentTs, command: "releases upload", app: "com.example", success: true } as any,
    ]);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "audit", "list"]);

    // formatOutput is called with rows that have relative timestamps
    const formatOutputMock = vi.mocked(core.formatOutput);
    const rowsArg = formatOutputMock.mock.calls.at(-1)?.[0] as Array<{ timestamp: string }>;
    expect(rowsArg).toBeDefined();
    expect(rowsArg![0]?.timestamp).not.toBe(recentTs);
    expect(rowsArg![0]?.timestamp).toContain("min ago");
  });

  it("JSON output preserves raw ISO timestamp", async () => {
    const core = await import("@gpc-cli/core");
    const ts = "2026-03-17T14:23:45.123Z";
    vi.mocked(core.listAuditEvents).mockResolvedValueOnce([
      { timestamp: ts, command: "releases upload", app: "com.example", success: true } as any,
    ]);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const program = await createProgram();
    await program.parseAsync(["node", "gpc", "--output", "json", "audit", "list"]);

    // In JSON mode, formatOutput is called with raw events (not transformed rows)
    const formatOutputMock = vi.mocked(core.formatOutput);
    const eventsArg = formatOutputMock.mock.calls.at(-1)?.[0] as Array<{ timestamp: string }>;
    expect(eventsArg).toBeDefined();
    expect(eventsArg![0]?.timestamp).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// v0.9.33 – Bug D: gpc version --json
// ---------------------------------------------------------------------------
describe("gpc version command (Bug D fix)", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gpc version outputs plain version string", async () => {
    const program = await createProgram();
    program.exitOverride();
    await program.parseAsync(["node", "test", "version"]);
    expect(logSpy).toHaveBeenCalledWith("0.0.0");
  });

  it("gpc version --output json outputs structured JSON", async () => {
    const program = await createProgram();
    program.exitOverride();
    await program.parseAsync(["node", "test", "--output", "json", "version"]);
    const raw = logSpy.mock.calls[0]?.[0] as string;
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed["version"]).toBe("0.0.0");
    expect(parsed["node"]).toBe(process.version);
    expect(typeof parsed["platform"]).toBe("string");
    expect(parsed["installMethod"]).toBe("npm");
  });

  it("gpc version --json flag (via --output json alias) outputs structured JSON", async () => {
    // Simulate what bin.ts does: --json is converted to --output json
    const program = await createProgram();
    program.exitOverride();
    // Directly set the root output option (equivalent to bin.ts --json → --output json transform)
    program.setOptionValue("output", "json");
    await program.parseAsync(["node", "test", "version"]);
    const raw = logSpy.mock.calls[0]?.[0] as string;
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed["version"]).toBe("0.0.0");
    expect(parsed["installMethod"]).toBe("npm");
  });
});

// ---------------------------------------------------------------------------
// v0.9.33 – Bug E: GPC_DEBUG=1 must not mutate process.argv
// ---------------------------------------------------------------------------
describe("GPC_DEBUG env var (Bug E fix)", () => {
  it("does not inject --verbose into process.argv", async () => {
    const original = [...process.argv];
    process.env["GPC_DEBUG"] = "1";
    try {
      // createProgram does not touch process.argv — the fix is in bin.ts
      // which calls program.setOptionValueWithSource after createProgram.
      // Here we verify the mechanism works without argv mutation.
      const program = await createProgram();
      program.setOptionValueWithSource("verbose", true, "env");
      expect(process.argv).toEqual(original);
      expect(program.opts()["verbose"]).toBe(true);
    } finally {
      delete process.env["GPC_DEBUG"];
    }
  });

  it("gpc apps list does not throw with --verbose set via env mechanism", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const program = await createProgram();
    program.exitOverride();
    // Simulate bin.ts GPC_DEBUG handling: set verbose without touching argv
    program.setOptionValueWithSource("verbose", true, "env");
    // Should parse cleanly with no extra positional args
    await expect(
      program.parseAsync(["node", "test", "apps", "list"])
    ).resolves.not.toThrow();
    vi.restoreAllMocks();
  });
});
