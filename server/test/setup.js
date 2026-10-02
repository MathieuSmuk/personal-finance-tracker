import dotenv from "dotenv";
import { afterAll } from "vitest";

const result = dotenv.config({
  path: ".env.test",
  override: true,
});

if (result.error) {
  throw new Error(
    "Unable to load server/.env.test. Copy .env.test.example to .env.test and add your local test database credentials.",
  );
}

process.env.NODE_ENV = "test";

if (process.env.DATABASE_URL) {
  throw new Error(
    "Database tests must not use DATABASE_URL. Configure the local test database with DB_NAME instead.",
  );
}

if (!process.env.DB_NAME?.endsWith("_test")) {
  throw new Error(
    `Unsafe test database name: "${process.env.DB_NAME}". Test database names must end with "_test".`,
  );
}

const { default: pool } = await import("../db/index.js");

afterAll(async () => {
  await pool.end();
});
