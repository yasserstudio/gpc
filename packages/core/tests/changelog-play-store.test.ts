import { describe, it, expect, vi } from "vitest";
import {
  buildLocaleBundle,
  renderPlayStore,
  resolveLocales,
  PLAY_STORE_LIMIT,
  PLACEHOLDER_TEXT,
  type GeneratedChangelog,
  type ParsedCommit,
} from "../src/index.js";

function commit(overrides: Partial<ParsedCommit> & { sha: string; subject: string }): ParsedCommit {
  return {
    type: "feat",
    files: [],
    weight: 10,
    isRevert: false,
    isFixup: false,
    authorDate: "2026-04-15T12:00:00Z",
    ...overrides,
  };
}

function makeGenerated(
  overrides: Partial<GeneratedChangelog> = {},
): GeneratedChangelog {
  const grouped = overrides.grouped ?? {
    feat: [commit({ sha: "abc1234", subject: "shell completion walker" })],
    fix: [commit({ sha: "def5678", subject: "correct vitals lmk endpoint", type: "fix" })],
  };
  const { grouped: _ignored, ...rest } = overrides;
  void _ignored;
  return {
    from: "v0.9.61",
    to: "v0.9.62",
    repo: "yasserstudio/gpc",
    rawCommitCount: 2,
    commits: [],
    clusters: [],
    grouped,
    headlineCandidates: [],
    warnings: [],
    ...rest,
  };
}

describe("buildLocaleBundle", () => {
  it("renders en-US bullets lossless from grouped commits", () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, { locales: ["en-US"], format: "md" });
    const en = bundle.locales.find((l) => l.language === "en-US")!;
    expect(en.text).toContain("- feat: shell completion walker");
    expect(en.text).toContain("- fix: correct vitals lmk endpoint");
    expect(en.status).toBe("ok");
  });

  it("emits placeholder text for non-source locales", () => {
    const g = makeGenerated();
    const bundle = buildLocaleBundle(g, {
      locales: ["en-US", "fr-FR", "de-DE"],
      format: "md",
    });
    const fr = bundle.locales.find((l) => l.language === "fr-FR")!;
    expect(fr.status).toBe("placeholder");
    expect(fr.text).toBe(PLACEHOLDER_TEXT);
  });

  it("flags overflow and collects in overflows[]", () => {
    const longSubject = "x".repeat(PLAY_STORE_LIMIT);
    const g = makeGenerated({
      grouped: {
        feat: [
          commit({ sha: "abc", subject: longSubject }),
          commit({ sha: "def", subject: longSubject }),
        ],
      },
    });
    const bundle = buildLocaleBundle(g, { locales: ["en-US"], format: "md" });
    expect(bundle.overflows).toEqual(["en-US"]);
    const en = bundle.locales[0]!;
    expect(en.status).toBe("over");
    expect([...en.text].length).toBe(PLAY_STORE_LIMIT);
    expect(en.text.endsWith("…")).toBe(true);
  });

  it("counts chars as Unicode code points, not UTF-16 units", () => {
    const g = makeGenerated({
      grouped: {
        feat: [commit({ sha: "abc", subject: "🎉 party" })],
      },
    });
    const bundle = buildLocaleBundle(g, { locales: ["en-US"], format: "md" });
    const en = bundle.locales[0]!;
    expect(en.chars).toBe([...en.text].length);
  });

  it("emits 'No notable changes.' for empty range", () => {
    const g = makeGenerated({ grouped: {} });
    const bundle = buildLocaleBundle(g, { locales: ["en-US"], format: "md" });
    const en = bundle.locales[0]!;
    expect(en.status).toBe("empty");
    expect(en.text).toBe("No notable changes.");
  });
});

describe("renderPlayStore", () => {
  it("md format includes per-locale headings and summary", () => {
    const g = makeGenerated();
    const { output } = renderPlayStore(g, {
      locales: ["en-US", "fr-FR"],
      format: "md",
    });
    expect(output).toContain("## en-US");
    expect(output).toContain("## fr-FR (needs translation)");
    expect(output).toContain("## Summary");
    expect(output).toMatch(/en-US: \d+\/500 ✓/);
  });

  it("json format parses and exposes bundle shape", () => {
    const g = makeGenerated();
    const { output } = renderPlayStore(g, {
      locales: ["en-US", "fr-FR"],
      format: "json",
    });
    const parsed = JSON.parse(output);
    expect(parsed.limit).toBe(500);
    expect(parsed.from).toBe("v0.9.61");
    expect(parsed.locales).toHaveLength(2);
    expect(parsed.sourceLanguage).toBe("en-US");
  });

  it("prompt format includes target list and source text", () => {
    const g = makeGenerated();
    const { output } = renderPlayStore(g, {
      locales: ["en-US", "fr-FR", "de-DE"],
      format: "prompt",
    });
    expect(output).toContain("TARGETS:");
    expect(output).toContain("  - fr-FR");
    expect(output).toContain("  - de-DE");
    expect(output).toContain("SOURCE (en-US");
    expect(output).toContain("- feat: shell completion walker");
    expect(output).toContain("≤ 500");
  });

  it("prompt format handles source-only bundle gracefully", () => {
    const g = makeGenerated();
    const { output } = renderPlayStore(g, {
      locales: ["en-US"],
      format: "prompt",
    });
    expect(output).toContain("(none — source-only bundle)");
  });
});

describe("resolveLocales", () => {
  it("parses CSV into a validated list", async () => {
    const out = await resolveLocales("en-US,fr-FR,de-DE");
    expect(out).toEqual(["en-US", "fr-FR", "de-DE"]);
  });

  it("rejects invalid BCP 47 codes with CHANGELOG_LOCALES_INVALID", async () => {
    await expect(resolveLocales("en-US,xx-ZZ")).rejects.toMatchObject({
      code: "CHANGELOG_LOCALES_INVALID",
      exitCode: 2,
    });
  });

  it("rejects empty input with CHANGELOG_LOCALES_REQUIRED", async () => {
    await expect(resolveLocales("")).rejects.toMatchObject({
      code: "CHANGELOG_LOCALES_REQUIRED",
    });
  });

  it("'auto' without client/packageName throws CHANGELOG_LOCALES_AUTO_NO_APP", async () => {
    await expect(resolveLocales("auto")).rejects.toMatchObject({
      code: "CHANGELOG_LOCALES_AUTO_NO_APP",
      exitCode: 2,
    });
  });

  it("'auto' fetches listings via client and returns languages", async () => {
    const editInsert = vi.fn().mockResolvedValue({ id: "edit-1" });
    const editDelete = vi.fn().mockResolvedValue(undefined);
    const listingsList = vi
      .fn()
      .mockResolvedValue([{ language: "en-US" }, { language: "fr-FR" }, { language: "de-DE" }]);
    const client = {
      edits: { insert: editInsert, delete: editDelete },
      listings: { list: listingsList },
    } as unknown as Parameters<typeof resolveLocales>[1] extends { client?: infer C } ? C : never;

    const out = await resolveLocales("auto", {
      client: client as never,
      packageName: "com.example.app",
    });
    expect(out).toEqual(["en-US", "fr-FR", "de-DE"]);
    expect(editInsert).toHaveBeenCalledWith("com.example.app");
    expect(listingsList).toHaveBeenCalledWith("com.example.app", "edit-1");
    expect(editDelete).toHaveBeenCalled();
  });

  it("'auto' with zero listings throws CHANGELOG_LOCALES_EMPTY", async () => {
    const client = {
      edits: {
        insert: vi.fn().mockResolvedValue({ id: "edit-1" }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      listings: { list: vi.fn().mockResolvedValue([]) },
    };
    await expect(
      resolveLocales("auto", {
        client: client as never,
        packageName: "com.example.app",
      }),
    ).rejects.toMatchObject({ code: "CHANGELOG_LOCALES_EMPTY" });
  });
});
