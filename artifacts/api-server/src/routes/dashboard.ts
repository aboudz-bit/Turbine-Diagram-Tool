import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  usersTable,
  assetSectionsTable,
  assetStagesTable,
  timeEntriesTable,
} from "@workspace/db";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import { computeEffectiveStatus } from "../lib/task-utils";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    // Total by status (with computed overdue)
    const rawTasks = await db
      .select({
        id: tasksTable.id,
        status: tasksTable.status,
        deadline: tasksTable.deadline,
        assignedToId: tasksTable.assignedToId,
        sectionId: tasksTable.sectionId,
        stageId: tasksTable.stageId,
        completedAt: tasksTable.completedAt,
        estimatedHours: tasksTable.estimatedHours,
      })
      .from(tasksTable);

    // Apply computed overdue status
    const allTasks = rawTasks.map((t) => ({
      ...t,
      status: computeEffectiveStatus(t),
    }));

    const byStatus: Record<string, number> = {};
    for (const task of allTasks) {
      byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
    }

    // By section
    const sectionCounts = await db
      .select({
        sectionName: assetSectionsTable.name,
        count: sql<number>`count(*)::int`,
      })
      .from(tasksTable)
      .leftJoin(assetSectionsTable, eq(tasksTable.sectionId, assetSectionsTable.id))
      .where(isNotNull(tasksTable.sectionId))
      .groupBy(assetSectionsTable.name);

    // By stage
    const stageCounts = await db
      .select({
        stageName: assetStagesTable.name,
        count: sql<number>`count(*)::int`,
      })
      .from(tasksTable)
      .leftJoin(assetStagesTable, eq(tasksTable.stageId, assetStagesTable.id))
      .where(isNotNull(tasksTable.stageId))
      .groupBy(assetStagesTable.name);

    // Technician performance via SQL aggregation (single query)
    const techStats = await db
      .select({
        technicianId: usersTable.id,
        technicianName: usersTable.name,
        assignedTasks: sql<number>`count(${tasksTable.id})::int`,
        completedTasks: sql<number>`count(case when ${tasksTable.status} in ('approved', 'submitted') then 1 end)::int`,
      })
      .from(usersTable)
      .leftJoin(tasksTable, eq(tasksTable.assignedToId, usersTable.id))
      .where(eq(usersTable.role, "technician"))
      .groupBy(usersTable.id, usersTable.name);

    // Avg completion hours via single aggregate query
    const techTimeStats = await db
      .select({
        userId: timeEntriesTable.userId,
        totalMinutes: sql<number>`coalesce(sum(${timeEntriesTable.duration}), 0)::int`,
        entryCount: sql<number>`count(${timeEntriesTable.duration})::int`,
      })
      .from(timeEntriesTable)
      .where(isNotNull(timeEntriesTable.duration))
      .groupBy(timeEntriesTable.userId);

    const timeByUser = new Map(techTimeStats.map((t) => [t.userId, t]));

    const techPerformance = techStats.map((tech) => {
      const timeData = timeByUser.get(tech.technicianId);
      const avgHours = timeData && timeData.entryCount > 0
        ? timeData.totalMinutes / timeData.entryCount / 60
        : 0;
      return {
        technicianId: tech.technicianId,
        technicianName: tech.technicianName,
        assignedTasks: tech.assignedTasks,
        completedTasks: tech.completedTasks,
        avgCompletionHours: Math.round(avgHours * 10) / 10,
      };
    });

    const overdueCount = byStatus["overdue"] ?? 0;
    const approvedCount = byStatus["approved"] ?? 0;
    const rejectedCount = (byStatus["rejected"] ?? 0) + (byStatus["revision_needed"] ?? 0);
    const reviewedCount = approvedCount + rejectedCount;
    const approvalRate =
      reviewedCount > 0
        ? Math.round((approvedCount / reviewedCount) * 100)
        : null;

    res.json({
      totalTasks: allTasks.length,
      byStatus,
      bySection: sectionCounts.map((s) => ({
        sectionName: s.sectionName ?? "Unknown",
        count: s.count,
      })),
      byStage: stageCounts.map((s) => ({
        stageName: s.stageName ?? "Unknown",
        count: s.count,
      })),
      technicianPerformance: techPerformance,
      overdueCount,
      approvalRate,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
