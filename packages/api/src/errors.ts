export class PlayApiError extends Error {
  public readonly exitCode = 4;
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly suggestion?: string,
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
      },
    };
  }
}
