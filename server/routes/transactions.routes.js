import express from "express";

import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  updateTransaction,
} from "../controllers/transactions.controller.js";

import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router
  .route("/")
  .get(requireAuth, getTransactions)
  .post(requireAuth, createTransaction);

router
  .route("/:id")
  .get(requireAuth, getTransactionById)
  .patch(requireAuth, updateTransaction)
  .delete(requireAuth, deleteTransaction);

export default router;
