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

  return response.body.user;
}

async function createTestAccount(agent, accountDetails = {}) {
  const response = await agent.post("/api/accounts").send({
    name: accountDetails.name ?? "Test Chequing",
    account_type: accountDetails.account_type ?? "chequing",
    opening_balance: accountDetails.opening_balance ?? "500.00",
  });

  expect(response.status).toBe(201);

  return response.body.account;
}

async function createTestCategory(agent, categoryDetails = {}) {
  const response = await agent.post("/api/categories").send({
    name: categoryDetails.name ?? "Groceries",
    transaction_type: categoryDetails.transaction_type ?? "expense",
    color: categoryDetails.color ?? "#2563EB",
  });

  expect(response.status).toBe(201);

  return response.body.category;
}

async function createTwoUsersWithResources() {
  const firstUserAgent = request.agent(app);
  const secondUserAgent = request.agent(app);

  await registerTestUser(firstUserAgent, {
    name: "First Transaction User",
    email: "first.transaction@example.com",
  });

  await registerTestUser(secondUserAgent, {
    name: "Second Transaction User",
    email: "second.transaction@example.com",
  });

  const firstAccount = await createTestAccount(firstUserAgent, {
    name: "First User Chequing",
    account_type: "chequing",
    opening_balance: "1000.00",
  });

  const secondAccount = await createTestAccount(secondUserAgent, {
    name: "Second User Chequing",
    account_type: "chequing",
    opening_balance: "2000.00",
  });

  const firstCategory = await createTestCategory(firstUserAgent, {
    name: "First User Groceries",
    transaction_type: "expense",
    color: "#DC2626",
  });

  const secondCategory = await createTestCategory(secondUserAgent, {
    name: "Second User Groceries",
    transaction_type: "expense",
    color: "#2563EB",
  });

  return {
    firstUserAgent,
    secondUserAgent,
    firstAccount,
    secondAccount,
    firstCategory,
    secondCategory,
  };
}

async function createTestTransaction(
  agent,
  account,
  category,
  transactionDetails = {},
) {
  const response = await agent.post("/api/transactions").send({
    account_id: account.id,
    category_id: category.id,
    transaction_type:
      transactionDetails.transaction_type ?? category.transaction_type,
    amount: transactionDetails.amount ?? "45.75",
    description: transactionDetails.description ?? "Test transaction",
    transaction_date: transactionDetails.transaction_date ?? "2026-10-01",
    notes: transactionDetails.notes ?? "Created by a test",
  });

  expect(response.status).toBe(201);

  return response.body.transaction;
}

describe("Category and transaction ownership", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("Category ownership", () => {
    test("returns only categories owned by the authenticated user", async () => {
      const firstUserAgent = request.agent(app);
      const secondUserAgent = request.agent(app);

      await registerTestUser(firstUserAgent, {
        name: "First Category User",
        email: "first.category@example.com",
      });

      await registerTestUser(secondUserAgent, {
        name: "Second Category User",
        email: "second.category@example.com",
      });

      await createTestCategory(firstUserAgent, {
        name: "First User Groceries",
        transaction_type: "expense",
        color: "#DC2626",
      });

      await createTestCategory(secondUserAgent, {
        name: "Second User Salary",
        transaction_type: "income",
        color: "#16A34A",
      });

      const firstResponse = await firstUserAgent.get("/api/categories");

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.categories).toHaveLength(1);

      expect(firstResponse.body.categories[0]).toEqual(
        expect.objectContaining({
          name: "First User Groceries",
          transaction_type: "expense",
          color: "#DC2626",
          is_archived: false,
        }),
      );

      expect(firstResponse.body.categories).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Second User Salary",
          }),
        ]),
      );
    });

    test("does not allow another user to update or archive a category", async () => {
      const ownerAgent = request.agent(app);
      const otherUserAgent = request.agent(app);

      await registerTestUser(ownerAgent, {
        name: "Category Owner",
        email: "category.owner@example.com",
      });

      await registerTestUser(otherUserAgent, {
        name: "Other Category User",
        email: "other.category@example.com",
      });

      const category = await createTestCategory(ownerAgent, {
        name: "Protected Category",
        transaction_type: "expense",
        color: "#F97316",
      });

      const updateResponse = await otherUserAgent
        .patch(`/api/categories/${category.id}`)
        .send({
          name: "Unauthorized Category Name",
          color: "#000000",
        });

      expect(updateResponse.status).toBe(404);
      expect(updateResponse.body).toEqual({
        message: "Category not found.",
      });

      const archiveResponse = await otherUserAgent
        .patch(`/api/categories/${category.id}/archive`)
        .send({
          is_archived: true,
        });

      expect(archiveResponse.status).toBe(404);
      expect(archiveResponse.body).toEqual({
        message: "Category not found.",
      });

      const ownerResponse = await ownerAgent.get("/api/categories");

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.categories).toHaveLength(1);

      expect(ownerResponse.body.categories[0]).toEqual(
        expect.objectContaining({
          id: category.id,
          name: "Protected Category",
          transaction_type: "expense",
          color: "#F97316",
          is_archived: false,
        }),
      );
    });
  });
  describe("Transaction ownership", () => {
    test("rejects a transaction using another user's account", async () => {
      const { firstAccount, secondUserAgent, secondCategory } =
        await createTwoUsersWithResources();

      const response = await secondUserAgent.post("/api/transactions").send({
        account_id: firstAccount.id,
        category_id: secondCategory.id,
        transaction_type: "expense",
        amount: "50.00",
        description: "Unauthorized account transaction",
        transaction_date: "2026-10-01",
        notes: null,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message:
          "The selected account or category is invalid for this transaction.",
      });

      const transactionResponse =
        await secondUserAgent.get("/api/transactions");

      expect(transactionResponse.status).toBe(200);
      expect(transactionResponse.body.transactions).toEqual([]);
      expect(transactionResponse.body.pagination.total_items).toBe(0);
    });
    test("rejects a transaction using another user's category", async () => {
      const { firstCategory, secondUserAgent, secondAccount } =
        await createTwoUsersWithResources();

      const response = await secondUserAgent.post("/api/transactions").send({
        account_id: secondAccount.id,
        category_id: firstCategory.id,
        transaction_type: "expense",
        amount: "75.00",
        description: "Unauthorized category transaction",
        transaction_date: "2026-10-02",
        notes: null,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message:
          "The selected account or category is invalid for this transaction.",
      });

      const transactionResponse =
        await secondUserAgent.get("/api/transactions");

      expect(transactionResponse.status).toBe(200);
      expect(transactionResponse.body.transactions).toEqual([]);
      expect(transactionResponse.body.pagination.total_items).toBe(0);
    });
    test("does not expose another user's transaction", async () => {
      const { firstUserAgent, secondUserAgent, firstAccount, firstCategory } =
        await createTwoUsersWithResources();

      const transaction = await createTestTransaction(
        firstUserAgent,
        firstAccount,
        firstCategory,
        {
          amount: "125.50",
          description: "Owner transaction",
          transaction_date: "2026-10-03",
        },
      );

      const listResponse = await secondUserAgent.get("/api/transactions");

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.transactions).toEqual([]);
      expect(listResponse.body.pagination.total_items).toBe(0);

      const detailResponse = await secondUserAgent.get(
        `/api/transactions/${transaction.id}`,
      );

      expect(detailResponse.status).toBe(404);
      expect(detailResponse.body).toEqual({
        message: "Transaction not found.",
      });

      const ownerResponse = await firstUserAgent.get(
        `/api/transactions/${transaction.id}`,
      );

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.transaction).toEqual(
        expect.objectContaining({
          id: transaction.id,
          description: "Owner transaction",
          amount: "125.50",
        }),
      );
    });
    test("does not allow another user to update or delete a transaction", async () => {
      const {
        firstUserAgent,
        secondUserAgent,
        firstAccount,
        secondAccount,
        firstCategory,
        secondCategory,
      } = await createTwoUsersWithResources();

      const transaction = await createTestTransaction(
        firstUserAgent,
        firstAccount,
        firstCategory,
        {
          amount: "80.00",
          description: "Protected transaction",
          transaction_date: "2026-10-04",
        },
      );

      const updateResponse = await secondUserAgent
        .patch(`/api/transactions/${transaction.id}`)
        .send({
          account_id: secondAccount.id,
          category_id: secondCategory.id,
          transaction_type: "expense",
          amount: "999.99",
          description: "Unauthorized update",
          transaction_date: "2026-10-05",
          notes: "This must not be saved",
        });

      expect(updateResponse.status).toBe(404);
      expect(updateResponse.body).toEqual({
        message: "Transaction not found.",
      });

      const deleteResponse = await secondUserAgent.delete(
        `/api/transactions/${transaction.id}`,
      );

      expect(deleteResponse.status).toBe(404);
      expect(deleteResponse.body).toEqual({
        message: "Transaction not found.",
      });

      const ownerResponse = await firstUserAgent.get(
        `/api/transactions/${transaction.id}`,
      );

      expect(ownerResponse.status).toBe(200);

      expect(ownerResponse.body.transaction).toEqual(
        expect.objectContaining({
          id: transaction.id,
          account_id: firstAccount.id,
          category_id: firstCategory.id,
          amount: "80.00",
          description: "Protected transaction",
        }),
      );
    });
  });
});
