/**
 * Shared error formatting for CLI output.
 * Extracts error code, message, and suggestion from typed errors (GpcError, AuthError, ApiError, ConfigError).
 */

interface TypedError {
  message: string;
  code?: string;
  suggestion?: string;
  exitCode?: number;
}

function isTypedError(error: unknown): error is Error & TypedError {
  return error instanceof Error && "code" in error && typeof (error as TypedError).code === "string";
}

const AUTH_KEYWORDS = ["AUTH", "UNAUTHENTICATED", "PERMISSION_DENIED", "401", "403"];

function isAuthRelatedError(error: unknown): boolean {
  if (isTypedError(error)) {
    if (error.exitCode === 3) return true;
    if (error.code && AUTH_KEYWORDS.some((k) => error.code?.includes(k))) return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return AUTH_KEYWORDS.some((k) => msg.includes(k));
}

/**
 * Format an error for CLI output. Prints:
 *   Error [CODE]: message
 *   Suggestion: suggestion (if available)
 *
 * Returns the appropriate exit code.
 */
export function handleCliError(error: unknown): number {
  const authHint = isAuthRelatedError(error)
    ? "\n→ Run gpc doctor to diagnose your credentials."
    : "";

  if (isTypedError(error)) {
    console.error(`Error [${error.code}]: ${error.message}`);
    if (error.suggestion) {
      console.error(`Suggestion: ${error.suggestion}`);
    }
    if (authHint) console.error(authHint);
    return error.exitCode ?? 1;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  if (authHint) console.error(authHint);
  return 1;
}
