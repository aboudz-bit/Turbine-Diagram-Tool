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
  TEST_SUPERVISOR,
  getAssetId,
  getSectionId,
} from "./setup";

describe("Attachments API", () => {
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

  const techAuth = () => authHeader(TEST_TECHNICIAN);
  const engAuth = () => authHeader(TEST_ENGINEER);
  const supAuth = () => authHeader(TEST_SUPERVISOR);

  async function createTask(): Promise<number> {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", engAuth())
      .send({
        title: "Attachment Test Task",
        assetId: getAssetId(),
        sectionId: getSectionId(),
        priority: "medium",
        assignedToId: TEST_TECHNICIAN.id,
      });
    expect(res.status).toBe(201);
    return res.body.id;
  }

  describe("GET /api/tasks/:taskId/attachments", () => {
    it("should return empty array for task with no attachments", async () => {
      const taskId = await createTask();
      const res = await request(app)
        .get(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it("should return 401 when not authenticated", async () => {
      const taskId = await createTask();
      const res = await request(app)
        .get(`/api/tasks/${taskId}/attachments`);
      expect(res.status).toBe(401);
    });

    it("should return 404 for non-existent task", async () => {
      const res = await request(app)
        .get("/api/tasks/999999/attachments")
        .set("Authorization", techAuth());
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tasks/:taskId/attachments", () => {
    it("should create an image attachment with valid data", async () => {
      const taskId = await createTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth())
        .send({
          fileName: "inspection_photo.jpg",
          mimeType: "image/jpeg",
          fileSize: 204800,
          storageUrl: "gs://test-bucket/tasks/1/inspection_photo.jpg",
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        taskId,
        fileName: "inspection_photo.jpg",
        mimeType: "image/jpeg",
        attachmentType: "image",
        uploadedByUserId: TEST_TECHNICIAN.id,
      });
      expect(res.body.id).toBeDefined();
    });

    it("should create a file attachment (PDF)", async () => {
      const taskId = await createTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth())
        .send({
          fileName: "report.pdf",
          mimeType: "application/pdf",
          fileSize: 102400,
          storageUrl: "gs://test-bucket/report.pdf",
        });

      expect(res.status).toBe(201);
      expect(res.body.attachmentType).toBe("file");
    });

    it("should reject unsupported MIME type", async () => {
      const taskId = await createTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth())
        .send({
          fileName: "malware.exe",
          mimeType: "application/x-msdownload",
          fileSize: 1024,
          storageUrl: "gs://test-bucket/malware.exe",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not allowed/i);
    });

    it("should reject files exceeding 20MB", async () => {
      const taskId = await createTask();

      const res = await request(app)
        .post(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth())
        .send({
          fileName: "huge_file.jpg",
          mimeType: "image/jpeg",
          fileSize: 25 * 1024 * 1024,
          storageUrl: "gs://test-bucket/huge.jpg",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/too large/i);
    });

    it("should return 404 for non-existent task", async () => {
      const res = await request(app)
        .post("/api/tasks/999999/attachments")
        .set("Authorization", techAuth())
        .send({
          fileName: "test.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024,
          storageUrl: "gs://test-bucket/test.jpg",
        });
      expect(res.status).toBe(404);
    });

    it("should list created attachments with uploader name", async () => {
      const taskId = await createTask();

      await request(app)
        .post(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth())
        .send({
          fileName: "check_photo.png",
          mimeType: "image/png",
          fileSize: 51200,
          storageUrl: "gs://test-bucket/check_photo.png",
        });

      const listRes = await request(app)
        .get(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth());

      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].fileName).toBe("check_photo.png");
      expect(listRes.body[0].attachmentType).toBe("image");
      expect(listRes.body[0].uploaderName).toBe(TEST_TECHNICIAN.name);
    });
  });

  describe("DELETE /api/tasks/:taskId/attachments/:attachmentId", () => {
    it("should allow uploader to delete own attachment", async () => {
      const taskId = await createTask();

      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth())
        .send({
          fileName: "delete_me.png",
          mimeType: "image/png",
          fileSize: 5120,
          storageUrl: "gs://test-bucket/delete_me.png",
        });
      expect(createRes.status).toBe(201);
      const attachmentId = createRes.body.id;

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
        .set("Authorization", techAuth());
      expect(deleteRes.status).toBe(204);

      const listRes = await request(app)
        .get(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth());
      expect(listRes.body).toHaveLength(0);
    });

    it("should allow engineer to delete any attachment", async () => {
      const taskId = await createTask();

      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth())
        .send({
          fileName: "tech_upload.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024,
          storageUrl: "gs://test-bucket/tech_upload.jpg",
        });
      const attachmentId = createRes.body.id;

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
        .set("Authorization", engAuth());
      expect(deleteRes.status).toBe(204);
    });

    it("should allow supervisor to delete any attachment", async () => {
      const taskId = await createTask();

      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/attachments`)
        .set("Authorization", techAuth())
        .send({
          fileName: "sup_delete_test.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024,
          storageUrl: "gs://test-bucket/sup_test.jpg",
        });
      const attachmentId = createRes.body.id;

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
        .set("Authorization", supAuth());
      expect(deleteRes.status).toBe(204);
    });

    it("should return 404 for non-existent attachment", async () => {
      const taskId = await createTask();
      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}/attachments/999999`)
        .set("Authorization", techAuth());
      expect(deleteRes.status).toBe(404);
    });
  });
});
