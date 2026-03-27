import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  usersTable,
  timeEntriesTable,
  qcReviewsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { isValidTransition, getValidTransitions } from "../lib/state-machine";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  CreateTaskBody,
  UpdateTaskStatusBody,
  ListTasksQueryParams,
} from "@workspace/api-zod";

/**
 * Patched CreateTaskBody: the generated schema uses zod.date() for deadline,
 * but JSON request bodies always contain strings, not Date objects.
 * We wrap safeParse to pre-coerce the deadline field before delegating to the
 * original schema, keeping the fix local without importing zod directly.
 */
const CreateTaskBodyPatched = {
  safeParse(data: unknown) {
    if (data && typeof data === "object" && "deadline" in data) {
      const d = data as Record<string, unknown>;
      if (typeof d.deadline === "string") {
        const parsed = new Date(d.deadline);
        if (!isNaN(parsed.getTime())) {
          d.deadline = parsed;
        }
        // If invalid, leave as string — Zod will reject it with a clear error
      }
    }
    return CreateTaskBody.safeParse(data);
  },
};
import {
  taskBaseQuery,
  buildTaskRow,
  applyEffectiveStatus,
} from "../lib/task-queries";
import { computeEffectiveStatus } from "../lib/task-utils";

const router: IRouter = Router();

router.get(
  "/tasks",
  validateQuery(ListTasksQueryParams),
  async (req, res): Promise<void> => {
    try {
      const query = (req as unknown as Record<string, unknown>).validatedQuery as Record<string, unknown> ?? req.query;
      const { status, assignedTo, sectionId } = query as Record<string, string>;
      const limit = Math.min(Number(query.limit) || 50, 200);
      const offset = Number(query.offset) || 0;

      const conditions = [];
      if (status && status !== "overdue")
        conditions.push(
          eq(
            tasksTable.status,
            status as
              | "draft"
              | "assigned"
              | "in_progress"
              | "paused"
              | "submitted"
              | "under_qc"
              | "approved"
              | "rejected"
              | "revision_needed"
              | "overdue",
          ),
        );
      if (assignedTo)
        conditions.push(
          eq(tasksTable.assignedToId, parseInt(assignedTo as string, 10)),
        );
      if (sectionId)
        conditions.push(
          eq(tasksTable.sectionId, parseInt(sectionId as string, 10)),
        );

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // For "overdue" filter, we need all rows since overdue is computed
      if (status === "overdue") {
        const allTasks = await taskBaseQuery()
          .where(whereClause)
          .orderBy(tasksTable.createdAt);

        const overdueTasks = allTasks
          .map((t) => ({ ...applyEffectiveStatus(t), totalMinutes: 0 }))
          .filter((t) => t.status === "overdue");

        const total = overdueTasks.length;
        const data = overdueTasks.slice(offset, offset + limit);
        res.json({ data, total });
      } else {
        // Count total matching rows
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasksTable)
          .where(whereClause);
        const total = countResult?.count ?? 0;

        // Fetch paginated results
        const tasks = await taskBaseQuery()
          .where(whereClause)
          .orderBy(tasksTable.createdAt)
          .limit(limit)
          .offset(offset);

        const data = tasks.map((t) => ({
          ...applyEffectiveStatus(t),
          totalMinutes: 0,
        }));

        res.json({ data, total });
      }
    } catch (err) {
      req.log.error({ err }, "Failed to list tasks");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post("/tasks", validateBody(CreateTaskBodyPatched), async (req, res) => {
  try {
    const {
      title,
      description,
      assetId,
      sectionId,
      stageId,
      componentId,
      assignedToId,
      estimatedHours,
      deadline,
      priority,
    } = req.body;

    // Validate deadline is a parseable date if provided
    if (deadline) {
      const parsed = new Date(deadline);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ error: "Invalid deadline format. Use ISO-8601 (e.g. 2025-12-31T23:59:59Z)." });
        return;
      }
    }

    const [task] = await db
      .insert(tasksTable)
      .values({
        title,
        description: description || null,
        assetId,
        sectionId: sectionId || null,
        stageId: stageId || null,
        componentId: componentId || null,
        assignedToId: assignedToId || null,
        createdById: req.user!.id,
        estimatedHours: estimatedHours ? estimatedHours.toString() : null,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority ?? "medium",
        status: assignedToId ? "assigned" : "draft",
      })
      .returning();

    const full = await buildTaskRow(task.id);
    res.status(201).json(full);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err, body: req.body }, "CREATE TASK ERROR");
    res.status(500).json({ error: message });
  }
});

router.get("/tasks/:taskId", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const task = await buildTaskRow(taskId);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    // Time entries with computed fields
    const timeEntries = await db
      .select({
        id: timeEntriesTable.id,
        taskId: timeEntriesTable.taskId,
        userId: timeEntriesTable.userId,
        userName: usersTable.name,
        startTime: timeEntriesTable.startTime,
        endTime: timeEntriesTable.endTime,
        duration: timeEntriesTable.duration,
        pauseReason: timeEntriesTable.pauseReason,
      })
      .from(timeEntriesTable)
      .leftJoin(usersTable, eq(timeEntriesTable.userId, usersTable.id))
      .where(eq(timeEntriesTable.taskId, taskId))
      .orderBy(timeEntriesTable.startTime);

    const mappedEntries = timeEntries.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      userId: e.userId,
      userName: e.userName ?? "Technician",
      startTime: e.startTime,
      endTime: e.endTime,
      durationMinutes: e.duration,
      pauseReason: e.pauseReason,
      isActive: e.endTime === null,
    }));

    const activeEntry = mappedEntries.find((e) => e.isActive) ?? null;

    // QC reviews
    const qcReviews = await db
      .select({
        id: qcReviewsTable.id,
        taskId: qcReviewsTable.taskId,
        reviewerId: qcReviewsTable.reviewerId,
        reviewerName: usersTable.name,
        decision: qcReviewsTable.decision,
        comments: qcReviewsTable.comments,
        createdAt: qcReviewsTable.createdAt,
      })
      .from(qcReviewsTable)
      .leftJoin(usersTable, eq(qcReviewsTable.reviewerId, usersTable.id))
      .where(eq(qcReviewsTable.taskId, taskId))
      .orderBy(qcReviewsTable.createdAt);

    res.json({
      ...task,
      timeEntries: mappedEntries,
      activeTimeEntry: activeEntry,
      qcReviews,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/tasks/:taskId",
  validateBody(UpdateTaskStatusBody),
  async (req, res): Promise<void> => {
    try {
      const taskId = parseInt(req.params.taskId as string, 10);
      const status = req.body.status as "draft" | "assigned" | "in_progress" | "paused" | "submitted" | "under_qc" | "approved" | "rejected" | "revision_needed" | "overdue";
      const version = req.body.version as number;

      const [existing] = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.id, taskId));
      if (!existing) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      // Lock approved tasks
      if (existing.status === "approved") {
        res.status(403).json({ error: "Approved tasks cannot be modified" });
        return;
      }

      // Use effective status (computed overdue) for transition validation
      const effectiveStatus = computeEffectiveStatus(existing);

      // Enforce state machine
      if (!isValidTransition(effectiveStatus, status)) {
        res.status(400).json({
          error: `Invalid status transition from '${effectiveStatus}' to '${status}'`,
          validTransitions: getValidTransitions(effectiveStatus),
        });
        return;
      }

      // Optimistic locking: only update if version matches
      const [updated] = await db
        .update(tasksTable)
        .set({
          status,
          version: existing.version + 1,
          submittedAt: status === "submitted" ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(tasksTable.id, taskId), eq(tasksTable.version, version)))
        .returning();

      if (!updated) {
        res.status(409).json({
          error: "Task was modified by another user. Please refresh and try again.",
        });
        return;
      }

      const full = await buildTaskRow(taskId);
      res.json(full);
    } catch (err) {
      req.log.error({ err }, "Failed to update task");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.name);
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
