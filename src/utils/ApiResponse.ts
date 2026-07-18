import type { HttpStatusCode } from "../constants/httpStatus.js";

// Single response envelope used for every JSON success reply, so clients can
// rely on the same { success, statusCode, message, data } shape everywhere.
// ApiError + the error handler produce the same shape for failures.
export class ApiResponse<T = unknown> {
  public readonly success: boolean;

  constructor(
    public readonly statusCode: HttpStatusCode,
    public readonly data: T,
    public readonly message: string = "Success"
  ) {
    this.success = statusCode < 400;
  }
}
