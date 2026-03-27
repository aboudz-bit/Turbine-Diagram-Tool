import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { timeEntriesTable, tasksTable } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tasks/:taskId/time", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const entries = await db
      .select({
        id: timeEntriesTable.id,
        taskId: timeEntriesTable.taskId,
        userId: timeEntriesTable.userId,
        startTime: timeEntriesTable.startTime,
        endTime: timeEntriesTable.endTime,
        duration: timeEntriesTable.duration,
        pauseReason: timeEntriesTable.pauseReason,
      })
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.taskId, taskId))
      .orderBy(timeEntriesTable.startTime);

    const result = entries.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      userId: e.userId,
      userName: "Technician",
      startTime: e.startTime,
      endTime: e.endTime,
      durationMinutes: e.duration ?? null,
      pauseReason: e.pauseReason,
      isActive: e.endTime === null,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list time entries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks/:taskId/time", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { userId = 1 } = req.body;

    // Close any existing open entries first
    const openEntries = await db
      .select()
      .from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.taskId, taskId), isNull(timeEntriesTable.endTime)));

    for (const entry of openEntries) {
      const now = new Date();
      const durationMinutes = Math.round(
        (now.getTime() - entry.startTime.getTime()) / 60000
      );
      await db
        .update(timeEntriesTable)
        .set({ endTime: now, duration: durationMinutes })
        .where(eq(timeEntriesTable.id, entry.id));
    }

    const [entry] = await db
      .insert(timeEntriesTable)
      .values({ taskId, userId, startTime: new Date() })
      .returning();

    // Update task status to in_progress
    await db
      .update(tasksTable)
      .set({ status: "in_progress", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));

    res.status(201).json({
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      userName: "Technician",
      startTime: entry.startTime,
      endTime: null,
      durationMinutes: null,
      pauseReason: null,
      isActive: true,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to start time tracking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks/:taskId/time/pause", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ error: "Pause reason is required" });
    }

    const openEntries = await db
      .select()
      .from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.taskId, taskId), isNull(timeEntriesTable.endTime)));

    if (openEntries.length === 0) {
      return res.status(404).json({ error: "No active time entry found" });
    }

    const now = new Date();
    const entry = openEntries[0];
    const durationMinutes = Math.round(
      (now.getTime() - entry.startTime.getTime()) / 60000
    );

    const [updated] = await db
      .update(timeEntriesTable)
      .set({ endTime: now, duration: durationMinutes, pauseReason: reason })
      .where(eq(timeEntriesTable.id, entry.id))
      .returning();

    // Update task status to paused
    await db
      .update(tasksTable)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));

    res.json({
      id: updated.id,
      taskId: updated.taskId,
      userId: updated.userId,
      userName: "Technician",
      startTime: updated.startTime,
      endTime: updated.endTime,
      durationMinutes: updated.duration,
      pauseReason: updated.pauseReason,
      isActive: false,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to pause time tracking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks/:taskId/time/resume", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);

    const [entry] = await db
      .insert(timeEntriesTable)
      .values({ taskId, userId: 1, startTime: new Date() })
      .returning();

    // Update task status back to in_progress
    await db
      .update(tasksTable)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));

    res.status(201).json({
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      userName: "Technician",
      startTime: entry.startTime,
      endTime: null,
      durationMinutes: null,
      pauseReason: null,
      isActive: true,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to resume time tracking");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
