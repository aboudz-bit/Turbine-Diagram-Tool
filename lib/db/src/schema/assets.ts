import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  model: text("model").notNull().default("SGT-9000HL"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assetSectionsTable = pgTable("asset_sections", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assetsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
});

export const assetStagesTable = pgTable("asset_stages", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => assetSectionsTable.id),
  name: text("name").notNull(),
  stageNumber: integer("stage_number").notNull(),
  bladeCountMin: integer("blade_count_min"),
  bladeCountMax: integer("blade_count_max"),
});

export const assetComponentsTable = pgTable("asset_components", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull().references(() => assetStagesTable.id),
  name: text("name").notNull(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true });
export const insertSectionSchema = createInsertSchema(assetSectionsTable).omit({ id: true });
export const insertStageSchema = createInsertSchema(assetStagesTable).omit({ id: true });
export const insertComponentSchema = createInsertSchema(assetComponentsTable).omit({ id: true });

export type Asset = typeof assetsTable.$inferSelect;
export type AssetSection = typeof assetSectionsTable.$inferSelect;
export type AssetStage = typeof assetStagesTable.$inferSelect;
export type AssetComponent = typeof assetComponentsTable.$inferSelect;
