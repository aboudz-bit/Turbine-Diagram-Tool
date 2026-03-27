/**
 * Advanced Analytics — Enterprise Dashboard Routes
 *
 * GET /analytics/completion-times   — avg completion time per task type/section
 * GET /analytics/overdue-rate       — overdue rate as percentage
 * GET /analytics/technician-ranking — technician performance scores
 * GET /analytics/turbine-breakdown  — tasks per turbine model
 * GET /analytics/failure-frequency  — failure frequency per component
 * GET /analytics/trends             — time-series trend data
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  timeEntriesTable,
  usersTable,
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
  qcReviewsTable,
} from "@workspace/db";
import { eq, sql, isNotNull, and, desc, count } from "drizzle-orm";
import { computeEffectiveStatus } from "../lib/task-utils";
import { requirePermission } from "../services/permissionMatrix";

const router: IRouter = Router();

/**
 * Average completion time per section and per turbine model.
 */
router.get(
  "/analytics/completion-times",
  requirePermission("dashboard:analytics"),
  async (req, res) => {
    try {
      // Per section
      const bySection = await db
        .select({
          sectionName: assetSectionsTable.name,
          avgMinutes: sql<number>`coalesce(avg(${timeEntriesTable.duration}), 0)::numeric`,
          taskCount: sql<number>`count(distinct ${tasksTable.id})::int`,
          totalMinutes: sql<number>`coalesce(sum(${timeEntriesTable.duration}), 0)::int`,
        })
        .from(timeEntriesTable)
        .innerJoin(tasksTable, eq(timeEntriesTable.taskId, tasksTable.id))
        .leftJoin(assetSectionsTable, eq(tasksTable.sectionId, assetSectionsTable.id))
        .where(isNotNull(timeEntriesTable.duration))
        .groupBy(assetSectionsTable.name);

      // Per turbine model
      const byModel = await db
        .select({
          turbineModel: assetsTable.model,
          avgMinutes: sql<number>`coalesce(avg(${timeEntriesTable.duration}), 0)::numeric`,
          taskCount: sql<number>`count(distinct ${tasksTable.id})::int`,
        })
        .from(timeEntriesTable)
        .innerJoin(tasksTable, eq(timeEntriesTable.taskId, tasksTable.id))
        .leftJoin(assetsTable, eq(tasksTable.assetId, assetsTable.id))
        .where(isNotNull(timeEntriesTable.duration))
        .groupBy(assetsTable.model);

      res.json({
        bySection: bySection.map((s) => ({
          sectionName: s.sectionName ?? "Unknown",
          avgCompletionHours: Math.round((Number(s.avgMinutes) / 60) * 10) / 10,
          taskCount: s.taskCount,
          totalHours: Math.round((s.totalMinutes / 60) * 10) / 10,
        })),
        byModel: byModel.map((m) => ({
          turbineModel: m.turbineModel ?? "Unknown",
          avgCompletionHours: Math.round((Number(m.avgMinutes) / 60) * 10) / 10,
          taskCount: m.taskCount,
        })),
      });
    } catch (err) {
      req.log.error({ err }, "Failed to get completion times");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * Overdue rate — percentage of tasks that are/were overdue.
 */
router.get(
  "/analytics/overdue-rate",
  requirePermission("dashboard:analytics"),
  async (req, res) => {
    try {
      const allTasks = await db
        .select({
          id: tasksTable.id,
          status: tasksTable.status,
          deadline: tasksTable.deadline,
        })
        .from(tasksTable);

      const total = allTasks.length;
      const overdueCount = allTasks.filter(
        (t) => computeEffectiveStatus(t) === "overdue",
      ).length;

      const overdueRate = total > 0 ? Math.round((overdueCount / total) * 1000) / 10 : 0;

      // Monthly trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyOverdue = await db
        .select({
          month: sql<string>`to_char(${tasksTable.createdAt}, 'YYYY-MM')`,
          total: sql<number>`count(*)::int`,
          overdueAtCreation: sql<number>`count(case when ${tasksTable.deadline} < now() then 1 end)::int`,
        })
        .from(tasksTable)
        .where(sql`${tasksTable.createdAt} >= ${sixMonthsAgo}`)
        .groupBy(sql`to_char(${tasksTable.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${tasksTable.createdAt}, 'YYYY-MM')`);

      res.json({
        totalTasks: total,
        overdueCount,
        overdueRate,
        monthlyTrend: monthlyOverdue,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to get overdue rate");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * Technician ranking — performance score based on:
 * - Tasks completed
 * - Average completion time
 * - Overdue ratio
 * - QC approval rate
 */
router.get(
  "/analytics/technician-ranking",
  requirePermission("dashboard:analytics"),
  async (req, res) => {
    try {
      // Base stats
      const techStats = await db
        .select({
          technicianId: usersTable.id,
          technicianName: usersTable.name,
          role: usersTable.role,
          assignedTasks: sql<number>`count(${tasksTable.id})::int`,
          completedTasks: sql<number>`count(case when ${tasksTable.status} = 'approved' then 1 end)::int`,
          submittedTasks: sql<number>`count(case when ${tasksTable.status} in ('submitted', 'under_qc', 'approved') then 1 end)::int`,
          overdueTasks: sql<number>`count(case when ${tasksTable.deadline} < now() and ${tasksTable.status} not in ('approved', 'draft') then 1 end)::int`,
        })
        .from(usersTable)
        .leftJoin(tasksTable, eq(tasksTable.assignedToId, usersTable.id))
        .where(eq(usersTable.role, "technician"))
        .groupBy(usersTable.id, usersTable.name, usersTable.role);

      // Time stats per technician
      const techTimeStats = await db
        .select({
          userId: timeEntriesTable.userId,
          totalMinutes: sql<number>`coalesce(sum(${timeEntriesTable.duration}), 0)::int`,
          sessionCount: sql<number>`count(*)::int`,
        })
        .from(timeEntriesTable)
        .where(isNotNull(timeEntriesTable.duration))
        .groupBy(timeEntriesTable.userId);

      const timeByUser = new Map(techTimeStats.map((t) => [t.userId, t]));

      // QC stats per technician (rejection count)
      const rejectionStats = await db
        .select({
          assignedToId: tasksTable.assignedToId,
          rejections: sql<number>`count(case when ${qcReviewsTable.decision} = 'rejected' then 1 end)::int`,
          totalReviews: sql<number>`count(${qcReviewsTable.id})::int`,
        })
        .from(qcReviewsTable)
        .innerJoin(tasksTable, eq(qcReviewsTable.taskId, tasksTable.id))
        .where(isNotNull(tasksTable.assignedToId))
        .groupBy(tasksTable.assignedToId);

      const rejectionByUser = new Map(
        rejectionStats.map((r) => [r.assignedToId, r]),
      );

      const rankings = techStats.map((tech) => {
        const timeData = timeByUser.get(tech.technicianId);
        const rejectionData = rejectionByUser.get(tech.technicianId);
        const totalHours = timeData
          ? Math.round((timeData.totalMinutes / 60) * 10) / 10
          : 0;
        const avgHoursPerTask = tech.completedTasks > 0 && timeData
          ? Math.round((timeData.totalMinutes / tech.completedTasks / 60) * 10) / 10
          : 0;
        const overdueRatio = tech.assignedTasks > 0
          ? Math.round((tech.overdueTasks / tech.assignedTasks) * 100)
          : 0;
        const approvalRate = rejectionData && rejectionData.totalReviews > 0
          ? Math.round(((rejectionData.totalReviews - rejectionData.rejections) / rejectionData.totalReviews) * 100)
          : tech.completedTasks > 0 ? 100 : 0;

        // Performance score: weighted average
        // 40% completion rate + 30% approval rate + 30% on-time rate
        const completionRate = tech.assignedTasks > 0
          ? (tech.completedTasks / tech.assignedTasks) * 100
          : 0;
        const onTimeRate = 100 - overdueRatio;
        const performanceScore = Math.round(
          completionRate * 0.4 + approvalRate * 0.3 + onTimeRate * 0.3,
        );

        return {
          technicianId: tech.technicianId,
          technicianName: tech.technicianName,
          assignedTasks: tech.assignedTasks,
          completedTasks: tech.completedTasks,
          overdueTasks: tech.overdueTasks,
          totalLoggedHours: totalHours,
          avgHoursPerTask,
          overdueRatio,
          approvalRate,
          performanceScore,
        };
      });

      // Sort by performance score descending
      rankings.sort((a, b) => b.performanceScore - a.performanceScore);

      res.json({ rankings });
    } catch (err) {
      req.log.error({ err }, "Failed to get technician rankings");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * Tasks per turbine model breakdown.
 */
router.get(
  "/analytics/turbine-breakdown",
  requirePermission("dashboard:analytics"),
  async (req, res) => {
    try {
      const breakdown = await db
        .select({
          turbineModel: assetsTable.model,
          assetName: assetsTable.name,
          totalTasks: sql<number>`count(${tasksTable.id})::int`,
          activeTasks: sql<number>`count(case when ${tasksTable.status} in ('assigned', 'in_progress', 'paused') then 1 end)::int`,
          completedTasks: sql<number>`count(case when ${tasksTable.status} = 'approved' then 1 end)::int`,
          overdueTasks: sql<number>`count(case when ${tasksTable.deadline} < now() and ${tasksTable.status} not in ('approved', 'draft') then 1 end)::int`,
        })
        .from(tasksTable)
        .innerJoin(assetsTable, eq(tasksTable.assetId, assetsTable.id))
        .groupBy(assetsTable.model, assetsTable.name);

      res.json({ breakdown });
    } catch (err) {
      req.log.error({ err }, "Failed to get turbine breakdown");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * Failure frequency per component — how many rejected/revision_needed per component.
 */
router.get(
  "/analytics/failure-frequency",
  requirePermission("dashboard:analytics"),
  async (req, res) => {
    try {
      const failures = await db
        .select({
          componentId: assetComponentsTable.id,
          componentName: assetComponentsTable.name,
          stageName: assetStagesTable.name,
          sectionName: assetSectionsTable.name,
          totalTasks: sql<number>`count(${tasksTable.id})::int`,
          rejectedTasks: sql<number>`count(case when ${tasksTable.status} in ('rejected', 'revision_needed') then 1 end)::int`,
          failureRate: sql<number>`case when count(${tasksTable.id}) > 0 then round(count(case when ${tasksTable.status} in ('rejected', 'revision_needed') then 1 end)::numeric / count(${tasksTable.id})::numeric * 100, 1) else 0 end`,
        })
        .from(tasksTable)
        .innerJoin(assetComponentsTable, eq(tasksTable.componentId, assetComponentsTable.id))
        .innerJoin(assetStagesTable, eq(assetComponentsTable.stageId, assetStagesTable.id))
        .innerJoin(assetSectionsTable, eq(assetStagesTable.sectionId, assetSectionsTable.id))
        .groupBy(
          assetComponentsTable.id,
          assetComponentsTable.name,
          assetStagesTable.name,
          assetSectionsTable.name,
        )
        .orderBy(desc(sql`count(case when ${tasksTable.status} in ('rejected', 'revision_needed') then 1 end)`));

      res.json({ failures });
    } catch (err) {
      req.log.error({ err }, "Failed to get failure frequency");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
