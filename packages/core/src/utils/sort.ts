/**
 * Sort utility for CLI list command results.
 *
 * Supports ascending (field) and descending (-field) sort specs,
 * including dot notation for nested fields (e.g., "comments.userComment.starRating").
 */

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function compare(a: unknown, b: unknown): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b));
}

/**
 * Sort an array of items by a field specification.
 *
 * @param items - Array to sort (not mutated; returns a new array)
 * @param sortSpec - Field name for ascending, or `-field` for descending.
 *                   Supports dot notation for nested fields.
 *                   If undefined/empty, returns items in original order.
 * @returns Sorted copy of items
 */
export function sortResults<T>(items: T[], sortSpec?: string): T[] {
  if (!sortSpec || items.length === 0) {
    return items;
  }

  const descending = sortSpec.startsWith("-");
  const field = descending ? sortSpec.slice(1) : sortSpec;

  // Validate that at least one item has the field — if none do, return original order
  const hasField = items.some((item) => getNestedValue(item, field) !== undefined);
  if (!hasField) {
    return items;
  }

  const sorted = [...items].sort((a, b) => {
    const aVal = getNestedValue(a, field);
    const bVal = getNestedValue(b, field);
    const result = compare(aVal, bVal);
    return descending ? -result : result;
  });

  return sorted;
}
