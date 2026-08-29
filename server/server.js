import cors from "cors";
import express from "express";
import dotenv from "dotenv";

import pool from "./db/index.js";
import accountRoutes from "./routes/account.routes.js";
import authRoutes from "./routes/auth.routes.js";
import categoriesRouter from "./routes/categories.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import transactionsRouter from "./routes/transactions.routes.js";
import sessionMiddleware from "./config/session.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(sessionMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/categories", categoriesRouter);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/transactions", transactionsRouter);

app.get("/", (req, res) => {
  res.json({
    message: "Personal Finance Tracker API is running!",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return res.status(503).json({
      status: "error",
      database: "unavailable",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
