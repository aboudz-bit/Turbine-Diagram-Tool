import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
  tasksTable,
  timeEntriesTable,
} from "@workspace/db";
import { eq, isNotNull, inArray, sql, and } from "drizzle-orm";
import { taskBaseQuery, applyEffectiveStatus } from "../lib/task-queries";

const router: IRouter = Router();

router.get("/assets", async (req, res) => {
  try {
    const assets = await db.select().from(assetsTable);
    res.json(assets);
  } catch (err) {
    req.log.error({ err }, "Failed to list assets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assets/:assetId/sections", async (req, res) => {
  try {
    const assetId = parseInt(req.params.assetId as string, 10);
    const sections = await db
      .select()
      .from(assetSectionsTable)
      .where(eq(assetSectionsTable.assetId, assetId))
      .orderBy(assetSectionsTable.order);
    res.json(sections);
  } catch (err) {
    req.log.error({ err }, "Failed to list sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sections/:sectionId/stages", async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId as string, 10);
    const stages = await db
      .select()
      .from(assetStagesTable)
      .where(eq(assetStagesTable.sectionId, sectionId))
      .orderBy(assetStagesTable.stageNumber);
    res.json(stages);
  } catch (err) {
    req.log.error({ err }, "Failed to list stages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stages/:stageId/components", async (req, res) => {
  try {
    const stageId = parseInt(req.params.stageId as string, 10);
    const components = await db
      .select()
      .from(assetComponentsTable)
      .where(eq(assetComponentsTable.stageId, stageId));
    res.json(components);
  } catch (err) {
    req.log.error({ err }, "Failed to list components");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/components/:componentId/history", async (req, res): Promise<void> => {
  try {
    const componentId = parseInt(req.params.componentId as string, 10);

    // Get component info
    const [component] = await db
      .select({
        id: assetComponentsTable.id,
        name: assetComponentsTable.name,
        stageId: assetComponentsTable.stageId,
        stageName: assetStagesTable.name,
        sectionName: assetSectionsTable.name,
      })
      .from(assetComponentsTable)
      .leftJoin(assetStagesTable, eq(assetComponentsTable.stageId, assetStagesTable.id))
      .leftJoin(assetSectionsTable, eq(assetStagesTable.sectionId, assetSectionsTable.id))
      .where(eq(assetComponentsTable.id, componentId));

    if (!component) {
      res.status(404).json({ error: "Component not found" });
      return;
    }

    // Get tasks for this component (using shared query builder)
    const rawTasks = await taskBaseQuery()
      .where(eq(tasksTable.componentId, componentId))
      .orderBy(tasksTable.createdAt);

    // Apply computed overdue status
    const tasks = rawTasks.map(applyEffectiveStatus);

    const completedTasks = tasks.filter((t) =>
      ["approved", "submitted"].includes(t.status)
    );

    // Avg repair hours from time entries on completed tasks (SQL-level filter)
    let avgRepairHours: number | null = null;
    if (completedTasks.length > 0) {
      const completedIds = completedTasks.map((t) => t.id);
      const [timeAgg] = await db
        .select({
          totalMinutes: sql<number>`coalesce(sum(${timeEntriesTable.duration}), 0)::int`,
        })
        .from(timeEntriesTable)
        .where(
          and(
            inArray(timeEntriesTable.taskId, completedIds),
            isNotNull(timeEntriesTable.duration),
          ),
        );

      if (timeAgg && timeAgg.totalMinutes > 0) {
        avgRepairHours = Math.round((timeAgg.totalMinutes / completedTasks.length / 60) * 10) / 10;
      }
    }

    const lastMaintenance =
      completedTasks.length > 0
        ? completedTasks[completedTasks.length - 1].updatedAt
        : null;

    res.json({
      componentId: component.id,
      componentName: component.name,
      stageName: component.stageName,
      sectionName: component.sectionName,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      avgRepairHours,
      lastMaintenanceDate: lastMaintenance,
      tasks: tasks.map((t) => ({ ...t, totalMinutes: 0 })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get component history");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
