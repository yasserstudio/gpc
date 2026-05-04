import { describe, it, expect } from "vitest";
import { decodeNotification, formatNotification } from "../src/commands/rtdn.js";

const makePayload = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64");

const BASE = {
  version: "1.0",
  packageName: "com.example.app",
  eventTimeMillis: "1700000000000",
};

describe("decodeNotification", () => {
  it("decodes valid base64 JSON", () => {
    const payload = makePayload({ ...BASE, testNotification: { version: "1.0" } });
    const result = decodeNotification(payload);
    expect(result.packageName).toBe("com.example.app");
    expect(result.testNotification).toBeDefined();
  });

  it("throws on invalid base64", () => {
    expect(() => decodeNotification("!!!invalid!!!")).toThrow("Failed to decode");
  });

  it("throws on non-JSON base64", () => {
    const payload = Buffer.from("not json").toString("base64");
    expect(() => decodeNotification(payload)).toThrow("Failed to decode");
  });
});

describe("formatNotification", () => {
  it("formats test notification", () => {
    const result = formatNotification({
      ...BASE,
      testNotification: { version: "1.0" },
    });
    expect(result.type).toBe("test");
    expect(result.event).toBe("TEST_NOTIFICATION");
  });

  it("formats voided purchase notification", () => {
    const result = formatNotification({
      ...BASE,
      voidedPurchaseNotification: {
        purchaseToken: "abcdefghijklmnopqrstuvwxyz",
        orderId: "GPA.1234",
        productType: 0,
      },
    });
    expect(result.type).toBe("voided-purchase");
    expect(result.event).toBe("VOIDED_PURCHASE");
  });

  it("formats OTP notification", () => {
    const result = formatNotification({
      ...BASE,
      oneTimeProductNotification: {
        version: "1.0",
        notificationType: 1,
        purchaseToken: "abcdefghijklmnopqrstuvwxyz",
        sku: "com.example.item",
      },
    });
    expect(result.type).toBe("one-time-product");
    expect(result.event).toBe("ONE_TIME_PRODUCT_PURCHASED");
  });

  it("returns unknown for unrecognized notification shape", () => {
    const result = formatNotification(BASE as any);
    expect(result.type).toBe("unknown");
  });

  it.each([
    [1, "SUBSCRIPTION_RECOVERED"],
    [2, "SUBSCRIPTION_RENEWED"],
    [3, "SUBSCRIPTION_CANCELED"],
    [4, "SUBSCRIPTION_PURCHASED"],
    [5, "SUBSCRIPTION_ON_HOLD"],
    [6, "SUBSCRIPTION_IN_GRACE_PERIOD"],
    [7, "SUBSCRIPTION_RESTARTED"],
    [8, "SUBSCRIPTION_PRICE_CHANGE_CONFIRMED"],
    [9, "SUBSCRIPTION_DEFERRED"],
    [10, "SUBSCRIPTION_PAUSED"],
    [11, "SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED"],
    [12, "SUBSCRIPTION_REVOKED"],
    [13, "SUBSCRIPTION_EXPIRED"],
    [17, "SUBSCRIPTION_ITEMS_CHANGED"],
    [18, "SUBSCRIPTION_CANCELLATION_SCHEDULED"],
    [19, "SUBSCRIPTION_PRICE_CHANGE_UPDATED"],
    [20, "SUBSCRIPTION_PENDING_PURCHASE_CANCELED"],
    [22, "SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED"],
  ])("subscription type %i → %s", (type, expected) => {
    const result = formatNotification({
      ...BASE,
      subscriptionNotification: {
        version: "1.0",
        notificationType: type,
        purchaseToken: "abcdefghijklmnopqrstuvwxyz",
        subscriptionId: "sub_monthly",
      },
    });
    expect(result.type).toBe("subscription");
    expect(result.event).toBe(expected);
  });

  it("falls back to UNKNOWN for unrecognized subscription type", () => {
    const result = formatNotification({
      ...BASE,
      subscriptionNotification: {
        version: "1.0",
        notificationType: 999,
        purchaseToken: "abcdefghijklmnopqrstuvwxyz",
        subscriptionId: "sub_monthly",
      },
    });
    expect(result.event).toBe("UNKNOWN(999)");
  });

  it("truncates purchase token in output", () => {
    const result = formatNotification({
      ...BASE,
      subscriptionNotification: {
        version: "1.0",
        notificationType: 1,
        purchaseToken: "abcdefghijklmnopqrstuvwxyz",
        subscriptionId: "sub_monthly",
      },
    });
    expect(result.purchaseToken).toBe("abcdefghijklmnop...");
  });
});
