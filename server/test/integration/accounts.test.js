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
    test("rejects an invalid account ID", async () => {
      const agent = request.agent(app);

      await registerTestUser(agent, {
        name: "Invalid ID User",
        email: "invalid.id@example.com",
      });

      const response = await agent.patch("/api/accounts/not-a-number").send({
        name: "Valid Account Name",
        account_type: "chequing",
        opening_balance: "100.00",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Please provide a valid account ID.",
      });
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
    test("rejects a non-boolean archive status", async () => {
      const agent = request.agent(app);

      await registerTestUser(agent, {
        name: "Archive Validation User",
        email: "archive.validation@example.com",
      });

      const account = await createTestAccount(agent);

      const response = await agent
        .patch(`/api/accounts/${account.id}/archive`)
        .send({
          is_archived: "true",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Archive status must be true or false.",
      });

      const accountsResponse = await agent.get("/api/accounts");

      expect(accountsResponse.status).toBe(200);
      expect(accountsResponse.body.accounts).toHaveLength(1);
      expect(accountsResponse.body.accounts[0]).toEqual(
        expect.objectContaining({
          id: account.id,
          is_archived: false,
        }),
      );
    });
  });
  describe("POST /api/accounts", () => {
    test("rejects account creation by unauthenticated users", async () => {
      const response = await request(app).post("/api/accounts").send({
        name: "Unauthorized Account",
        account_type: "chequing",
        opening_balance: "100.00",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Authentication required.",
      });
    });

    test("rejects an account without a name", async () => {
      const agent = request.agent(app);

      await registerTestUser(agent, {
        name: "Validation User",
        email: "validation.user@example.com",
      });

      const response = await agent.post("/api/accounts").send({
        account_type: "chequing",
        opening_balance: "100.00",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Validation failed.",
        errors: [
          {
            field: "name",
            message: "Account name must be between 1 and 100 characters.",
          },
        ],
      });

      const accountsResponse = await agent.get("/api/accounts");

      expect(accountsResponse.status).toBe(200);
      expect(accountsResponse.body.accounts).toEqual([]);
    });

    test("rejects an unsupported account type", async () => {
      const agent = request.agent(app);

      await registerTestUser(agent, {
        name: "Validation User",
        email: "validation.user@example.com",
      });

      const response = await agent.post("/api/accounts").send({
        name: "Investment Account",
        account_type: "investment",
        opening_balance: "100.00",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Validation failed.",
        errors: [
          {
            field: "account_type",
            message: "Account type must be chequing, savings, or cash.",
          },
        ],
      });
    });

    test("rejects a balance with more than two decimal places", async () => {
      const agent = request.agent(app);

      await registerTestUser(agent, {
        name: "Validation User",
        email: "validation.user@example.com",
      });

      const response = await agent.post("/api/accounts").send({
        name: "Invalid Balance",
        account_type: "savings",
        opening_balance: "100.999",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Validation failed.",
        errors: [
          {
            field: "opening_balance",
            message:
              "Opening balance must be a valid amount with no more than two decimal places.",
          },
        ],
      });
    });

    test("rejects duplicate account names for the same user", async () => {
      const agent = request.agent(app);

      await registerTestUser(agent, {
        name: "Duplicate User",
        email: "duplicate.user@example.com",
      });

      await createTestAccount(agent, {
        name: "Everyday Chequing",
        account_type: "chequing",
        opening_balance: "500.00",
      });

      const response = await agent.post("/api/accounts").send({
        name: "Everyday Chequing",
        account_type: "savings",
        opening_balance: "750.00",
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        message: "An account with that name already exists.",
      });

      const accountsResponse = await agent.get("/api/accounts");

      expect(accountsResponse.status).toBe(200);
      expect(accountsResponse.body.accounts).toHaveLength(1);
      expect(accountsResponse.body.accounts[0].name).toBe("Everyday Chequing");
    });
  });
});
