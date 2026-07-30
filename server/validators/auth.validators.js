import { body } from "express-validator";

export const validateRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters."),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address."),

  body("password")
    .isString()
    .isLength({ min: 12, max: 128 })
    .withMessage("Password must be between 12 and 128 characters."),
];
