import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  usersTable,
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
  timeEntriesTable,
  qcReviewsTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { isValidTransition, getValidTransitions } from "../lib/state-machine";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  CreateTaskBody,
  UpdateTaskStatusBody,
  ListTasksQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildTaskRow(taskId: number) {
  const [task] = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      assetId: tasksTable.assetId,
      assetName: assetsTable.name,
      sectionId: tasksTable.sectionId,
      sectionName: assetSectionsTable.name,
      stageId: tasksTable.stageId,
      stageName: assetStagesTable.name,
      stageNumber: assetStagesTable.stageNumber,
      bladeCountMin: assetStagesTable.bladeCountMin,
      bladeCountMax: assetStagesTable.bladeCountMax,
      componentId: tasksTable.componentId,
      componentName: assetComponentsTable.name,
      assignedToId: tasksTable.assignedToId,
      assignedToName: usersTable.name,
      createdById: tasksTable.createdById,
      estimatedHours: tasksTable.estimatedHours,
      deadline: tasksTable.deadline,
      priority: tasksTable.priority,
      status: tasksTable.status,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
    })
    .from(tasksTable)
    .leftJoin(assetsTable, eq(tasksTable.assetId, assetsTable.id))
    .leftJoin(
      assetSectionsTable,
      eq(tasksTable.sectionId, assetSectionsTable.id),
    )
    .leftJoin(assetStagesTable, eq(tasksTable.stageId, assetStagesTable.id))
    .leftJoin(
      assetComponentsTable,
      eq(tasksTable.componentId, assetComponentsTable.id),
    )
    .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id))
    .where(eq(tasksTable.id, taskId));

  if (!task) return null;

  // Calculate total tracked minutes
  const timeEntries = await db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.taskId, taskId));

  const totalMinutes = timeEntries.reduce(
    (sum, e) => sum + (e.duration ?? 0),
    0,
  );

  return { ...task, totalMinutes };
}

router.get(
  "/tasks",
  validateQuery(ListTasksQueryParams),
  async (req, res): Promise<void> => {
    try {
      const { status, assignedTo, sectionId } = req.query;
      const conditions = [];
      if (status)
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

      const tasks = await db
        .select({
          id: tasksTable.id,
          title: tasksTable.title,
          description: tasksTable.description,
          assetId: tasksTable.assetId,
          assetName: assetsTable.name,
          sectionId: tasksTable.sectionId,
          sectionName: assetSectionsTable.name,
          stageId: tasksTable.stageId,
          stageName: assetStagesTable.name,
          stageNumber: assetStagesTable.stageNumber,
          bladeCountMin: assetStagesTable.bladeCountMin,
          bladeCountMax: assetStagesTable.bladeCountMax,
          componentId: tasksTable.componentId,
          componentName: assetComponentsTable.name,
          assignedToId: tasksTable.assignedToId,
          assignedToName: usersTable.name,
          createdById: tasksTable.createdById,
          estimatedHours: tasksTable.estimatedHours,
          deadline: tasksTable.deadline,
          priority: tasksTable.priority,
          status: tasksTable.status,
          createdAt: tasksTable.createdAt,
          updatedAt: tasksTable.updatedAt,
        })
        .from(tasksTable)
        .leftJoin(assetsTable, eq(tasksTable.assetId, assetsTable.id))
        .leftJoin(
          assetSectionsTable,
          eq(tasksTable.sectionId, assetSectionsTable.id),
        )
        .leftJoin(assetStagesTable, eq(tasksTable.stageId, assetStagesTable.id))
        .leftJoin(
          assetComponentsTable,
          eq(tasksTable.componentId, assetComponentsTable.id),
        )
        .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(tasksTable.createdAt);

      // Add totalMinutes=0 for list view (performance)
      const result = tasks.map((t) => ({ ...t, totalMinutes: 0 }));
      res.json(result);
    } catch (err) {
      req.log.error({ err }, "Failed to list tasks");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post("/tasks", validateBody(CreateTaskBody), async (req, res) => {
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
    res.status(201).json(full);
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
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
      const status = req.body.status as "draft" | "assigned" | "in_progress" | "paused" | "submitted" | "under_qc" | "approved" | "rejected" | "overdue";

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

      // Enforce state machine
      if (!isValidTransition(existing.status, status)) {
        res.status(400).json({
          error: `Invalid status transition from '${existing.status}' to '${status}'`,
          validTransitions: getValidTransitions(existing.status),
        });
        return;
      }

      await db
        .update(tasksTable)
        .set({
          status,
          submittedAt: status === "submitted" ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(tasksTable.id, taskId));

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
