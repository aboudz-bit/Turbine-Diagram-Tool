import { db } from "@workspace/db";
import {
  tasksTable,
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
  usersTable,
  timeEntriesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { computeEffectiveStatus } from "./task-utils";

export const taskSelectFields = {
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
};

/**
 * Base query for tasks with all LEFT JOINs for asset/section/stage/component/user.
 */
export function taskBaseQuery() {
  return db
    .select(taskSelectFields)
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
    .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id));
}

/**
 * Build a full task row by ID, including totalMinutes and computed overdue status.
 */
export async function buildTaskRow(taskId: number) {
  const [task] = await taskBaseQuery().where(eq(tasksTable.id, taskId));

  if (!task) return null;

  const timeEntries = await db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.taskId, taskId));

  const totalMinutes = timeEntries.reduce(
    (sum, e) => sum + (e.duration ?? 0),
    0,
  );

  return {
    ...task,
    status: computeEffectiveStatus(task),
    totalMinutes,
  };
}

/**
 * Apply computed overdue status to a task row (for list views where totalMinutes=0).
 */
export function applyEffectiveStatus<
  T extends { status: string; deadline: Date | null },
>(task: T): T & { status: string } {
  return { ...task, status: computeEffectiveStatus(task) };
}
