import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runWatch,
  dispatchWebhook,
  handleBreach,
  VALID_WATCH_METRICS,
  DEFAULT_WATCH_THRESHOLDS,
} from "../src/commands/watch.js";
import type {
  WatchConfig,
  WatchEvent,
  WatchCallbacks,
  WatchMetric,
} from "../src/commands/watch.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../src/commands/releases.js", () => ({
  getReleasesStatus: vi.fn(),
  updateRollout: vi.fn(),
}));

vi.mock("../src/commands/status.js", () => ({
  trackBreachState: vi.fn().mockResolvedValue(true),
  sendNotification: vi.fn(),
}));

vi.mock("../src/commands/vitals.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/commands/vitals.js")>();
  return {
    ...actual,
    checkThreshold: actual.checkThreshold,
  };
});

import { getReleasesStatus, updateRollout } from "../src/commands/releases.js";
import { trackBreachState, sendNotification } from "../src/commands/status.js";

const mockGetReleasesStatus = vi.mocked(getReleasesStatus);
const mockUpdateRollout = vi.mocked(updateRollout);
const mockTrackBreachState = vi.mocked(trackBreachState);
const mockSendNotification = vi.mocked(sendNotification);

function mockReporting() {
  return {
    queryMetricSet: vi.fn().mockResolvedValue({
      rows: [
        {
          metrics: {
            crashRate: { decimalValue: { value: "0.01" } },
            distinctUsers: { decimalValue: { value: "1000" } },
          },
        },
      ],
    }),
    getAnomalies: vi.fn(),
    searchErrorIssues: vi.fn(),
  };
}

function mockClient() {
  return {
    edits: { insert: vi.fn(), delete: vi.fn(), commit: vi.fn(), get: vi.fn(), validate: vi.fn() },
    tracks: { list: vi.fn(), get: vi.fn(), patch: vi.fn() },
    bundles: { list: vi.fn(), upload: vi.fn(), uploadResumable: vi.fn() },
    apks: { list: vi.fn(), upload: vi.fn(), uploadResumable: vi.fn() },
    listings: { list: vi.fn(), get: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteAll: vi.fn() },
    images: { list: vi.fn(), upload: vi.fn(), delete: vi.fn(), deleteAll: vi.fn() },
    reviews: { list: vi.fn(), get: vi.fn(), reply: vi.fn() },
    releases: { list: vi.fn() },
    subscriptions: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      patch: vi.fn(),
      archive: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
    },
    basePlans: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      migratePrices: vi.fn(),
      batchMigratePrices: vi.fn(),
      batchUpdate: vi.fn(),
    },
    offers: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      batchGet: vi.fn(),
      batchUpdate: vi.fn(),
      batchUpdateStates: vi.fn(),
    },
    inappproducts: {
      list: vi.fn(),
      get: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      batchGet: vi.fn(),
      batchUpdate: vi.fn(),
      batchDelete: vi.fn(),
    },
    purchasesProducts: { get: vi.fn(), acknowledge: vi.fn(), consume: vi.fn() },
    purchasesSubscriptions: {
      get: vi.fn(),
      acknowledge: vi.fn(),
      defer: vi.fn(),
      refund: vi.fn(),
      revoke: vi.fn(),
      cancel: vi.fn(),
    },
    purchasesSubscriptionsV2: { get: vi.fn(), revoke: vi.fn() },
    voidedPurchases: { list: vi.fn() },
    orders: { refund: vi.fn(), batchGet: vi.fn() },
    generatedApks: { list: vi.fn(), download: vi.fn() },
    appDetails: { get: vi.fn(), patch: vi.fn() },
    deobfuscationFiles: { upload: vi.fn() },
    countryAvailability: { get: vi.fn() },
    internalAppSharing: { uploadBundle: vi.fn(), uploadApk: vi.fn() },
    users: { list: vi.fn(), create: vi.fn(), delete: vi.fn(), patch: vi.fn() },
    grants: { list: vi.fn(), create: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    dataSafety: { update: vi.fn() },
    appRecovery: {
      list: vi.fn(),
      create: vi.fn(),
      cancel: vi.fn(),
      deploy: vi.fn(),
      addTargeting: vi.fn(),
    },
    deviceTierConfigs: { list: vi.fn(), get: vi.fn(), create: vi.fn() },
    externalTransactions: { refund: vi.fn(), create: vi.fn(), get: vi.fn() },
    systemApks: { list: vi.fn(), create: vi.fn() },
    testers: { get: vi.fn(), patch: vi.fn() },
    oneTimeProducts: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      batchGet: vi.fn(),
      batchUpdate: vi.fn(),
      batchDelete: vi.fn(),
    },
    purchaseOptions: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      cancel: vi.fn(),
      batchGet: vi.fn(),
      batchUpdate: vi.fn(),
      batchUpdateStates: vi.fn(),
      batchDelete: vi.fn(),
    },
    purchaseOptionOffers: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      cancel: vi.fn(),
      batchGet: vi.fn(),
      batchUpdate: vi.fn(),
      batchUpdateStates: vi.fn(),
      batchDelete: vi.fn(),
    },
    customApps: { create: vi.fn() },
    games: { list: vi.fn() },
  } as unknown as ReturnType<typeof import("@gpc-cli/api").createApiClient>;
}

function baseConfig(overrides?: Partial<WatchConfig>): WatchConfig {
  return {
    packageName: "com.example.app",
    track: "production",
    intervalSeconds: 60,
    metrics: ["crashes", "anr"],
    thresholds: { crashes: 0.02, anr: 0.01 },
    maxRounds: 1,
    actions: ["notify"],
    ...overrides,
  };
}

function collectCallbacks(): WatchCallbacks & { events: WatchEvent[] } {
  const events: WatchEvent[] = [];
  return {
    events,
    onEvent: (e) => events.push(e),
    onBreach: vi.fn(),
    onComplete: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("watch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReleasesStatus.mockResolvedValue([
      {
        track: "production",
        status: "inProgress",
        versionCodes: ["142"],
        userFraction: 0.1,
        releaseNotes: [],
      },
    ]);
  });

  describe("VALID_WATCH_METRICS", () => {
    it("contains all expected metrics", () => {
      expect(VALID_WATCH_METRICS.has("crashes")).toBe(true);
      expect(VALID_WATCH_METRICS.has("anr")).toBe(true);
      expect(VALID_WATCH_METRICS.has("lmk")).toBe(true);
      expect(VALID_WATCH_METRICS.has("slowStarts")).toBe(true);
      expect(VALID_WATCH_METRICS.has("slowRender")).toBe(true);
      expect(VALID_WATCH_METRICS.has("errorCount")).toBe(true);
      expect(VALID_WATCH_METRICS.size).toBe(6);
    });
  });

  describe("DEFAULT_WATCH_THRESHOLDS", () => {
    it("provides sensible defaults", () => {
      expect(DEFAULT_WATCH_THRESHOLDS.crashes).toBe(0.02);
      expect(DEFAULT_WATCH_THRESHOLDS.anr).toBe(0.01);
    });
  });

  describe("runWatch", () => {
    it("completes one round with no breach", async () => {
      const reporting = mockReporting();
      const client = mockClient();
      const cb = collectCallbacks();

      const summary = await runWatch(client, reporting, baseConfig(), cb);

      expect(summary.rounds).toBe(1);
      expect(summary.breachCount).toBe(0);
      expect(summary.halted).toBe(false);
      expect(cb.events).toHaveLength(1);
      expect(cb.events[0]!.rollout?.versionCode).toBe("142");
      expect(cb.events[0]!.rollout?.userFraction).toBe(0.1);
    });

    it("detects a threshold breach", async () => {
      const reporting = mockReporting();
      reporting.queryMetricSet.mockResolvedValue({
        rows: [
          {
            metrics: {
              crashRate: { decimalValue: { value: "0.05" } },
              distinctUsers: { decimalValue: { value: "1000" } },
            },
          },
        ],
      });
      const client = mockClient();
      const cb = collectCallbacks();

      const summary = await runWatch(client, reporting, baseConfig(), cb);

      expect(summary.breachCount).toBe(1);
      expect(cb.events[0]!.breaches).toContain("crashes");
    });

    it("respects maxRounds", async () => {
      vi.useFakeTimers();
      const reporting = mockReporting();
      const client = mockClient();
      const cb = collectCallbacks();

      const promise = runWatch(
        client,
        reporting,
        baseConfig({ maxRounds: 3, intervalSeconds: 60 }),
        cb,
      );

      // Advance past the sleep between rounds (60 × 1s ticks × 2 gaps)
      for (let i = 0; i < 120; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      const summary = await promise;
      expect(summary.rounds).toBe(3);
      vi.useRealTimers();
    });

    it("auto-stops when rollout completes", async () => {
      vi.useFakeTimers();
      mockGetReleasesStatus
        .mockResolvedValueOnce([
          {
            track: "production",
            status: "inProgress",
            versionCodes: ["142"],
            userFraction: 0.5,
            releaseNotes: [],
          },
        ])
        .mockResolvedValueOnce([
          { track: "production", status: "completed", versionCodes: ["142"], releaseNotes: [] },
        ]);

      const reporting = mockReporting();
      const client = mockClient();
      const cb = collectCallbacks();

      const promise = runWatch(
        client,
        reporting,
        baseConfig({ maxRounds: 10, intervalSeconds: 60 }),
        cb,
      );

      // Advance past one sleep gap
      for (let i = 0; i < 60; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      const summary = await promise;
      expect(summary.rounds).toBe(2);
      expect(cb.events[1]!.rollout?.status).toBe("completed");
      vi.useRealTimers();
    });

    it("rejects interval below 60 seconds", async () => {
      const reporting = mockReporting();
      const client = mockClient();
      const cb = collectCallbacks();

      await expect(
        runWatch(client, reporting, baseConfig({ intervalSeconds: 30 }), cb),
      ).rejects.toThrow("at least 60 seconds");
    });

    it("sends notification on breach", async () => {
      const reporting = mockReporting();
      reporting.queryMetricSet.mockResolvedValue({
        rows: [
          {
            metrics: {
              crashRate: { decimalValue: { value: "0.05" } },
              distinctUsers: { decimalValue: { value: "1000" } },
            },
          },
        ],
      });
      const client = mockClient();
      const cb = collectCallbacks();

      await runWatch(client, reporting, baseConfig({ actions: ["notify"] }), cb);

      expect(mockSendNotification).toHaveBeenCalledWith(
        "GPC Watch: Threshold Breach",
        expect.stringContaining("com.example.app"),
      );
    });

    it("halts rollout when halt action is configured", async () => {
      const reporting = mockReporting();
      reporting.queryMetricSet.mockResolvedValue({
        rows: [
          {
            metrics: {
              crashRate: { decimalValue: { value: "0.05" } },
              distinctUsers: { decimalValue: { value: "1000" } },
            },
          },
        ],
      });
      const client = mockClient();
      const cb = collectCallbacks();

      const summary = await runWatch(client, reporting, baseConfig({ actions: ["halt"] }), cb);

      expect(mockUpdateRollout).toHaveBeenCalledWith(
        client,
        "com.example.app",
        "production",
        "halt",
      );
      expect(summary.halted).toBe(true);
    });

    it("handles no active rollout gracefully", async () => {
      mockGetReleasesStatus.mockResolvedValue([]);
      const reporting = mockReporting();
      const client = mockClient();
      const cb = collectCallbacks();

      const summary = await runWatch(client, reporting, baseConfig(), cb);

      expect(summary.rounds).toBe(1);
      expect(cb.events[0]!.rollout).toBeNull();
    });

    it("monitors multiple metrics", async () => {
      const reporting = mockReporting();
      reporting.queryMetricSet.mockImplementation(async (_pkg, metricSet) => {
        if (metricSet === "crashRateMetricSet") {
          return { rows: [{ metrics: { crashRate: { decimalValue: { value: "0.01" } } } }] };
        }
        if (metricSet === "anrRateMetricSet") {
          return { rows: [{ metrics: { anrRate: { decimalValue: { value: "0.005" } } } }] };
        }
        if (metricSet === "lmkRateMetricSet") {
          return {
            rows: [{ metrics: { userPerceivedLmkRate: { decimalValue: { value: "0.02" } } } }],
          };
        }
        return { rows: [] };
      });
      const client = mockClient();
      const cb = collectCallbacks();

      await runWatch(
        client,
        reporting,
        baseConfig({
          metrics: ["crashes", "anr", "lmk"],
          thresholds: { crashes: 0.02, anr: 0.01, lmk: 0.03 },
        }),
        cb,
      );

      const vitals = cb.events[0]!.vitals;
      expect(vitals.crashes?.value).toBe(0.01);
      expect(vitals.anr?.value).toBe(0.005);
      expect(vitals.lmk?.value).toBe(0.02);
      expect(vitals.crashes?.breached).toBe(false);
      expect(vitals.anr?.breached).toBe(false);
      expect(vitals.lmk?.breached).toBe(false);
    });

    it("only fires breach actions on state change", async () => {
      mockTrackBreachState.mockResolvedValue(false); // no state change
      const reporting = mockReporting();
      reporting.queryMetricSet.mockResolvedValue({
        rows: [
          {
            metrics: {
              crashRate: { decimalValue: { value: "0.05" } },
              distinctUsers: { decimalValue: { value: "1000" } },
            },
          },
        ],
      });
      const client = mockClient();
      const cb = collectCallbacks();

      await runWatch(client, reporting, baseConfig(), cb);

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("records events in summary", async () => {
      vi.useFakeTimers();
      const reporting = mockReporting();
      const client = mockClient();
      const cb = collectCallbacks();

      const promise = runWatch(
        client,
        reporting,
        baseConfig({ maxRounds: 2, intervalSeconds: 60 }),
        cb,
      );

      for (let i = 0; i < 60; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      const summary = await promise;
      expect(summary.events).toHaveLength(2);
      expect(summary.durationMs).toBeGreaterThanOrEqual(0);
      vi.useRealTimers();
    });
  });

  describe("dispatchWebhook", () => {
    it("sends POST with event data", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      const event: WatchEvent = {
        round: 1,
        timestamp: "2026-04-25T12:00:00Z",
        rollout: {
          track: "production",
          versionCode: "142",
          userFraction: 0.1,
          status: "inProgress",
        },
        vitals: { crashes: { value: 0.05, threshold: 0.02, breached: true } },
        breaches: ["crashes"],
        halted: false,
      };

      await dispatchWebhook("https://hooks.example.com/gpc", event);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://hooks.example.com/gpc",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("breach");
      expect(body.breaches).toEqual(["crashes"]);

      vi.unstubAllGlobals();
    });
  });

  describe("handleBreach", () => {
    it("sends notification for notify action", async () => {
      const client = mockClient();
      const event: WatchEvent = {
        round: 1,
        timestamp: "2026-04-25T12:00:00Z",
        rollout: null,
        vitals: {},
        breaches: ["crashes"],
        halted: false,
      };

      await handleBreach(event, baseConfig({ actions: ["notify"] }), client);

      expect(mockSendNotification).toHaveBeenCalled();
    });

    it("halts rollout for halt action", async () => {
      const client = mockClient();
      const event: WatchEvent = {
        round: 1,
        timestamp: "2026-04-25T12:00:00Z",
        rollout: null,
        vitals: {},
        breaches: ["crashes"],
        halted: false,
      };

      const halted = await handleBreach(event, baseConfig({ actions: ["halt"] }), client);

      expect(halted).toBe(true);
      expect(mockUpdateRollout).toHaveBeenCalledWith(
        client,
        "com.example.app",
        "production",
        "halt",
      );
    });

    it("dispatches webhook for webhook action", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      const client = mockClient();
      const event: WatchEvent = {
        round: 1,
        timestamp: "2026-04-25T12:00:00Z",
        rollout: null,
        vitals: {},
        breaches: ["crashes"],
        halted: false,
      };

      await handleBreach(
        event,
        baseConfig({ actions: ["webhook"], webhookUrl: "https://hooks.example.com/gpc" }),
        client,
      );

      expect(mockFetch).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });
});
