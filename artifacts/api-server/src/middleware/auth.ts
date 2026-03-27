import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? "turbine-qc-dev-secret";
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as Record<
      string,
      unknown
    >;
    req.user = {
      id: (payload.sub as number) ?? (payload.id as number),
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, name: user.name, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: "24h" },
  );
}
