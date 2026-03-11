import { describe, it, expect } from "vitest";
import { sortResults } from "../src/utils/sort.js";

describe("sortResults", () => {
  it("sorts ascending by string field", () => {
    const items = [{ name: "cherry" }, { name: "apple" }, { name: "banana" }];
    const result = sortResults(items, "name");
    expect(result.map((i) => i.name)).toEqual(["apple", "banana", "cherry"]);
  });

  it("sorts descending with - prefix", () => {
    const items = [{ name: "cherry" }, { name: "apple" }, { name: "banana" }];
    const result = sortResults(items, "-name");
    expect(result.map((i) => i.name)).toEqual(["cherry", "banana", "apple"]);
  });

  it("sorts by numeric field", () => {
    const items = [{ stars: 3 }, { stars: 1 }, { stars: 5 }, { stars: 2 }];
    const result = sortResults(items, "stars");
    expect(result.map((i) => i.stars)).toEqual([1, 2, 3, 5]);
  });

  it("sorts descending by numeric field", () => {
    const items = [{ stars: 3 }, { stars: 1 }, { stars: 5 }, { stars: 2 }];
    const result = sortResults(items, "-stars");
    expect(result.map((i) => i.stars)).toEqual([5, 3, 2, 1]);
  });

  it("sorts by nested field with dot notation", () => {
    const items = [
      { meta: { date: "2024-03-01" } },
      { meta: { date: "2024-01-15" } },
      { meta: { date: "2024-02-10" } },
    ];
    const result = sortResults(items, "meta.date");
    expect(result.map((i) => i.meta.date)).toEqual([
      "2024-01-15",
      "2024-02-10",
      "2024-03-01",
    ]);
  });

  it("sorts descending by nested field", () => {
    const items = [
      { comments: { userComment: { starRating: 3 } } },
      { comments: { userComment: { starRating: 5 } } },
      { comments: { userComment: { starRating: 1 } } },
    ];
    const result = sortResults(items, "-comments.userComment.starRating");
    expect(result.map((i) => i.comments.userComment.starRating)).toEqual([5, 3, 1]);
  });

  it("returns original order when no sort spec provided", () => {
    const items = [{ name: "cherry" }, { name: "apple" }, { name: "banana" }];
    const result = sortResults(items, undefined);
    expect(result).toEqual(items);
  });

  it("returns original order when sort spec is empty string", () => {
    const items = [{ name: "cherry" }, { name: "apple" }, { name: "banana" }];
    const result = sortResults(items, "");
    expect(result).toEqual(items);
  });

  it("returns empty array for empty input", () => {
    const result = sortResults([], "name");
    expect(result).toEqual([]);
  });

  it("returns original order when field does not exist in any item", () => {
    const items = [{ name: "cherry" }, { name: "apple" }, { name: "banana" }];
    const result = sortResults(items, "nonexistent");
    expect(result).toEqual(items);
  });

  it("does not mutate the original array", () => {
    const items = [{ name: "cherry" }, { name: "apple" }, { name: "banana" }];
    const original = [...items];
    sortResults(items, "name");
    expect(items).toEqual(original);
  });

  it("handles items with missing values for the sort field", () => {
    const items = [
      { name: "cherry", email: "c@test.com" },
      { name: "apple" },
      { name: "banana", email: "b@test.com" },
    ] as Array<{ name: string; email?: string }>;
    const result = sortResults(items, "email");
    // Items with the field come first (sorted), then items without
    expect(result.map((i) => i.name)).toEqual(["banana", "cherry", "apple"]);
  });
});
