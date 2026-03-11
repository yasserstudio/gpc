import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendWebhook,
  formatSlackPayload,
  formatDiscordPayload,
  formatCustomPayload,
} from "../src/utils/webhooks.js";
import type { WebhookPayload } from "../src/utils/webhooks.js";
import type { WebhookConfig } from "@gpc-cli/config";

const successPayload: WebhookPayload = {
  command: "releases upload",
  success: true,
  duration: 3500,
  app: "com.example.app",
};

const failurePayload: WebhookPayload = {
  command: "releases promote",
  success: false,
  duration: 1200,
  app: "com.example.app",
  error: "Track not found",
};

const detailedPayload: WebhookPayload = {
  command: "releases upload",
  success: true,
  duration: 5000,
  app: "com.example.app",
  details: { track: "beta", versionCode: 42 },
};

describe("formatSlackPayload", () => {
  it("formats a successful payload", () => {
    const result = formatSlackPayload(successPayload) as Record<string, unknown>;
    const attachments = result["attachments"] as Array<Record<string, unknown>>;
    expect(attachments).toHaveLength(1);
    expect(attachments[0]["color"]).toBe("#2eb886");
    expect(attachments[0]["title"]).toContain("releases upload");
    expect(attachments[0]["title"]).toContain("\u2713");
  });

  it("formats a failure payload with red color", () => {
    const result = formatSlackPayload(failurePayload) as Record<string, unknown>;
    const attachments = result["attachments"] as Array<Record<string, unknown>>;
    expect(attachments[0]["color"]).toBe("#e01e5a");
    expect(attachments[0]["title"]).toContain("\u2717");
  });

  it("includes error field when present", () => {
    const result = formatSlackPayload(failurePayload) as Record<string, unknown>;
    const attachments = result["attachments"] as Array<Record<string, unknown>>;
    const fields = attachments[0]["fields"] as Array<Record<string, unknown>>;
    const errorField = fields.find((f) => f["title"] === "Error");
    expect(errorField).toBeDefined();
    expect(errorField!["value"]).toBe("Track not found");
  });

  it("includes detail fields when present", () => {
    const result = formatSlackPayload(detailedPayload) as Record<string, unknown>;
    const attachments = result["attachments"] as Array<Record<string, unknown>>;
    const fields = attachments[0]["fields"] as Array<Record<string, unknown>>;
    const trackField = fields.find((f) => f["title"] === "track");
    expect(trackField).toBeDefined();
    expect(trackField!["value"]).toBe("beta");
  });
});

describe("formatDiscordPayload", () => {
  it("formats a successful payload as Discord embed", () => {
    const result = formatDiscordPayload(successPayload) as Record<string, unknown>;
    const embeds = result["embeds"] as Array<Record<string, unknown>>;
    expect(embeds).toHaveLength(1);
    expect(embeds[0]["color"]).toBe(0x2eb886);
    expect(embeds[0]["title"]).toContain("releases upload");
    expect(embeds[0]["title"]).toContain("\u2713");
  });

  it("formats a failure payload with red color", () => {
    const result = formatDiscordPayload(failurePayload) as Record<string, unknown>;
    const embeds = result["embeds"] as Array<Record<string, unknown>>;
    expect(embeds[0]["color"]).toBe(0xe01e5a);
    expect(embeds[0]["title"]).toContain("\u2717");
  });

  it("includes app field", () => {
    const result = formatDiscordPayload(successPayload) as Record<string, unknown>;
    const embeds = result["embeds"] as Array<Record<string, unknown>>;
    const fields = embeds[0]["fields"] as Array<Record<string, unknown>>;
    const appField = fields.find((f) => f["name"] === "App");
    expect(appField).toBeDefined();
    expect(appField!["value"]).toBe("com.example.app");
  });
});

describe("formatCustomPayload", () => {
  it("returns raw payload as JSON", () => {
    const result = formatCustomPayload(successPayload);
    expect(result).toEqual(successPayload);
  });

  it("does not mutate original payload", () => {
    const result = formatCustomPayload(successPayload);
    expect(result).not.toBe(successPayload);
    expect(result).toEqual(successPayload);
  });
});

describe("sendWebhook", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with correct URL and body for slack", async () => {
    const config: WebhookConfig = { slack: "https://hooks.slack.com/services/XXX" };
    await sendWebhook(config, successPayload, "slack");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hooks.slack.com/services/XXX");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toEqual({ "Content-Type": "application/json" });

    const body = JSON.parse(opts.body as string);
    expect(body["attachments"]).toBeDefined();
  });

  it("calls fetch with correct URL and body for discord", async () => {
    const config: WebhookConfig = { discord: "https://discord.com/api/webhooks/XXX" };
    await sendWebhook(config, successPayload, "discord");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body["embeds"]).toBeDefined();
  });

  it("calls fetch with raw JSON for custom", async () => {
    const config: WebhookConfig = { custom: "https://example.com/webhook" };
    await sendWebhook(config, successPayload, "custom");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body["command"]).toBe("releases upload");
    expect(body["success"]).toBe(true);
  });

  it("sends to only the specified target", async () => {
    const config: WebhookConfig = {
      slack: "https://hooks.slack.com/services/XXX",
      discord: "https://discord.com/api/webhooks/XXX",
      custom: "https://example.com/webhook",
    };
    await sendWebhook(config, successPayload, "slack");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("https://hooks.slack.com/services/XXX");
  });

  it("sends to all configured webhooks when no target specified", async () => {
    const config: WebhookConfig = {
      slack: "https://hooks.slack.com/services/XXX",
      discord: "https://discord.com/api/webhooks/XXX",
      custom: "https://example.com/webhook",
    };
    await sendWebhook(config, successPayload);

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("handles fetch failure gracefully without throwing", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const config: WebhookConfig = { slack: "https://hooks.slack.com/services/XXX" };

    await expect(sendWebhook(config, successPayload, "slack")).resolves.toBeUndefined();
  });

  it("handles abort/timeout gracefully without throwing", async () => {
    mockFetch.mockImplementation(
      () => new Promise((_resolve, reject) => setTimeout(() => reject(new Error("aborted")), 10)),
    );
    const config: WebhookConfig = { slack: "https://hooks.slack.com/services/XXX" };

    await expect(sendWebhook(config, successPayload, "slack")).resolves.toBeUndefined();
  });

  it("skips when no webhooks are configured", async () => {
    const config: WebhookConfig = {};
    await sendWebhook(config, successPayload);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips target when URL is not configured for it", async () => {
    const config: WebhookConfig = { slack: "https://hooks.slack.com/services/XXX" };
    await sendWebhook(config, successPayload, "discord");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses AbortSignal for timeout", async () => {
    const config: WebhookConfig = { slack: "https://hooks.slack.com/services/XXX" };
    await sendWebhook(config, successPayload, "slack");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });
});
