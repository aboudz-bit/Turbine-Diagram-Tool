import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assetsRouter from "./assets";
import tasksRouter from "./tasks";
import timeRouter from "./time";
import qcRouter from "./qc";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assetsRouter);
router.use(tasksRouter);
router.use(timeRouter);
router.use(qcRouter);
router.use(dashboardRouter);

export default router;
