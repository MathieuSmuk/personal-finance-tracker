import pool from "../db/index.js";

const VALID_TRANSACTION_TYPES = ["income", "expense"];
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export async function createCategory(req, res) {
  const { name, transaction_type, color } = req.body;

  const cleanName = typeof name === "string" ? name.trim() : "";

  const cleanTransactionType =
    typeof transaction_type === "string"
      ? transaction_type.trim().toLowerCase()
      : "";

  let cleanColor = null;

  if (typeof color === "string" && color.trim() !== "") {
    cleanColor = color.trim().toUpperCase();
  } else if (color !== undefined && color !== null && color !== "") {
    return res.status(400).json({
      message: "Category color must be a valid hexadecimal color.",
    });
  }

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

  if (cleanColor !== null && !COLOR_PATTERN.test(cleanColor)) {
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
  try {
    const result = await pool.query(
      `SELECT
         id,
         name,
         transaction_type,
         color,
         created_at
       FROM categories
       WHERE user_id = $1
       ORDER BY
         transaction_type ASC,
         name ASC,
         id ASC`,
      [req.session.userId],
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
