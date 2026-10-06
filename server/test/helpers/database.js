import pool from "../../db/index.js";

export async function resetTestDatabase() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      `Refusing to reset database while NODE_ENV is "${process.env.NODE_ENV}".`,
    );
  }

  const databaseResult = await pool.query(
    "SELECT current_database() AS database_name",
  );

  const databaseName = databaseResult.rows[0]?.database_name;

  if (!databaseName?.endsWith("_test")) {
    throw new Error(`Refusing to reset unsafe database: "${databaseName}".`);
  }

  await pool.query(`
    TRUNCATE TABLE
      user_sessions,
      transactions,
      categories,
      accounts,
      users
    RESTART IDENTITY
    CASCADE
  `);
}
