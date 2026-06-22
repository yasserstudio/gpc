import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Command } from "commander";

const mocks = vi.hoisted(() => ({
  achievementsList: vi.fn().mockResolvedValue({ items: [] }),
  achievementsGet: vi.fn().mockResolvedValue({ id: "ach-1" }),
  achievementsInsert: vi.fn().mockResolvedValue({ id: "ach-new" }),
  achievementsUpdate: vi.fn().mockResolvedValue({ id: "ach-1" }),
  achievementsDelete: vi.fn().mockResolvedValue(undefined),
  leaderboardsList: vi.fn().mockResolvedValue({ items: [] }),
  leaderboardsGet: vi.fn().mockResolvedValue({ id: "lb-1" }),
  leaderboardsInsert: vi.fn().mockResolvedValue({ id: "lb-new" }),
  leaderboardsUpdate: vi.fn().mockResolvedValue({ id: "lb-1" }),
  leaderboardsDelete: vi.fn().mockResolvedValue(undefined),
  loadConfig: vi.fn().mockResolvedValue({
    games: { applicationId: "999888777" },
    auth: { serviceAccount: "/tmp/sa.json" },
  }),
  readJsonFile: vi.fn().mockResolvedValue({
    achievementType: "STANDARD",
    initialState: "HIDDEN",
    draft: {
      name: { translations: [{ locale: "en-US", value: "Test" }] },
      description: { translations: [{ locale: "en-US", value: "Test desc" }] },
      pointValue: 5,
    },
  }),
}));

vi.mock("@gpc-cli/auth", () => ({
  resolveAuth: vi.fn().mockResolvedValue({ getAccessToken: vi.fn() }),
}));

vi.mock("@gpc-cli/config", () => ({
  loadConfig: mocks.loadConfig,
}));

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
    grants: {
      list: vi.fn().mockResolvedValue({ grants: [] }),
      create: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  }),
  createGamesClient: vi.fn().mockReturnValue({
    leaderboards: { list: vi.fn().mockResolvedValue({}), get: vi.fn(), getScores: vi.fn() },
    achievements: { list: vi.fn().mockResolvedValue({}), reveal: vi.fn() },
  }),
  createGamesConfigClient: vi.fn().mockReturnValue({
    achievements: {
      list: mocks.achievementsList,
      get: mocks.achievementsGet,
      insert: mocks.achievementsInsert,
      update: mocks.achievementsUpdate,
      delete: mocks.achievementsDelete,
    },
    leaderboards: {
      list: mocks.leaderboardsList,
      get: mocks.leaderboardsGet,
      insert: mocks.leaderboardsInsert,
      update: mocks.leaderboardsUpdate,
      delete: mocks.leaderboardsDelete,
    },
  }),
  createEnterpriseClient: vi.fn().mockReturnValue({
    apps: { create: vi.fn(), list: vi.fn().mockResolvedValue({}) },
  }),
}));

vi.mock("@gpc-cli/core", () => {
  class GpcError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly exitCode: number,
      public readonly suggestion?: string,
    ) {
      super(message);
      this.name = "GpcError";
    }
  }

  class MockPluginManager {
    private plugins: any[] = [];
    private commands: any[] = [];
    async load() {}
    async runBeforeCommand() {}
    async runAfterCommand() {}
    async runOnError() {}
    async runBeforeRequest() {}
    async runAfterResponse() {}
    getRegisteredCommands() { return [...this.commands]; }
    getLoadedPlugins() { return [...this.plugins]; }
    hasRequestHooks() { return false; }
    reset() { this.plugins = []; this.commands = []; }
    _addPlugin(p: any) { this.plugins.push(p); }
    _addCommand(c: any) { this.commands.push(c); }
  }

  return {
    GpcError,
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
    syncImages: vi.fn().mockResolvedValue({ uploaded: 0, skipped: 0, deleted: 0, total: 0, details: [] }),
    getCountryAvailability: vi.fn().mockResolvedValue({}),
    updateAppDetails: vi.fn().mockResolvedValue({}),
    getAppInfo: vi.fn().mockResolvedValue({}),
    listReviews: vi.fn().mockResolvedValue({ reviews: [] }),
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
    diffListingsCommand: vi.fn().mockResolvedValue({ diffs: [] }),
    sortResults: vi.fn().mockImplementation((data: unknown[]) => data),
    createSpinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn(), fail: vi.fn(), update: vi.fn() }),
    listRecoveryActions: vi.fn().mockResolvedValue([]),
    cancelRecoveryAction: vi.fn().mockResolvedValue({}),
    deployRecoveryAction: vi.fn().mockResolvedValue({}),
    createRecoveryAction: vi.fn().mockResolvedValue({}),
    addRecoveryTargeting: vi.fn().mockResolvedValue({}),
    updateDataSafety: vi.fn().mockResolvedValue({}),
    importDataSafety: vi.fn().mockResolvedValue({}),
    createExternalTransaction: vi.fn().mockResolvedValue({}),
    getExternalTransaction: vi.fn().mockResolvedValue({}),
    refundExternalTransaction: vi.fn().mockResolvedValue({}),
    generateNotesFromGit: vi.fn().mockResolvedValue({ language: "en-US", text: "notes", commitCount: 1, since: "v1.0.0" }),
    listDeviceTiers: vi.fn().mockResolvedValue([]),
    getDeviceTier: vi.fn().mockResolvedValue({}),
    createDeviceTier: vi.fn().mockResolvedValue({}),
    sendWebhook: vi.fn().mockResolvedValue(undefined),
    formatSlackPayload: vi.fn().mockReturnValue({}),
    formatDiscordPayload: vi.fn().mockReturnValue({}),
    formatCustomPayload: vi.fn().mockReturnValue({}),
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
    createAuditEntry: vi.fn().mockReturnValue({}),
    initAudit: vi.fn().mockResolvedValue(undefined),
    listAuditEvents: vi.fn().mockResolvedValue([]),
    searchAuditEvents: vi.fn().mockResolvedValue([]),
    clearAuditLog: vi.fn().mockResolvedValue({ deleted: 3, remaining: 0 }),
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
    uploadInternalSharing: vi.fn().mockResolvedValue({ downloadUrl: "", sha256: "", certificateFingerprint: "", fileType: "bundle" }),
    listGeneratedApks: vi.fn().mockResolvedValue([]),
    downloadGeneratedApk: vi.fn().mockResolvedValue({ path: "/tmp/out.apk", sizeBytes: 1024 }),
    detectFastlane: vi.fn().mockResolvedValue({ hasFastfile: false, hasAppfile: false, hasMetadata: false, hasGemfile: false, lanes: [], metadataLanguages: [] }),
    generateMigrationPlan: vi.fn().mockReturnValue({ config: {}, checklist: [], warnings: [] }),
    writeMigrationOutput: vi.fn().mockResolvedValue([]),
    getVitalsLmk: vi.fn().mockResolvedValue({ rows: [] }),
    getVitalsErrorCount: vi.fn().mockResolvedValue({ rows: [] }),
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
    listAchievementConfigs: vi.fn().mockImplementation(async (client: any, appId: string, opts: any) => client.achievements.list(appId, opts)),
    getAchievementConfig: vi.fn().mockImplementation(async (client: any, id: string) => client.achievements.get(id)),
    createAchievementConfig: vi.fn().mockImplementation(async (client: any, appId: string, data: any) => client.achievements.insert(appId, data)),
    updateAchievementConfig: vi.fn().mockImplementation(async (client: any, id: string, data: any) => client.achievements.update(id, data)),
    deleteAchievementConfig: vi.fn().mockImplementation(async (client: any, id: string) => client.achievements.delete(id)),
    diffAchievementConfig: vi.fn().mockResolvedValue([]),
    listLeaderboardConfigs: vi.fn().mockImplementation(async (client: any, appId: string, opts: any) => client.leaderboards.list(appId, opts)),
    getLeaderboardConfig: vi.fn().mockImplementation(async (client: any, id: string) => client.leaderboards.get(id)),
    createLeaderboardConfig: vi.fn().mockImplementation(async (client: any, appId: string, data: any) => client.leaderboards.insert(appId, data)),
    updateLeaderboardConfig: vi.fn().mockImplementation(async (client: any, id: string, data: any) => client.leaderboards.update(id, data)),
    deleteLeaderboardConfig: vi.fn().mockImplementation(async (client: any, id: string) => client.leaderboards.delete(id)),
    diffLeaderboardConfig: vi.fn().mockResolvedValue([]),
    createEnterpriseApp: vi.fn().mockResolvedValue({ packageName: "com.google.customapp.test", title: "Test Private App" }),
    publishEnterpriseApp: vi.fn().mockResolvedValue({ packageName: "com.google.customapp.test", title: "Test Private App" }),
    analyzeBundle: vi.fn().mockResolvedValue({ filePath: "test.aab", fileType: "aab", totalCompressed: 0, totalUncompressed: 0, entryCount: 0, modules: [], categories: [], entries: [] }),
    compareBundles: vi.fn().mockReturnValue({ before: { path: "a.aab", totalCompressed: 0 }, after: { path: "b.aab", totalCompressed: 0 }, sizeDelta: 0, sizeDeltaPercent: 0, moduleDeltas: [], categoryDeltas: [] }),
    topFiles: vi.fn().mockReturnValue([]),
    checkBundleSize: vi.fn().mockResolvedValue({ passed: true, violations: [] }),
    listBundles: vi.fn().mockResolvedValue([]),
    findBundle: vi.fn().mockResolvedValue(null),
    waitForBundle: vi.fn().mockResolvedValue({ versionCode: 1, sha1: "", sha256: "" }),
    lintListings: vi.fn().mockReturnValue([]),
    lintListing: vi.fn().mockReturnValue({ valid: true, fields: [] }),
    wordDiff: vi.fn().mockReturnValue([]),
    formatWordDiff: vi.fn().mockReturnValue(""),
    lintLocalListings: vi.fn().mockResolvedValue([]),
    analyzeRemoteListings: vi.fn().mockResolvedValue({ results: [], missingLocales: [] }),
    diffListingsEnhanced: vi.fn().mockResolvedValue([]),
    scaffoldPlugin: vi.fn().mockResolvedValue({ dir: "./gpc-plugin-test", files: [] }),
    DEFAULT_LIMITS: { title: 30, shortDescription: 80, fullDescription: 4000, video: 256 },
    getAppStatus: vi.fn().mockResolvedValue({ packageName: "com.example.app", fetchedAt: "2026-01-01", cached: false, sections: [], releases: [], vitals: { windowDays: 7, crashes: { value: undefined, threshold: 2, status: "unknown" }, anr: { value: undefined, threshold: 0.5, status: "unknown" }, slowStarts: { value: undefined, threshold: 25, status: "unknown" }, slowRender: { value: undefined, threshold: 50, status: "unknown" } }, reviews: { windowDays: 7, averageRating: undefined, previousAverageRating: undefined, totalNew: 0, positivePercent: undefined }, thresholdBreached: false }),
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
    PROVIDER_WHITELIST: ["anthropic", "openai", "google"],
    DEFAULT_MODELS: { anthropic: "claude-sonnet-4-6", openai: "gpt-4o-mini", google: "gemini-2.5-flash" },
    resolveAiConfig: vi.fn().mockReturnValue({ path: "direct", provider: "anthropic", model: "claude-sonnet-4-6", runId: "test-run-id" }),
    createTranslator: vi.fn().mockResolvedValue(vi.fn().mockResolvedValue({ text: "translated", tokensIn: 10, tokensOut: 8 })),
    translateBundle: vi.fn().mockResolvedValue({ from: "v0.9.62", to: "HEAD", limit: 500, sourceLanguage: "en-US", locales: [], overflows: [], failures: [], tokensIn: 0, tokensOut: 0 }),
    fetchAggregateCost: vi.fn().mockResolvedValue(undefined),
    formatPathLabel: vi.fn().mockReturnValue("direct Anthropic SDK (claude-sonnet-4-6)"),
    classifyError: vi.fn().mockReturnValue("unknown"),
    buildLocaleBundle: vi.fn().mockReturnValue({ from: "v0.9.62", to: "HEAD", limit: 500, sourceLanguage: "en-US", locales: [], overflows: [] }),
    renderPlayStoreMd: vi.fn().mockReturnValue(""),
    renderPlayStorePrompt: vi.fn().mockReturnValue(""),
    annotateListResult: vi.fn().mockImplementation((r: any) => r),
    moreResultsFooter: vi.fn().mockReturnValue(undefined),
  };
});

vi.mock("../src/json.js", () => ({
  readJsonFile: mocks.readJsonFile,
}));

vi.mock("../src/prompt.js", () => ({
  requireConfirm: vi.fn().mockResolvedValue(undefined),
  promptConfirm: vi.fn().mockResolvedValue(true),
  promptInput: vi.fn(),
  skipConfirm: vi.fn().mockReturnValue(true),
  isInteractive: vi.fn().mockReturnValue(false),
}));

import { createProgram } from "../src/program.js";

describe("games config CLI commands", () => {
  let program: Command;

  beforeEach(async () => {
    program = await createProgram();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();

    mocks.loadConfig.mockResolvedValue({
      games: { applicationId: "999888777" },
      auth: { serviceAccount: "/tmp/sa.json" },
    });
  });

  describe("achievements", () => {
    it("list calls with game-id from config", async () => {
      await program.parseAsync(["node", "gpc", "games", "achievements", "list"]);
      expect(mocks.achievementsList).toHaveBeenCalledWith("999888777", expect.anything());
    });

    it("list uses --game-id flag over config", async () => {
      await program.parseAsync([
        "node", "gpc", "games", "--game-id", "111222333", "achievements", "list",
      ]);
      expect(mocks.achievementsList).toHaveBeenCalledWith("111222333", expect.anything());
    });

    it("get calls with achievement ID", async () => {
      await program.parseAsync(["node", "gpc", "games", "achievements", "get", "ach-abc"]);
      expect(mocks.achievementsGet).toHaveBeenCalledWith("ach-abc");
    });

    it("create calls insert with file data", async () => {
      await program.parseAsync([
        "node", "gpc", "games", "achievements", "create", "--file", "test.json",
      ]);
      expect(mocks.achievementsInsert).toHaveBeenCalledWith(
        "999888777",
        expect.objectContaining({ achievementType: "STANDARD" }),
      );
    });

    it("update calls update with ID and file data", async () => {
      await program.parseAsync([
        "node", "gpc", "games", "achievements", "update", "ach-1", "--file", "test.json",
      ]);
      expect(mocks.achievementsUpdate).toHaveBeenCalledWith(
        "ach-1",
        expect.objectContaining({ achievementType: "STANDARD" }),
      );
    });

    it("delete calls delete with correct ID", async () => {
      await program.parseAsync(["node", "gpc", "games", "achievements", "delete", "ach-1"]);
      expect(mocks.achievementsDelete).toHaveBeenCalledWith("ach-1");
    });

    it("create skips API call in dry-run mode", async () => {
      await program.parseAsync([
        "node", "gpc", "--dry-run", "games", "achievements", "create", "--file", "test.json",
      ]);
      expect(mocks.achievementsInsert).not.toHaveBeenCalled();
    });
  });

  describe("leaderboards", () => {
    it("list calls with game-id from config", async () => {
      await program.parseAsync(["node", "gpc", "games", "leaderboards", "list"]);
      expect(mocks.leaderboardsList).toHaveBeenCalledWith("999888777", expect.anything());
    });

    it("get calls with leaderboard ID", async () => {
      await program.parseAsync(["node", "gpc", "games", "leaderboards", "get", "lb-xyz"]);
      expect(mocks.leaderboardsGet).toHaveBeenCalledWith("lb-xyz");
    });

    it("create calls insert with file data", async () => {
      await program.parseAsync([
        "node", "gpc", "games", "leaderboards", "create", "--file", "test.json",
      ]);
      expect(mocks.leaderboardsInsert).toHaveBeenCalledWith("999888777", expect.anything());
    });

    it("update calls update with ID and file data", async () => {
      await program.parseAsync([
        "node", "gpc", "games", "leaderboards", "update", "lb-1", "--file", "test.json",
      ]);
      expect(mocks.leaderboardsUpdate).toHaveBeenCalledWith("lb-1", expect.anything());
    });

    it("delete calls delete with correct ID", async () => {
      await program.parseAsync(["node", "gpc", "games", "leaderboards", "delete", "lb-1"]);
      expect(mocks.leaderboardsDelete).toHaveBeenCalledWith("lb-1");
    });

    it("delete skips API call in dry-run mode", async () => {
      await program.parseAsync([
        "node", "gpc", "--dry-run", "games", "leaderboards", "delete", "lb-1",
      ]);
      expect(mocks.leaderboardsDelete).not.toHaveBeenCalled();
    });
  });

  describe("game-id resolution", () => {
    it("errors when no game-id is available", async () => {
      mocks.loadConfig.mockResolvedValueOnce({});

      await expect(
        program.parseAsync(["node", "gpc", "games", "achievements", "list"]),
      ).rejects.toThrow("Game application ID is required");
    });

    it("reads GPC_GAME_ID from env", async () => {
      mocks.loadConfig.mockResolvedValueOnce({
        auth: { serviceAccount: "/tmp/sa.json" },
      });
      process.env["GPC_GAME_ID"] = "env-game-id";

      await program.parseAsync(["node", "gpc", "games", "achievements", "list"]);
      expect(mocks.achievementsList).toHaveBeenCalledWith("env-game-id", expect.anything());

      delete process.env["GPC_GAME_ID"];
    });
  });

  describe("events subcommand removed", () => {
    it("does not have an events subcommand", () => {
      const gamesCmd = program.commands.find((c: Command) => c.name() === "games");
      expect(gamesCmd).toBeDefined();
      const subNames = (gamesCmd as Command).commands.map((c: Command) => c.name());
      expect(subNames).not.toContain("events");
      expect(subNames).toContain("achievements");
      expect(subNames).toContain("leaderboards");
    });
  });
});
