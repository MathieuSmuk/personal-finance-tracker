import cors from "cors";
import express from "express";
import dotenv from "dotenv";

import pool from "./db/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Personal Finance Tracker API is running!",
  });
});

app.get("/api/health/database", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        CURRENT_TIMESTAMP AS current_time
    `);

    res.status(200).json({
      message: "Database connection successful!",
      database: result.rows[0].database_name,
      time: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      message: "Database connection failed.",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
