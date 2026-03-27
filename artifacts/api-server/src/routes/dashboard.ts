import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  usersTable,
  assetSectionsTable,
  assetStagesTable,
  timeEntriesTable,
  auditLogTable,
  assetsTable,
} from "@workspace/db";
import { eq, sql, isNotNull, isNull, desc } from "drizzle-orm";
import { computeEffectiveStatus } from "../lib/task-utils";
import { getActionLabel } from "../lib/auditLog";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    // All tasks with effective status
    const rawTasks = await db
      .select({
        id: tasksTable.id,
        status: tasksTable.status,
        deadline: tasksTable.deadline,
        assignedToId: tasksTable.assignedToId,
        sectionId: tasksTable.sectionId,
        stageId: tasksTable.stageId,
        assetId: tasksTable.assetId,
        completedAt: tasksTable.completedAt,
        estimatedHours: tasksTable.estimatedHours,
      })
      .from(tasksTable);

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

    // By turbine unit
    const turbineCounts = await db
      .select({
        assetName: assetsTable.name,
        assetModel: assetsTable.model,
        count: sql<number>`count(${tasksTable.id})::int`,
      })
      .from(tasksTable)
      .leftJoin(assetsTable, eq(tasksTable.assetId, assetsTable.id))
      .where(isNotNull(tasksTable.assetId))
      .groupBy(assetsTable.id, assetsTable.name, assetsTable.model);

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
    const techStats = await db
      .select({
        technicianId: usersTable.id,
        technicianName: usersTable.name,
        assignedTasks: sql<number>`count(${tasksTable.id})::int`,
        completedTasks: sql<number>`count(case when ${tasksTable.status} in ('approved', 'submitted') then 1 end)::int`,
        inProgressTasks: sql<number>`count(case when ${tasksTable.status} = 'in_progress' then 1 end)::int`,
      })
      .from(usersTable)
      .leftJoin(tasksTable, eq(tasksTable.assignedToId, usersTable.id))
      .where(eq(usersTable.role, "technician"))
      .groupBy(usersTable.id, usersTable.name);

    // Total logged labor hours
    const [totalTimeResult] = await db
      .select({
        totalMinutes: sql<number>`coalesce(sum(${timeEntriesTable.duration}), 0)::int`,
      })
      .from(timeEntriesTable)
      .where(isNotNull(timeEntriesTable.duration));

    const totalLoggedHours = Math.round((totalTimeResult?.totalMinutes ?? 0) / 60 * 10) / 10;

    // Active running timers
    const [activeSessionResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(timeEntriesTable)
      .where(isNull(timeEntriesTable.endTime));

    // Per-technician logged hours
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
      const totalHours = timeData ? Math.round(timeData.totalMinutes / 60 * 10) / 10 : 0;
      const avgHours = timeData && timeData.entryCount > 0
        ? timeData.totalMinutes / timeData.entryCount / 60
        : 0;
      return {
        technicianId: tech.technicianId,
        technicianName: tech.technicianName,
        assignedTasks: tech.assignedTasks,
        completedTasks: tech.completedTasks,
        inProgressTasks: tech.inProgressTasks,
        totalLoggedHours: totalHours,
        avgCompletionHours: Math.round(avgHours * 10) / 10,
      };
    });

    // Recent audit activity (last 15)
    const recentAuditRows = await db
      .select({
        id: auditLogTable.id,
        action: auditLogTable.action,
        taskId: auditLogTable.taskId,
        entityType: auditLogTable.entityType,
        entityId: auditLogTable.entityId,
        actorId: auditLogTable.actorId,
        actorName: usersTable.name,
        createdAt: auditLogTable.createdAt,
      })
      .from(auditLogTable)
      .leftJoin(usersTable, eq(auditLogTable.actorId, usersTable.id))
      .orderBy(desc(auditLogTable.createdAt))
      .limit(15);

    const recentActivity = recentAuditRows.map((r) => ({
      id: r.id,
      action: r.action,
      actionLabel: getActionLabel(r.action),
      taskId: r.taskId,
      entityType: r.entityType,
      entityId: r.entityId,
      actorName: r.actorName ?? "System",
      createdAt: r.createdAt,
    }));

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
      byTurbine: turbineCounts.map((t) => ({
        assetName: t.assetName ?? "Unknown",
        assetModel: t.assetModel ?? "Unknown",
        count: t.count,
      })),
      technicianPerformance: techPerformance,
      overdueCount,
      approvalRate,
      totalLoggedHours,
      activeSessionCount: activeSessionResult?.count ?? 0,
      recentActivity,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
