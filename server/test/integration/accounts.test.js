import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import app from "../../app.js";
import { resetTestDatabase } from "../helpers/database.js";

const TEST_PASSWORD = "StrongTestPassword123!";

async function registerTestUser(agent, userDetails) {
  const response = await agent.post("/api/auth/register").send({
    name: userDetails.name,
    email: userDetails.email,
    password: TEST_PASSWORD,
  });

  expect(response.status).toBe(201);
  expect(response.body.message).toBe(
    "User registered and authenticated successfully.",
  );

  return response.body.user;
}

async function createTestAccount(agent, accountDetails = {}) {
  const response = await agent.post("/api/accounts").send({
    name: accountDetails.name ?? "Test Chequing",
    account_type: accountDetails.account_type ?? "chequing",
    opening_balance: accountDetails.opening_balance ?? "500.00",
  });

  expect(response.status).toBe(201);
  expect(response.body.message).toBe("Account created successfully.");

  return response.body.account;
}

describe("Account routes", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("GET /api/accounts", () => {
    test("rejects requests from unauthenticated users", async () => {
      const response = await request(app).get("/api/accounts");

      expect(response.status).toBe(401);
      expect(response.headers["content-type"]).toMatch(/json/);
      expect(response.body).toEqual({
        message: "Authentication required.",
      });
    });

    test("returns an empty account list for a newly registered user", async () => {
      const agent = request.agent(app);

      await registerTestUser(agent, {
        name: "Test User",
        email: "test.user@example.com",
      });

      const response = await agent.get("/api/accounts");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accounts: [],
      });
    });

    test("returns only accounts owned by the authenticated user", async () => {
      const firstUserAgent = request.agent(app);
      const secondUserAgent = request.agent(app);

      await registerTestUser(firstUserAgent, {
        name: "First User",
        email: "first.user@example.com",
      });

      await registerTestUser(secondUserAgent, {
        name: "Second User",
        email: "second.user@example.com",
      });

      const firstAccountResponse = await firstUserAgent
        .post("/api/accounts")
        .send({
          name: "First User Chequing",
          account_type: "chequing",
          opening_balance: "1250.50",
        });

      const secondAccountResponse = await secondUserAgent
        .post("/api/accounts")
        .send({
          name: "Second User Savings",
          account_type: "savings",
          opening_balance: "3000.00",
        });

      expect(firstAccountResponse.status).toBe(201);
      expect(secondAccountResponse.status).toBe(201);

      const response = await firstUserAgent.get("/api/accounts");

      expect(response.status).toBe(200);
      expect(response.body.accounts).toHaveLength(1);

      expect(response.body.accounts[0]).toEqual(
        expect.objectContaining({
          name: "First User Chequing",
          account_type: "chequing",
          opening_balance: "1250.50",
          is_archived: false,
        }),
      );

      expect(response.body.accounts).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Second User Savings",
          }),
        ]),
      );
    });
  });
  describe("PATCH /api/accounts/:id", () => {
    test("allows the owner to update an account", async () => {
      const ownerAgent = request.agent(app);

      await registerTestUser(ownerAgent, {
        name: "Account Owner",
        email: "owner@example.com",
      });

      const account = await createTestAccount(ownerAgent);

      const response = await ownerAgent
        .patch(`/api/accounts/${account.id}`)
        .send({
          name: "Updated Savings",
          account_type: "savings",
          opening_balance: "875.25",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Account updated successfully.");

      expect(response.body.account).toEqual(
        expect.objectContaining({
          id: account.id,
          name: "Updated Savings",
          account_type: "savings",
          opening_balance: "875.25",
          is_archived: false,
        }),
      );
    });
    test("does not allow another user to update the account", async () => {
      const ownerAgent = request.agent(app);
      const otherUserAgent = request.agent(app);

      await registerTestUser(ownerAgent, {
        name: "Account Owner",
        email: "owner@example.com",
      });

      await registerTestUser(otherUserAgent, {
        name: "Other User",
        email: "other.user@example.com",
      });

      const account = await createTestAccount(ownerAgent, {
        name: "Owner Chequing",
        account_type: "chequing",
        opening_balance: "1200.00",
      });

      const response = await otherUserAgent
        .patch(`/api/accounts/${account.id}`)
        .send({
          name: "Unauthorized Change",
          account_type: "savings",
          opening_balance: "9999.99",
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Account not found.",
      });

      const ownerAccountsResponse = await ownerAgent.get("/api/accounts");

      expect(ownerAccountsResponse.status).toBe(200);
      expect(ownerAccountsResponse.body.accounts).toHaveLength(1);

      expect(ownerAccountsResponse.body.accounts[0]).toEqual(
        expect.objectContaining({
          id: account.id,
          name: "Owner Chequing",
          account_type: "chequing",
          opening_balance: "1200.00",
          is_archived: false,
        }),
      );
    });
  });
  describe("PATCH /api/accounts/:id/archive", () => {
    test("allows the owner to archive an account", async () => {
      const ownerAgent = request.agent(app);

      await registerTestUser(ownerAgent, {
        name: "Archive Owner",
        email: "archive.owner@example.com",
      });

      const account = await createTestAccount(ownerAgent);

      const response = await ownerAgent
        .patch(`/api/accounts/${account.id}/archive`)
        .send({
          is_archived: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Account archived successfully.");

      expect(response.body.account).toEqual(
        expect.objectContaining({
          id: account.id,
          is_archived: true,
        }),
      );
    });

    test("does not allow another user to archive the account", async () => {
      const ownerAgent = request.agent(app);
      const otherUserAgent = request.agent(app);

      await registerTestUser(ownerAgent, {
        name: "Archive Owner",
        email: "archive.owner@example.com",
      });

      await registerTestUser(otherUserAgent, {
        name: "Other User",
        email: "other.user@example.com",
      });

      const account = await createTestAccount(ownerAgent, {
        name: "Protected Savings",
        account_type: "savings",
      });

      const response = await otherUserAgent
        .patch(`/api/accounts/${account.id}/archive`)
        .send({
          is_archived: true,
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Account not found.",
      });

      const ownerAccountsResponse = await ownerAgent.get("/api/accounts");

      expect(ownerAccountsResponse.status).toBe(200);
      expect(ownerAccountsResponse.body.accounts).toHaveLength(1);

      expect(ownerAccountsResponse.body.accounts[0]).toEqual(
        expect.objectContaining({
          id: account.id,
          name: "Protected Savings",
          is_archived: false,
        }),
      );
    });
  });
});
