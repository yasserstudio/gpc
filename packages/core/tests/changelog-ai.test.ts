import { describe, it, expect } from "vitest";
import {
  classifyError,
  resolveAiConfig,
  formatPathLabel,
  PROVIDER_WHITELIST,
  DEFAULT_MODELS,
} from "../src/index.js";

describe("classifyError", () => {
  it("maps 429 statusCode to rate_limited", () => {
    expect(classifyError({ statusCode: 429 })).toBe("rate_limited");
  });

  it("maps Anthropic 529 (Overloaded) to rate_limited", () => {
    expect(classifyError({ statusCode: 529, message: "Overloaded" })).toBe("rate_limited");
  });

  it("maps RateLimitError name to rate_limited", () => {
    expect(classifyError({ name: "RateLimitError", message: "too many" })).toBe("rate_limited");
  });

  it("maps 401/403 to auth", () => {
    expect(classifyError({ statusCode: 401 })).toBe("auth");
    expect(classifyError({ statusCode: 403 })).toBe("auth");
  });

  it("maps 'API key invalid' messages to auth", () => {
    expect(classifyError({ message: "API key invalid: check your ANTHROPIC_API_KEY" })).toBe(
      "auth",
    );
  });

  it("maps finishReason SAFETY to safety_blocked (Google)", () => {
    expect(classifyError({ finishReason: "SAFETY" })).toBe("safety_blocked");
  });

  it("maps 400 + content_policy message to safety_blocked (OpenAI)", () => {
    expect(
      classifyError({
        statusCode: 400,
        message: "Your request was rejected by content_policy",
      }),
    ).toBe("safety_blocked");
  });

  it("maps AbortError to timeout", () => {
    expect(classifyError({ name: "AbortError", message: "aborted" })).toBe("timeout");
  });

  it("maps 'timed out' messages to timeout", () => {
    expect(classifyError({ message: "request timed out after 30s" })).toBe("timeout");
  });

  it("maps ECONNREFUSED to network", () => {
    expect(classifyError({ message: "fetch failed: ECONNREFUSED" })).toBe("network");
  });

  it("falls through to unknown for unrecognized shapes", () => {
    expect(classifyError({ message: "something weird happened" })).toBe("unknown");
    expect(classifyError(null)).toBe("unknown");
    expect(classifyError("a string")).toBe("unknown");
    expect(classifyError(undefined)).toBe("unknown");
  });

  it("rate_limited wins over safety_blocked when both signals present", () => {
    // Precedence invariant: 429 is actionable (retry later), SAFETY is not.
    // We should surface the retry-able reason first.
    expect(classifyError({ statusCode: 429, finishReason: "SAFETY" })).toBe("rate_limited");
  });
});

describe("resolveAiConfig", () => {
  it("picks gateway path + anthropic default when AI_GATEWAY_API_KEY is set", () => {
    const config = resolveAiConfig({ env: { AI_GATEWAY_API_KEY: "gw-key" } });
    expect(config.path).toBe("gateway");
    expect(config.provider).toBe("anthropic");
    expect(config.model).toBe(DEFAULT_MODELS.anthropic);
    expect(config.runId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("picks direct path + anthropic when ANTHROPIC_API_KEY only", () => {
    const config = resolveAiConfig({ env: { ANTHROPIC_API_KEY: "sk-ant-x" } });
    expect(config.path).toBe("direct");
    expect(config.provider).toBe("anthropic");
    expect(config.model).toBe(DEFAULT_MODELS.anthropic);
  });

  it("picks direct + openai when only OPENAI_API_KEY is set", () => {
    const config = resolveAiConfig({ env: { OPENAI_API_KEY: "sk-openai-x" } });
    expect(config.path).toBe("direct");
    expect(config.provider).toBe("openai");
    expect(config.model).toBe(DEFAULT_MODELS.openai);
  });

  it("picks direct + google when only GOOGLE_GENERATIVE_AI_API_KEY is set", () => {
    const config = resolveAiConfig({ env: { GOOGLE_GENERATIVE_AI_API_KEY: "AIza-x" } });
    expect(config.path).toBe("direct");
    expect(config.provider).toBe("google");
    expect(config.model).toBe(DEFAULT_MODELS.google);
  });

  it("gateway wins over direct keys when both are set", () => {
    const config = resolveAiConfig({
      env: { AI_GATEWAY_API_KEY: "gw-key", OPENAI_API_KEY: "sk-openai-x" },
    });
    expect(config.path).toBe("gateway");
    expect(config.provider).toBe("anthropic");
  });

  it("respects explicit --provider override on gateway path", () => {
    const config = resolveAiConfig({
      provider: "openai",
      env: { AI_GATEWAY_API_KEY: "gw-key" },
    });
    expect(config.path).toBe("gateway");
    expect(config.provider).toBe("openai");
    expect(config.model).toBe(DEFAULT_MODELS.openai);
  });

  it("respects explicit --model override", () => {
    const config = resolveAiConfig({
      model: "claude-opus-4-7",
      env: { ANTHROPIC_API_KEY: "sk-ant-x" },
    });
    expect(config.model).toBe("claude-opus-4-7");
  });

  it("throws CHANGELOG_AI_UNKNOWN_PROVIDER for unknown --provider", () => {
    expect(() =>
      resolveAiConfig({ provider: "mistral", env: { ANTHROPIC_API_KEY: "sk" } }),
    ).toThrowError(/Unknown --provider "mistral"/);
  });

  it("normalizes --provider to lowercase (ANTHROPIC / Anthropic → anthropic)", () => {
    expect(
      resolveAiConfig({ provider: "ANTHROPIC", env: { ANTHROPIC_API_KEY: "x" } }).provider,
    ).toBe("anthropic");
    expect(
      resolveAiConfig({ provider: "Anthropic", env: { ANTHROPIC_API_KEY: "x" } }).provider,
    ).toBe("anthropic");
    expect(resolveAiConfig({ provider: "OpenAI", env: { ANTHROPIC_API_KEY: "x" } }).provider).toBe(
      "openai",
    );
  });

  it("treats empty-string AI_GATEWAY_API_KEY as unset", () => {
    // `AI_GATEWAY_API_KEY=""` is falsy at runtime — commonly happens when a
    // CI secret is unset but the env var is still exported. Must not opt into
    // the Gateway path based on the mere presence of the key.
    const config = resolveAiConfig({
      env: { AI_GATEWAY_API_KEY: "", ANTHROPIC_API_KEY: "sk" },
    });
    expect(config.path).toBe("direct");
    expect(config.provider).toBe("anthropic");
  });

  it("throws CHANGELOG_AI_NO_CREDENTIALS when no env key is set", () => {
    expect(() => resolveAiConfig({ env: {} })).toThrowError(/No AI provider credentials found/);
  });

  it("generates a distinct runId per invocation", () => {
    const a = resolveAiConfig({ env: { ANTHROPIC_API_KEY: "x" } });
    const b = resolveAiConfig({ env: { ANTHROPIC_API_KEY: "x" } });
    expect(a.runId).not.toBe(b.runId);
  });
});

describe("formatPathLabel", () => {
  it("formats gateway labels", () => {
    const label = formatPathLabel({
      path: "gateway",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      runId: "r",
    });
    expect(label).toBe("routing via AI Gateway (anthropic/claude-sonnet-4-6)");
  });

  it("formats direct labels with correct brand casing", () => {
    expect(
      formatPathLabel({ path: "direct", provider: "openai", model: "gpt-4o-mini", runId: "r" }),
    ).toBe("direct OpenAI SDK (gpt-4o-mini)");
    expect(formatPathLabel({ path: "direct", provider: "anthropic", model: "m", runId: "r" })).toBe(
      "direct Anthropic SDK (m)",
    );
    expect(formatPathLabel({ path: "direct", provider: "google", model: "m", runId: "r" })).toBe(
      "direct Google SDK (m)",
    );
  });
});

describe("PROVIDER_WHITELIST / DEFAULT_MODELS", () => {
  it("whitelist contains exactly anthropic, openai, google", () => {
    expect([...PROVIDER_WHITELIST].sort()).toEqual(["anthropic", "google", "openai"]);
  });

  it("all whitelisted providers have a default model", () => {
    for (const p of PROVIDER_WHITELIST) {
      expect(DEFAULT_MODELS[p]).toBeTruthy();
    }
  });

  it("default models are non-reasoning choices", () => {
    // Guard against accidentally picking reasoning-model defaults (gpt-5, o3, etc.)
    expect(DEFAULT_MODELS.openai).not.toMatch(/^(gpt-5|o3|o4)/);
    expect(DEFAULT_MODELS.anthropic).not.toMatch(/thinking/i);
  });
});
