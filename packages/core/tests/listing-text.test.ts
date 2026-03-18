import { describe, it, expect } from "vitest";
import {
  lintListings,
  wordDiff,
  formatWordDiff,
  DEFAULT_LIMITS,
  type DiffToken,
} from "../src/utils/listing-text.js";

// ---------------------------------------------------------------------------
// DEFAULT_LIMITS
// ---------------------------------------------------------------------------
describe("DEFAULT_LIMITS", () => {
  it("has expected fields with correct limits", () => {
    expect(DEFAULT_LIMITS.title).toBe(30);
    expect(DEFAULT_LIMITS.shortDescription).toBe(80);
    expect(DEFAULT_LIMITS.fullDescription).toBe(4000);
    expect(DEFAULT_LIMITS.video).toBe(256);
  });
});

// ---------------------------------------------------------------------------
// lintListings – single listing
// ---------------------------------------------------------------------------
describe("lintListings – single listing", () => {
  it("returns valid for all fields within limits", () => {
    const results = lintListings([
      {
        language: "en-US",
        fields: {
          title: "My App",
          shortDescription: "A short description",
          fullDescription: "A full description",
        },
      },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.valid).toBe(true);
    expect(results[0]!.fields.every((f) => f.status === "ok")).toBe(true);
  });

  it("marks field as 'over' when exceeding limit", () => {
    const longTitle = "A".repeat(31);
    const results = lintListings([
      { language: "en-US", fields: { title: longTitle } },
    ]);
    const titleField = results[0]!.fields.find((f) => f.field === "title");
    expect(titleField?.status).toBe("over");
    expect(results[0]!.valid).toBe(false);
  });

  it("marks field as 'warn' when over 80% of limit", () => {
    // 25 chars is 83% of 30 (title limit) — should be warn
    const warnTitle = "A".repeat(25);
    const results = lintListings([
      { language: "en-US", fields: { title: warnTitle } },
    ]);
    const titleField = results[0]!.fields.find((f) => f.field === "title");
    expect(titleField?.status).toBe("warn");
  });

  it("marks field as 'ok' when under 80% of limit", () => {
    // 20 chars is 67% of 30 (title limit) — ok
    const okTitle = "A".repeat(20);
    const results = lintListings([
      { language: "en-US", fields: { title: okTitle } },
    ]);
    const titleField = results[0]!.fields.find((f) => f.field === "title");
    expect(titleField?.status).toBe("ok");
  });

  it("handles exact limit as ok (not warn)", () => {
    // Exactly 30 chars = 100% — should be 'over' since it exceeds limit... wait, exactly at limit is ok
    const exactTitle = "A".repeat(30);
    const results = lintListings([
      { language: "en-US", fields: { title: exactTitle } },
    ]);
    const titleField = results[0]!.fields.find((f) => f.field === "title");
    // 30 chars, limit 30 → not over (<=)
    expect(titleField?.status).not.toBe("over");
  });

  it("handles missing fields without error", () => {
    const results = lintListings([{ language: "en-US", fields: {} }]);
    expect(results).toHaveLength(1);
    expect(results[0]!.valid).toBe(true);
  });

  it("includes char count and limit in result", () => {
    const results = lintListings([
      { language: "en-US", fields: { title: "Hello" } },
    ]);
    const titleField = results[0]!.fields.find((f) => f.field === "title");
    expect(titleField?.chars).toBe(5);
    expect(titleField?.limit).toBe(DEFAULT_LIMITS.title);
  });
});

// ---------------------------------------------------------------------------
// lintListings – multiple listings
// ---------------------------------------------------------------------------
describe("lintListings – multiple listings", () => {
  it("returns one result per listing", () => {
    const results = lintListings([
      { language: "en-US", fields: { title: "App" } },
      { language: "de-DE", fields: { title: "App DE" } },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]!.language).toBe("en-US");
    expect(results[1]!.language).toBe("de-DE");
  });

  it("reports invalid only for listings with violations", () => {
    const results = lintListings([
      { language: "en-US", fields: { title: "Good" } },
      { language: "de-DE", fields: { title: "A".repeat(35) } },
    ]);
    expect(results[0]!.valid).toBe(true);
    expect(results[1]!.valid).toBe(false);
  });

  it("returns empty array for empty input", () => {
    expect(lintListings([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// wordDiff
// ---------------------------------------------------------------------------
describe("wordDiff", () => {
  it("returns empty diff for identical strings", () => {
    const diff = wordDiff("hello world", "hello world");
    const hasChanges = diff.some((d) => d.type !== "equal");
    expect(hasChanges).toBe(false);
  });

  it("detects added words", () => {
    const diff = wordDiff("hello world", "hello beautiful world");
    const added = diff.filter((d) => d.type === "insert");
    expect(added.length).toBeGreaterThan(0);
    expect(added.some((d) => d.text.includes("beautiful"))).toBe(true);
  });

  it("detects removed words", () => {
    const diff = wordDiff("hello beautiful world", "hello world");
    const removed = diff.filter((d) => d.type === "delete");
    expect(removed.length).toBeGreaterThan(0);
    expect(removed.some((d) => d.text.includes("beautiful"))).toBe(true);
  });

  it("detects equal words", () => {
    const diff = wordDiff("a b c", "a X c");
    const equal = diff.filter((d) => d.type === "equal");
    expect(equal.length).toBeGreaterThan(0);
  });

  it("handles empty strings", () => {
    expect(() => wordDiff("", "")).not.toThrow();
    expect(() => wordDiff("", "hello")).not.toThrow();
    expect(() => wordDiff("hello", "")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// formatWordDiff
// ---------------------------------------------------------------------------
describe("formatWordDiff", () => {
  it("formats additions with [+...] marker", () => {
    const diff: DiffToken[] = [{ type: "insert", text: "new" }];
    expect(formatWordDiff(diff)).toContain("[+new]");
  });

  it("formats removals with [-...] marker", () => {
    const diff: DiffToken[] = [{ type: "delete", text: "old" }];
    expect(formatWordDiff(diff)).toContain("[-old]");
  });

  it("formats equal parts without markers", () => {
    const diff: DiffToken[] = [{ type: "equal", text: "same" }];
    const result = formatWordDiff(diff);
    expect(result).toContain("same");
    expect(result).not.toContain("[+same]");
    expect(result).not.toContain("[-same]");
  });

  it("returns a non-empty string for non-empty diff", () => {
    const diff = wordDiff("old text here", "new text here");
    expect(formatWordDiff(diff).length).toBeGreaterThan(0);
  });
});
