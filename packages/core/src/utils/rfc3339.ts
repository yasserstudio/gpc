/** RFC 3339 with an explicit zone, so the same input means the same instant on every machine. */
const RFC3339_RE = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/i;

/**
 * Parse an RFC 3339 timestamp that carries a zone. Returns undefined for any
 * other shape, including calendar dates that Date() would silently roll over
 * (2026-02-30 becomes March 2 otherwise).
 */
export function parseRfc3339(raw: string): Date | undefined {
  const value = raw.trim();
  const match = RFC3339_RE.exec(value);
  if (!match) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  // Round-trip the calendar date in the given offset to catch rollover.
  const offsetMs = parsed.getTime() - Date.parse(value.replace(/(?:Z|[+-]\d{2}:\d{2})$/i, "Z"));
  const calendarDate = new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 10);
  return calendarDate === match[1] ? parsed : undefined;
}
