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

export type UserRole = "engineer" | "supervisor" | "site_manager" | "technician";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}`,
      });
      return;
    }
    next();
  };
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

export function signToken(user: AuthUser, rememberMe = false): string {
  return jwt.sign(
    { sub: user.id, name: user.name, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: rememberMe ? "30d" : "8h" },
  );
}
