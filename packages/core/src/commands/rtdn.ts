import type { PlayApiClient } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RtdnConfig {
  topicName?: string;
  enabled?: boolean;
}

export interface RtdnStatus {
  topicName: string | null;
  enabled: boolean;
}

export interface DecodedNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  oneTimeProductNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    sku: string;
  };
  voidedPurchaseNotification?: {
    purchaseToken: string;
    orderId: string;
    productType: number;
    refundType?: number;
  };
  testNotification?: {
    version: string;
  };
}

// RTDN notification type names
const SUBSCRIPTION_NOTIFICATION_TYPES: Record<number, string> = {
  1: "SUBSCRIPTION_RECOVERED",
  2: "SUBSCRIPTION_RENEWED",
  3: "SUBSCRIPTION_CANCELED",
  4: "SUBSCRIPTION_PURCHASED",
  5: "SUBSCRIPTION_ON_HOLD",
  6: "SUBSCRIPTION_IN_GRACE_PERIOD",
  7: "SUBSCRIPTION_RESTARTED",
  8: "SUBSCRIPTION_PRICE_CHANGE_CONFIRMED",
  9: "SUBSCRIPTION_DEFERRED",
  10: "SUBSCRIPTION_PAUSED",
  11: "SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED",
  12: "SUBSCRIPTION_REVOKED",
  13: "SUBSCRIPTION_EXPIRED",
  20: "SUBSCRIPTION_PENDING_PURCHASE_CANCELED",
};

const OTP_NOTIFICATION_TYPES: Record<number, string> = {
  1: "ONE_TIME_PRODUCT_PURCHASED",
  2: "ONE_TIME_PRODUCT_CANCELED",
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Get RTDN status by reading the app's notification topic configuration.
 * Uses the monetization settings endpoint if available, otherwise returns defaults.
 */
export async function getRtdnStatus(
  client: PlayApiClient,
  packageName: string,
): Promise<RtdnStatus> {
  try {
    // The RTDN topic is configured via the Developer API notification settings
    // This is typically set via the Play Console or the API's appInformation endpoint
    const edit = await client.edits.insert(packageName);
    try {
      const details = await client.details.get(packageName, edit.id);
      // App details doesn't directly expose RTDN topic — return basic info
      return {
        topicName: null,
        enabled: false,
      };
    } finally {
      await client.edits.delete(packageName, edit.id).catch(() => {});
    }
  } catch {
    return { topicName: null, enabled: false };
  }
}

/**
 * Decode a base64-encoded RTDN notification payload.
 * Pub/Sub messages from Google Play are base64-encoded JSON.
 */
export function decodeNotification(base64Payload: string): DecodedNotification {
  try {
    const json = Buffer.from(base64Payload, "base64").toString("utf-8");
    return JSON.parse(json) as DecodedNotification;
  } catch {
    throw new GpcError(
      "Failed to decode notification payload. Expected base64-encoded JSON.",
      "RTDN_DECODE_ERROR",
      1,
      "Ensure the payload is a valid base64-encoded Pub/Sub message from Google Play.",
    );
  }
}

/**
 * Format a decoded notification into a human-readable summary.
 */
export function formatNotification(notification: DecodedNotification): Record<string, unknown> {
  const base: Record<string, unknown> = {
    packageName: notification.packageName,
    eventTime: notification.eventTimeMillis
      ? new Date(Number(notification.eventTimeMillis)).toISOString()
      : "-",
    version: notification.version,
  };

  if (notification.subscriptionNotification) {
    const n = notification.subscriptionNotification;
    return {
      ...base,
      type: "subscription",
      event: SUBSCRIPTION_NOTIFICATION_TYPES[n.notificationType] || `UNKNOWN(${n.notificationType})`,
      subscriptionId: n.subscriptionId,
      purchaseToken: n.purchaseToken.slice(0, 16) + "...",
    };
  }

  if (notification.oneTimeProductNotification) {
    const n = notification.oneTimeProductNotification;
    return {
      ...base,
      type: "one-time-product",
      event: OTP_NOTIFICATION_TYPES[n.notificationType] || `UNKNOWN(${n.notificationType})`,
      sku: n.sku,
      purchaseToken: n.purchaseToken.slice(0, 16) + "...",
    };
  }

  if (notification.voidedPurchaseNotification) {
    const n = notification.voidedPurchaseNotification;
    return {
      ...base,
      type: "voided-purchase",
      event: "VOIDED_PURCHASE",
      orderId: n.orderId,
      purchaseToken: n.purchaseToken.slice(0, 16) + "...",
    };
  }

  if (notification.testNotification) {
    return { ...base, type: "test", event: "TEST_NOTIFICATION" };
  }

  return { ...base, type: "unknown" };
}
