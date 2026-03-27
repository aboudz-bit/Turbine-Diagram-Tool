import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import {
  seedTestData,
  cleanupTestData,
  closePool,
  authHeader,
  insertTechSignature,
  TEST_ENGINEER,
  TEST_TECHNICIAN,
  TEST_SUPERVISOR,
  getAssetId,
  getSectionId,
} from "./setup";

const VALID_SIG_DATA =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("Signatures API", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();
    await seedTestData();
  });

  afterAll(async () => {
    await closePool();
  });

  const engAuth = () => authHeader(TEST_ENGINEER);
  const techAuth = () => authHeader(TEST_TECHNICIAN);
  const supAuth = () => authHeader(TEST_SUPERVISOR);

  async function createTask(): Promise<number> {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", engAuth())
      .send({
        title: "Sig Test Task",
        assetId: getAssetId(),
        sectionId: getSectionId(),
        priority: "medium",
        assignedToId: TEST_TECHNICIAN.id,
      });
    return res.body.id;
  }

  // ── Role enforcement ─────────────────────────────────────────────────────

  describe("Role: POST /api/tasks (create task)", () => {
    it("should create task as engineer → 201", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", engAuth())
        .send({
          title: "Engineer Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "high",
        });
      expect(res.status).toBe(201);
    });

    it("should reject task creation as technician → 403", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", techAuth())
        .send({
          title: "Tech Attempt",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "low",
        });
      expect(res.status).toBe(403);
    });
  });

  // ── Signature gate on submit ──────────────────────────────────────────────

  describe("Signature gate: submit without technician signature → 400", () => {
    it("should reject status:submitted without tech signature", async () => {
      const taskId = await createTask();

      // in_progress (no signature)
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth())
        .send({ status: "in_progress", version: 1 });

      // Try to submit — no signature present
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth())
        .send({ status: "submitted", version: 2 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("signature required");
    });

    it("should allow status:submitted when tech signature is present", async () => {
      const taskId = await createTask();

      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth())
        .send({ status: "in_progress", version: 1 });

      await insertTechSignature(taskId);

      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth())
        .send({ status: "submitted", version: 2 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("submitted");
    });
  });

  // ── Signature API ─────────────────────────────────────────────────────────

  describe("POST /api/tasks/:taskId/signatures", () => {
    it("should save a technician_completion signature", async () => {
      const taskId = await createTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/signatures`)
        .set("Authorization", techAuth())
        .send({
          signatureType: "technician_completion",
          signatureData: VALID_SIG_DATA,
        });

      expect(res.status).toBe(201);
      expect(res.body.signatureType).toBe("technician_completion");
      expect(res.body.signerName).toBe(TEST_TECHNICIAN.name);
      expect(res.body.signerRole).toBe("technician");
    });

    it("should save a supervisor_qc_approval signature", async () => {
      const taskId = await createTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/signatures`)
        .set("Authorization", supAuth())
        .send({
          signatureType: "supervisor_qc_approval",
          signatureData: VALID_SIG_DATA,
        });

      expect(res.status).toBe(201);
      expect(res.body.signatureType).toBe("supervisor_qc_approval");
      expect(res.body.signerName).toBe(TEST_SUPERVISOR.name);
    });

    it("should replace an existing signature of the same type", async () => {
      const taskId = await createTask();

      await request(app)
        .post(`/api/tasks/${taskId}/signatures`)
        .set("Authorization", techAuth())
        .send({ signatureType: "technician_completion", signatureData: VALID_SIG_DATA });

      const res = await request(app)
        .post(`/api/tasks/${taskId}/signatures`)
        .set("Authorization", techAuth())
        .send({ signatureType: "technician_completion", signatureData: VALID_SIG_DATA });

      expect(res.status).toBe(201);

      const listRes = await request(app)
        .get(`/api/tasks/${taskId}/signatures`)
        .set("Authorization", engAuth());

      expect(listRes.body.filter((s: { signatureType: string }) => s.signatureType === "technician_completion").length).toBe(1);
    });
  });

  describe("GET /api/tasks/:taskId/signatures", () => {
    it("should list signatures for a task", async () => {
      const taskId = await createTask();

      await request(app)
        .post(`/api/tasks/${taskId}/signatures`)
        .set("Authorization", techAuth())
        .send({ signatureType: "technician_completion", signatureData: VALID_SIG_DATA });

      const res = await request(app)
        .get(`/api/tasks/${taskId}/signatures`)
        .set("Authorization", engAuth());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].signatureType).toBe("technician_completion");
    });

    it("should return signatures field in GET /tasks/:id", async () => {
      const taskId = await createTask();

      await request(app)
        .post(`/api/tasks/${taskId}/signatures`)
        .set("Authorization", techAuth())
        .send({ signatureType: "technician_completion", signatureData: VALID_SIG_DATA });

      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("signatures");
      expect(res.body.signatures.length).toBe(1);
    });
  });
});
