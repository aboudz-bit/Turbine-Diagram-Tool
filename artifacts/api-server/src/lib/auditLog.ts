import { db } from "@workspace/db";
import { auditLogTable } from "@workspace/db";

const ACTION_LABELS: Record<string, string> = {
  task_created: "Task created",
  task_assigned: "Task assigned",
  task_started: "Work session started",
  task_paused: "Work paused",
  task_resumed: "Work resumed",
  task_stopped: "Work session completed",
  task_submitted: "Submitted for QC",
  task_approved: "QC approved",
  task_rejected: "QC rejected",
  task_revision_needed: "Revision requested",
  signature_saved: "Signature recorded",
  attachment_uploaded: "Attachment uploaded",
  attachment_deleted: "Attachment deleted",
  notification_created: "Notification sent",
  // Enterprise upgrade actions
  checklist_created: "Checklist created",
  checklist_item_updated: "Checklist item updated",
  deadline_suggested: "Deadline suggested",
  qr_scanned: "QR code scanned",
  reminder_sent: "Reminder sent",
  integrity_check: "Integrity check performed",
};

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

export async function logAuditEvent(params: {
  taskId?: number;
  actorId?: number;
  action: string;
  entityType: string;
  entityId: number;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      taskId: params.taskId ?? null,
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.details ? JSON.stringify(params.details) : null,
    });
  } catch (err) {
    console.error("[auditLog] Failed to write audit event:", err);
  }
}
