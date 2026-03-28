/**
 * Smart Reminder Engine
 *
 * Background job that scans active tasks and triggers notifications:
 * - 6 hours before deadline
 * - 2 hours before deadline
 * - Overdue tasks
 * - Long-running tasks (no activity > configurable hours)
 *
 * Design: Compatible with future Redis queue / cron migration.
 * Uses setInterval for now — swap with Bull/BullMQ or pg-boss later.
 */

import { db } from "@workspace/db";
import {
  tasksTable,
  timeEntriesTable,
  notificationsTable,
  auditLogTable,
  usersTable,
} from "@workspace/db";
import { eq, and, isNotNull, isNull, lt, gt, sql, ne, inArray } from "drizzle-orm";
import { createNotification } from "../lib/notifications";

// ─── Configuration ───────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REMINDER_WINDOWS_HOURS = [6, 2]; // hours before deadline
const LONG_RUNNING_THRESHOLD_HOURS = 8; // no activity for 8+ hours

// Notification types for reminders (uses existing "task_overdue" + extended)
type ReminderType = "task_overdue" | "task_assigned"; // reuse existing types

interface ReminderConfig {
  intervalMs: number;
  longRunningThresholdHours: number;
  reminderWindowsHours: number[];
  enabled: boolean;
}

const config: ReminderConfig = {
  intervalMs: SCAN_INTERVAL_MS,
  longRunningThresholdHours: LONG_RUNNING_THRESHOLD_HOURS,
  reminderWindowsHours: REMINDER_WINDOWS_HOURS,
  enabled: true,
};

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Check if a specific reminder was already sent for a task.
 * Uses title prefix matching to avoid duplicates.
 */
async function wasReminderSent(
  userId: number,
  taskId: number,
  titlePrefix: string,
): Promise<boolean> {
  try {
    const [existing] = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.taskId, taskId),
          sql`${notificationsTable.title} LIKE ${titlePrefix + "%"}`,
        ),
      )
      .limit(1);
    return !!existing;
  } catch {
    return true; // assume sent on error to avoid spam
  }
}

/**
 * Scan for tasks approaching their deadline and send reminders.
 */
async function scanDeadlineReminders(): Promise<number> {
  let sent = 0;
  try {
    const now = new Date();

    // Get all active tasks with deadlines
    const activeTasks = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        deadline: tasksTable.deadline,
        assignedToId: tasksTable.assignedToId,
        status: tasksTable.status,
      })
      .from(tasksTable)
      .where(
        and(
          isNotNull(tasksTable.deadline),
          isNotNull(tasksTable.assignedToId),
          // Only active statuses
          sql`${tasksTable.status} IN ('assigned', 'in_progress', 'paused')`,
        ),
      );

    for (const task of activeTasks) {
      if (!task.deadline || !task.assignedToId) continue;

      const hoursUntilDeadline =
        (task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check overdue
      if (hoursUntilDeadline < 0) {
        const alreadySent = await wasReminderSent(
          task.assignedToId,
          task.id,
          "Task Overdue",
        );
        if (!alreadySent) {
          await createNotification(
            task.assignedToId,
            task.id,
            "task_overdue",
            "Task Overdue",
            `Task "${task.title}" is past its deadline by ${Math.abs(Math.round(hoursUntilDeadline))} hours.`,
          );
          sent++;
        }
        continue;
      }

      // Check reminder windows (6h, 2h)
      for (const windowHours of config.reminderWindowsHours) {
        if (hoursUntilDeadline <= windowHours && hoursUntilDeadline > 0) {
          const titlePrefix = `Deadline in ${windowHours}h`;
          const alreadySent = await wasReminderSent(
            task.assignedToId,
            task.id,
            titlePrefix,
          );
          if (!alreadySent) {
            await createNotification(
              task.assignedToId,
              task.id,
              "task_assigned", // reuse existing type
              `${titlePrefix}: ${task.title}`,
              `Task "${task.title}" deadline is in approximately ${Math.round(hoursUntilDeadline)} hours.`,
            );
            sent++;
          }
        }
      }
    }
  } catch (err) {
    console.error("[reminderEngine] Deadline scan error:", err);
  }
  return sent;
}

/**
 * Scan for long-running tasks with no recent activity.
 */
async function scanLongRunningTasks(): Promise<number> {
  let sent = 0;
  try {
    const thresholdTime = new Date();
    thresholdTime.setHours(
      thresholdTime.getHours() - config.longRunningThresholdHours,
    );

    // Find in_progress tasks where last time entry is older than threshold
    const staleTasks = await db
      .select({
        taskId: tasksTable.id,
        taskTitle: tasksTable.title,
        assignedToId: tasksTable.assignedToId,
        lastActivity: sql<Date>`max(${timeEntriesTable.startTime})`,
      })
      .from(tasksTable)
      .leftJoin(timeEntriesTable, eq(timeEntriesTable.taskId, tasksTable.id))
      .where(
        and(
          eq(tasksTable.status, "in_progress"),
          isNotNull(tasksTable.assignedToId),
        ),
      )
      .groupBy(tasksTable.id, tasksTable.title, tasksTable.assignedToId)
      .having(
        sql`max(${timeEntriesTable.startTime}) < ${thresholdTime} OR max(${timeEntriesTable.startTime}) IS NULL`,
      );

    for (const task of staleTasks) {
      if (!task.assignedToId) continue;

      const titlePrefix = "Long Running Task";
      const alreadySent = await wasReminderSent(
        task.assignedToId,
        task.taskId,
        titlePrefix,
      );

      if (!alreadySent) {
        await createNotification(
          task.assignedToId,
          task.taskId,
          "task_assigned", // reuse existing type
          `${titlePrefix}: ${task.taskTitle}`,
          `Task "${task.taskTitle}" has been in progress with no activity for over ${config.longRunningThresholdHours} hours.`,
        );
        sent++;
      }
    }
  } catch (err) {
    console.error("[reminderEngine] Long-running scan error:", err);
  }
  return sent;
}

/**
 * Run a single scan cycle (deadline + long-running).
 */
export async function runScanCycle(): Promise<{ deadlineReminders: number; longRunningAlerts: number; escalations: number }> {
  try {
    const deadlineReminders = await scanDeadlineReminders();
    const longRunningAlerts = await scanLongRunningTasks();
    const escalations = await scanQcEscalations();

    if (deadlineReminders > 0 || longRunningAlerts > 0 || escalations > 0) {
      console.log(
        `[reminderEngine] Scan complete: ${deadlineReminders} deadline reminders, ${longRunningAlerts} long-running alerts, ${escalations} escalations`,
      );
    }

    return { deadlineReminders, longRunningAlerts, escalations };
  } catch (err) {
    console.error("[reminderEngine] Scan cycle crashed (non-fatal):", err);
    return { deadlineReminders: 0, longRunningAlerts: 0, escalations: 0 };
  }
}

/**
 * Auto-escalation: notify supervisors/managers when tasks are stuck
 * in submitted/under_qc for more than 4 hours.
 */
async function scanQcEscalations(): Promise<number> {
  try {
    const ESCALATION_HOURS = 4;
    const cutoff = new Date(Date.now() - ESCALATION_HOURS * 60 * 60 * 1000);

    const staleTasks = await db
      .select({ id: tasksTable.id, title: tasksTable.title })
      .from(tasksTable)
      .where(
        and(
          inArray(tasksTable.status, ["submitted", "under_qc"]),
          isNotNull(tasksTable.submittedAt),
          lt(tasksTable.submittedAt, cutoff),
        ),
      );

    if (staleTasks.length === 0) return 0;

    const managers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(inArray(usersTable.role, ["site_manager", "supervisor", "engineer"]));

    let count = 0;
    for (const task of staleTasks) {
      for (const mgr of managers) {
        const prefix = `[Escalation] "${task.title}"`;
        const alreadySent = await wasReminderSent(mgr.id, task.id, prefix);
        if (alreadySent) continue;
        await createNotification(
          mgr.id,
          task.id,
          "task_overdue",
          `${prefix} — awaiting QC review`,
          `Task has been waiting for QC review for over ${ESCALATION_HOURS} hours. Immediate action required.`,
        );
        count++;
      }
    }
    return count;
  } catch (err) {
    console.error("[reminderEngine] QC escalation scan error (non-fatal):", err);
    return 0;
  }
}

/**
 * Start the reminder engine (call once at server startup).
 */
export function startReminderEngine(): void {
  if (intervalHandle) {
    console.warn("[reminderEngine] Already running, skipping duplicate start");
    return;
  }

  if (!config.enabled) {
    console.log("[reminderEngine] Disabled via config, not starting");
    return;
  }

  console.log(
    `[reminderEngine] Starting — scan interval: ${config.intervalMs / 1000}s, ` +
    `reminder windows: ${config.reminderWindowsHours.join("h, ")}h, ` +
    `long-running threshold: ${config.longRunningThresholdHours}h`,
  );

  // Run initial scan after a short delay (let server finish starting)
  setTimeout(() => {
    runScanCycle().catch((err) =>
      console.error("[reminderEngine] Initial scan failed:", err),
    );
  }, 10_000);

  // Schedule recurring scans
  intervalHandle = setInterval(() => {
    runScanCycle().catch((err) =>
      console.error("[reminderEngine] Scan cycle failed:", err),
    );
  }, config.intervalMs);
}

/**
 * Stop the reminder engine (for graceful shutdown).
 */
export function stopReminderEngine(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("[reminderEngine] Stopped");
  }
}

/**
 * Update engine configuration at runtime.
 */
export function configureReminderEngine(
  updates: Partial<ReminderConfig>,
): ReminderConfig {
  Object.assign(config, updates);
  return { ...config };
}
