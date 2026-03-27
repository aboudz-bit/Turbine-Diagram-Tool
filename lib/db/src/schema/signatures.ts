import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { tasksTable } from "./tasks";

export const signatureTypeEnum = pgEnum("signature_type", [
  "technician_completion",
  "supervisor_qc_approval",
]);

export const signaturesTable = pgTable("signatures", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  signatureType: signatureTypeEnum("signature_type").notNull(),
  signatureData: text("signature_data").notNull(),
  signerName: text("signer_name").notNull(),
  signerRole: text("signer_role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Signature = typeof signaturesTable.$inferSelect;
