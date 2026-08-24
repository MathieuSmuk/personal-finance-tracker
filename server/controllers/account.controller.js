import pool from "../db/index.js";

function getAccountId(value) {
  const accountId = Number(value);

  if (!Number.isInteger(accountId) || accountId <= 0) {
    return null;
  }

  return accountId;
}

export async function createAccount(req, res) {
  const { name, account_type } = req.body;

  const cleanName = name.trim();

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
      [req.session.userId, cleanName, account_type, openingBalance],
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
  const includeArchived = req.query.include_archived === "true";

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
         AND (
           $2::BOOLEAN = TRUE
           OR is_archived = FALSE
         )
       ORDER BY
         is_archived ASC,
         created_at ASC,
         id ASC`,
      [req.session.userId, includeArchived],
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

export async function updateAccount(req, res) {
  const accountId = getAccountId(req.params.id);

  if (accountId === null) {
    return res.status(400).json({
      message: "Please provide a valid account ID.",
    });
  }

  const { name, account_type, opening_balance } = req.body;

  const cleanName = name.trim();

  try {
    const result = await pool.query(
      `UPDATE accounts
       SET
         name = $3,
         account_type = $4,
         opening_balance = $5
       WHERE id = $1
         AND user_id = $2
       RETURNING
         id,
         name,
         account_type,
         opening_balance,
         is_archived,
         created_at`,
      [accountId, req.session.userId, cleanName, account_type, opening_balance],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    return res.status(200).json({
      message: "Account updated successfully.",
      account: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with that name already exists.",
      });
    }

    console.error("Unable to update account:", error);

    return res.status(500).json({
      message: "Unable to update account.",
    });
  }
}

export async function setAccountArchiveStatus(req, res) {
  const accountId = getAccountId(req.params.id);

  const { is_archived } = req.body;

  if (accountId === null) {
    return res.status(400).json({
      message: "Please provide a valid account ID.",
    });
  }

  if (typeof is_archived !== "boolean") {
    return res.status(400).json({
      message: "Archive status must be true or false.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE accounts
       SET is_archived = $3
       WHERE id = $1
         AND user_id = $2
       RETURNING
         id,
         name,
         account_type,
         opening_balance,
         is_archived,
         created_at`,
      [accountId, req.session.userId, is_archived],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    return res.status(200).json({
      message: is_archived
        ? "Account archived successfully."
        : "Account restored successfully.",
      account: result.rows[0],
    });
  } catch (error) {
    console.error("Unable to change account archive status:", error);

    return res.status(500).json({
      message: "Unable to change account archive status.",
    });
  }
}
