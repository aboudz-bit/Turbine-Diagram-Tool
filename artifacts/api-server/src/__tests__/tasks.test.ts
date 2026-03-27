import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import {
  seedTestData,
  cleanupTestData,
  closePool,
  authHeader,
  insertTechSignature,
  insertSupSignature,
  TEST_ENGINEER,
  TEST_TECHNICIAN,
  getAssetId,
  getSectionId,
  getStageId,
  getComponentId,
} from "./setup";

describe("Tasks API", () => {
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

  const auth = () => authHeader(TEST_ENGINEER);

  describe("POST /api/tasks", () => {
    it("should create a task in draft status", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", auth())
        .send({
          title: "Test Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "high",
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Test Task");
      expect(res.body.status).toBe("draft");
      expect(res.body.priority).toBe("high");
      expect(res.body.createdById).toBe(TEST_ENGINEER.id);
    });

    it("should create a task as assigned when assignedToId provided", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", auth())
        .send({
          title: "Assigned Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "medium",
          assignedToId: TEST_TECHNICIAN.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("assigned");
      expect(res.body.assignedToId).toBe(TEST_TECHNICIAN.id);
    });

    it("should reject invalid body (missing title)", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", auth())
        .send({
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "high",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/tasks", () => {
    it("should return paginated task list", async () => {
      // Create 3 tasks
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/api/tasks")
          .set("Authorization", auth())
          .send({
            title: `Task ${i}`,
            assetId: getAssetId(),
            sectionId: getSectionId(),
            priority: "medium",
          });
      }

      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("total");
      expect(res.body.data.length).toBe(3);
      expect(res.body.total).toBe(3);
    });

    it("should filter by status", async () => {
      await request(app)
        .post("/api/tasks")
        .set("Authorization", auth())
        .send({
          title: "Draft Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "low",
        });

      const res = await request(app)
        .get("/api/tasks?status=draft")
        .set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: { status: string }) => t.status === "draft")).toBe(true);
    });

    it("should paginate with limit and offset", async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/tasks")
          .set("Authorization", auth())
          .send({
            title: `Task ${i}`,
            assetId: getAssetId(),
            sectionId: getSectionId(),
            priority: "medium",
          });
      }

      const res = await request(app)
        .get("/api/tasks?limit=2&offset=1")
        .set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.total).toBe(5);
    });
  });

  describe("GET /api/tasks/:taskId", () => {
    it("should return task detail with time entries and qc reviews", async () => {
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", auth())
        .send({
          title: "Detail Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "high",
        });

      const taskId = createRes.body.id;

      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body).toHaveProperty("timeEntries");
      expect(res.body).toHaveProperty("qcReviews");
      expect(res.body).toHaveProperty("activeTimeEntry");
    });

    it("should return 404 for non-existent task", async () => {
      const res = await request(app)
        .get("/api/tasks/99999")
        .set("Authorization", auth());

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/tasks/:taskId (status transitions)", () => {
    it("should allow valid transition: draft → assigned", async () => {
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", auth())
        .send({
          title: "Transition Test",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "medium",
        });

      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", auth())
        .send({ status: "assigned", version: 1 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("assigned");
    });

    it("should reject invalid transition: draft → approved", async () => {
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", auth())
        .send({
          title: "Invalid Transition",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "medium",
        });

      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", auth())
        .send({ status: "approved", version: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid status transition");
    });

    it("should reject modification of approved tasks", async () => {
      // Create → assign → in_progress → submitted → under_qc → approved
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", auth())
        .send({
          title: "Approved Lock Test",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "medium",
          assignedToId: TEST_TECHNICIAN.id,
        });
      const taskId = createRes.body.id;

      // assigned → in_progress (version 1 → 2)
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", auth())
        .send({ status: "in_progress", version: 1 });

      // Add technician signature before submit
      await insertTechSignature(taskId);

      // in_progress → submitted (version 2 → 3)
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", auth())
        .send({ status: "submitted", version: 2 });

      // submitted → under_qc (version 3 → 4)
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", auth())
        .send({ status: "under_qc", version: 3 });

      // Add supervisor signature before approve
      await insertSupSignature(taskId);

      // under_qc → approved via QC review (bypasses version check)
      await request(app)
        .post(`/api/tasks/${taskId}/qc`)
        .set("Authorization", auth())
        .send({ decision: "approved" });

      // Try to modify approved task
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", auth())
        .send({ status: "draft", version: 4 });

      expect(res.status).toBe(403);
    });
  });
});
