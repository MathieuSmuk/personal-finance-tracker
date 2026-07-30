import { validationResult } from "express-validator";

export function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors
      .array({ onlyFirstError: true })
      .map((error) => ({
        field: error.path,
        message: error.msg,
      }));

    return res.status(400).json({
      message: "Validation failed.",
      errors: formattedErrors,
    });
  }

  next();
}
