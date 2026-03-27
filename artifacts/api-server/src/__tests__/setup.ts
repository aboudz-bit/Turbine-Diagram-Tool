import { db, pool } from "@workspace/db";
import {
  usersTable,
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
  tasksTable,
  timeEntriesTable,
  qcReviewsTable,
  signaturesTable,
  notificationsTable,
  auditLogTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { signToken, type AuthUser } from "../middleware/auth";

// Seed data IDs
export const TEST_ENGINEER: AuthUser = {
  id: 0, // will be set after insert
  name: "Test Engineer",
  email: "engineer@test.com",
  role: "engineer",
};

export const TEST_TECHNICIAN: AuthUser = {
  id: 0,
  name: "Test Technician",
  email: "tech@test.com",
  role: "technician",
};

export const TEST_SUPERVISOR: AuthUser = {
  id: 0,
  name: "Test Supervisor",
  email: "supervisor@test.com",
  role: "supervisor",
};

let seeded = false;
let assetId = 0;
let sectionId = 0;
let stageId = 0;
let componentId = 0;

export function getAssetId() { return assetId; }
export function getSectionId() { return sectionId; }
export function getStageId() { return stageId; }
export function getComponentId() { return componentId; }

export async function seedTestData() {
  if (seeded) return;

  // Clean in reverse dependency order (audit_log before users to avoid FK violation)
  await db.delete(auditLogTable);
  await db.delete(notificationsTable);
  await db.delete(signaturesTable);
  await db.delete(qcReviewsTable);
  await db.delete(timeEntriesTable);
  await db.delete(tasksTable);
  await db.delete(assetComponentsTable);
  await db.delete(assetStagesTable);
  await db.delete(assetSectionsTable);
  await db.delete(assetsTable);
  await db.delete(usersTable);

  // Seed users
  const [eng] = await db
    .insert(usersTable)
    .values({ name: TEST_ENGINEER.name, email: TEST_ENGINEER.email, role: TEST_ENGINEER.role as "engineer" })
    .returning();
  TEST_ENGINEER.id = eng.id;

  const [tech] = await db
    .insert(usersTable)
    .values({ name: TEST_TECHNICIAN.name, email: TEST_TECHNICIAN.email, role: TEST_TECHNICIAN.role as "technician" })
    .returning();
  TEST_TECHNICIAN.id = tech.id;

  const [sup] = await db
    .insert(usersTable)
    .values({ name: TEST_SUPERVISOR.name, email: TEST_SUPERVISOR.email, role: TEST_SUPERVISOR.role as "supervisor" })
    .returning();
  TEST_SUPERVISOR.id = sup.id;

  // Seed asset hierarchy
  const [asset] = await db
    .insert(assetsTable)
    .values({ name: "Test Turbine", model: "SGT-TEST" })
    .returning();
  assetId = asset.id;

  const [section] = await db
    .insert(assetSectionsTable)
    .values({ assetId: asset.id, name: "Compressor", order: 1 })
    .returning();
  sectionId = section.id;

  const [stage] = await db
    .insert(assetStagesTable)
    .values({ sectionId: section.id, name: "Stage 1", stageNumber: 1 })
    .returning();
  stageId = stage.id;

  const [component] = await db
    .insert(assetComponentsTable)
    .values({ stageId: stage.id, name: "Blade Set" })
    .returning();
  componentId = component.id;

  seeded = true;
}

export async function cleanupTestData() {
  await db.delete(notificationsTable);
  await db.delete(signaturesTable);
  await db.delete(qcReviewsTable);
  await db.delete(timeEntriesTable);
  await db.delete(tasksTable);
  seeded = false;
}

export async function closePool() {
  await pool.end();
}

export function authHeader(user: AuthUser): string {
  return `Bearer ${signToken(user)}`;
}

/** Insert a technician_completion signature directly for a task (bypasses the API for test setup). */
export async function insertTechSignature(taskId: number): Promise<void> {
  await db.delete(signaturesTable).where(
    and(
      eq(signaturesTable.taskId, taskId),
      eq(signaturesTable.signatureType, "technician_completion"),
    ),
  );
  await db.insert(signaturesTable).values({
    taskId,
    userId: TEST_TECHNICIAN.id,
    signatureType: "technician_completion",
    signatureData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    signerName: TEST_TECHNICIAN.name,
    signerRole: "technician",
  });
}

/** Insert a supervisor_qc_approval signature directly for a task (bypasses the API for test setup). */
export async function insertSupSignature(taskId: number): Promise<void> {
  await db.delete(signaturesTable).where(
    and(
      eq(signaturesTable.taskId, taskId),
      eq(signaturesTable.signatureType, "supervisor_qc_approval"),
    ),
  );
  await db.insert(signaturesTable).values({
    taskId,
    userId: TEST_SUPERVISOR.id,
    signatureType: "supervisor_qc_approval",
    signatureData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    signerName: TEST_SUPERVISOR.name,
    signerRole: "supervisor",
  });
}
