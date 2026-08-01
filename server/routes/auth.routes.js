import { Router } from "express";

import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  validateLogin,
  validateRegistration,
} from "../validators/auth.validators.js";

const router = Router();

router.post("/register", validateRegistration, validateRequest, registerUser);

router.post("/login", validateLogin, validateRequest, loginUser);

router.post("/logout", logoutUser);

router.get("/me", requireAuth, getCurrentUser);

export default router;
