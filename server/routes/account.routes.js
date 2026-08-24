import { Router } from "express";

import {
  createAccount,
  getAccounts,
  setAccountArchiveStatus,
  updateAccount,
} from "../controllers/account.controller.js";

import { requireAuth } from "../middleware/requireAuth.js";

import { validateRequest } from "../middleware/validateRequest.js";

import { validateCreateAccount } from "../validators/account.validators.js";

const router = Router();

router.get("/", requireAuth, getAccounts);

router.post(
  "/",
  requireAuth,
  validateCreateAccount,
  validateRequest,
  createAccount,
);

router.patch("/:id/archive", requireAuth, setAccountArchiveStatus);

router.patch(
  "/:id",
  requireAuth,
  validateCreateAccount,
  validateRequest,
  updateAccount,
);

export default router;
