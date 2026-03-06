export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
