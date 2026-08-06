import { body } from "express-validator";

const MONEY_PATTERN = /^-?(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export const validateCreateAccount = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Account name must be between 1 and 100 characters."),

  body("account_type")
    .trim()
    .toLowerCase()
    .isIn(["chequing", "savings", "cash"])
    .withMessage("Account type must be chequing, savings, or cash."),

  body("opening_balance")
    .optional()
    .customSanitizer((value) => String(value).trim())
    .matches(MONEY_PATTERN)
    .withMessage(
      "Opening balance must be a valid amount with no more than two decimal places.",
    ),
];
