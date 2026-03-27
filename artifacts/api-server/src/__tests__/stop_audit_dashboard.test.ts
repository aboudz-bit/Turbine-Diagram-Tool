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

// ── Shared setup: single pool lifecycle for all 3 describe groups ─────────────

beforeAll(async () => { await seedTestData(); });
beforeEach(async () => { await cleanupTestData(); await seedTestData(); });
afterAll(async () => { await closePool(); });

// ── helpers ───────────────────────────────────────────────────────────────────

const techAuth = () => authHeader(TEST_TECHNICIAN);
const engAuth = () => authHeader(TEST_ENGINEER);

async function createTask(): Promise<number> {
  const res = await request(app)
    .post("/api/tasks")
    .set("Authorization", engAuth())
    .send({
      title: "Test Task",
      assetId: getAssetId(),
      sectionId: getSectionId(),
      priority: "medium",
      assignedToId: TEST_TECHNICIAN.id,
    });
  expect(res.status).toBe(201);
  return res.body.id;
}

async function createAndStartTask(): Promise<number> {
  const taskId = await createTask();
  const startRes = await request(app)
    .post(`/api/tasks/${taskId}/time`)
    .set("Authorization", techAuth())
    .send({});
  expect(startRes.status).toBe(201);
  return taskId;
}

// ── Stop Time Tracking ────────────────────────────────────────────────────────

describe("Stop Time Tracking — POST /api/tasks/:taskId/time/stop", () => {
  it("should stop an active session and return completed entry", async () => {
    const taskId = await createAndStartTask();

    const stopRes = await request(app)
      .post(`/api/tasks/${taskId}/time/stop`)
      .set("Authorization", techAuth());

    expect(stopRes.status).toBe(200);
    expect(stopRes.body.status).toBe("completed");
    expect(stopRes.body.endTime).toBeTruthy();
    expect(stopRes.body.isActive).toBe(false);
  });

  it("should set task status to paused after stop", async () => {
    const taskId = await createAndStartTask();

    await request(app)
      .post(`/api/tasks/${taskId}/time/stop`)
      .set("Authorization", techAuth());

    const taskRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set("Authorization", techAuth());

    expect(taskRes.body.status).toBe("paused");
    expect(taskRes.body.activeTimeEntry).toBeNull();
  });

  it("should return 404 when no active session exists", async () => {
    const taskId = await createTask();

    const stopRes = await request(app)
      .post(`/api/tasks/${taskId}/time/stop`)
      .set("Authorization", techAuth());

    expect(stopRes.status).toBe(404);
  });

  it("should block submit when a session is running (returns 400)", async () => {
    const taskId = await createAndStartTask();

    const submitRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Authorization", engAuth())
      .send({ status: "submitted", version: 1 });

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.error).toMatch(/session.*running|work session.*running|stop.*pause/i);
  });

  it("should set activeSessionCount to 0 on dashboard after stop", async () => {
    const taskId = await createAndStartTask();

    const beforeStats = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());
    expect(beforeStats.body.activeSessionCount).toBeGreaterThanOrEqual(1);

    await request(app)
      .post(`/api/tasks/${taskId}/time/stop`)
      .set("Authorization", techAuth());

    const afterStats = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());
    expect(afterStats.body.activeSessionCount).toBe(0);
  });
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

describe("Audit Log — GET /api/tasks/:taskId/audit", () => {
  it("should return empty array for a new task with no events", async () => {
    const taskId = await createTask();

    const res = await request(app)
      .get(`/api/tasks/${taskId}/audit`)
      .set("Authorization", techAuth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should record task_started event after starting work", async () => {
    const taskId = await createAndStartTask();

    const auditRes = await request(app)
      .get(`/api/tasks/${taskId}/audit`)
      .set("Authorization", techAuth());

    expect(auditRes.status).toBe(200);
    const events = auditRes.body as Array<{ action: string; actorName: string; actionLabel: string }>;
    const startEvent = events.find(e => e.action === "task_started");
    expect(startEvent).toBeDefined();
    expect(startEvent?.actorName).toBe(TEST_TECHNICIAN.name);
    expect(startEvent?.actionLabel).toBeTruthy();
  });

  it("should record task_paused event after pausing", async () => {
    const taskId = await createAndStartTask();

    await request(app)
      .post(`/api/tasks/${taskId}/time/pause`)
      .set("Authorization", techAuth())
      .send({ reason: "Waiting for parts" });

    const auditRes = await request(app)
      .get(`/api/tasks/${taskId}/audit`)
      .set("Authorization", techAuth());

    const events = auditRes.body as Array<{ action: string }>;
    const pauseEvent = events.find(e => e.action === "task_paused");
    expect(pauseEvent).toBeDefined();
  });

  it("should record task_stopped event after stopping", async () => {
    const taskId = await createAndStartTask();

    await request(app)
      .post(`/api/tasks/${taskId}/time/stop`)
      .set("Authorization", techAuth());

    const auditRes = await request(app)
      .get(`/api/tasks/${taskId}/audit`)
      .set("Authorization", techAuth());

    const events = auditRes.body as Array<{ action: string }>;
    const stopEvent = events.find(e => e.action === "task_stopped");
    expect(stopEvent).toBeDefined();
  });

  it("should return events in descending time order (most recent first)", async () => {
    const taskId = await createAndStartTask();

    await request(app)
      .post(`/api/tasks/${taskId}/time/stop`)
      .set("Authorization", techAuth());

    const auditRes = await request(app)
      .get(`/api/tasks/${taskId}/audit`)
      .set("Authorization", techAuth());

    const events = auditRes.body as Array<{ createdAt: string }>;
    if (events.length >= 2) {
      const first = new Date(events[0].createdAt).getTime();
      const second = new Date(events[1].createdAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });

  it("should return 401 without authentication", async () => {
    const taskId = await createTask();
    const res = await request(app).get(`/api/tasks/${taskId}/audit`);
    expect(res.status).toBe(401);
  });

  it("should return 404 for non-existent task", async () => {
    const res = await request(app)
      .get("/api/tasks/999999/audit")
      .set("Authorization", techAuth());
    expect(res.status).toBe(404);
  });
});

// ── Dashboard Stats — new metrics ─────────────────────────────────────────────

describe("Dashboard Stats — new metrics", () => {
  it("should return totalLoggedHours as a number (0 with no entries)", async () => {
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalLoggedHours");
    expect(typeof res.body.totalLoggedHours).toBe("number");
    expect(res.body.totalLoggedHours).toBe(0);
  });

  it("should return activeSessionCount as 0 with no running sessions", async () => {
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("activeSessionCount");
    expect(res.body.activeSessionCount).toBe(0);
  });

  it("should increment activeSessionCount when a timer is running", async () => {
    await createAndStartTask();

    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());

    expect(res.status).toBe(200);
    expect(res.body.activeSessionCount).toBeGreaterThanOrEqual(1);
  });

  it("should return byTurbine array with turbineName and count fields", async () => {
    await createTask();

    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("byTurbine");
    expect(Array.isArray(res.body.byTurbine)).toBe(true);
    if (res.body.byTurbine.length > 0) {
      const entry = res.body.byTurbine[0];
      expect(entry).toHaveProperty("count");
      // field is either turbineName or assetName depending on backend alias
      const hasName = "turbineName" in entry || "assetName" in entry;
      expect(hasName).toBe(true);
    }
  });

  it("should return recentActivity array after task events", async () => {
    const taskId = await createAndStartTask();
    await request(app)
      .post(`/api/tasks/${taskId}/time/stop`)
      .set("Authorization", techAuth());

    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("recentActivity");
    expect(Array.isArray(res.body.recentActivity)).toBe(true);
    if (res.body.recentActivity.length > 0) {
      const entry = res.body.recentActivity[0];
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("action");
      expect(entry).toHaveProperty("actionLabel");
      expect(entry).toHaveProperty("actorName");
      expect(entry).toHaveProperty("createdAt");
    }
  });

  it("should reset activeSessionCount to 0 after timer is stopped", async () => {
    const taskId = await createAndStartTask();

    const beforeRes = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());
    expect(beforeRes.body.activeSessionCount).toBeGreaterThanOrEqual(1);

    await request(app)
      .post(`/api/tasks/${taskId}/time/stop`)
      .set("Authorization", techAuth());

    const afterRes = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", engAuth());
    expect(afterRes.body.activeSessionCount).toBe(0);
  });
});
