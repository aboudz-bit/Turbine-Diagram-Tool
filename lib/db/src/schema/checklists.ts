/**
 * Advanced Checklist Engine — DB Schema
 *
 * task_checklists: one checklist per task (linked to template)
 * checklist_items: individual items with type support (boolean, numeric, text)
 */

import { pgTable, serial, text, integer, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tasksTable } from "./tasks";

export const checklistItemTypeEnum = pgEnum("checklist_item_type", [
  "boolean",
  "numeric",
  "text",
]);

export const taskChecklistsTable = pgTable("task_checklists", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasksTable.id),
  templateId: text("template_id"), // reference to turbineTemplates.id
  title: text("title").notNull(),
  totalItems: integer("total_items").notNull().default(0),
  completedItems: integer("completed_items").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const checklistItemsTable = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id")
    .notNull()
    .references(() => taskChecklistsTable.id),
  sortOrder: integer("sort_order").notNull().default(0),
  label: text("label").notNull(),
  itemType: checklistItemTypeEnum("item_type").notNull().default("boolean"),
  isRequired: boolean("is_required").notNull().default(true),

  // Value fields — one per type
  booleanValue: boolean("boolean_value"),
  numericValue: numeric("numeric_value", { precision: 10, scale: 4 }),
  textValue: text("text_value"),

  // Numeric constraints (for numeric items)
  numericUnit: text("numeric_unit"),           // e.g., "mm", "°C"
  numericMin: numeric("numeric_min", { precision: 10, scale: 4 }),
  numericMax: numeric("numeric_max", { precision: 10, scale: 4 }),

  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedByUserId: integer("completed_by_user_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TaskChecklist = typeof taskChecklistsTable.$inferSelect;
export type ChecklistItem = typeof checklistItemsTable.$inferSelect;
