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

/**
 * Fetch multiple known pages in parallel.
 * Useful when page tokens are predictable or when pre-fetching subsequent pages
 * after an initial sequential fetch reveals the token pattern.
 *
 * @param fetchPage - Function that fetches a page given a token
 * @param pageTokens - Array of page tokens to fetch concurrently
 * @param concurrency - Max concurrent requests (default: 4)
 */
export async function paginateParallel<TItem>(
  fetchPage: (pageToken?: string) => Promise<{ items: TItem[]; nextPageToken?: string }>,
  pageTokens: string[],
  concurrency = 4,
): Promise<{ items: TItem[]; nextPageToken?: string }> {
  const allItems: TItem[] = [];
  let lastNextPageToken: string | undefined;

  // Process in batches of `concurrency`
  for (let i = 0; i < pageTokens.length; i += concurrency) {
    const batch = pageTokens.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((token) => fetchPage(token)));

    for (const result of results) {
      allItems.push(...result.items);
      if (result.nextPageToken) {
        lastNextPageToken = result.nextPageToken;
      }
    }
  }

  return { items: allItems, nextPageToken: lastNextPageToken };
}
