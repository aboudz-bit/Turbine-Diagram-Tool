/**
 * Server-Sent Events (SSE) — Real-time task updates
 *
 * Clients connect via GET /events and receive live updates when
 * tasks change status, new comments appear, or QC decisions are made.
 *
 * Auth: Uses req.user from requireAuth middleware (Authorization header).
 * For EventSource (which can't send headers), also supports ?token= query param.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const router = Router();

// Active SSE connections keyed by userId
const clients = new Map<number, Set<Response>>();

/**
 * Broadcast an event to all connected clients (or a specific user).
 */
export function broadcastEvent(
  event: string,
  data: unknown,
  targetUserId?: number,
): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  if (targetUserId != null) {
    const userClients = clients.get(targetUserId);
    if (userClients) {
      for (const res of userClients) {
        res.write(payload);
      }
    }
    return;
  }

  // Broadcast to all
  for (const [, userClients] of clients) {
    for (const res of userClients) {
      res.write(payload);
    }
  }
}

/**
 * Middleware: authenticate SSE via query param token (fallback for EventSource).
 * If req.user is already set by requireAuth, this is a no-op.
 */
function authenticateSSE(req: Request, res: Response, next: NextFunction): void {
  // Already authenticated via Authorization header
  if (req.user?.id) {
    next();
    return;
  }

  // Try query param token (EventSource can't send headers)
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET ?? "turbine-qc-dev-secret";
    const payload = jwt.verify(token, secret) as Record<string, unknown>;
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

/**
 * GET /events — SSE stream
 */
router.get("/events", authenticateSSE, (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable Nginx buffering
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: new Date().toISOString() })}\n\n`);

  // Register client
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30_000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    const userClients = clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        clients.delete(userId);
      }
    }
  });
});

/**
 * GET /events/status — Connection count (for admin/debugging)
 */
router.get("/events/status", (_req: Request, res: Response) => {
  let totalConnections = 0;
  for (const [, userClients] of clients) {
    totalConnections += userClients.size;
  }
  res.json({
    connectedUsers: clients.size,
    totalConnections,
  });
});

export default router;
