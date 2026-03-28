/**
 * QC Escalation Routes
 *
 * GET  /escalation/pending   — list tasks stuck in submitted/under_qc beyond threshold
 * POST /escalation/escalate  — manually escalate a task to site manager
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable, usersTable } from "@workspace/db";
import { eq, inArray, lt, and } from "drizzle-orm";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

const ESCALATION_THRESHOLD_HOURS = 4;

router.get("/escalation/pending", async (req, res): Promise<void> => {
  try {
    const thresholdMs = ESCALATION_THRESHOLD_HOURS * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - thresholdMs);

    const stale = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        submittedAt: tasksTable.submittedAt,
        assignedToId: tasksTable.assignedToId,
        priority: tasksTable.priority,
      })
      .from(tasksTable)
      .where(
        and(
          inArray(tasksTable.status, ["submitted", "under_qc"]),
          lt(tasksTable.submittedAt, cutoff),
        ),
      );

    const items = stale.map(t => ({
      ...t,
      waitingHours: t.submittedAt
        ? Math.round((Date.now() - new Date(t.submittedAt).getTime()) / 3600000 * 10) / 10
        : null,
      needsEscalation: true,
    }));

    res.json({ threshold_hours: ESCALATION_THRESHOLD_HOURS, count: items.length, items });
  } catch (err) {
    req.log.error({ err }, "Failed to list escalation candidates");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/escalation/escalate", async (req, res): Promise<void> => {
  try {
    const { taskId } = req.body as { taskId?: number };
    if (!taskId) { res.status(400).json({ error: "taskId is required" }); return; }

    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    // Notify all site managers and supervisors
    const managers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(inArray(usersTable.role, ["site_manager", "supervisor"]));

    for (const mgr of managers) {
      await createNotification(
        mgr.id,
        taskId,
        "task_overdue",
        `Escalation: "${task.title}" awaiting QC review`,
        `Task #TSK-${String(taskId).padStart(4, "0")} has been waiting for QC review and requires immediate attention.`,
      );
    }

    res.json({
      escalated: true,
      taskId,
      notifiedCount: managers.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to escalate task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
