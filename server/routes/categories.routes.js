import express from "express";

import {
  createCategory,
  getCategories,
  setCategoryArchiveStatus,
  updateCategory,
} from "../controllers/categories.controller.js";

import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router
  .route("/")
  .get(requireAuth, getCategories)
  .post(requireAuth, createCategory);

router.patch("/:id/archive", requireAuth, setCategoryArchiveStatus);

router.patch("/:id", requireAuth, updateCategory);

export default router;
