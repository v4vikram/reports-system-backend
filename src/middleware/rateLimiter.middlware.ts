import rateLimit from "express-rate-limit";
import { ErrorMessages, HttpStatus } from "../constants/index.js";

const tooManyRequests = {
  success: false,
  message: ErrorMessages.TOO_MANY_REQUESTS,
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  message: tooManyRequests,
});

// Tighter limiter for credential-guessing-prone endpoints (login, refresh).
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  message: tooManyRequests,
});
