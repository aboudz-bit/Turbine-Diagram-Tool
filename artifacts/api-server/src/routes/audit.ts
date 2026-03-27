import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { auditLogTable, usersTable, tasksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getActionLabel } from "../lib/auditLog";

const router: IRouter = Router();

router.get("/tasks/:taskId/audit", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);

    const [task] = await db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    const rows = await db
      .select({
        id: auditLogTable.id,
        action: auditLogTable.action,
        entityType: auditLogTable.entityType,
        entityId: auditLogTable.entityId,
        actorId: auditLogTable.actorId,
        actorName: usersTable.name,
        actorRole: usersTable.role,
        metadata: auditLogTable.metadata,
        createdAt: auditLogTable.createdAt,
      })
      .from(auditLogTable)
      .leftJoin(usersTable, eq(auditLogTable.actorId, usersTable.id))
      .where(eq(auditLogTable.taskId, taskId))
      .orderBy(desc(auditLogTable.createdAt));

    const result = rows.map((r) => ({
      id: r.id,
      action: r.action,
      actionLabel: getActionLabel(r.action),
      entityType: r.entityType,
      entityId: r.entityId,
      actorId: r.actorId,
      actorName: r.actorName ?? "System",
      actorRole: r.actorRole ?? null,
      details: r.metadata ? (() => { try { return JSON.parse(r.metadata!); } catch { return null; } })() : null,
      createdAt: r.createdAt,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get audit log");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
