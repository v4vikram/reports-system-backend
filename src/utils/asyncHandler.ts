import type { NextFunction, Request, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Express 5 already forwards a rejected handler promise to the error
// middleware on its own, but wrapping routes explicitly keeps that contract
// visible at the call site instead of relying on framework behavior no one
// reading the route list would otherwise know about.
export function asyncHandler(handler: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
