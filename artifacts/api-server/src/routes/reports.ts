/**
 * PDF / HTML Report Generation
 *
 * GET /tasks/:taskId/report — generate a full QC report (HTML, printable as PDF)
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  usersTable,
  timeEntriesTable,
  signaturesTable,
  auditLogTable,
  attachmentsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tasks/:taskId/report", async (req, res): Promise<void> => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);

    // Fetch task with relations
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    // Fetch related data in parallel
    const [assignee, creator, timeEntries, signatures, auditEntries, attachments] = await Promise.all([
      task.assignedToId
        ? db.select().from(usersTable).where(eq(usersTable.id, task.assignedToId)).then(r => r[0])
        : Promise.resolve(null),
      task.createdById
        ? db.select().from(usersTable).where(eq(usersTable.id, task.createdById)).then(r => r[0])
        : Promise.resolve(null),
      db.select().from(timeEntriesTable).where(eq(timeEntriesTable.taskId, taskId)),
      db.select().from(signaturesTable).where(eq(signaturesTable.taskId, taskId)),
      db.select().from(auditLogTable).where(eq(auditLogTable.taskId, taskId)),
      db.select().from(attachmentsTable).where(eq(attachmentsTable.taskId, taskId)),
    ]);

    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const techSig = signatures.find(s => s.signatureType === "technician_completion");
    const supSig = signatures.find(s => s.signatureType === "supervisor_qc_approval");

    const statusLabel = (task.status ?? "").replace(/_/g, " ").toUpperCase();
    const priorityColor = task.priority === "high" ? "#dc2626" : task.priority === "medium" ? "#d97706" : "#2563eb";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>QC Report — Task #${taskId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 13px; }
  @media print { body { padding: 20px; } .no-print { display: none !important; } }
  .header { border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header h1 { font-size: 22px; color: #1e40af; }
  .header .meta { text-align: right; font-size: 11px; color: #6b7280; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
  .status-approved { background: #d1fae5; color: #065f46; }
  .status-rejected { background: #fee2e2; color: #991b1b; }
  .status-default { background: #e0e7ff; color: #3730a3; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; display: block; }
  .field value { font-size: 13px; display: block; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 10px; border: 1px solid #e5e7eb; font-size: 12px; }
  th { background: #f9fafb; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
  .sig-box { border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; margin-top: 6px; background: #f9fafb; }
  .sig-name { font-weight: 600; font-size: 13px; }
  .sig-meta { font-size: 11px; color: #6b7280; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  .print-btn { position: fixed; top: 16px; right: 16px; padding: 8px 20px; background: #1e40af; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .print-btn:hover { background: #1e3a8a; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

<div class="header">
  <div>
    <h1>QC Inspection Report</h1>
    <p style="color:#6b7280; margin-top:4px;">Task #TSK-${String(taskId).padStart(4, "0")}</p>
  </div>
  <div class="meta">
    <span class="badge ${task.status === "approved" ? "status-approved" : task.status === "rejected" ? "status-rejected" : "status-default"}">${statusLabel}</span>
    <br><br>
    Generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
  </div>
</div>

<div class="section">
  <h2>Task Details</h2>
  <div class="grid">
    <div class="field"><label>Title</label><value>${escapeHtml(task.title)}</value></div>
    <div class="field"><label>Priority</label><value style="color:${priorityColor}; font-weight:700">${(task.priority ?? "medium").toUpperCase()}</value></div>
    <div class="field"><label>Assigned To</label><value>${escapeHtml(assignee?.name ?? "Unassigned")}</value></div>
    <div class="field"><label>Created By</label><value>${escapeHtml(creator?.name ?? "Unknown")}</value></div>
    <div class="field"><label>Estimated Hours</label><value>${task.estimatedHours ?? "—"}</value></div>
    <div class="field"><label>Total Logged Hours</label><value>${totalHours}h</value></div>
    <div class="field"><label>Deadline</label><value>${task.deadline ? new Date(task.deadline).toLocaleDateString("en-US", { dateStyle: "long" }) : "—"}</value></div>
    <div class="field"><label>Completed At</label><value>${task.completedAt ? new Date(task.completedAt).toLocaleDateString("en-US", { dateStyle: "long" }) : "—"}</value></div>
  </div>
  ${task.description ? `<div style="margin-top:12px"><label style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af">Description</label><p style="margin-top:4px;line-height:1.6;color:#374151">${escapeHtml(task.description)}</p></div>` : ""}
</div>

<div class="section">
  <h2>Time Log</h2>
  ${timeEntries.length > 0 ? `
  <table>
    <thead><tr><th>Start</th><th>End</th><th>Duration</th><th>Note</th></tr></thead>
    <tbody>
    ${timeEntries.map(e => `<tr>
      <td>${e.startTime ? new Date(e.startTime).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
      <td>${e.endTime ? new Date(e.endTime).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "Ongoing"}</td>
      <td>${e.duration ? `${e.duration} min` : "—"}</td>
      <td>${escapeHtml(e.pauseReason ?? "")}</td>
    </tr>`).join("")}
    </tbody>
  </table>` : "<p style='color:#9ca3af'>No time entries recorded.</p>"}
</div>

<div class="section">
  <h2>Attachments</h2>
  ${attachments.length > 0 ? `
  <table>
    <thead><tr><th>File</th><th>Type</th><th>Size</th></tr></thead>
    <tbody>
    ${attachments.map(a => `<tr>
      <td>${escapeHtml(a.fileName)}</td>
      <td>${escapeHtml(a.mimeType)}</td>
      <td>${a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} KB` : "—"}</td>
    </tr>`).join("")}
    </tbody>
  </table>` : "<p style='color:#9ca3af'>No attachments.</p>"}
</div>

<div class="section">
  <h2>Electronic Signatures</h2>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
    <div>
      <label style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af">Technician Completion</label>
      ${techSig ? `<div class="sig-box">
        <div class="sig-name">${escapeHtml(techSig.signerName ?? "")}</div>
        <div class="sig-meta">${escapeHtml((techSig.signerRole ?? "").replace(/_/g, " ").toUpperCase())} &mdash; ${new Date(techSig.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
      </div>` : `<div class="sig-box" style="color:#9ca3af">Not signed</div>`}
    </div>
    <div>
      <label style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af">Supervisor QC Approval</label>
      ${supSig ? `<div class="sig-box">
        <div class="sig-name">${escapeHtml(supSig.signerName ?? "")}</div>
        <div class="sig-meta">${escapeHtml((supSig.signerRole ?? "").replace(/_/g, " ").toUpperCase())} &mdash; ${new Date(supSig.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
      </div>` : `<div class="sig-box" style="color:#9ca3af">Not signed</div>`}
    </div>
  </div>
</div>

<div class="section">
  <h2>Audit Trail</h2>
  <table>
    <thead><tr><th>Action</th><th>Actor</th><th>Timestamp</th></tr></thead>
    <tbody>
    ${auditEntries.slice(0, 30).map(a => `<tr>
      <td>${escapeHtml((a.action ?? "").replace(/_/g, " "))}</td>
      <td>${escapeHtml(String(a.actorId ?? ""))}</td>
      <td>${new Date(a.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</td>
    </tr>`).join("")}
    </tbody>
  </table>
</div>

<div class="footer">
  Turbine QC System &mdash; Generated automatically &mdash; Confidential
</div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    req.log.error({ err }, "Failed to generate report");
    res.status(500).json({ error: "Internal server error" });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default router;
