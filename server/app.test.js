import request from "supertest";
import { describe, expect, test } from "vitest";

import app from "./app.js";

describe("Express application", () => {
  test("returns information about the API", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Personal Finance Tracker API is running!",
    });
  });
  test("reports that the test database is connected", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      database: "connected",
    });
  });
});
