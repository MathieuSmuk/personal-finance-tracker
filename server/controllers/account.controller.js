import pool from "../db/index.js";

export async function createAccount(req, res) {
  const { name, account_type } = req.body;

  const openingBalance = req.body.opening_balance ?? "0.00";

  try {
    const result = await pool.query(
      `INSERT INTO accounts (
         user_id,
         name,
         account_type,
         opening_balance
       )
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         name,
         account_type,
         opening_balance,
         is_archived,
         created_at`,
      [req.session.userId, name, account_type, openingBalance],
    );

    return res.status(201).json({
      message: "Account created successfully.",
      account: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with that name already exists.",
      });
    }

    console.error("Unable to create account:", error);

    return res.status(500).json({
      message: "Unable to create account.",
    });
  }
}

export async function getAccounts(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         id,
         name,
         account_type,
         opening_balance,
         is_archived,
         created_at
       FROM accounts
       WHERE user_id = $1
         AND is_archived = FALSE
       ORDER BY created_at ASC, id ASC`,
      [req.session.userId],
    );

    return res.status(200).json({
      accounts: result.rows,
    });
  } catch (error) {
    console.error("Unable to retrieve accounts:", error);

    return res.status(500).json({
      message: "Unable to retrieve accounts.",
    });
  }
}
