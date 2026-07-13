import type { NextFunction, Request, Response } from "express";

type AsyncRequestHandler<P = Record<string, string>> = (
  req: Request<P>,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler<P = Record<string, string>>(handler: AsyncRequestHandler<P>) {
  return (req: Request<P>, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
