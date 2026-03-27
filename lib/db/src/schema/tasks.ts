import { pgTable, serial, text, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { assetsTable, assetSectionsTable, assetStagesTable, assetComponentsTable } from "./assets";

export const taskStatusEnum = pgEnum("task_status", [
  "draft",
  "assigned",
  "in_progress",
  "paused",
  "submitted",
  "under_qc",
  "approved",
  "rejected",
  "revision_needed",
  "overdue",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "high",
  "medium",
  "low",
]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assetId: integer("asset_id").references(() => assetsTable.id),
  sectionId: integer("section_id").references(() => assetSectionsTable.id),
  stageId: integer("stage_id").references(() => assetStagesTable.id),
  componentId: integer("component_id").references(() => assetComponentsTable.id),
  assignedToId: integer("assigned_to_id").references(() => usersTable.id),
  createdById: integer("created_by_id").references(() => usersTable.id),
  estimatedHours: numeric("estimated_hours", { precision: 5, scale: 2 }),
  deadline: timestamp("deadline"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("draft"),
  startedAt: timestamp("started_at"),
  submittedAt: timestamp("submitted_at"),
  completedAt: timestamp("completed_at"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  pauseReason: text("pause_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qcReviewsTable = pgTable("qc_reviews", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  reviewerId: integer("reviewer_id").notNull().references(() => usersTable.id),
  decision: text("decision").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true, createdAt: true, updatedAt: true, startedAt: true, submittedAt: true, completedAt: true
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
