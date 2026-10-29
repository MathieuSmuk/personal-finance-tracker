import request from "supertest";
import { describe, expect, test } from "vitest";

import app from "../../app.js";

describe("API origin protection", () => {
  test.each([
    ["post", "/api/auth/register"],
    ["post", "/api/auth/login"],
    ["post", "/api/auth/logout"],
    ["post", "/api/accounts"],
    ["post", "/api/categories"],
    ["post", "/api/transactions"],
    ["patch", "/api/accounts/1"],
    ["patch", "/api/categories/1"],
    ["patch", "/api/transactions/1"],
    ["delete", "/api/transactions/1"],
  ])("rejects an untrusted origin for %s %s", async (method, path) => {
    const response = await request(app)
      [method](path)
      .set("Origin", "https://untrusted.example");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Request origin is not allowed.",
    });
  });

  test.each([undefined, "null", `${process.env.CLIENT_URL}.attacker.example`])(
    "rejects a missing or invalid origin: %s",
    async (origin) => {
      const pendingRequest = request(app).post("/api/auth/logout");

      if (origin !== undefined) {
        pendingRequest.set("Origin", origin);
      }

      const response = await pendingRequest;

      expect(response.status).toBe(403);
    },
  );

  test("allows a trusted request to reach authentication", async () => {
    const response = await request(app)
      .post("/api/accounts")
      .set("Origin", process.env.CLIENT_URL)
      .send({
        name: "Test Account",
        account_type: "chequing",
        opening_balance: "0.00",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required.",
    });
  });

  test("does not block a read-only request without an origin", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required.",
    });
  });
});
