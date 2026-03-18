import { listAuditEvents } from "../audit.js";

export interface QuotaUsage {
  dailyCallsUsed: number;
  dailyCallsLimit: number;
  dailyCallsRemaining: number;
  minuteCallsUsed: number;
  minuteCallsLimit: number;
  minuteCallsRemaining: number;
  topCommands: Array<{ command: string; count: number }>;
}

const DAILY_LIMIT = 200_000;
const MINUTE_LIMIT = 3_000;

/** Compute quota usage from the local audit log. */
export async function getQuotaUsage(): Promise<QuotaUsage> {
  const now = Date.now();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const startOfMinute = new Date(now - 60 * 1000);

  const todayEntries = await listAuditEvents({
    since: startOfDay.toISOString(),
  });

  const minuteEntries = todayEntries.filter(
    (e) => new Date(e.timestamp).getTime() >= startOfMinute.getTime(),
  );

  const commandCounts = new Map<string, number>();
  for (const entry of todayEntries) {
    commandCounts.set(entry.command, (commandCounts.get(entry.command) ?? 0) + 1);
  }

  const topCommands = Array.from(commandCounts.entries())
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const dailyCallsUsed = todayEntries.length;
  const minuteCallsUsed = minuteEntries.length;

  return {
    dailyCallsUsed,
    dailyCallsLimit: DAILY_LIMIT,
    dailyCallsRemaining: Math.max(0, DAILY_LIMIT - dailyCallsUsed),
    minuteCallsUsed,
    minuteCallsLimit: MINUTE_LIMIT,
    minuteCallsRemaining: Math.max(0, MINUTE_LIMIT - minuteCallsUsed),
    topCommands,
  };
}
