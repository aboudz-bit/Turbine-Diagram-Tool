import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { signaturesTable, tasksTable, auditLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tasks/:taskId/signatures", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const signatures = await db
      .select()
      .from(signaturesTable)
      .where(eq(signaturesTable.taskId, taskId))
      .orderBy(signaturesTable.createdAt);

    res.json(
      signatures.map((s) => ({
        id: s.id,
        taskId: s.taskId,
        userId: s.userId,
        signatureType: s.signatureType,
        signerName: s.signerName,
        signerRole: s.signerRole,
        createdAt: s.createdAt,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get task signatures");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks/:taskId/signatures", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const { signatureType, signatureData } = req.body as {
      signatureType: string;
      signatureData: string;
    };
    const userId = req.user!.id;
    const signerName = req.user!.name;
    const signerRole = req.user!.role;

    if (!signatureType || !signatureData) {
      res.status(400).json({ error: "signatureType and signatureData are required" });
      return;
    }

    if (!["technician_completion", "supervisor_qc_approval"].includes(signatureType)) {
      res.status(400).json({ error: "Invalid signatureType" });
      return;
    }

    // Validate task exists and is not approved
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.status === "approved") {
      res.status(403).json({ error: "Cannot add signatures to an approved task" });
      return;
    }

    // Role enforcement for supervisor_qc_approval
    if (signatureType === "supervisor_qc_approval") {
      const allowed = ["engineer", "supervisor", "site_manager"];
      if (!allowed.includes(req.user!.role)) {
        res.status(403).json({ error: "Only engineers, supervisors, or site managers can add QC approval signatures" });
        return;
      }
    }

    // Replace existing signature of same type for this task
    await db
      .delete(signaturesTable)
      .where(
        and(
          eq(signaturesTable.taskId, taskId),
          eq(signaturesTable.signatureType, signatureType as "technician_completion" | "supervisor_qc_approval"),
        ),
      );

    const [signature] = await db
      .insert(signaturesTable)
      .values({
        taskId,
        userId,
        signatureType: signatureType as "technician_completion" | "supervisor_qc_approval",
        signatureData,
        signerName,
        signerRole,
      })
      .returning();

    // Audit log
    await db.insert(auditLogTable).values({
      entityType: "signature",
      entityId: signature.id,
      action: "signature_added",
      actorId: userId,
      metadata: JSON.stringify({ taskId, signatureType, signerName, signerRole }),
    }).catch(() => {});

    res.status(201).json({
      id: signature.id,
      taskId: signature.taskId,
      userId: signature.userId,
      signatureType: signature.signatureType,
      signerName: signature.signerName,
      signerRole: signature.signerRole,
      createdAt: signature.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save signature");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
