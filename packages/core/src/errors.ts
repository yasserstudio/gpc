export class GpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number,
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = "GpcError";
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

export class ConfigError extends GpcError {
  constructor(message: string, code: string, suggestion?: string) {
    super(message, code, 1, suggestion);
    this.name = "ConfigError";
  }
}

export class ApiError extends GpcError {
  constructor(
    message: string,
    code: string,
    public readonly statusCode?: number,
    suggestion?: string,
  ) {
    super(message, code, 4, suggestion);
    this.name = "ApiError";
  }
}

export class NetworkError extends GpcError {
  constructor(message: string, suggestion?: string) {
    super(message, "NETWORK_ERROR", 5, suggestion);
    this.name = "NetworkError";
  }
}
