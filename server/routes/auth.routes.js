import { Router } from "express";

import { registerUser } from "../controllers/auth.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { validateRegistration } from "../validators/auth.validators.js";

const router = Router();

router.post("/register", validateRegistration, validateRequest, registerUser);

export default router;
