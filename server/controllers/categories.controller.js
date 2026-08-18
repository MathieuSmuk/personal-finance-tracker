import pool from "../db/index.js";

const VALID_TRANSACTION_TYPES = ["income", "expense"];
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function getCleanColor(color) {
  if (
    color === undefined ||
    color === null ||
    (typeof color === "string" && color.trim() === "")
  ) {
    return null;
  }

  if (typeof color !== "string") {
    return undefined;
  }

  return color.trim().toUpperCase();
}

function getCategoryId(value) {
  const categoryId = Number(value);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return null;
  }

  return categoryId;
}

export async function createCategory(req, res) {
  const { name, transaction_type, color } = req.body;

  const cleanName = typeof name === "string" ? name.trim() : "";

  const cleanTransactionType =
    typeof transaction_type === "string"
      ? transaction_type.trim().toLowerCase()
      : "";

  const cleanColor = getCleanColor(color);

  if (cleanName.length < 1 || cleanName.length > 100) {
    return res.status(400).json({
      message: "Category name must contain between 1 and 100 characters.",
    });
  }

  if (!VALID_TRANSACTION_TYPES.includes(cleanTransactionType)) {
    return res.status(400).json({
      message: "Category type must be income or expense.",
    });
  }

  if (
    cleanColor === undefined ||
    (cleanColor !== null && !COLOR_PATTERN.test(cleanColor))
  ) {
    return res.status(400).json({
      message: "Category color must use the hexadecimal format #RRGGBB.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (
         user_id,
         name,
         transaction_type,
         color
       )
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         name,
         transaction_type,
         color,
         is_archived,
         created_at`,
      [req.session.userId, cleanName, cleanTransactionType, cleanColor],
    );

    return res.status(201).json({
      message: "Category created successfully.",
      category: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "A category with that name and transaction type already exists.",
      });
    }

    console.error("Unable to create category:", error);

    return res.status(500).json({
      message: "Unable to create category.",
    });
  }
}

export async function getCategories(req, res) {
  const includeArchived = req.query.include_archived === "true";

  try {
    const result = await pool.query(
      `SELECT
         id,
         name,
         transaction_type,
         color,
         is_archived,
         created_at
       FROM categories
       WHERE user_id = $1
         AND (
           $2::BOOLEAN = TRUE
           OR is_archived = FALSE
         )
       ORDER BY
         is_archived ASC,
         transaction_type ASC,
         name ASC,
         id ASC`,
      [req.session.userId, includeArchived],
    );

    return res.status(200).json({
      categories: result.rows,
    });
  } catch (error) {
    console.error("Unable to retrieve categories:", error);

    return res.status(500).json({
      message: "Unable to retrieve categories.",
    });
  }
}

export async function updateCategory(req, res) {
  const categoryId = getCategoryId(req.params.id);
  const { name, color } = req.body;

  if (categoryId === null) {
    return res.status(400).json({
      message: "Please provide a valid category ID.",
    });
  }

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanColor = getCleanColor(color);

  if (cleanName.length < 1 || cleanName.length > 100) {
    return res.status(400).json({
      message: "Category name must contain between 1 and 100 characters.",
    });
  }

  if (
    cleanColor === undefined ||
    (cleanColor !== null && !COLOR_PATTERN.test(cleanColor))
  ) {
    return res.status(400).json({
      message: "Category color must use the hexadecimal format #RRGGBB.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE categories
       SET
         name = $3,
         color = $4
       WHERE id = $1
         AND user_id = $2
       RETURNING
         id,
         name,
         transaction_type,
         color,
         is_archived,
         created_at`,
      [categoryId, req.session.userId, cleanName, cleanColor],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      message: "Category updated successfully.",
      category: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "A category with that name and transaction type already exists.",
      });
    }

    console.error("Unable to update category:", error);

    return res.status(500).json({
      message: "Unable to update category.",
    });
  }
}

export async function setCategoryArchiveStatus(req, res) {
  const categoryId = getCategoryId(req.params.id);
  const { is_archived } = req.body;

  if (categoryId === null) {
    return res.status(400).json({
      message: "Please provide a valid category ID.",
    });
  }

  if (typeof is_archived !== "boolean") {
    return res.status(400).json({
      message: "Archive status must be true or false.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE categories
       SET is_archived = $3
       WHERE id = $1
         AND user_id = $2
       RETURNING
         id,
         name,
         transaction_type,
         color,
         is_archived,
         created_at`,
      [categoryId, req.session.userId, is_archived],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      message: is_archived
        ? "Category archived successfully."
        : "Category restored successfully.",
      category: result.rows[0],
    });
  } catch (error) {
    console.error("Unable to change category archive status:", error);

    return res.status(500).json({
      message: "Unable to change category archive status.",
    });
  }
}
