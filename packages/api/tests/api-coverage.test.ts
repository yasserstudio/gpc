import { describe, it, expect } from "vitest";
import { createApiClient } from "../src/client.js";
import { createUsersClient } from "../src/users-client.js";
import { createReportingClient } from "../src/reporting-client.js";
import type { PlayApiClient } from "../src/client.js";
import type { UsersApiClient } from "../src/users-client.js";
import type { ReportingApiClient } from "../src/reporting-client.js";

/**
 * API Coverage Audit
 *
 * Verifies that every expected endpoint method exists on the API clients.
 * This acts as a regression guard — if a method is accidentally removed
 * or renamed, these tests will catch it.
 */

// Build a minimal client for shape inspection (methods exist but will fail if called)
const fakeOptions = {
  accessToken: "fake",
  baseUrl: "https://fake.example.com",
};

const client: PlayApiClient = createApiClient(fakeOptions);
const usersClient: UsersApiClient = createUsersClient(fakeOptions);
const reportingClient: ReportingApiClient = createReportingClient(fakeOptions);

/** Helper: assert every method in the manifest exists as a function on the target object */
function assertMethods(target: Record<string, unknown>, methods: string[], namespace: string) {
  for (const method of methods) {
    it(`${namespace}.${method} exists and is a function`, () => {
      expect(target).toHaveProperty(method);
      expect(typeof target[method]).toBe("function");
    });
  }
}

describe("API Coverage Audit — PlayApiClient", () => {
  describe("edits namespace", () => {
    assertMethods(client.edits, ["insert", "get", "validate", "commit", "delete"], "edits");
  });

  describe("details namespace", () => {
    assertMethods(client.details, ["get", "update", "patch"], "details");
  });

  describe("bundles namespace", () => {
    assertMethods(client.bundles, ["list", "upload"], "bundles");
  });

  describe("tracks namespace", () => {
    assertMethods(client.tracks, ["list", "get", "create", "update", "patch"], "tracks");
  });

  describe("releases namespace", () => {
    assertMethods(client.releases as unknown as Record<string, unknown>, ["list"], "releases");
  });

  describe("apks namespace", () => {
    assertMethods(client.apks, ["addExternallyHosted"], "apks");
  });

  describe("listings namespace", () => {
    assertMethods(
      client.listings,
      ["list", "get", "update", "patch", "delete", "deleteAll"],
      "listings",
    );
  });

  describe("images namespace", () => {
    assertMethods(client.images, ["list", "upload", "delete", "deleteAll"], "images");
  });

  describe("countryAvailability namespace", () => {
    assertMethods(client.countryAvailability, ["get"], "countryAvailability");
  });

  describe("dataSafety namespace", () => {
    assertMethods(client.dataSafety, ["get", "update"], "dataSafety");
  });

  describe("reviews namespace", () => {
    assertMethods(client.reviews, ["list", "get", "reply"], "reviews");
  });

  describe("subscriptions namespace", () => {
    assertMethods(
      client.subscriptions,
      [
        "list",
        "get",
        "create",
        "update",
        "delete",
        "activateBasePlan",
        "deactivateBasePlan",
        "deleteBasePlan",
        "migratePrices",
        "batchMigratePrices",
        "listOffers",
        "getOffer",
        "createOffer",
        "updateOffer",
        "deleteOffer",
        "activateOffer",
        "deactivateOffer",
        "batchGet",
        "batchUpdate",
      ],
      "subscriptions",
    );
  });

  describe("inappproducts namespace", () => {
    assertMethods(
      client.inappproducts,
      ["list", "get", "create", "update", "patch", "delete", "batchUpdate", "batchGet", "batchDelete"],
      "inappproducts",
    );
  });

  describe("purchases namespace", () => {
    assertMethods(
      client.purchases,
      [
        "getProduct",
        "acknowledgeProduct",
        "consumeProduct",
        "getSubscriptionV2",
        "getSubscriptionV1",
        "cancelSubscription",
        "deferSubscription",
        "revokeSubscriptionV2",
        "listVoided",
        "acknowledgeSubscription",
        "revokeSubscriptionV2",
        "cancelSubscriptionV2",
        "deferSubscriptionV2",
        "getProductV2",
      ],
      "purchases",
    );
  });

  describe("orders namespace", () => {
    assertMethods(client.orders, ["get", "batchGet", "refund"], "orders");
  });

  describe("monetization namespace", () => {
    assertMethods(client.monetization, ["convertRegionPrices"], "monetization");
  });

  describe("reports namespace", () => {
    assertMethods(client.reports, ["list"], "reports");
  });

  describe("testers namespace", () => {
    assertMethods(client.testers, ["get", "update", "patch"], "testers");
  });

  describe("deobfuscation namespace", () => {
    assertMethods(client.deobfuscation, ["upload"], "deobfuscation");
  });

  describe("appRecovery namespace", () => {
    assertMethods(
      client.appRecovery,
      ["list", "cancel", "deploy", "create", "addTargeting"],
      "appRecovery",
    );
  });

  describe("externalTransactions namespace", () => {
    assertMethods(client.externalTransactions, ["create", "get", "refund"], "externalTransactions");
  });

  describe("deviceTiers namespace", () => {
    assertMethods(client.deviceTiers, ["list", "get", "create"], "deviceTiers");
  });

  describe("oneTimeProducts namespace", () => {
    assertMethods(
      client.oneTimeProducts,
      [
        "list",
        "get",
        "create",
        "update",
        "delete",
        "listOffers",
        "getOffer",
        "createOffer",
        "updateOffer",
        "deleteOffer",
        "batchDeletePurchaseOptions",
        "batchUpdatePurchaseOptionStates",
        "cancelOffer",
        "batchGetOffers",
        "batchUpdateOffers",
        "batchUpdateOfferStates",
        "batchDeleteOffers",
      ],
      "oneTimeProducts",
    );
  });

  // purchaseOptions namespace removed: standalone /purchaseOptions/ resource does not exist in API.

  describe("internalAppSharing namespace", () => {
    assertMethods(client.internalAppSharing, ["uploadBundle", "uploadApk"], "internalAppSharing");
  });

  describe("generatedApks namespace", () => {
    assertMethods(client.generatedApks, ["list", "download"], "generatedApks");
  });

  describe("systemApks namespace", () => {
    assertMethods(client.systemApks, ["create", "list", "get", "download"], "systemApks");
  });
});

describe("API Coverage Audit — UsersApiClient", () => {
  const methods = ["list", "create", "update", "delete"];
  for (const method of methods) {
    it(`users.${method} exists and is a function`, () => {
      expect(usersClient).toHaveProperty(method);
      expect(typeof usersClient[method as keyof UsersApiClient]).toBe("function");
    });
  }
});

describe("API Coverage Audit — ReportingApiClient", () => {
  const methods = ["queryMetricSet", "getAnomalies", "searchErrorIssues", "searchErrorReports"];
  for (const method of methods) {
    it(`reporting.${method} exists and is a function`, () => {
      expect(reportingClient).toHaveProperty(method);
      expect(typeof reportingClient[method as keyof ReportingApiClient]).toBe("function");
    });
  }
});

describe("API Coverage Audit — Namespace completeness", () => {
  const expectedNamespaces = [
    "edits",
    "details",
    "bundles",
    "tracks",
    "apks",
    "listings",
    "images",
    "expansionFiles",
    "countryAvailability",
    "dataSafety",
    "reviews",
    "subscriptions",
    "inappproducts",
    "purchases",
    "orders",
    "monetization",
    "reports",
    "testers",
    "deobfuscation",
    "appRecovery",
    "externalTransactions",
    "deviceTiers",
    "oneTimeProducts",
    "internalAppSharing",
    "generatedApks",
    "systemApks",
    "releases",
  ];

  it("PlayApiClient exposes all expected namespaces", () => {
    for (const ns of expectedNamespaces) {
      expect(client).toHaveProperty(ns);
      expect(typeof client[ns as keyof PlayApiClient]).toBe("object");
    }
  });

  it("PlayApiClient has no unexpected namespaces", () => {
    const actualKeys = Object.keys(client);
    const extra = actualKeys.filter((k) => !expectedNamespaces.includes(k));
    expect(extra).toEqual([]);
  });
});
