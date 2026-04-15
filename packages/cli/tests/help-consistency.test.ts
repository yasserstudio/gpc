import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Command } from "commander";

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
  approvePlugin: vi.fn().mockResolvedValue(undefined),
  revokePluginApproval: vi.fn().mockResolvedValue(true),
}));

vi.mock("@gpc-cli/core", () => {
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
  }

  return {
    PluginManager: MockPluginManager,
    discoverPlugins: vi.fn().mockResolvedValue([]),
    detectOutputFormat: vi.fn().mockReturnValue("table"),
    formatOutput: vi.fn().mockImplementation((data: unknown) => JSON.stringify(data)),
    // Stub all core command functions
    getAppInfo: vi.fn().mockResolvedValue({}),
    updateAppDetails: vi.fn().mockResolvedValue({}),
    uploadRelease: vi.fn().mockResolvedValue({}),
    getReleasesStatus: vi.fn().mockResolvedValue([]),
    promoteRelease: vi.fn().mockResolvedValue({}),
    updateRollout: vi.fn().mockResolvedValue({}),
    listTracks: vi.fn().mockResolvedValue([]),
    createTrack: vi.fn().mockResolvedValue({}),
    updateTrackConfig: vi.fn().mockResolvedValue({}),
    uploadExternallyHosted: vi.fn().mockResolvedValue({}),
    getListings: vi.fn().mockResolvedValue([]),
    updateListing: vi.fn().mockResolvedValue({}),
    deleteListing: vi.fn().mockResolvedValue(undefined),
    pullListings: vi.fn().mockResolvedValue({ listings: [] }),
    pushListings: vi.fn().mockResolvedValue({}),
    listImages: vi.fn().mockResolvedValue([]),
    uploadImage: vi.fn().mockResolvedValue({}),
    deleteImage: vi.fn().mockResolvedValue(undefined),
    exportImages: vi.fn().mockResolvedValue({}),
    getCountryAvailability: vi.fn().mockResolvedValue({}),
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
    checkThreshold: vi.fn().mockReturnValue({ breached: false }),
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
    syncInAppProducts: vi.fn().mockResolvedValue({}),
    getProductPurchase: vi.fn().mockResolvedValue({}),
    acknowledgeProductPurchase: vi.fn().mockResolvedValue(undefined),
    consumeProductPurchase: vi.fn().mockResolvedValue(undefined),
    getSubscriptionPurchase: vi.fn().mockResolvedValue({}),
    acknowledgeSubscriptionPurchase: vi.fn().mockResolvedValue(undefined),
    revokeSubscriptionPurchase: vi.fn().mockResolvedValue(undefined),
    deferSubscriptionPurchase: vi.fn().mockResolvedValue(undefined),
    refundSubscriptionPurchase: vi.fn().mockResolvedValue(undefined),
    getConvertedRegionPrices: vi.fn().mockResolvedValue({}),
    listReports: vi.fn().mockResolvedValue([]),
    downloadReport: vi.fn().mockResolvedValue({}),
    listUsers: vi.fn().mockResolvedValue({ users: [] }),
    getUser: vi.fn().mockResolvedValue({}),
    createUser: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    listGrants: vi.fn().mockResolvedValue({ grants: [] }),
    updateGrant: vi.fn().mockResolvedValue({}),
    deleteGrant: vi.fn().mockResolvedValue(undefined),
    listTesters: vi.fn().mockResolvedValue({ testers: [] }),
    addTesters: vi.fn().mockResolvedValue({}),
    removeTesters: vi.fn().mockResolvedValue({}),
    importTesters: vi.fn().mockResolvedValue({}),
    validateAppBundle: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
    publishFlow: vi.fn().mockResolvedValue({}),
    scaffoldPlugin: vi.fn().mockResolvedValue({ dir: "./test", files: [] }),
    listRecoveryActions: vi.fn().mockResolvedValue({ recoveryActions: [] }),
    createRecoveryAction: vi.fn().mockResolvedValue({}),
    cancelRecoveryAction: vi.fn().mockResolvedValue({}),
    deployRecoveryAction: vi.fn().mockResolvedValue({}),
    updateDataSafety: vi.fn().mockResolvedValue({}),
    listExternalTransactions: vi.fn().mockResolvedValue({ externalTransactions: [] }),
    createExternalTransaction: vi.fn().mockResolvedValue({}),
    refundExternalTransaction: vi.fn().mockResolvedValue({}),
    getExternalTransaction: vi.fn().mockResolvedValue({}),
    listDeviceTierConfigs: vi.fn().mockResolvedValue({ deviceTierConfigs: [] }),
    getDeviceTierConfig: vi.fn().mockResolvedValue({}),
    createDeviceTierConfig: vi.fn().mockResolvedValue({}),
    listDeviceGroups: vi.fn().mockResolvedValue({ deviceGroups: [] }),
    listOneTimeProducts: vi.fn().mockResolvedValue({ oneTimeProducts: [] }),
    getOneTimeProduct: vi.fn().mockResolvedValue({}),
    createOneTimeProduct: vi.fn().mockResolvedValue({}),
    updateOneTimeProduct: vi.fn().mockResolvedValue({}),
    deleteOneTimeProduct: vi.fn().mockResolvedValue(undefined),
    uploadInternalSharingApk: vi.fn().mockResolvedValue({}),
    uploadInternalSharingBundle: vi.fn().mockResolvedValue({}),
    listGeneratedApks: vi.fn().mockResolvedValue({ generatedApks: [] }),
    downloadGeneratedApk: vi.fn().mockResolvedValue({}),
    listPurchaseOptions: vi.fn().mockResolvedValue({ purchaseOptions: [] }),
    getPurchaseOption: vi.fn().mockResolvedValue({}),
    createPurchaseOption: vi.fn().mockResolvedValue({}),
    updatePurchaseOption: vi.fn().mockResolvedValue({}),
    deletePurchaseOption: vi.fn().mockResolvedValue(undefined),
    activatePurchaseOption: vi.fn().mockResolvedValue({}),
    deactivatePurchaseOption: vi.fn().mockResolvedValue({}),
    migrateFastlaneMetadata: vi.fn().mockResolvedValue({}),
    analyzeBundle: vi.fn().mockResolvedValue({
      filePath: "test.aab",
      fileType: "aab",
      totalCompressed: 0,
      totalUncompressed: 0,
      entryCount: 0,
      modules: [],
      categories: [],
      entries: [],
    }),
    compareBundles: vi.fn().mockReturnValue({
      before: {},
      after: {},
      sizeDelta: 0,
      sizeDeltaPercent: 0,
      moduleDeltas: [],
      categoryDeltas: [],
    }),
    topFiles: vi.fn().mockResolvedValue([]),
    checkBundleSize: vi.fn().mockResolvedValue({ pass: true, violations: [] }),
    getVitalsLmk: vi.fn().mockResolvedValue({ rows: [] }),
    getVitalsErrorCount: vi.fn().mockResolvedValue({ rows: [] }),
    compareVitalsTrend: vi.fn().mockResolvedValue({
      metric: "crashRateMetricSet",
      current: undefined,
      previous: undefined,
      changePercent: undefined,
      direction: "unknown",
    }),
    compareVersionVitals: vi
      .fn()
      .mockResolvedValue({ v1: { versionCode: "1" }, v2: { versionCode: "2" }, regressions: [] }),
    watchVitalsWithAutoHalt: vi.fn().mockReturnValue(() => {}),
    analyzeReviews: vi.fn().mockResolvedValue({
      totalReviews: 0,
      averageRating: 0,
      sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
      topTopics: [],
      topKeywords: [],
      ratingDistribution: {},
    }),
    maybePaginate: vi.fn().mockResolvedValue(undefined),
    createGrant: vi.fn().mockResolvedValue({}),
    startTrain: vi.fn().mockResolvedValue({}),
    getTrainStatus: vi.fn().mockResolvedValue(null),
    pauseTrain: vi.fn().mockResolvedValue(null),
    abortTrain: vi.fn().mockResolvedValue(undefined),
    advanceTrain: vi.fn().mockResolvedValue(null),
    getQuotaUsage: vi
      .fn()
      .mockResolvedValue({ total: 0, today: 0, thisMinute: 0, topCommands: [] }),
    getSubscriptionAnalytics: vi.fn().mockResolvedValue({
      totalSubscriptions: 0,
      activeCount: 0,
      activeBasePlans: 0,
      trialBasePlans: 0,
      pausedBasePlans: 0,
      canceledBasePlans: 0,
      offerCount: 0,
      byProductId: [],
    }),
    diffSubscription: vi.fn().mockResolvedValue([]),
    listLeaderboards: vi.fn().mockResolvedValue([]),
    listAchievements: vi.fn().mockResolvedValue([]),
    listEvents: vi.fn().mockResolvedValue([]),
    createEnterpriseApp: vi.fn().mockResolvedValue({}),
    publishEnterpriseApp: vi.fn().mockResolvedValue({}),
    lintLocalListings: vi.fn().mockResolvedValue([]),
    analyzeRemoteListings: vi.fn().mockResolvedValue({ results: [] }),
    diffListingsEnhanced: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@gpc-cli/api", () => ({
  createApiClient: vi.fn().mockReturnValue({
    apps: { get: vi.fn() },
  }),
  createUsersClient: vi.fn().mockReturnValue({}),
  createGamesClient: vi.fn().mockReturnValue({}),
  createEnterpriseClient: vi.fn().mockReturnValue({}),
}));

import { createProgram } from "../src/program";

const EXPECTED_TOP_LEVEL_COMMANDS = [
  "apps",
  "anomalies",
  "auth",
  "config",
  "doctor",
  "update",
  "releases",
  "tracks",
  "listings",
  "reviews",
  "vitals",
  "subscriptions",
  "iap",
  "purchases",
  "pricing",
  "reports",
  "users",
  "testers",
  "plugins",
  "validate",
  "publish",
  "recovery",
  "data-safety",
  "external-transactions",
  "device-tiers",
  "one-time-products",
  "internal-sharing",
  "generated-apks",
  "system-apks",
  "purchase-options",
  "bundle",
  "audit",
  "migrate",
  "docs",
  "completion",
  "install-skills",
  "version",
  "cache",
  "feedback",
  "grants",
  "quickstart",
  "train",
  "quota",
  "games",
  "enterprise",
  "preflight",
  "init",
  "diff",
  "changelog",
  "rtdn",
  "verify",
];

describe("help text consistency", () => {
  let program: Command;

  beforeAll(async () => {
    // Ensure all commands are loaded by clearing argv[2]
    const savedArgv = [...process.argv];
    process.argv = ["node", "gpc"];
    program = await createProgram();
    process.argv = savedArgv;
  });

  it("registers all expected top-level commands", () => {
    const commandNames = program.commands.map((cmd) => cmd.name());
    for (const expected of EXPECTED_TOP_LEVEL_COMMANDS) {
      expect(commandNames, `missing command: ${expected}`).toContain(expected);
    }
  });

  it("has no unexpected top-level commands", () => {
    const commandNames = program.commands.map((cmd) => cmd.name());
    // Also allow "status" (registered in the loader map) and "__complete"
    // (hidden shell-completion value provider).
    const allowed = new Set([...EXPECTED_TOP_LEVEL_COMMANDS, "status", "__complete"]);
    for (const name of commandNames) {
      expect(allowed, `unexpected command: ${name}`).toContain(name);
    }
  });

  it("every command has a non-empty description", () => {
    for (const cmd of program.commands) {
      expect(cmd.description(), `command "${cmd.name()}" has no description`).toBeTruthy();
      expect(
        cmd.description().trim().length,
        `command "${cmd.name()}" has empty description`,
      ).toBeGreaterThan(0);
    }
  });

  it("no command description exceeds 80 characters", () => {
    for (const cmd of program.commands) {
      const desc = cmd.description();
      expect(
        desc.length,
        `command "${cmd.name()}" description is ${desc.length} chars: "${desc}"`,
      ).toBeLessThanOrEqual(80);
    }
  });

  it("all subcommands have non-empty descriptions", () => {
    for (const cmd of program.commands) {
      for (const sub of cmd.commands) {
        expect(
          sub.description(),
          `subcommand "${cmd.name()} ${sub.name()}" has no description`,
        ).toBeTruthy();
      }
    }
  });

  it("no subcommand description exceeds 80 characters", () => {
    for (const cmd of program.commands) {
      for (const sub of cmd.commands) {
        const desc = sub.description();
        expect(
          desc.length,
          `"${cmd.name()} ${sub.name()}" description is ${desc.length} chars: "${desc}"`,
        ).toBeLessThanOrEqual(80);
      }
    }
  });

  it("the root program has a description", () => {
    expect(program.description()).toBeTruthy();
  });

  it("the root program name is gpc", () => {
    expect(program.name()).toBe("gpc");
  });

  it("command count matches expected count", () => {
    const commandNames = program.commands.map((cmd) => cmd.name());
    // At minimum we must have all expected commands
    expect(commandNames.length).toBeGreaterThanOrEqual(EXPECTED_TOP_LEVEL_COMMANDS.length);
  });

  it("descriptions start with an uppercase letter", () => {
    for (const cmd of program.commands) {
      const desc = cmd.description();
      const firstChar = desc.charAt(0);
      expect(
        firstChar,
        `command "${cmd.name()}" description starts with lowercase: "${desc}"`,
      ).toBe(firstChar.toUpperCase());
    }
  });
});
