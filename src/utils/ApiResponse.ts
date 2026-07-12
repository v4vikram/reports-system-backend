import type { Response } from "express";
import { SuccessMessages } from "../constants/index.js";

export class ApiResponse<T = unknown> {
  constructor(
    public status: number,
    public data: T,
    public message: string = SuccessMessages.SUCCESS
  ) {}

  send(res: Response) {
    res.status(this.status).json({
      success: true,
      message: this.message,
      data: this.data,
    });
  }
}
