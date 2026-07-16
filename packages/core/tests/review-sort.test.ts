import { describe, it, expect } from "vitest";
import type { Review } from "@gpc-cli/api";
import { sortReviews, REVIEW_SORT_PRESETS } from "../src/commands/reviews.js";

const review = (id: string, rating: number, seconds: number): Review => ({
  reviewId: id,
  authorName: id,
  comments: [
    {
      userComment: {
        text: `review ${id}`,
        lastModified: { seconds: String(seconds) },
        starRating: rating,
      },
    },
  ],
});

// r1: rating 5, oldest.  r2: rating 1, newest.  r3: rating 3, middle.
const r1 = review("r1", 5, 1000);
const r2 = review("r2", 1, 3000);
const r3 = review("r3", 3, 2000);
const reviews = [r1, r2, r3];

const ids = (rs: Review[]) => rs.map((r) => r.reviewId);

describe("sortReviews presets", () => {
  it("newest orders by lastModified descending", () => {
    expect(ids(sortReviews(reviews, "newest"))).toEqual(["r2", "r3", "r1"]);
  });

  it("oldest orders by lastModified ascending", () => {
    expect(ids(sortReviews(reviews, "oldest"))).toEqual(["r1", "r3", "r2"]);
  });

  it("rating orders by starRating descending", () => {
    expect(ids(sortReviews(reviews, "rating"))).toEqual(["r1", "r3", "r2"]);
  });

  it("does not mutate the input array", () => {
    const input = [...reviews];
    sortReviews(input, "newest");
    expect(ids(input)).toEqual(["r1", "r2", "r3"]);
  });

  it("returns input order for no spec", () => {
    expect(ids(sortReviews(reviews))).toEqual(["r1", "r2", "r3"]);
  });

  it("falls back to generic field sort for a raw field spec", () => {
    // top-level field the generic sorter can read
    expect(ids(sortReviews(reviews, "-reviewId"))).toEqual(["r3", "r2", "r1"]);
    expect(ids(sortReviews(reviews, "reviewId"))).toEqual(["r1", "r2", "r3"]);
  });

  it("tolerates reviews with no userComment (treated as 0)", () => {
    const bare: Review = { reviewId: "r0", authorName: "r0", comments: [] };
    const out = sortReviews([r1, bare], "rating");
    expect(out[0]?.reviewId).toBe("r1"); // rating 5 before missing (0)
  });

  it("exposes the preset list", () => {
    expect(REVIEW_SORT_PRESETS).toEqual(["newest", "oldest", "rating"]);
  });

  it("treats a non-numeric seconds value as 0 (no NaN-destabilized sort)", () => {
    const bad = review("bad", 2, 0);
    // corrupt the seconds to a non-numeric string
    bad.comments[0]!.userComment!.lastModified.seconds = "not-a-number";
    const out = sortReviews([r2, bad, r1], "newest"); // r2 newest(3000), r1(1000), bad(0)
    expect(ids(out)).toEqual(["r2", "r1", "bad"]);
  });

  it("keeps input order for reviews with equal timestamps (stable)", () => {
    const a = review("a", 3, 5000);
    const b = review("b", 3, 5000);
    const c = review("c", 3, 5000);
    expect(ids(sortReviews([a, b, c], "newest"))).toEqual(["a", "b", "c"]);
  });

  it("orders newest/oldest correctly when some reviews lack a userComment", () => {
    const bare: Review = { reviewId: "r0", authorName: "r0", comments: [] };
    // bare -> timestamp 0, so it is oldest
    expect(ids(sortReviews([r2, bare, r1], "oldest"))).toEqual(["r0", "r1", "r2"]);
    expect(ids(sortReviews([bare, r1, r2], "newest"))).toEqual(["r2", "r1", "r0"]);
  });
});
