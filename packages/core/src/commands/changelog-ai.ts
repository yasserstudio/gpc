import { randomUUID } from "node:crypto";
import { GpcError } from "../errors.js";

export type Provider = "anthropic" | "openai" | "google";
export type TranslationPath = "gateway" | "direct";

export type ErrorReason =
  | "rate_limited"
  | "auth"
  | "safety_blocked"
  | "timeout"
  | "network"
  | "no_source"
  | "unknown";

export interface TranslationResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export type Translator = (locale: string, sourceText: string) => Promise<TranslationResult>;

export interface TranslatorConfig {
  path: TranslationPath;
  provider: Provider;
  model: string;
  runId: string;
}

export interface ResolveAiConfigOptions {
  provider?: string;
  model?: string;
  env?: NodeJS.ProcessEnv;
}

export const PROVIDER_WHITELIST: readonly Provider[] = ["anthropic", "openai", "google"] as const;

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
};

export function resolveAiConfig(opts: ResolveAiConfigOptions = {}): TranslatorConfig {
  const env = opts.env ?? process.env;
  const hasGateway =
    typeof env["AI_GATEWAY_API_KEY"] === "string" && env["AI_GATEWAY_API_KEY"].length > 0;

  let provider: Provider;
  if (opts.provider) {
    const normalized = opts.provider.toLowerCase();
    if (!(PROVIDER_WHITELIST as readonly string[]).includes(normalized)) {
      throw new GpcError(
        `Unknown --provider "${opts.provider}"`,
        "CHANGELOG_AI_UNKNOWN_PROVIDER",
        2,
        `Valid providers: ${PROVIDER_WHITELIST.join(", ")}`,
      );
    }
    provider = normalized as Provider;
  } else if (hasGateway || env["ANTHROPIC_API_KEY"]) {
    provider = "anthropic";
  } else if (env["OPENAI_API_KEY"]) {
    provider = "openai";
  } else if (env["GOOGLE_GENERATIVE_AI_API_KEY"]) {
    provider = "google";
  } else {
    throw new GpcError(
      "No AI provider credentials found in env",
      "CHANGELOG_AI_NO_CREDENTIALS",
      3,
      "Set one of: AI_GATEWAY_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY.",
    );
  }

  const model = opts.model ?? DEFAULT_MODELS[provider];
  const path: TranslationPath = hasGateway ? "gateway" : "direct";
  const runId = randomUUID();

  return { path, provider, model, runId };
}

export function classifyError(err: unknown): ErrorReason {
  if (!err || typeof err !== "object") return "unknown";
  const e = err as Record<string, unknown>;
  const name = typeof e["name"] === "string" ? (e["name"] as string) : "";
  const statusCode =
    typeof e["statusCode"] === "number"
      ? (e["statusCode"] as number)
      : typeof e["status"] === "number"
        ? (e["status"] as number)
        : 0;
  const message = typeof e["message"] === "string" ? (e["message"] as string).toLowerCase() : "";
  const finishReason = typeof e["finishReason"] === "string" ? (e["finishReason"] as string) : "";

  // 429 = standard rate-limit. 529 = Anthropic "Overloaded" (treated as rate-limit class).
  if (name === "RateLimitError" || statusCode === 429 || statusCode === 529) return "rate_limited";

  if (statusCode === 401 || statusCode === 403) return "auth";
  if (message.includes("api key invalid") || message.includes("invalid api key")) return "auth";

  if (finishReason === "SAFETY") return "safety_blocked";
  if (
    statusCode === 400 &&
    (message.includes("content_policy") ||
      message.includes("content policy") ||
      message.includes("safety"))
  ) {
    return "safety_blocked";
  }

  if (name === "AbortError" || name === "TimeoutError") return "timeout";
  if (message.includes("timeout") || message.includes("timed out")) return "timeout";

  if (
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("network") ||
    (name === "TypeError" && message.includes("fetch"))
  ) {
    return "network";
  }

  return "unknown";
}

function buildSystemPrompt(): string {
  return [
    'You translate Play Store "What\'s new" release notes for Android apps.',
    "Rules:",
    "- Translation MUST be at most 500 Unicode code points.",
    '- Preserve bullet format (one item per line, starts with "- ").',
    "- User-facing tone. Avoid internal jargon.",
    '- Do not translate technical names (package names, CLI flags, "GPC").',
    "- Drop the conventional-commit prefix (feat:/fix:/docs:) if it feels unnatural in the target language.",
    "Respond with the translated text only. No explanations, no markdown headings.",
  ].join("\n");
}

function buildUserPrompt(locale: string, sourceText: string): string {
  return `Translate the following release notes into ${locale}:\n\n${sourceText}`;
}

type ProviderOptions = Record<string, Record<string, unknown>>;

function providerSpecificOptions(provider: Provider): ProviderOptions {
  if (provider === "google") {
    return { google: { thinkingConfig: { thinkingBudget: 0 } } };
  }
  return {};
}

function readUsage(usage: unknown): { tokensIn: number; tokensOut: number } {
  if (!usage || typeof usage !== "object") return { tokensIn: 0, tokensOut: 0 };
  const u = usage as Record<string, unknown>;
  const tokensIn =
    typeof u["inputTokens"] === "number"
      ? (u["inputTokens"] as number)
      : typeof u["promptTokens"] === "number"
        ? (u["promptTokens"] as number)
        : 0;
  const tokensOut =
    typeof u["outputTokens"] === "number"
      ? (u["outputTokens"] as number)
      : typeof u["completionTokens"] === "number"
        ? (u["completionTokens"] as number)
        : 0;
  return { tokensIn, tokensOut };
}

export async function createTranslator(config: TranslatorConfig): Promise<Translator> {
  const ai = await import("ai");
  const generateText = ai.generateText;

  if (config.path === "gateway") {
    const modelString = `${config.provider}/${config.model}`;
    return async (locale, sourceText) => {
      const result = await generateText({
        model: ai.gateway(modelString),
        system: buildSystemPrompt(),
        prompt: buildUserPrompt(locale, sourceText),
        temperature: 0.2,
        providerOptions: {
          gateway: { tags: [`gpc-changelog-${config.runId}`] },
          ...providerSpecificOptions(config.provider),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      const { tokensIn, tokensOut } = readUsage(result.usage);
      return { text: result.text, tokensIn, tokensOut };
    };
  }

  // direct path
  let modelFactory: (modelId: string) => unknown;
  if (config.provider === "anthropic") {
    const mod = await import("@ai-sdk/anthropic");
    modelFactory = (id: string) => mod.anthropic(id);
  } else if (config.provider === "openai") {
    const mod = await import("@ai-sdk/openai");
    modelFactory = (id: string) => mod.openai(id);
  } else {
    const mod = await import("@ai-sdk/google");
    modelFactory = (id: string) => mod.google(id);
  }

  return async (locale, sourceText) => {
    const result = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: modelFactory(config.model) as any,
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(locale, sourceText),
      temperature: 0.2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      providerOptions: providerSpecificOptions(config.provider) as any,
    });
    const { tokensIn, tokensOut } = readUsage(result.usage);
    return { text: result.text, tokensIn, tokensOut };
  };
}

export async function fetchAggregateCost(runId: string): Promise<number | undefined> {
  try {
    const { gateway } = await import("ai");
    // Two-day window covers the UTC-midnight edge case where a long run
    // starts on day N and finishes on day N+1.
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const today = now.toISOString().slice(0, 10);
    const startDate = yesterday.toISOString().slice(0, 10);
    const report = await gateway.getSpendReport({
      startDate,
      endDate: today,
      groupBy: "tag",
      tags: [`gpc-changelog-${runId}`],
    });
    const results = (report as { results?: Array<{ totalCost?: number }> }).results ?? [];
    return results.reduce((sum, row) => sum + (row.totalCost ?? 0), 0);
  } catch {
    return undefined;
  }
}

const PROVIDER_BRAND: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

export function formatPathLabel(config: TranslatorConfig): string {
  if (config.path === "gateway") {
    return `routing via AI Gateway (${config.provider}/${config.model})`;
  }
  return `direct ${PROVIDER_BRAND[config.provider]} SDK (${config.model})`;
}
