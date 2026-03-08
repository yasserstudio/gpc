export interface PaginateOptions {
  limit?: number;
  startPageToken?: string;
}

export async function* paginate<TItem>(
  fetchPage: (pageToken?: string) => Promise<{ items: TItem[]; nextPageToken?: string }>,
  options?: PaginateOptions,
): AsyncGenerator<TItem[], void, unknown> {
  let pageToken = options?.startPageToken;
  let collected = 0;
  const limit = options?.limit;

  for (;;) {
    if (limit !== undefined && collected >= limit) break;

    const page = await fetchPage(pageToken);
    const items = page.items;

    if (items.length === 0) break;

    if (limit !== undefined) {
      const remaining = limit - collected;
      if (items.length > remaining) {
        yield items.slice(0, remaining);
        return;
      }
    }

    yield items;
    collected += items.length;
    pageToken = page.nextPageToken;

    if (!pageToken) break;
  }
}

export async function paginateAll<TItem>(
  fetchPage: (pageToken?: string) => Promise<{ items: TItem[]; nextPageToken?: string }>,
  options?: PaginateOptions,
): Promise<{ items: TItem[]; nextPageToken?: string }> {
  const allItems: TItem[] = [];
  let lastPageToken: string | undefined;
  const limit = options?.limit;

  for await (const items of paginate(fetchPage, options)) {
    allItems.push(...items);
    if (limit !== undefined && allItems.length >= limit) break;
  }

  // If we stopped due to limit, try to get the next page token for resumption
  if (limit !== undefined && allItems.length >= limit) {
    lastPageToken = undefined; // Already truncated by paginate
  }

  return { items: allItems, nextPageToken: lastPageToken };
}
