export class PlayApiError extends Error {
  public readonly exitCode = 4;
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly suggestion?: string,
    /** Google's own error message, kept verbatim so a mis-mapped code is still diagnosable. */
    public readonly details?: string,
  ) {
    super(message);
    this.name = "PlayApiError";
  }
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        suggestion: this.suggestion,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}
