import type { WebhookConfig } from "@gpc-cli/config";

export interface WebhookPayload {
  command: string;
  success: boolean;
  duration: number;
  app?: string;
  details?: Record<string, unknown>;
  error?: string;
}

export function formatSlackPayload(payload: WebhookPayload): object {
  const status = payload.success ? "\u2713" : "\u2717";
  const color = payload.success ? "#2eb886" : "#e01e5a";
  const durationSec = (payload.duration / 1000).toFixed(1);

  const fields: Array<{ title: string; value: string; short: boolean }> = [
    { title: "Command", value: payload.command, short: true },
    { title: "Duration", value: `${durationSec}s`, short: true },
  ];

  if (payload.app) {
    fields.push({ title: "App", value: payload.app, short: true });
  }

  if (payload.error) {
    fields.push({ title: "Error", value: payload.error, short: false });
  }

  if (payload.details) {
    for (const [key, value] of Object.entries(payload.details)) {
      fields.push({ title: key, value: String(value), short: true });
    }
  }

  return {
    attachments: [
      {
        color,
        fallback: `GPC: ${payload.command} ${status}`,
        title: `GPC: ${payload.command} ${status}`,
        fields,
        footer: "GPC CLI",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

export function formatDiscordPayload(payload: WebhookPayload): object {
  const status = payload.success ? "\u2713" : "\u2717";
  const color = payload.success ? 0x2eb886 : 0xe01e5a;
  const durationSec = (payload.duration / 1000).toFixed(1);

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: "Command", value: payload.command, inline: true },
    { name: "Duration", value: `${durationSec}s`, inline: true },
  ];

  if (payload.app) {
    fields.push({ name: "App", value: payload.app, inline: true });
  }

  if (payload.error) {
    fields.push({ name: "Error", value: payload.error, inline: false });
  }

  if (payload.details) {
    for (const [key, value] of Object.entries(payload.details)) {
      fields.push({ name: key, value: String(value), inline: true });
    }
  }

  return {
    embeds: [
      {
        title: `GPC: ${payload.command} ${status}`,
        color,
        fields,
        footer: { text: "GPC CLI" },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function formatCustomPayload(payload: WebhookPayload): object {
  return { ...payload };
}

type WebhookTarget = "slack" | "discord" | "custom";

const FORMATTERS: Record<WebhookTarget, (p: WebhookPayload) => object> = {
  slack: formatSlackPayload,
  discord: formatDiscordPayload,
  custom: formatCustomPayload,
};

const WEBHOOK_TIMEOUT_MS = 5000;

async function sendSingle(url: string, body: object): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendWebhook(
  config: WebhookConfig,
  payload: WebhookPayload,
  target?: string,
): Promise<void> {
  try {
    const targets: WebhookTarget[] = target
      ? [target as WebhookTarget]
      : (Object.keys(FORMATTERS) as WebhookTarget[]);

    const promises: Promise<void>[] = [];

    for (const t of targets) {
      const url = config[t];
      if (!url) continue;

      const formatter = FORMATTERS[t];
      if (!formatter) continue;

      const body = formatter(payload);
      promises.push(sendSingle(url, body).catch(() => {}));
    }

    await Promise.all(promises);
  } catch {
    // Never throw — webhook failures must not break the CLI
  }
}
