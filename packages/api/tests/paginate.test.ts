import { describe, it, expect, vi } from "vitest";
import { paginate, paginateAll, paginateParallel } from "../src/paginate";

describe("paginate", () => {
  it("yields all pages when no limit", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], nextPageToken: "page2" })
      .mockResolvedValueOnce({ items: [3, 4], nextPageToken: "page3" })
      .mockResolvedValueOnce({ items: [5], nextPageToken: undefined });

    const pages: number[][] = [];
    for await (const page of paginate(fetchPage)) {
      pages.push(page);
    }

    expect(pages).toEqual([[1, 2], [3, 4], [5]]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "page2");
    expect(fetchPage).toHaveBeenNthCalledWith(3, "page3");
  });

  it("stops when empty page returned", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], nextPageToken: "page2" })
      .mockResolvedValueOnce({ items: [], nextPageToken: "page3" });

    const pages: number[][] = [];
    for await (const page of paginate(fetchPage)) {
      pages.push(page);
    }

    expect(pages).toEqual([[1, 2]]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("respects limit", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2, 3], nextPageToken: "page2" })
      .mockResolvedValueOnce({ items: [4, 5, 6], nextPageToken: "page3" });

    const pages: number[][] = [];
    for await (const page of paginate(fetchPage, { limit: 4 })) {
      pages.push(page);
    }

    expect(pages).toEqual([[1, 2, 3], [4]]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("respects startPageToken", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ items: [3, 4], nextPageToken: undefined });

    const pages: number[][] = [];
    for await (const page of paginate(fetchPage, { startPageToken: "page2" })) {
      pages.push(page);
    }

    expect(pages).toEqual([[3, 4]]);
    expect(fetchPage).toHaveBeenCalledWith("page2");
  });

  it("handles single page", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ items: [1, 2], nextPageToken: undefined });

    const pages: number[][] = [];
    for await (const page of paginate(fetchPage)) {
      pages.push(page);
    }

    expect(pages).toEqual([[1, 2]]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("handles empty first page", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ items: [], nextPageToken: undefined });

    const pages: number[][] = [];
    for await (const page of paginate(fetchPage)) {
      pages.push(page);
    }

    expect(pages).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("stops when limit is exactly met", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], nextPageToken: "page2" })
      .mockResolvedValueOnce({ items: [3, 4], nextPageToken: "page3" });

    const pages: number[][] = [];
    for await (const page of paginate(fetchPage, { limit: 2 })) {
      pages.push(page);
    }

    expect(pages).toEqual([[1, 2]]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe("paginateAll", () => {
  it("collects all items into a single array", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], nextPageToken: "page2" })
      .mockResolvedValueOnce({ items: [3, 4], nextPageToken: undefined });

    const result = await paginateAll(fetchPage);

    expect(result.items).toEqual([1, 2, 3, 4]);
  });

  it("respects limit", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2, 3], nextPageToken: "page2" })
      .mockResolvedValueOnce({ items: [4, 5, 6], nextPageToken: "page3" });

    const result = await paginateAll(fetchPage, { limit: 4 });

    expect(result.items).toEqual([1, 2, 3, 4]);
  });

  it("works with startPageToken", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ items: [5, 6], nextPageToken: undefined });

    const result = await paginateAll(fetchPage, { startPageToken: "page3" });

    expect(result.items).toEqual([5, 6]);
    expect(fetchPage).toHaveBeenCalledWith("page3");
  });

  it("returns empty array for empty results", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ items: [], nextPageToken: undefined });

    const result = await paginateAll(fetchPage);

    expect(result.items).toEqual([]);
  });
});

describe("paginateParallel", () => {
  it("fetches multiple pages in parallel", async () => {
    const fetchPage = vi.fn().mockImplementation(async (token: string) => {
      if (token === "page2") return { items: [3, 4], nextPageToken: "page3" };
      if (token === "page3") return { items: [5, 6], nextPageToken: undefined };
      return { items: [], nextPageToken: undefined };
    });

    const result = await paginateParallel(fetchPage, ["page2", "page3"]);

    expect(result.items).toEqual([3, 4, 5, 6]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("respects concurrency limit", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const fetchPage = vi.fn().mockImplementation(async (token: string) => {
      currentConcurrent++;
      if (currentConcurrent > maxConcurrent) maxConcurrent = currentConcurrent;
      await new Promise((r) => setTimeout(r, 10));
      currentConcurrent--;
      return { items: [Number(token)], nextPageToken: undefined };
    });

    await paginateParallel(fetchPage, ["1", "2", "3", "4", "5", "6"], 2);

    expect(fetchPage).toHaveBeenCalledTimes(6);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("returns last nextPageToken", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1], nextPageToken: undefined })
      .mockResolvedValueOnce({ items: [2], nextPageToken: "page4" });

    const result = await paginateParallel(fetchPage, ["page2", "page3"]);

    expect(result.items).toEqual([1, 2]);
    expect(result.nextPageToken).toBe("page4");
  });

  it("handles empty page tokens array", async () => {
    const fetchPage = vi.fn();
    const result = await paginateParallel(fetchPage, []);

    expect(result.items).toEqual([]);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("defaults to concurrency of 4", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const fetchPage = vi.fn().mockImplementation(async () => {
      currentConcurrent++;
      if (currentConcurrent > maxConcurrent) maxConcurrent = currentConcurrent;
      await new Promise((r) => setTimeout(r, 10));
      currentConcurrent--;
      return { items: [1], nextPageToken: undefined };
    });

    await paginateParallel(fetchPage, ["a", "b", "c", "d", "e", "f", "g", "h"]);

    expect(fetchPage).toHaveBeenCalledTimes(8);
    expect(maxConcurrent).toBeLessThanOrEqual(4);
  });
});
