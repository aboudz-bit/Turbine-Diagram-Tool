import type { Request, Response, NextFunction } from "express";

interface ParseResult {
  success: boolean;
  data?: unknown;
  error?: { flatten: () => { fieldErrors: Record<string, string[]> } };
}

interface Schema {
  safeParse: (data: unknown) => ParseResult;
}

export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error!.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: result.error!.flatten().fieldErrors,
      });
      return;
    }
    // Express 5: req.query is read-only, so store parsed data on a custom property
    (req as unknown as Record<string, unknown>).validatedQuery = result.data;
    next();
  };
}
