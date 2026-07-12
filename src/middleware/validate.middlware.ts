import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type ValidationSource = "body" | "query" | "params";

export function validate(schema: ZodType, source: ValidationSource = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    req[source] = schema.parse(req[source]);
    next();
  };
}
