import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  usersTable,
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tasks", async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const conditions = [];
    if (status) conditions.push(eq(tasksTable.status, status as string));
    if (assignedTo) conditions.push(eq(tasksTable.assignedToId, parseInt(assignedTo as string, 10)));

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
      .leftJoin(assetSectionsTable, eq(tasksTable.sectionId, assetSectionsTable.id))
      .leftJoin(assetStagesTable, eq(tasksTable.stageId, assetStagesTable.id))
      .leftJoin(assetComponentsTable, eq(tasksTable.componentId, assetComponentsTable.id))
      .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(tasksTable.createdAt);

    res.json(tasks);
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", async (req, res) => {
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
        description,
        assetId,
        sectionId,
        stageId,
        componentId,
        assignedToId,
        createdById: 1,
        estimatedHours: estimatedHours?.toString(),
        deadline: deadline ? new Date(deadline) : null,
        priority: priority ?? "medium",
        status: assignedToId ? "assigned" : "draft",
      })
      .returning();

    res.status(201).json(task);
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tasks/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
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
      .leftJoin(assetSectionsTable, eq(tasksTable.sectionId, assetSectionsTable.id))
      .leftJoin(assetStagesTable, eq(tasksTable.stageId, assetStagesTable.id))
      .leftJoin(assetComponentsTable, eq(tasksTable.componentId, assetComponentsTable.id))
      .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id))
      .where(eq(tasksTable.id, taskId));

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    req.log.error({ err }, "Failed to get task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tasks/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { status, pauseReason, qcComment } = req.body;

    const [task] = await db
      .update(tasksTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId))
      .returning();

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Internal server error" });
  }
});

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
