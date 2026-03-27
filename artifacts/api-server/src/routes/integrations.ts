/**
 * Integration Health Check Routes
 *
 * GET /integrations/health — status of all external integrations
 */

import { Router, type IRouter } from "express";
import { checkSapHealth } from "../integrations/sapConnector";
import { checkIotHealth } from "../integrations/iotSensorHub";
import { checkPredictiveHealth } from "../integrations/predictiveMaintenance";
import { requirePermission } from "../services/permissionMatrix";

const router: IRouter = Router();

/**
 * Return health status of all integration connectors.
 */
router.get(
  "/integrations/health",
  requirePermission("system:configure"),
  async (req, res) => {
    try {
      const [sap, iot, predictive] = await Promise.all([
        checkSapHealth(),
        checkIotHealth(),
        checkPredictiveHealth(),
      ]);

      res.json({
        sap,
        iot,
        predictive,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      req.log.error({ err }, "Failed to check integration health");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
