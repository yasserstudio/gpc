import { appendFile, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface AuditEntry {
  timestamp: string;
  command: string;
  app?: string;
  args: Record<string, unknown>;
  user?: string;
  success?: boolean;
  durationMs?: number;
  error?: string;
}

let auditDir: string | null = null;

/**
 * Initialize audit logging with a directory path.
 * Typically ~/.config/gpc/ or the XDG config dir.
 */
export function initAudit(configDir: string): void {
  auditDir = configDir;
}

/**
 * Write an audit log entry. Non-blocking — errors are silently ignored.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  if (!auditDir) return;

  try {
    await mkdir(auditDir, { recursive: true, mode: 0o700 });
    const logPath = join(auditDir, "audit.log");
    const redactedEntry = redactAuditArgs(entry);
    const line = JSON.stringify(redactedEntry) + "\n";
    await appendFile(logPath, line, { encoding: "utf-8", mode: 0o600 });
    await chmod(logPath, 0o600).catch(() => {});
  } catch {
    // Audit logging must never break the CLI
  }
}

const SENSITIVE_ARG_KEYS = new Set([
  "keyFile",
  "key_file",
  "serviceAccount",
  "service-account",
  "token",
  "password",
  "secret",
  "credentials",
  "private_key",
  "privateKey",
  "private_key_id",
  "privateKeyId",
  "client_secret",
  "clientSecret",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "api_key",
  "auth_token",
  "bearer",
  "jwt",
  "signing_key",
  "keystore_password",
  "store_password",
  "key_password",
]);

export { SENSITIVE_ARG_KEYS };

export function redactAuditArgs(entry: AuditEntry): AuditEntry {
  const redacted: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entry.args)) {
    redacted[k] = SENSITIVE_ARG_KEYS.has(k) ? "[REDACTED]" : v;
  }
  return { ...entry, args: redacted };
}

/**
 * Convenience: create an audit entry for a write command.
 */
export function createAuditEntry(
  command: string,
  args: Record<string, unknown>,
  app?: string,
): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    command,
    app,
    args,
  };
}

export async function listAuditEvents(options?: {
  limit?: number;
  since?: string;
  command?: string;
}): Promise<AuditEntry[]> {
  if (!auditDir) return [];
  const logPath = join(auditDir, "audit.log");
  let content: string;
  try {
    content = await readFile(logPath, "utf-8");
  } catch {
    return [];
  }
  const lines = content.trim().split("\n").filter(Boolean);
  let entries: AuditEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as AuditEntry);
    } catch {
      // skip malformed lines
    }
  }
  if (options?.since) {
    const sinceDate = new Date(options.since).getTime();
    entries = entries.filter((e) => new Date(e.timestamp).getTime() >= sinceDate);
  }
  if (options?.command) {
    const cmd = options.command.toLowerCase();
    entries = entries.filter((e) => e.command.toLowerCase().includes(cmd));
  }
  if (options?.limit) {
    entries = entries.slice(-options.limit);
  }
  return entries;
}

export async function searchAuditEvents(query: string): Promise<AuditEntry[]> {
  const all = await listAuditEvents();
  const q = query.toLowerCase();
  return all.filter((e) => {
    const text = JSON.stringify(e).toLowerCase();
    return text.includes(q);
  });
}

export async function clearAuditLog(options?: {
  before?: string;
  dryRun?: boolean;
}): Promise<{ deleted: number; remaining: number }> {
  if (!auditDir) return { deleted: 0, remaining: 0 };
  const logPath = join(auditDir, "audit.log");
  let content: string;
  try {
    content = await readFile(logPath, "utf-8");
  } catch {
    return { deleted: 0, remaining: 0 };
  }
  const lines = content.trim().split("\n").filter(Boolean);
  if (!options?.before) {
    const count = lines.length;
    if (!options?.dryRun) {
      await writeFile(logPath, "", { encoding: "utf-8", mode: 0o600 });
    }
    return { deleted: count, remaining: 0 };
  }
  const beforeDate = new Date(options.before).getTime();
  const keep: string[] = [];
  const remove: string[] = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as AuditEntry;
      if (new Date(entry.timestamp).getTime() < beforeDate) {
        remove.push(line);
      } else {
        keep.push(line);
      }
    } catch {
      keep.push(line);
    }
  }
  if (!options?.dryRun) {
    await writeFile(logPath, keep.length > 0 ? keep.join("\n") + "\n" : "", {
      encoding: "utf-8",
      mode: 0o600,
    });
  }
  return { deleted: remove.length, remaining: keep.length };
}
