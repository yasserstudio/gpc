import { appendFile, mkdir } from "node:fs/promises";
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
    await mkdir(auditDir, { recursive: true });
    const logPath = join(auditDir, "audit.log");
    const line = JSON.stringify(entry) + "\n";
    await appendFile(logPath, line, "utf-8");
  } catch {
    // Audit logging must never break the CLI
  }
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
