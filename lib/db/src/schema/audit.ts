import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { tasksTable } from "./tasks";

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasksTable.id),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: integer("actor_id").references(() => usersTable.id),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
