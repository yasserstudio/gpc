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

/**
 * Format an error for CLI output. Prints:
 *   Error [CODE]: message
 *   Suggestion: suggestion (if available)
 *
 * Returns the appropriate exit code.
 */
export function handleCliError(error: unknown): number {
  if (isTypedError(error)) {
    console.error(`Error [${error.code}]: ${error.message}`);
    if (error.suggestion) {
      console.error(`Suggestion: ${error.suggestion}`);
    }
    return error.exitCode ?? 1;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  return 1;
}
