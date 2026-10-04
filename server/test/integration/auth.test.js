import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import app from "../../app.js";
import { resetTestDatabase } from "../helpers/database.js";

const TEST_PASSWORD = "StrongTestPassword123!";

function getRegistrationDetails(overrides = {}) {
  return {
    name: "Authentication User",
    email: "authentication.user@example.com",
    password: TEST_PASSWORD,
    ...overrides,
  };
}

async function registerUser(agent, overrides = {}) {
  const registrationDetails = getRegistrationDetails(overrides);

  const response = await agent
    .post("/api/auth/register")
    .send(registrationDetails);

  expect(response.status).toBe(201);

  return {
    response,
    registrationDetails,
  };
}

describe("Authentication routes", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("POST /api/auth/register", () => {
    test("registers and authenticates a new user", async () => {
      const agent = request.agent(app);

      const { response, registrationDetails } = await registerUser(agent);

      expect(response.body.message).toBe(
        "User registered and authenticated successfully.",
      );

      expect(response.body.user).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: registrationDetails.name,
          email: registrationDetails.email,
          created_at: expect.any(String),
        }),
      );

      expect(response.body.user).not.toHaveProperty("password_hash");

      const currentUserResponse = await agent.get("/api/auth/me");

      expect(currentUserResponse.status).toBe(200);
      expect(currentUserResponse.body.user).toEqual(
        expect.objectContaining({
          id: response.body.user.id,
          name: registrationDetails.name,
          email: registrationDetails.email,
        }),
      );
    });

    test("rejects an email that is already registered", async () => {
      const firstAgent = request.agent(app);
      const secondAgent = request.agent(app);

      await registerUser(firstAgent, {
        email: "duplicate@example.com",
      });

      const response = await secondAgent.post("/api/auth/register").send(
        getRegistrationDetails({
          name: "Second User",
          email: "DUPLICATE@example.com",
        }),
      );

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        message: "An account with that email already exists.",
      });
    });
  });

  describe("POST /api/auth/login", () => {
    test("authenticates a user with valid credentials", async () => {
      const registrationAgent = request.agent(app);

      const { response: registrationResponse } = await registerUser(
        registrationAgent,
        {
          name: "Login User",
          email: "login.user@example.com",
        },
      );

      const loginAgent = request.agent(app);

      const loginResponse = await loginAgent.post("/api/auth/login").send({
        email: "LOGIN.USER@example.com",
        password: TEST_PASSWORD,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.message).toBe("Login successful.");

      expect(loginResponse.body.user).toEqual(
        expect.objectContaining({
          id: registrationResponse.body.user.id,
          name: "Login User",
          email: "login.user@example.com",
        }),
      );

      expect(loginResponse.body.user).not.toHaveProperty("password_hash");

      const currentUserResponse = await loginAgent.get("/api/auth/me");

      expect(currentUserResponse.status).toBe(200);
      expect(currentUserResponse.body.user.id).toBe(
        registrationResponse.body.user.id,
      );
    });

    test("rejects an incorrect password without creating an authenticated session", async () => {
      const registrationAgent = request.agent(app);

      await registerUser(registrationAgent, {
        email: "wrong.password@example.com",
      });

      const loginAgent = request.agent(app);

      const loginResponse = await loginAgent.post("/api/auth/login").send({
        email: "wrong.password@example.com",
        password: "IncorrectPassword123!",
      });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body).toEqual({
        message: "Invalid email or password.",
      });

      const currentUserResponse = await loginAgent.get("/api/auth/me");

      expect(currentUserResponse.status).toBe(401);
      expect(currentUserResponse.body).toEqual({
        message: "Authentication required.",
      });
    });

    test("rejects an email that is not registered", async () => {
      const agent = request.agent(app);

      const response = await agent.post("/api/auth/login").send({
        email: "missing.user@example.com",
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Invalid email or password.",
      });
    });
  });

  describe("GET /api/auth/me", () => {
    test("rejects unauthenticated users", async () => {
      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Authentication required.",
      });
    });
  });

  describe("POST /api/auth/logout", () => {
    test("destroys the authenticated session", async () => {
      const agent = request.agent(app);

      await registerUser(agent, {
        email: "logout.user@example.com",
      });

      const authenticatedResponse = await agent.get("/api/auth/me");

      expect(authenticatedResponse.status).toBe(200);

      const logoutResponse = await agent.post("/api/auth/logout");

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toEqual({
        message: "Logout successful.",
      });

      const loggedOutResponse = await agent.get("/api/auth/me");

      expect(loggedOutResponse.status).toBe(401);
      expect(loggedOutResponse.body).toEqual({
        message: "Authentication required.",
      });
    });
  });
});
