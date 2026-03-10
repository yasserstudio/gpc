import { describe, it, expect, vi } from "vitest";
import { paginate, paginateAll } from "../src/paginate";

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
