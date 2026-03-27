import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { timeEntriesTable, tasksTable, usersTable } from "@workspace/db";
import { eq, isNull, isNotNull, and, sum } from "drizzle-orm";
import { isValidTransition } from "../lib/state-machine";
import { computeEffectiveStatus } from "../lib/task-utils";
import { validateBody } from "../middleware/validate";
import { PauseTimeTrackingBody } from "@workspace/api-zod";
import { logAuditEvent } from "../lib/auditLog";

const router: IRouter = Router();

router.get("/tasks/:taskId/time", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const entries = await db
      .select({
        id: timeEntriesTable.id,
        taskId: timeEntriesTable.taskId,
        userId: timeEntriesTable.userId,
        userName: usersTable.name,
        startTime: timeEntriesTable.startTime,
        endTime: timeEntriesTable.endTime,
        duration: timeEntriesTable.duration,
        pauseReason: timeEntriesTable.pauseReason,
        status: timeEntriesTable.status,
      })
      .from(timeEntriesTable)
      .leftJoin(usersTable, eq(timeEntriesTable.userId, usersTable.id))
      .where(eq(timeEntriesTable.taskId, taskId))
      .orderBy(timeEntriesTable.startTime);

    const result = entries.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      userId: e.userId,
      userName: e.userName ?? "Technician",
      startTime: e.startTime,
      endTime: e.endTime,
      durationMinutes: e.duration ?? null,
      pauseReason: e.pauseReason,
      status: e.status,
      isActive: e.endTime === null,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list time entries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks/:taskId/time", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const userId = req.user!.id;

    // Verify task exists and check state machine
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.status === "approved") {
      res.status(400).json({ error: "Cannot start time tracking: task is approved and locked." });
      return;
    }

    const effectiveStatus = computeEffectiveStatus(task);
    if (!isValidTransition(effectiveStatus, "in_progress")) {
      res.status(400).json({
        error: `Cannot start time tracking: task is in '${effectiveStatus}' status`,
      });
      return;
    }

    // Check for existing open session by this user on this task
    const [existingOpen] = await db
      .select({ id: timeEntriesTable.id })
      .from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.taskId, taskId), eq(timeEntriesTable.userId, userId), isNull(timeEntriesTable.endTime)));
    if (existingOpen) {
      res.status(400).json({ error: "A work session is already running for this task." });
      return;
    }

    // Wrap in transaction for atomicity
    const entry = await db.transaction(async (tx) => {
      const now = new Date();

      // Create new entry with status 'running'
      const [newEntry] = await tx
        .insert(timeEntriesTable)
        .values({ taskId, userId, startTime: now, status: "running" })
        .returning();

      // Update task status
      await tx
        .update(tasksTable)
        .set({ status: "in_progress", startedAt: now, updatedAt: now })
        .where(eq(tasksTable.id, taskId));

      return newEntry;
    });

    // Look up user name for response
    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    await logAuditEvent({
      taskId,
      actorId: userId,
      action: "task_started",
      entityType: "time_entry",
      entityId: entry.id,
    }).catch(() => {});

    res.status(201).json({
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      userName: user?.name ?? "Technician",
      startTime: entry.startTime,
      endTime: null,
      durationMinutes: null,
      pauseReason: null,
      status: "running",
      isActive: true,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to start time tracking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/tasks/:taskId/time/pause",
  validateBody(PauseTimeTrackingBody),
  async (req, res): Promise<void> => {
    try {
      const taskId = parseInt(req.params.taskId as string, 10);
      const { reason } = req.body as { reason: string };
      const userId = req.user!.id;

      if (!reason || reason.trim() === "") {
        res.status(400).json({ error: "Pause reason is required" });
        return;
      }

      // Verify task state
      const [task] = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.id, taskId));
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      const effectiveStatus = computeEffectiveStatus(task);
      if (!isValidTransition(effectiveStatus, "paused")) {
        res.status(400).json({
          error: `Cannot pause: task is in '${effectiveStatus}' status`,
        });
        return;
      }

      // Wrap in transaction
      const updated = await db.transaction(async (tx) => {
        const openEntries = await tx
          .select()
          .from(timeEntriesTable)
          .where(
            and(
              eq(timeEntriesTable.taskId, taskId),
              isNull(timeEntriesTable.endTime),
            ),
          );

        if (openEntries.length === 0) {
          throw new Error("NO_ACTIVE_ENTRY");
        }

        const now = new Date();
        const entry = openEntries[0];
        const durationMinutes = Math.round(
          (now.getTime() - entry.startTime.getTime()) / 60000,
        );

        const [updatedEntry] = await tx
          .update(timeEntriesTable)
          .set({ endTime: now, duration: durationMinutes, pauseReason: reason, status: "paused", updatedAt: now })
          .where(eq(timeEntriesTable.id, entry.id))
          .returning();

        await tx
          .update(tasksTable)
          .set({ status: "paused", updatedAt: now })
          .where(eq(tasksTable.id, taskId));

        return updatedEntry;
      });

      // Look up user name
      const [user] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, updated.userId));

      await logAuditEvent({
        taskId,
        actorId: userId,
        action: "task_paused",
        entityType: "time_entry",
        entityId: updated.id,
        details: { reason },
      }).catch(() => {});

      res.json({
        id: updated.id,
        taskId: updated.taskId,
        userId: updated.userId,
        userName: user?.name ?? "Technician",
        startTime: updated.startTime,
        endTime: updated.endTime,
        durationMinutes: updated.duration,
        pauseReason: updated.pauseReason,
        status: "paused",
        isActive: false,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "NO_ACTIVE_ENTRY") {
        res.status(404).json({ error: "No active time entry found" });
        return;
      }
      req.log.error({ err }, "Failed to pause time tracking");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post("/tasks/:taskId/time/resume", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const userId = req.user!.id;

    // Verify task state
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const effectiveStatus = computeEffectiveStatus(task);
    if (!isValidTransition(effectiveStatus, "in_progress")) {
      res.status(400).json({
        error: `Cannot resume: task is in '${effectiveStatus}' status`,
      });
      return;
    }

    // Check no existing running session
    const [existingOpen] = await db
      .select({ id: timeEntriesTable.id })
      .from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.taskId, taskId), isNull(timeEntriesTable.endTime)));
    if (existingOpen) {
      res.status(400).json({ error: "A work session is already running." });
      return;
    }

    // Wrap in transaction
    const entry = await db.transaction(async (tx) => {
      const now = new Date();
      const [newEntry] = await tx
        .insert(timeEntriesTable)
        .values({ taskId, userId, startTime: now, status: "running" })
        .returning();

      await tx
        .update(tasksTable)
        .set({ status: "in_progress", updatedAt: now })
        .where(eq(tasksTable.id, taskId));

      return newEntry;
    });

    // Look up user name
    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    await logAuditEvent({
      taskId,
      actorId: userId,
      action: "task_resumed",
      entityType: "time_entry",
      entityId: entry.id,
    }).catch(() => {});

    res.status(201).json({
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      userName: user?.name ?? "Technician",
      startTime: entry.startTime,
      endTime: null,
      durationMinutes: null,
      pauseReason: null,
      status: "running",
      isActive: true,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to resume time tracking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Stop work session — closes the active entry with status 'completed'
router.post("/tasks/:taskId/time/stop", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const userId = req.user!.id;

    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    if (task.status === "approved") { res.status(400).json({ error: "Task is locked." }); return; }

    const updated = await db.transaction(async (tx) => {
      const openEntries = await tx
        .select()
        .from(timeEntriesTable)
        .where(and(eq(timeEntriesTable.taskId, taskId), isNull(timeEntriesTable.endTime)));

      if (openEntries.length === 0) throw new Error("NO_ACTIVE_ENTRY");

      const now = new Date();
      const entry = openEntries[0];
      const durationMinutes = Math.round((now.getTime() - entry.startTime.getTime()) / 60000);

      const [updatedEntry] = await tx
        .update(timeEntriesTable)
        .set({ endTime: now, duration: durationMinutes, status: "completed", updatedAt: now })
        .where(eq(timeEntriesTable.id, entry.id))
        .returning();

      // Move task status back to paused (stopped but not submitted)
      await tx.update(tasksTable).set({ status: "paused", updatedAt: now }).where(eq(tasksTable.id, taskId));

      return updatedEntry;
    });

    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.userId));

    await logAuditEvent({
      taskId,
      actorId: userId,
      action: "task_stopped",
      entityType: "time_entry",
      entityId: updated.id,
      details: { durationMinutes: updated.duration },
    }).catch(() => {});

    res.json({
      id: updated.id,
      taskId: updated.taskId,
      userId: updated.userId,
      userName: user?.name ?? "Technician",
      startTime: updated.startTime,
      endTime: updated.endTime,
      durationMinutes: updated.duration,
      pauseReason: null,
      status: "completed",
      isActive: false,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_ACTIVE_ENTRY") {
      res.status(404).json({ error: "No active time entry found" });
      return;
    }
    req.log.error({ err }, "Failed to stop time tracking");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
