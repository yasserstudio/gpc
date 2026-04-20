import { describe, it, expect } from "vitest";
import * as core from "../src/index.js";

/**
 * Core Command Coverage Audit
 *
 * Verifies that every major API area has corresponding exported functions
 * in the @gpc-cli/core barrel. This catches accidental removal of exports
 * and ensures the core surface stays complete.
 */

/** Helper: assert each name is exported and is a function */
function assertExports(names: string[], area: string) {
  for (const name of names) {
    it(`exports ${name}`, () => {
      expect(core).toHaveProperty(name);
      expect(typeof (core as Record<string, unknown>)[name]).toBe("function");
    });
  }
}

describe("Core Command Coverage — Apps", () => {
  assertExports(["getAppInfo"], "apps");
});

describe("Core Command Coverage — Releases & Tracks", () => {
  assertExports(
    [
      "uploadRelease",
      "getReleasesStatus",
      "promoteRelease",
      "updateRollout",
      "listTracks",
      "createTrack",
      "updateTrackConfig",
      "uploadExternallyHosted",
    ],
    "releases",
  );
});

describe("Core Command Coverage — Listings & Metadata", () => {
  assertExports(
    [
      "getListings",
      "updateListing",
      "deleteListing",
      "pullListings",
      "pushListings",
      "diffListingsCommand",
      "listImages",
      "uploadImage",
      "deleteImage",
      "getCountryAvailability",
      "updateAppDetails",
      "exportImages",
    ],
    "listings",
  );
});

describe("Core Command Coverage — Reviews", () => {
  assertExports(["listReviews", "getReview", "replyToReview", "exportReviews"], "reviews");
});

describe("Core Command Coverage — Vitals & Reporting", () => {
  assertExports(
    [
      "getVitalsOverview",
      "getVitalsCrashes",
      "getVitalsAnr",
      "getVitalsStartup",
      "getVitalsRendering",
      "getVitalsBattery",
      "getVitalsMemory",
      "getVitalsLmk",
      "getVitalsErrorCount",
      "getVitalsAnomalies",
      "searchVitalsErrors",
      "compareVitalsTrend",
      "checkThreshold",
    ],
    "vitals",
  );
});

describe("Core Command Coverage — Subscriptions", () => {
  assertExports(
    [
      "listSubscriptions",
      "getSubscription",
      "createSubscription",
      "updateSubscription",
      "deleteSubscription",
      "activateBasePlan",
      "deactivateBasePlan",
      "deleteBasePlan",
      "migratePrices",
      "listOffers",
      "getOffer",
      "createOffer",
      "updateOffer",
      "deleteOffer",
      "activateOffer",
      "deactivateOffer",
    ],
    "subscriptions",
  );
});

describe("Core Command Coverage — In-App Products", () => {
  assertExports(
    [
      "listInAppProducts",
      "getInAppProduct",
      "createInAppProduct",
      "updateInAppProduct",
      "deleteInAppProduct",
      "syncInAppProducts",
      "batchSyncInAppProducts",
    ],
    "iap",
  );
});

describe("Core Command Coverage — Purchases & Orders", () => {
  assertExports(
    [
      "getProductPurchase",
      "acknowledgeProductPurchase",
      "consumeProductPurchase",
      "getSubscriptionPurchase",
      "cancelSubscriptionPurchase",
      "deferSubscriptionPurchase",
      "revokeSubscriptionPurchase",
      "listVoidedPurchases",
      "refundOrder",
    ],
    "purchases",
  );
});

describe("Core Command Coverage — Pricing", () => {
  assertExports(["convertRegionPrices"], "pricing");
});

describe("Core Command Coverage — Reports", () => {
  assertExports(
    [
      "listReports",
      "downloadReport",
      "parseMonth",
      "isValidReportType",
      "isFinancialReportType",
      "isStatsReportType",
      "isValidStatsDimension",
    ],
    "reports",
  );
});

describe("Core Command Coverage — Users & Testers", () => {
  assertExports(
    ["listUsers", "getUser", "inviteUser", "updateUser", "removeUser", "parseGrantArg"],
    "users",
  );
  assertExports(["listTesters", "addTesters", "removeTesters", "importTestersFromCsv"], "testers");
});

describe("Core Command Coverage — App Recovery", () => {
  assertExports(
    [
      "listRecoveryActions",
      "cancelRecoveryAction",
      "deployRecoveryAction",
      "createRecoveryAction",
      "addRecoveryTargeting",
    ],
    "recovery",
  );
});

describe("Core Command Coverage — Data Safety", () => {
  assertExports(["updateDataSafety", "importDataSafety"], "data-safety");
});

describe("Core Command Coverage — External Transactions", () => {
  assertExports(
    ["createExternalTransaction", "getExternalTransaction", "refundExternalTransaction"],
    "external-transactions",
  );
});

describe("Core Command Coverage — Device Tiers", () => {
  assertExports(["listDeviceTiers", "getDeviceTier", "createDeviceTier"], "device-tiers");
});

describe("Core Command Coverage — One-Time Products", () => {
  assertExports(
    [
      "listOneTimeProducts",
      "getOneTimeProduct",
      "createOneTimeProduct",
      "updateOneTimeProduct",
      "deleteOneTimeProduct",
      "listOneTimeOffers",
      "getOneTimeOffer",
      "createOneTimeOffer",
      "updateOneTimeOffer",
      "deleteOneTimeOffer",
    ],
    "one-time-products",
  );
});

describe("Core Command Coverage — Internal Sharing", () => {
  assertExports(["uploadInternalSharing"], "internal-sharing");
});

describe("Core Command Coverage — Generated APKs", () => {
  assertExports(["listGeneratedApks", "downloadGeneratedApk"], "generated-apks");
});

// Purchase Options: standalone resource removed (phantom API).
// Purchase options are managed through oneTimeProducts paths.

describe("Core Command Coverage — Status", () => {
  assertExports(
    ["getAppStatus", "formatStatusTable", "loadStatusCache", "saveStatusCache", "statusHasBreach"],
    "status",
  );
});
