import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import {
  seedTestData,
  cleanupTestData,
  closePool,
  authHeader,
  TEST_ENGINEER,
  TEST_TECHNICIAN,
  getAssetId,
  getSectionId,
} from "./setup";

describe("Time Tracking API", () => {
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

  const auth = () => authHeader(TEST_TECHNICIAN);
  const engAuth = () => authHeader(TEST_ENGINEER);

  async function createAssignedTask(): Promise<number> {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", engAuth())
      .send({
        title: "Time Test Task",
        assetId: getAssetId(),
        sectionId: getSectionId(),
        priority: "medium",
        assignedToId: TEST_TECHNICIAN.id,
      });
    return res.body.id;
  }

  describe("POST /api/tasks/:taskId/time (start)", () => {
    it("should start time tracking and transition to in_progress", async () => {
      const taskId = await createAssignedTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/time`)
        .set("Authorization", auth())
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.isActive).toBe(true);
      expect(res.body.taskId).toBe(taskId);
      expect(res.body.userId).toBe(TEST_TECHNICIAN.id);

      // Verify task status changed
      const taskRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", auth());
      expect(taskRes.body.status).toBe("in_progress");
    });

    it("should reject starting on a draft task (no valid transition)", async () => {
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
        .post(`/api/tasks/${createRes.body.id}/time`)
        .set("Authorization", auth())
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/tasks/:taskId/time/pause", () => {
    it("should pause time tracking and transition to paused", async () => {
      const taskId = await createAssignedTask();

      // Start
      await request(app)
        .post(`/api/tasks/${taskId}/time`)
        .set("Authorization", auth())
        .send({});

      // Pause
      const res = await request(app)
        .post(`/api/tasks/${taskId}/time/pause`)
        .set("Authorization", auth())
        .send({ reason: "Break time" });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
      expect(res.body.pauseReason).toBe("Break time");

      // Verify task status
      const taskRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", auth());
      expect(taskRes.body.status).toBe("paused");
    });

    it("should reject pause without reason", async () => {
      const taskId = await createAssignedTask();

      await request(app)
        .post(`/api/tasks/${taskId}/time`)
        .set("Authorization", auth())
        .send({});

      const res = await request(app)
        .post(`/api/tasks/${taskId}/time/pause`)
        .set("Authorization", auth())
        .send({ reason: "" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/tasks/:taskId/time/resume", () => {
    it("should resume time tracking after pause", async () => {
      const taskId = await createAssignedTask();

      // Start → Pause → Resume
      await request(app)
        .post(`/api/tasks/${taskId}/time`)
        .set("Authorization", auth())
        .send({});

      await request(app)
        .post(`/api/tasks/${taskId}/time/pause`)
        .set("Authorization", auth())
        .send({ reason: "Lunch" });

      const res = await request(app)
        .post(`/api/tasks/${taskId}/time/resume`)
        .set("Authorization", auth());

      expect(res.status).toBe(201);
      expect(res.body.isActive).toBe(true);

      // Verify task status back to in_progress
      const taskRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", auth());
      expect(taskRes.body.status).toBe("in_progress");
    });
  });

  describe("GET /api/tasks/:taskId/time", () => {
    it("should list time entries for a task", async () => {
      const taskId = await createAssignedTask();

      await request(app)
        .post(`/api/tasks/${taskId}/time`)
        .set("Authorization", auth())
        .send({});

      const res = await request(app)
        .get(`/api/tasks/${taskId}/time`)
        .set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].isActive).toBe(true);
    });
  });
});
