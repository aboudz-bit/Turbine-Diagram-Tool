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
  TEST_SUPERVISOR,
  getAssetId,
  getSectionId,
} from "./setup";

describe("Notifications API", () => {
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

  // ── Notification creation triggers ───────────────────────────────────────

  describe("task_assigned notification on creation with assignedToId", () => {
    it("should create a notification for the assigned technician", async () => {
      await request(app)
        .post("/api/tasks")
        .set("Authorization", engAuth())
        .send({
          title: "Assigned Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "high",
          assignedToId: TEST_TECHNICIAN.id,
        });

      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", techAuth());

      expect(res.status).toBe(200);
      const assigned = res.body.find((n: { type: string }) => n.type === "task_assigned");
      expect(assigned).toBeDefined();
      expect(assigned.isRead).toBe(false);
    });

    it("should not create assignment notification when no assignedToId", async () => {
      await request(app)
        .post("/api/tasks")
        .set("Authorization", engAuth())
        .send({
          title: "Unassigned Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "low",
        });

      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", techAuth());

      expect(res.status).toBe(200);
      const assigned = res.body.find((n: { type: string }) => n.type === "task_assigned");
      expect(assigned).toBeUndefined();
    });
  });

  describe("task_submitted notification on submit", () => {
    it("should notify engineers/supervisors when task is submitted", async () => {
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", engAuth())
        .send({
          title: "Submit Notify Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "medium",
          assignedToId: TEST_TECHNICIAN.id,
        });
      const taskId = createRes.body.id;

      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth())
        .send({ status: "in_progress", version: 1 });

      await insertTechSignature(taskId);

      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set("Authorization", engAuth())
        .send({ status: "submitted", version: 2 });

      // Engineer (creator) should have a task_submitted notification
      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", engAuth());

      expect(res.status).toBe(200);
      const submitted = res.body.find((n: { type: string }) => n.type === "task_submitted");
      expect(submitted).toBeDefined();
    });
  });

  describe("task_approved / task_rejected notification on QC decision", () => {
    async function createUnderQcTask(): Promise<number> {
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", engAuth())
        .send({
          title: "QC Notify Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "high",
          assignedToId: TEST_TECHNICIAN.id,
        });
      const taskId = createRes.body.id;

      await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", engAuth())
        .send({ status: "in_progress", version: 1 });
      await insertTechSignature(taskId);
      await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", engAuth())
        .send({ status: "submitted", version: 2 });
      await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", engAuth())
        .send({ status: "under_qc", version: 3 });

      return taskId;
    }

    it("should notify assignee on approval", async () => {
      const taskId = await createUnderQcTask();
      await insertSupSignature(taskId);

      await request(app)
        .post(`/api/tasks/${taskId}/qc`)
        .set("Authorization", supAuth())
        .send({ decision: "approved" });

      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", techAuth());

      const approved = res.body.find((n: { type: string }) => n.type === "task_approved");
      expect(approved).toBeDefined();
      expect(approved.isRead).toBe(false);
    });

    it("should notify assignee on rejection", async () => {
      const taskId = await createUnderQcTask();

      await request(app)
        .post(`/api/tasks/${taskId}/qc`)
        .set("Authorization", supAuth())
        .send({ decision: "rejected", comments: "Blade gap too wide" });

      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", techAuth());

      const rejected = res.body.find((n: { type: string }) => n.type === "task_rejected");
      expect(rejected).toBeDefined();
    });
  });

  // ── Notification management ───────────────────────────────────────────────

  describe("PATCH /api/notifications/:id/read", () => {
    it("should mark a single notification as read", async () => {
      await request(app)
        .post("/api/tasks")
        .set("Authorization", engAuth())
        .send({
          title: "Mark Read Task",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "low",
          assignedToId: TEST_TECHNICIAN.id,
        });

      const listRes = await request(app)
        .get("/api/notifications")
        .set("Authorization", techAuth());

      const notifId = listRes.body[0].id;

      const res = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set("Authorization", techAuth());

      expect(res.status).toBe(200);
      expect(res.body.isRead).toBe(true);
    });
  });

  describe("PATCH /api/notifications/read-all", () => {
    it("should mark all notifications as read", async () => {
      // Create two tasks with assignments to generate two notifications
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post("/api/tasks")
          .set("Authorization", engAuth())
          .send({
            title: `Task ${i}`,
            assetId: getAssetId(),
            sectionId: getSectionId(),
            priority: "low",
            assignedToId: TEST_TECHNICIAN.id,
          });
      }

      const res = await request(app)
        .patch("/api/notifications/read-all")
        .set("Authorization", techAuth());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const listRes = await request(app)
        .get("/api/notifications")
        .set("Authorization", techAuth());

      const unread = listRes.body.filter((n: { isRead: boolean }) => !n.isRead);
      expect(unread.length).toBe(0);
    });
  });

  describe("GET /api/notifications", () => {
    it("should only return notifications for the current user", async () => {
      // Assign task to technician — creates notif for tech only
      await request(app)
        .post("/api/tasks")
        .set("Authorization", engAuth())
        .send({
          title: "Isolation Test",
          assetId: getAssetId(),
          sectionId: getSectionId(),
          priority: "low",
          assignedToId: TEST_TECHNICIAN.id,
        });

      // Supervisor should have no task_assigned notification
      const supRes = await request(app)
        .get("/api/notifications")
        .set("Authorization", supAuth());

      const assigned = supRes.body.find((n: { type: string }) => n.type === "task_assigned");
      expect(assigned).toBeUndefined();

      // Technician should have it
      const techRes = await request(app)
        .get("/api/notifications")
        .set("Authorization", techAuth());

      expect(techRes.body.find((n: { type: string }) => n.type === "task_assigned")).toBeDefined();
    });
  });
});
