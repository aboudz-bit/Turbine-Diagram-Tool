import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import authRouter from "./auth";
import healthRouter from "./health";
import assetsRouter from "./assets";
import tasksRouter from "./tasks";
import timeRouter from "./time";
import qcRouter from "./qc";
import dashboardRouter from "./dashboard";
import signaturesRouter from "./signatures";
import notificationsRouter from "./notifications";
import attachmentsRouter from "./attachments";
import auditRouter from "./audit";
import storageRouter from "./storage";
// Enterprise upgrade routes
import deadlineRouter from "./deadline";
import qrRouter from "./qr";
import checklistsRouter from "./checklists";
import analyticsRouter from "./analytics";
import permissionsRouter from "./permissions";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use(authRouter);

// Protected routes (auth required)
router.use(requireAuth);
router.use(assetsRouter);
router.use(tasksRouter);
router.use(timeRouter);
router.use(qcRouter);
router.use(dashboardRouter);
router.use(signaturesRouter);
router.use(notificationsRouter);
router.use(attachmentsRouter);
router.use(auditRouter);
router.use(storageRouter);
// Enterprise upgrade routes
router.use(deadlineRouter);
router.use(qrRouter);
router.use(checklistsRouter);
router.use(analyticsRouter);
router.use(permissionsRouter);
router.use(integrationsRouter);

export default router;
