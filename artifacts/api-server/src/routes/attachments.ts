import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { attachmentsTable, tasksTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logAuditEvent } from "../lib/auditLog";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const router: IRouter = Router();

// List attachments for a task
router.get("/tasks/:taskId/attachments", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);

    const [task] = await db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    const rows = await db
      .select({
        id: attachmentsTable.id,
        taskId: attachmentsTable.taskId,
        uploadedByUserId: attachmentsTable.uploadedByUserId,
        uploaderName: usersTable.name,
        fileName: attachmentsTable.fileName,
        mimeType: attachmentsTable.mimeType,
        fileSize: attachmentsTable.fileSize,
        storageUrl: attachmentsTable.storageUrl,
        attachmentType: attachmentsTable.attachmentType,
        createdAt: attachmentsTable.createdAt,
      })
      .from(attachmentsTable)
      .leftJoin(usersTable, eq(attachmentsTable.uploadedByUserId, usersTable.id))
      .where(eq(attachmentsTable.taskId, taskId))
      .orderBy(attachmentsTable.createdAt);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list attachments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save attachment metadata after client uploads file to GCS
router.post("/tasks/:taskId/attachments", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const userId = req.user!.id;

    const { fileName, mimeType, fileSize, storageUrl } = req.body as {
      fileName: string;
      mimeType: string;
      fileSize: number;
      storageUrl: string;
    };

    if (!fileName || !mimeType || !storageUrl) {
      res.status(400).json({ error: "fileName, mimeType, and storageUrl are required" });
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      res.status(400).json({ error: `File type '${mimeType}' is not allowed. Use images or PDF/document files.` });
      return;
    }

    if (fileSize > MAX_FILE_SIZE) {
      res.status(400).json({ error: "File is too large. Maximum size is 20 MB." });
      return;
    }

    // Verify task exists and is not locked
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    if (task.status === "approved") { res.status(400).json({ error: "Cannot add attachments to an approved task." }); return; }

    const attachmentType = mimeType.startsWith("image/") ? "image" : "file";

    const [att] = await db
      .insert(attachmentsTable)
      .values({ taskId, uploadedByUserId: userId, fileName, mimeType, fileSize: fileSize ?? 0, storageUrl, attachmentType })
      .returning();

    const [uploader] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));

    await logAuditEvent({
      taskId,
      actorId: userId,
      action: "attachment_uploaded",
      entityType: "attachment",
      entityId: att.id,
      details: { fileName, mimeType, fileSize },
    }).catch(() => {});

    res.status(201).json({
      id: att.id,
      taskId: att.taskId,
      uploadedByUserId: att.uploadedByUserId,
      uploaderName: uploader?.name ?? "Unknown",
      fileName: att.fileName,
      mimeType: att.mimeType,
      fileSize: att.fileSize,
      storageUrl: att.storageUrl,
      attachmentType: att.attachmentType,
      createdAt: att.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save attachment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete attachment — uploader or supervisor/engineer/site_manager
router.delete("/tasks/:taskId/attachments/:attachmentId", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);
    const attachmentId = parseInt(req.params.attachmentId as string, 10);
    const user = req.user!;

    const [att] = await db
      .select()
      .from(attachmentsTable)
      .where(and(eq(attachmentsTable.id, attachmentId), eq(attachmentsTable.taskId, taskId)));

    if (!att) { res.status(404).json({ error: "Attachment not found" }); return; }

    const canDelete =
      att.uploadedByUserId === user.id ||
      ["engineer", "supervisor", "site_manager"].includes(user.role);

    if (!canDelete) {
      res.status(403).json({ error: "You do not have permission to delete this attachment." });
      return;
    }

    await db.delete(attachmentsTable).where(eq(attachmentsTable.id, attachmentId));

    await logAuditEvent({
      taskId,
      actorId: user.id,
      action: "attachment_deleted",
      entityType: "attachment",
      entityId: attachmentId,
      details: { fileName: att.fileName },
    }).catch(() => {});

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete attachment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
