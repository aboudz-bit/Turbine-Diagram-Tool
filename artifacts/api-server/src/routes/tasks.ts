import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  usersTable,
  timeEntriesTable,
  qcReviewsTable,
  signaturesTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { isValidTransition, getValidTransitions } from "../lib/state-machine";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  CreateTaskBody,
  UpdateTaskStatusBody,
  ListTasksQueryParams,
} from "@workspace/api-zod";
import {
  taskBaseQuery,
  buildTaskRow,
  applyEffectiveStatus,
} from "../lib/task-queries";
import { computeEffectiveStatus } from "../lib/task-utils";
import { requireRole } from "../middleware/auth";
import { createNotification, notifyRoles } from "../lib/notifications";

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

      if (status === "overdue") {
        const allTasks = await taskBaseQuery()
          .where(whereClause)
          .orderBy(tasksTable.createdAt);

        const overdueTasks = allTasks
          .map((t) => ({ ...applyEffectiveStatus(t), totalMinutes: 0 }))
          .filter((t) => t.status === "overdue");

        // Create overdue notifications (once per task, non-blocking)
        for (const t of overdueTasks) {
          if (t.assignedToId) {
            createOverdueNotification(t.id, t.assignedToId, t.title).catch(() => {});
          }
        }

        const total = overdueTasks.length;
        const data = overdueTasks.slice(offset, offset + limit);
        res.json({ data, total });
      } else {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasksTable)
          .where(whereClause);
        const total = countResult?.count ?? 0;

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

router.post(
  "/tasks",
  requireRole("engineer", "supervisor", "site_manager"),
  validateBody(CreateTaskBody),
  async (req, res) => {
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

      // Notify assigned technician
      if (assignedToId) {
        await createNotification(
          assignedToId,
          task.id,
          "task_assigned",
          "New Task Assigned",
          `You have been assigned: ${title}`,
        ).catch(() => {});
      }

      res.status(201).json(full);
    } catch (err) {
      req.log.error({ err }, "Failed to create task");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/tasks/:taskId", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const task = await buildTaskRow(taskId);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

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

    // Signatures (exclude raw image data from list response for perf)
    const signatures = await db
      .select({
        id: signaturesTable.id,
        taskId: signaturesTable.taskId,
        userId: signaturesTable.userId,
        signatureType: signaturesTable.signatureType,
        signerName: signaturesTable.signerName,
        signerRole: signaturesTable.signerRole,
        createdAt: signaturesTable.createdAt,
      })
      .from(signaturesTable)
      .where(eq(signaturesTable.taskId, taskId))
      .orderBy(signaturesTable.createdAt);

    res.json({
      ...task,
      timeEntries: mappedEntries,
      activeTimeEntry: activeEntry,
      qcReviews,
      signatures,
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

      if (existing.status === "approved") {
        res.status(403).json({ error: "Approved tasks cannot be modified" });
        return;
      }

      // Require technician signature before submitting
      if (status === "submitted") {
        const [techSig] = await db
          .select()
          .from(signaturesTable)
          .where(
            and(
              eq(signaturesTable.taskId, taskId),
              eq(signaturesTable.signatureType, "technician_completion"),
            ),
          );
        if (!techSig) {
          res.status(400).json({
            error: "Technician completion signature required before submitting for QC review.",
          });
          return;
        }
      }

      const effectiveStatus = computeEffectiveStatus(existing);

      if (!isValidTransition(effectiveStatus, status)) {
        res.status(400).json({
          error: `Invalid status transition from '${effectiveStatus}' to '${status}'`,
          validTransitions: getValidTransitions(effectiveStatus),
        });
        return;
      }

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

      // Notifications for key status transitions
      if (status === "submitted" && existing.assignedToId) {
        await notifyRoles(
          ["engineer", "supervisor", "site_manager"],
          taskId,
          "task_submitted",
          "Task Ready for QC Review",
          `Task "${existing.title}" has been submitted for QC review.`,
        ).catch(() => {});
      }

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

async function createOverdueNotification(taskId: number, assignedToId: number, title: string): Promise<void> {
  try {
    // Check if overdue notification was already sent for this task recently
    const existing = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.taskId, taskId),
          eq(notificationsTable.type, "task_overdue"),
          eq(notificationsTable.userId, assignedToId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await createNotification(
        assignedToId,
        taskId,
        "task_overdue",
        "Task Overdue",
        `Task "${title}" is past its deadline and marked overdue.`,
      );
    }
  } catch {
    // Non-critical
  }
}

export default router;
