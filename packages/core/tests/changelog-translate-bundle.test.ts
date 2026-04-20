import { describe, it, expect, vi } from "vitest";
import {
  buildLocaleBundle,
  translateBundle,
  PLAY_STORE_LIMIT,
  type GeneratedChangelog,
  type ParsedCommit,
  type Translator,
} from "../src/index.js";

function commit(overrides: Partial<ParsedCommit> & { sha: string; subject: string }): ParsedCommit {
  return {
    type: "feat",
    files: [],
    weight: 10,
    isRevert: false,
    isFixup: false,
    authorDate: "2026-04-20T12:00:00Z",
    ...overrides,
  };
}

function makeGenerated(): GeneratedChangelog {
  return {
    from: "v0.9.62",
    to: "v0.9.63",
    repo: "yasserstudio/gpc",
    rawCommitCount: 2,
    commits: [],
    clusters: [],
    grouped: {
      feat: [commit({ sha: "a", subject: "ai translation" })],
      fix: [commit({ sha: "b", subject: "google lmk endpoint", type: "fix" })],
      perf: [],
      docs: [],
      refactor: [],
      build: [],
      ci: [],
      chore: [],
      test: [],
      style: [],
      revert: [],
      breaking: [],
      other: [],
    },
    headlineCandidates: [],
    warnings: [],
    linterViolations: [],
  };
}

function mockTranslator(
  reply: (locale: string) => string | Error,
  tokens = { in: 50, out: 40 },
): Translator {
  return vi.fn(async (locale: string) => {
    const r = reply(locale);
    if (r instanceof Error) throw r;
    return { text: r, tokensIn: tokens.in, tokensOut: tokens.out };
  });
}

describe("translateBundle", () => {
  it("replaces placeholder entries with translated text and status 'ok'", async () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, { locales: ["en-US", "fr-FR"], format: "json" });
    const translator = mockTranslator((locale) => `Traduction FR (${locale})`);

    const translated = await translateBundle(bundle, { translator });

    const fr = translated.locales.find((e) => e.language === "fr-FR")!;
    expect(fr.status).toBe("ok");
    expect(fr.text).toBe("Traduction FR (fr-FR)");
    expect(fr.chars).toBe([...fr.text].length);
    expect(translated.failures).toEqual([]);
    expect(translated.tokensIn).toBe(50);
    expect(translated.tokensOut).toBe(40);
  });

  it("leaves source locale unchanged and only translates placeholders", async () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, { locales: ["en-US", "fr-FR"], format: "json" });
    const translator = mockTranslator(() => "FR text");

    const translated = await translateBundle(bundle, { translator });

    expect(translator).toHaveBeenCalledTimes(1);
    expect(translator).toHaveBeenCalledWith("fr-FR", expect.any(String));
    const en = translated.locales.find((e) => e.language === "en-US")!;
    expect(en.status).toBe("ok");
    expect(en.text).not.toBe("FR text");
  });

  it("truncates overlong translations and marks status 'over', populates overflows[]", async () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, { locales: ["en-US", "de-DE"], format: "json" });
    const longText = "X".repeat(PLAY_STORE_LIMIT + 100);
    const translator = mockTranslator(() => longText);

    const translated = await translateBundle(bundle, { translator });

    const de = translated.locales.find((e) => e.language === "de-DE")!;
    expect(de.status).toBe("over");
    expect(de.chars).toBe(PLAY_STORE_LIMIT);
    expect(de.text.endsWith("…")).toBe(true);
    expect(translated.overflows).toContain("de-DE");
  });

  it("emits status 'failed' with reason slug when translator throws", async () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, { locales: ["en-US", "pt-BR"], format: "json" });
    const rateLimited = Object.assign(new Error("too many requests"), { statusCode: 429 });
    const translator = mockTranslator((loc) => (loc === "pt-BR" ? rateLimited : "ok"));

    const translated = await translateBundle(bundle, { translator });

    const pt = translated.locales.find((e) => e.language === "pt-BR")!;
    expect(pt.status).toBe("failed");
    expect(pt.text).toBe("[translation failed: rate_limited]");
    expect(translated.failures).toEqual([{ language: "pt-BR", reason: "rate_limited" }]);
  });

  it("strict mode throws when any translation fails, lenient mode returns normally", async () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, { locales: ["en-US", "ja-JP"], format: "json" });
    const translator = mockTranslator(() => new Error("boom"));

    // lenient
    const lenient = await translateBundle(bundle, { translator });
    expect(lenient.failures).toHaveLength(1);

    // strict throws
    await expect(translateBundle(bundle, { translator, strict: true })).rejects.toMatchObject({
      code: "CHANGELOG_AI_TRANSLATION_FAILED",
      exitCode: 1,
    });
  });

  it("accumulates tokensIn/tokensOut across locales", async () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, {
      locales: ["en-US", "fr-FR", "es-ES", "de-DE"],
      format: "json",
    });
    const translator = mockTranslator(() => "ok", { in: 30, out: 25 });

    const translated = await translateBundle(bundle, { translator });

    expect(translated.tokensIn).toBe(90); // 3 non-source locales × 30
    expect(translated.tokensOut).toBe(75);
  });

  it("short-circuits with 'no_source' when source language is absent from the locale list", async () => {
    // Regression guard: if buildLocaleBundle is given a locale list that
    // doesn't include the source language, the bundle has no source entry
    // to translate FROM. Calling the LLM with empty input would hallucinate
    // or return empty — and bill the user's key — so we must short-circuit.
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, { locales: ["fr-FR"], format: "json" });
    expect(bundle.locales.find((e) => e.language === "en-US")).toBeUndefined();

    const translator = mockTranslator(() => "SHOULD NOT BE CALLED");
    const translated = await translateBundle(bundle, { translator });

    expect(translator).not.toHaveBeenCalled();
    expect(translated.failures).toEqual([{ language: "fr-FR", reason: "no_source" }]);
    const fr = translated.locales.find((e) => e.language === "fr-FR")!;
    expect(fr.status).toBe("failed");
    expect(fr.text).toBe("[translation failed: no_source]");
  });

  it("invokes onError and onTranslated callbacks", async () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, { locales: ["en-US", "fr-FR", "ja-JP"], format: "json" });
    const translator = mockTranslator((loc) =>
      loc === "ja-JP" ? Object.assign(new Error("auth"), { statusCode: 401 }) : "ok",
    );

    const onError = vi.fn();
    const onTranslated = vi.fn();
    await translateBundle(bundle, { translator, onError, onTranslated });

    expect(onTranslated).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ language: "ja-JP", reason: "auth" }, expect.any(Error));
  });
});
