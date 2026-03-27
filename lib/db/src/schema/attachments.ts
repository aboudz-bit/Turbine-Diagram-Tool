import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { tasksTable } from "./tasks";
import { usersTable } from "./users";

export const attachmentsTable = pgTable("attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  uploadedByUserId: integer("uploaded_by_user_id").notNull().references(() => usersTable.id),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storageUrl: text("storage_url").notNull(),
  attachmentType: text("attachment_type").notNull().default("file"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Attachment = typeof attachmentsTable.$inferSelect;
