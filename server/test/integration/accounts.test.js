import request from "supertest";
import { describe, expect, test } from "vitest";

import app from "../../app.js";

describe("Account routes", () => {
  describe("GET /api/accounts", () => {
    test("rejects requests from unauthenticated users", async () => {
      const response = await request(app).get("/api/accounts");

      expect(response.status).toBe(401);
      expect(response.headers["content-type"]).toMatch(/json/);
      expect(response.body).toEqual({
        message: "Authentication required.",
      });
    });
  });
});
