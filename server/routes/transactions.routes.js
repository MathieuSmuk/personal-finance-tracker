import express from "express";

import {
  createTransaction,
  getTransactions,
} from "../controllers/transactions.controller.js";

import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router
  .route("/")
  .get(requireAuth, getTransactions)
  .post(requireAuth, createTransaction);

export default router;
