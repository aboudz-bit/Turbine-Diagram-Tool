import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/assets", async (req, res) => {
  try {
    const assets = await db.select().from(assetsTable);
    res.json(assets);
  } catch (err) {
    req.log.error({ err }, "Failed to list assets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assets/:assetId/sections", async (req, res) => {
  try {
    const assetId = parseInt(req.params.assetId, 10);
    const sections = await db
      .select()
      .from(assetSectionsTable)
      .where(eq(assetSectionsTable.assetId, assetId))
      .orderBy(assetSectionsTable.order);
    res.json(sections);
  } catch (err) {
    req.log.error({ err }, "Failed to list sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sections/:sectionId/stages", async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId, 10);
    const stages = await db
      .select()
      .from(assetStagesTable)
      .where(eq(assetStagesTable.sectionId, sectionId))
      .orderBy(assetStagesTable.stageNumber);
    res.json(stages);
  } catch (err) {
    req.log.error({ err }, "Failed to list stages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stages/:stageId/components", async (req, res) => {
  try {
    const stageId = parseInt(req.params.stageId, 10);
    const components = await db
      .select()
      .from(assetComponentsTable)
      .where(eq(assetComponentsTable.stageId, stageId));
    res.json(components);
  } catch (err) {
    req.log.error({ err }, "Failed to list components");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
