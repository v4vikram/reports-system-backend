import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type RequestPart = "body" | "query" | "params";

// Validates req[part] against a zod schema and passes ZodError to the
// central error handler on failure. For "query"/"params" we mutate the
// existing object in place rather than reassigning req.query/req.params,
// since Express 5 exposes those as non-configurable properties.
export function validate(schema: ZodType, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      next(result.error);
      return;
    }

    if (part === "body") {
      req.body = result.data;
    } else {
      Object.assign(req[part], result.data);
    }

    next();
  };
}
