/**
 * Deadline Engine API Route
 *
 * GET /deadline/suggest — compute deadline suggestion for task creation
 */

import { Router, type IRouter } from "express";
import { suggestDeadline } from "../services/deadlineEngine";

const router: IRouter = Router();

router.get("/deadline/suggest", async (req, res) => {
  try {
    const {
      turbineModel,
      sectionName,
      stageNumber,
      priority,
      assetId,
      sectionId,
      stageId,
    } = req.query;

    const suggestion = await suggestDeadline({
      turbineModel: turbineModel as string | undefined,
      sectionName: sectionName as string | undefined,
      stageNumber: stageNumber ? parseInt(stageNumber as string, 10) : undefined,
      priority: priority as string | undefined,
      assetId: assetId ? parseInt(assetId as string, 10) : undefined,
      sectionId: sectionId ? parseInt(sectionId as string, 10) : undefined,
      stageId: stageId ? parseInt(stageId as string, 10) : undefined,
    });

    res.json(suggestion);
  } catch (err) {
    req.log.error({ err }, "Failed to compute deadline suggestion");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
