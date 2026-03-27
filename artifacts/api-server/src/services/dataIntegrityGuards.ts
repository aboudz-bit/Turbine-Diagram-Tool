/**
 * Data Integrity Guards
 *
 * Centralized validation rules to prevent invalid state transitions:
 * - Prevent submit if: active timer running, checklist incomplete, no technician signature
 * - Prevent approve if: no supervisor signature
 * - Prevent delete of critical records
 */

import { db } from "@workspace/db";
import {
  tasksTable,
  timeEntriesTable,
  signaturesTable,
} from "@workspace/db";
import { taskChecklistsTable, checklistItemsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

export interface IntegrityCheckResult {
  allowed: boolean;
  violations: string[];
}

/**
 * Check if a task can be submitted for QC review.
 */
export async function canSubmitTask(taskId: number): Promise<IntegrityCheckResult> {
  const violations: string[] = [];

  try {
    // 1. Check for active (running) time entries
    const activeEntries = await db
      .select({ id: timeEntriesTable.id })
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.taskId, taskId),
          isNull(timeEntriesTable.endTime),
        ),
      )
      .limit(1);

    if (activeEntries.length > 0) {
      violations.push(
        "Cannot submit: a work session is still running. Please stop or pause the timer first.",
      );
    }

    // 2. Check for technician signature
    const techSigs = await db
      .select({ id: signaturesTable.id })
      .from(signaturesTable)
      .where(
        and(
          eq(signaturesTable.taskId, taskId),
          eq(signaturesTable.signatureType, "technician_completion"),
        ),
      )
      .limit(1);

    if (techSigs.length === 0) {
      violations.push(
        "Technician completion signature required before submitting for QC review.",
      );
    }

    // 3. Check for incomplete required checklist items
    const checklists = await db
      .select({ id: taskChecklistsTable.id })
      .from(taskChecklistsTable)
      .where(eq(taskChecklistsTable.taskId, taskId));

    if (checklists.length > 0) {
      for (const checklist of checklists) {
        const incompleteRequired = await db
          .select({ id: checklistItemsTable.id })
          .from(checklistItemsTable)
          .where(
            and(
              eq(checklistItemsTable.checklistId, checklist.id),
              eq(checklistItemsTable.isRequired, true),
              eq(checklistItemsTable.isCompleted, false),
            ),
          )
          .limit(1);

        if (incompleteRequired.length > 0) {
          violations.push(
            "All required checklist items must be completed before submission.",
          );
          break; // one violation is enough
        }
      }
    }
  } catch (err) {
    console.error("[dataIntegrityGuards] canSubmitTask error:", err);
    violations.push("Internal error during integrity check.");
  }

  return { allowed: violations.length === 0, violations };
}

/**
 * Check if a task can be approved by QC.
 */
export async function canApproveTask(taskId: number): Promise<IntegrityCheckResult> {
  const violations: string[] = [];

  try {
    // 1. Check for supervisor QC signature
    const supervisorSigs = await db
      .select({ id: signaturesTable.id })
      .from(signaturesTable)
      .where(
        and(
          eq(signaturesTable.taskId, taskId),
          eq(signaturesTable.signatureType, "supervisor_qc_approval"),
        ),
      )
      .limit(1);

    if (supervisorSigs.length === 0) {
      violations.push(
        "Supervisor QC approval signature is required before approving the task.",
      );
    }

    // 2. Verify all required checklists are complete
    const checklists = await db
      .select({ id: taskChecklistsTable.id })
      .from(taskChecklistsTable)
      .where(eq(taskChecklistsTable.taskId, taskId));

    for (const checklist of checklists) {
      const incompleteRequired = await db
        .select({ id: checklistItemsTable.id })
        .from(checklistItemsTable)
        .where(
          and(
            eq(checklistItemsTable.checklistId, checklist.id),
            eq(checklistItemsTable.isRequired, true),
            eq(checklistItemsTable.isCompleted, false),
          ),
        )
        .limit(1);

      if (incompleteRequired.length > 0) {
        violations.push(
          "All required checklist items must be completed before QC approval.",
        );
        break;
      }
    }
  } catch (err) {
    console.error("[dataIntegrityGuards] canApproveTask error:", err);
    violations.push("Internal error during integrity check.");
  }

  return { allowed: violations.length === 0, violations };
}

/**
 * Check if a record can be deleted.
 * Critical records (approved tasks, audit logs, signatures) cannot be deleted.
 */
export function canDeleteRecord(
  entityType: string,
  entityData: Record<string, unknown>,
): IntegrityCheckResult {
  const violations: string[] = [];

  switch (entityType) {
    case "task":
      if (entityData.status === "approved") {
        violations.push("Approved tasks cannot be deleted.");
      }
      if (entityData.status === "submitted" || entityData.status === "under_qc") {
        violations.push("Tasks under review cannot be deleted.");
      }
      break;

    case "audit_log":
      violations.push("Audit log entries cannot be deleted — they are immutable records.");
      break;

    case "signature":
      violations.push("Signatures are legally binding records and cannot be deleted.");
      break;

    case "attachment":
      // Attachments on approved tasks can't be deleted
      if (entityData.taskStatus === "approved") {
        violations.push("Attachments on approved tasks cannot be deleted.");
      }
      break;

    default:
      break;
  }

  return { allowed: violations.length === 0, violations };
}
