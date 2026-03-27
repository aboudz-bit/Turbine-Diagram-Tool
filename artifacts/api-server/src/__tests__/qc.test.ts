import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import {
  seedTestData,
  cleanupTestData,
  closePool,
  authHeader,
  TEST_ENGINEER,
  TEST_SUPERVISOR,
  TEST_TECHNICIAN,
  getAssetId,
  getSectionId,
} from "./setup";

describe("QC Review API", () => {
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
  const supAuth = () => authHeader(TEST_SUPERVISOR);
  const techAuth = () => authHeader(TEST_TECHNICIAN);

  async function createSubmittedTask(): Promise<number> {
    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", engAuth())
      .send({
        title: "QC Test Task",
        assetId: getAssetId(),
        sectionId: getSectionId(),
        priority: "high",
        assignedToId: TEST_TECHNICIAN.id,
      });
    const taskId = createRes.body.id;

    // assigned → in_progress → submitted → under_qc (with version tracking)
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Authorization", engAuth())
      .send({ status: "in_progress", version: 1 });

    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Authorization", engAuth())
      .send({ status: "submitted", version: 2 });

    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Authorization", engAuth())
      .send({ status: "under_qc", version: 3 });

    return taskId;
  }

  describe("POST /api/tasks/:taskId/qc", () => {
    it("should approve a task under QC", async () => {
      const taskId = await createSubmittedTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/qc`)
        .set("Authorization", supAuth())
        .send({ decision: "approved" });

      expect(res.status).toBe(201);
      expect(res.body.decision).toBe("approved");
      expect(res.body.reviewerId).toBe(TEST_SUPERVISOR.id);

      // Verify task is approved
      const taskRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth());
      expect(taskRes.body.status).toBe("approved");
    });

    it("should reject a task and set revision_needed status", async () => {
      const taskId = await createSubmittedTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/qc`)
        .set("Authorization", supAuth())
        .send({
          decision: "rejected",
          comments: "Blade alignment is off by 2 degrees",
        });

      expect(res.status).toBe(201);
      expect(res.body.decision).toBe("rejected");

      // Verify task is in revision_needed status
      const taskRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth());
      expect(taskRes.body.status).toBe("revision_needed");
    });

    it("should require comments when rejecting", async () => {
      const taskId = await createSubmittedTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/qc`)
        .set("Authorization", supAuth())
        .send({ decision: "rejected" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Comments are required");
    });

    it("should reject QC review on non-reviewable task", async () => {
      // Create a draft task (not submitted/under_qc)
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", engAuth())
        .send({
          title: "Draft Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "low",
        });

      const res = await request(app)
        .post(`/api/tasks/${createRes.body.id}/qc`)
        .set("Authorization", supAuth())
        .send({ decision: "approved" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Cannot review");
    });
  });

  describe("GET /api/tasks/:taskId/qc", () => {
    it("should list QC reviews for a task", async () => {
      const taskId = await createSubmittedTask();

      await request(app)
        .post(`/api/tasks/${taskId}/qc`)
        .set("Authorization", supAuth())
        .send({ decision: "approved" });

      const res = await request(app)
        .get(`/api/tasks/${taskId}/qc`)
        .set("Authorization", engAuth());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].decision).toBe("approved");
    });
  });

  describe("Full QC workflow: reject → revision_needed → in_progress → resubmit", () => {
    it("should allow re-submission after revision_needed", async () => {
      const taskId = await createSubmittedTask();

      // Reject
      await request(app)
        .post(`/api/tasks/${taskId}/qc`)
        .set("Authorization", supAuth())
        .send({ decision: "rejected", comments: "Needs rework" });

      // revision_needed → in_progress (version 4 after QC changes status without version bump)
      // QC review uses its own transaction, not PATCH, so version stays at 4
      const resumeRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth())
        .send({ status: "in_progress", version: 4 });
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.status).toBe("in_progress");

      // in_progress → submitted (version 5)
      const submitRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth())
        .send({ status: "submitted", version: 5 });
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.status).toBe("submitted");
    });
  });
});
