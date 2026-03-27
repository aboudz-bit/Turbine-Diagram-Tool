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

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    // Total by status
    const allTasks = await db
      .select({
        id: tasksTable.id,
        status: tasksTable.status,
        assignedToId: tasksTable.assignedToId,
        sectionId: tasksTable.sectionId,
        stageId: tasksTable.stageId,
        completedAt: tasksTable.completedAt,
        estimatedHours: tasksTable.estimatedHours,
      })
      .from(tasksTable);

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

    // Technician performance
    const technicians = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "technician"));

    const techPerformance = await Promise.all(
      technicians.map(async (tech) => {
        const techTasks = allTasks.filter((t) => t.assignedToId === tech.id);
        const completed = techTasks.filter((t) =>
          ["approved", "submitted"].includes(t.status)
        );

        // Avg completion from time entries
        const timeData = await db
          .select({ duration: timeEntriesTable.duration })
          .from(timeEntriesTable)
          .leftJoin(tasksTable, eq(timeEntriesTable.taskId, tasksTable.id))
          .where(
            and(
              eq(timeEntriesTable.userId, tech.id),
              isNotNull(timeEntriesTable.duration)
            )
          );

        const totalMinutes = timeData.reduce(
          (sum, e) => sum + (e.duration ?? 0),
          0
        );
        const avgHours =
          timeData.length > 0 ? totalMinutes / timeData.length / 60 : 0;

        return {
          technicianId: tech.id,
          technicianName: tech.name,
          assignedTasks: techTasks.length,
          completedTasks: completed.length,
          avgCompletionHours: Math.round(avgHours * 10) / 10,
        };
      })
    );

    const overdueCount = byStatus["overdue"] ?? 0;
    const approvedCount = byStatus["approved"] ?? 0;
    const rejectedCount = byStatus["rejected"] ?? 0;
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
