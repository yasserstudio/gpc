import { describe, it, expect } from "vitest";
import {
  scoreReadiness,
  gradeFromPercent,
  readinessBadgeColor,
  readinessBadgeUrl,
  readinessBadgeMarkdown,
  type ReadinessSignal,
} from "../src/commands/readiness.js";

const sig = (over: Partial<ReadinessSignal> = {}): ReadinessSignal => ({
  key: "k",
  label: "Signal",
  weight: 1,
  status: "pass",
  ...over,
});

describe("gradeFromPercent", () => {
  it("maps band boundaries", () => {
    expect(gradeFromPercent(100)).toBe("A");
    expect(gradeFromPercent(90)).toBe("A");
    expect(gradeFromPercent(89)).toBe("B");
    expect(gradeFromPercent(80)).toBe("B");
    expect(gradeFromPercent(79)).toBe("C");
    expect(gradeFromPercent(70)).toBe("C");
    expect(gradeFromPercent(69)).toBe("D");
    expect(gradeFromPercent(60)).toBe("D");
    expect(gradeFromPercent(59)).toBe("F");
    expect(gradeFromPercent(0)).toBe("F");
  });
});

describe("scoreReadiness", () => {
  it("all pass -> 100% grade A", () => {
    const score = scoreReadiness([sig({ key: "a", weight: 3 }), sig({ key: "b", weight: 2 })]);
    expect(score.percent).toBe(100);
    expect(score.grade).toBe("A");
    expect(score.evaluated).toBe(true);
    expect(score.earned).toBe(5);
    expect(score.possible).toBe(5);
  });

  it("warn earns half the weight", () => {
    const score = scoreReadiness([
      sig({ key: "a", weight: 2, status: "pass" }),
      sig({ key: "b", weight: 2, status: "warn" }),
    ]);
    // 2 + 1 = 3 of 4 -> 75% -> C
    expect(score.earned).toBe(3);
    expect(score.possible).toBe(4);
    expect(score.percent).toBe(75);
    expect(score.grade).toBe("C");
  });

  it("fail earns zero", () => {
    const score = scoreReadiness([
      sig({ key: "a", weight: 3, status: "pass" }),
      sig({ key: "b", weight: 3, status: "fail" }),
    ]);
    expect(score.earned).toBe(3);
    expect(score.possible).toBe(6);
    expect(score.percent).toBe(50);
    expect(score.grade).toBe("F");
  });

  it("na signals are excluded from both totals but still listed", () => {
    const score = scoreReadiness([
      sig({ key: "a", weight: 2, status: "pass" }),
      sig({ key: "b", weight: 3, status: "na" }),
    ]);
    expect(score.earned).toBe(2);
    expect(score.possible).toBe(2);
    expect(score.percent).toBe(100);
    expect(score.grade).toBe("A");
    const naRow = score.breakdown.find((b) => b.key === "b");
    expect(naRow?.status).toBe("na");
    expect(naRow?.points).toBe(0);
  });

  it("all na -> not evaluated, percent 0, grade F", () => {
    const score = scoreReadiness([sig({ status: "na" }), sig({ status: "na", key: "b" })]);
    expect(score.evaluated).toBe(false);
    expect(score.percent).toBe(0);
    expect(score.grade).toBe("F");
  });

  it("empty input -> not evaluated", () => {
    const score = scoreReadiness([]);
    expect(score.evaluated).toBe(false);
    expect(score.possible).toBe(0);
    expect(score.breakdown).toHaveLength(0);
  });

  it("collects suggestions from non-pass signals only", () => {
    const score = scoreReadiness([
      sig({ key: "a", status: "pass", suggestion: "ignored" }),
      sig({ key: "b", status: "warn", suggestion: "fix b" }),
      sig({ key: "c", status: "fail", suggestion: "fix c" }),
      sig({ key: "d", status: "na", suggestion: "ignored na" }),
    ]);
    expect(score.suggestions).toEqual(["fix b", "fix c"]);
  });
});

describe("readiness badge", () => {
  it("maps grades to shields colors", () => {
    expect(readinessBadgeColor("A")).toBe("brightgreen");
    expect(readinessBadgeColor("B")).toBe("green");
    expect(readinessBadgeColor("C")).toBe("yellow");
    expect(readinessBadgeColor("D")).toBe("orange");
    expect(readinessBadgeColor("F")).toBe("red");
  });

  it("builds a static shields URL with grade, percent, and color", () => {
    const score = scoreReadiness([sig({ weight: 1, status: "pass" })]);
    const url = readinessBadgeUrl(score);
    expect(url).toContain("https://img.shields.io/badge/");
    expect(url).toContain("brightgreen");
    // "A (100%)" url-encoded
    expect(url).toContain("A%20(100%25)");
  });

  it("shows a neutral badge when nothing was evaluated", () => {
    const url = readinessBadgeUrl(scoreReadiness([]));
    expect(url).toContain("lightgrey");
    expect(url).toContain("not%20evaluated");
  });

  it("markdown wraps the badge URL", () => {
    const score = scoreReadiness([sig()]);
    expect(readinessBadgeMarkdown(score)).toBe(`![GPC readiness](${readinessBadgeUrl(score)})`);
  });

  it("keeps exactly the two shields field separators (no stray dashes in segments)", () => {
    // The fixed label/message never contain literal dashes, so the defensive
    // doubling never fires here; this pins the separator structure so a future
    // label change that introduces a dash would fail loudly.
    const path = readinessBadgeUrl(scoreReadiness([sig()])).replace(
      "https://img.shields.io/badge/",
      "",
    );
    expect(path.split("-").filter((s) => s === "").length).toBe(0);
    expect(path.startsWith("GPC%20readiness-")).toBe(true);
    expect(path.endsWith("-brightgreen")).toBe(true);
  });
});

describe("scoreReadiness rounding", () => {
  it("rounds the percent before banding (2 of 3 -> 67% -> D)", () => {
    const score = scoreReadiness([
      sig({ key: "a", weight: 2, status: "pass" }),
      sig({ key: "b", weight: 1, status: "fail" }),
    ]);
    expect(score.percent).toBe(67); // round(66.67)
    expect(score.grade).toBe("D");
  });
});
