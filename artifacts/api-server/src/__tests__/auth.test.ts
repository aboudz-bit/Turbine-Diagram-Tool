import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { seedTestData, closePool, TEST_ENGINEER, authHeader } from "./setup";

describe("Auth API", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await closePool();
  });

  describe("POST /api/auth/login", () => {
    it("should return a token and user for valid userId", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ userId: TEST_ENGINEER.id });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        id: TEST_ENGINEER.id,
        name: TEST_ENGINEER.name,
        email: TEST_ENGINEER.email,
      });
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ userId: 99999 });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user when authenticated", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", authHeader(TEST_ENGINEER));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: TEST_ENGINEER.id,
        name: TEST_ENGINEER.name,
      });
    });

    it("should return 401 without auth header", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
    });

    it("should return 401 with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });

  describe("Protected routes", () => {
    it("should reject unauthenticated requests to /api/tasks", async () => {
      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(401);
    });

    it("should allow public access to /api/healthz", async () => {
      const res = await request(app).get("/api/healthz");

      expect(res.status).toBe(200);
    });
  });
});
