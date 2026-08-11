import express from "express";

import {
  createCategory,
  getCategories,
} from "../controllers/categories.controller.js";

import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router
  .route("/")
  .get(requireAuth, getCategories)
  .post(requireAuth, createCategory);

export default router;
