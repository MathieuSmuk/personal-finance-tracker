import { Router } from "express";

import {
  getCurrentUser,
  registerUser,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { validateRegistration } from "../validators/auth.validators.js";

const router = Router();

router.post("/register", validateRegistration, validateRequest, registerUser);

router.get("/me", requireAuth, getCurrentUser);

export default router;
