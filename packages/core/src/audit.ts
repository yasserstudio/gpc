import { appendFile, chmod, mkdir } from "node:fs/promises";
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
