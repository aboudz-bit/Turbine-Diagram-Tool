/**
 * Advanced Checklist Engine — API Routes
 *
 * POST   /tasks/:taskId/checklists           — create checklist for a task
 * GET    /tasks/:taskId/checklists           — list checklists for a task
 * GET    /checklists/:checklistId            — get checklist with items
 * PATCH  /checklists/:checklistId/items/:itemId — update a checklist item
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { taskChecklistsTable, checklistItemsTable } from "@workspace/db";
import { tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logAuditEvent } from "../lib/auditLog";
import { requirePermission } from "../services/permissionMatrix";

const router: IRouter = Router();

/**
 * Create a new checklist for a task.
 * Body: { title, items: [{ label, itemType, isRequired, numericUnit?, numericMin?, numericMax? }] }
 */
router.post(
  "/tasks/:taskId/checklists",
  requirePermission("checklist:create"),
  async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId as string, 10);

      // Verify task exists
      const [task] = await db
        .select({ id: tasksTable.id })
        .from(tasksTable)
        .where(eq(tasksTable.id, taskId));

      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      const { title, items } = req.body as {
        title: string;
        items: Array<{
          label: string;
          itemType?: "boolean" | "numeric" | "text";
          isRequired?: boolean;
          numericUnit?: string;
          numericMin?: number;
          numericMax?: number;
        }>;
      };

      if (!title || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "Title and at least one item are required." });
        return;
      }

      // Create checklist
      const [checklist] = await db
        .insert(taskChecklistsTable)
        .values({
          taskId,
          title,
          totalItems: items.length,
          completedItems: 0,
        })
        .returning();

      // Create items
      const createdItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const [created] = await db
          .insert(checklistItemsTable)
          .values({
            checklistId: checklist.id,
            sortOrder: i,
            label: item.label,
            itemType: item.itemType ?? "boolean",
            isRequired: item.isRequired ?? true,
            numericUnit: item.numericUnit ?? null,
            numericMin: item.numericMin?.toString() ?? null,
            numericMax: item.numericMax?.toString() ?? null,
          })
          .returning();
        createdItems.push(created);
      }

      await logAuditEvent({
        taskId,
        actorId: req.user!.id,
        action: "checklist_created",
        entityType: "checklist",
        entityId: checklist.id,
        details: { title, itemCount: items.length },
      }).catch(() => {});

      res.status(201).json({ ...checklist, items: createdItems });
    } catch (err) {
      req.log.error({ err }, "Failed to create checklist");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * List all checklists for a task.
 */
router.get("/tasks/:taskId/checklists", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);

    const checklists = await db
      .select()
      .from(taskChecklistsTable)
      .where(eq(taskChecklistsTable.taskId, taskId))
      .orderBy(taskChecklistsTable.createdAt);

    // Fetch items for each checklist
    const result = [];
    for (const checklist of checklists) {
      const items = await db
        .select()
        .from(checklistItemsTable)
        .where(eq(checklistItemsTable.checklistId, checklist.id))
        .orderBy(checklistItemsTable.sortOrder);

      const completedCount = items.filter((i) => i.isCompleted).length;
      result.push({
        ...checklist,
        completedItems: completedCount,
        progress: items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0,
        items,
      });
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list checklists");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get a single checklist with all its items.
 */
router.get("/checklists/:checklistId", async (req, res) => {
  try {
    const checklistId = parseInt(req.params.checklistId as string, 10);

    const [checklist] = await db
      .select()
      .from(taskChecklistsTable)
      .where(eq(taskChecklistsTable.id, checklistId));

    if (!checklist) {
      res.status(404).json({ error: "Checklist not found" });
      return;
    }

    const items = await db
      .select()
      .from(checklistItemsTable)
      .where(eq(checklistItemsTable.checklistId, checklistId))
      .orderBy(checklistItemsTable.sortOrder);

    const completedCount = items.filter((i) => i.isCompleted).length;

    res.json({
      ...checklist,
      completedItems: completedCount,
      progress: items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0,
      items,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get checklist");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update a checklist item (fill in value, mark as complete).
 * Body: { booleanValue?, numericValue?, textValue?, isCompleted? }
 */
router.patch(
  "/checklists/:checklistId/items/:itemId",
  requirePermission("checklist:fill"),
  async (req, res) => {
    try {
      const checklistId = parseInt(req.params.checklistId as string, 10);
      const itemId = parseInt(req.params.itemId as string, 10);

      const [item] = await db
        .select()
        .from(checklistItemsTable)
        .where(
          and(
            eq(checklistItemsTable.id, itemId),
            eq(checklistItemsTable.checklistId, checklistId),
          ),
        );

      if (!item) {
        res.status(404).json({ error: "Checklist item not found" });
        return;
      }

      const { booleanValue, numericValue, textValue, isCompleted } = req.body as {
        booleanValue?: boolean;
        numericValue?: number;
        textValue?: string;
        isCompleted?: boolean;
      };

      // Validate numeric range if provided
      if (numericValue !== undefined && item.itemType === "numeric") {
        if (item.numericMin !== null && numericValue < parseFloat(item.numericMin)) {
          res.status(400).json({
            error: `Value ${numericValue} is below minimum ${item.numericMin} ${item.numericUnit ?? ""}`,
          });
          return;
        }
        if (item.numericMax !== null && numericValue > parseFloat(item.numericMax)) {
          res.status(400).json({
            error: `Value ${numericValue} exceeds maximum ${item.numericMax} ${item.numericUnit ?? ""}`,
          });
          return;
        }
      }

      const updateData: Record<string, unknown> = {};
      if (booleanValue !== undefined) updateData.booleanValue = booleanValue;
      if (numericValue !== undefined) updateData.numericValue = numericValue.toString();
      if (textValue !== undefined) updateData.textValue = textValue;
      if (isCompleted !== undefined) {
        updateData.isCompleted = isCompleted;
        updateData.completedAt = isCompleted ? new Date() : null;
        updateData.completedByUserId = isCompleted ? req.user!.id : null;
      }

      const [updated] = await db
        .update(checklistItemsTable)
        .set(updateData)
        .where(eq(checklistItemsTable.id, itemId))
        .returning();

      // Update checklist completed count
      const allItems = await db
        .select({ isCompleted: checklistItemsTable.isCompleted })
        .from(checklistItemsTable)
        .where(eq(checklistItemsTable.checklistId, checklistId));

      const completedCount = allItems.filter((i) => i.isCompleted).length;

      await db
        .update(taskChecklistsTable)
        .set({ completedItems: completedCount, updatedAt: new Date() })
        .where(eq(taskChecklistsTable.id, checklistId));

      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to update checklist item");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
