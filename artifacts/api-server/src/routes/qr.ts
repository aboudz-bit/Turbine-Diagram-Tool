/**
 * QR Code / Asset Scanning Routes
 *
 * GET /qr/:qrId         — resolve a QR code to its asset context
 * GET /qr/manifest      — generate QR manifest for all assets
 */

import { Router, type IRouter } from "express";
import { resolveQrCode, generateQrManifest } from "../services/qrService";
import { requirePermission } from "../services/permissionMatrix";

const router: IRouter = Router();

/**
 * Resolve a QR code ID to its asset context + open tasks.
 * QR ID format: "asset:1", "section:3", "stage:5", "component:12"
 */
router.get("/qr/manifest", requirePermission("qr:generate"), async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const manifest = await generateQrManifest(baseUrl);
    res.json({ items: manifest, count: manifest.length });
  } catch (err) {
    req.log.error({ err }, "Failed to generate QR manifest");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/qr/:qrId", async (req, res) => {
  try {
    const qrId = req.params.qrId as string;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const result = await resolveQrCode(qrId, baseUrl);

    if (!result) {
      res.status(404).json({ error: "QR code not found or invalid format. Expected: asset:1, section:3, etc." });
      return;
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to resolve QR code");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
