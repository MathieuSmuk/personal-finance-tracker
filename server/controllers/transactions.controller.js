import pool from "../db/index.js";

const VALID_TRANSACTION_TYPES = ["income", "expense"];

function isValidTransactionDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isValidAmount(value) {
  const amountPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

  return amountPattern.test(String(value)) && Number(value) > 0;
}

export async function createTransaction(req, res) {
  const {
    account_id,
    category_id,
    transaction_type,
    amount,
    description,
    transaction_date,
    notes,
  } = req.body;

  const accountId = Number(account_id);
  const categoryId = Number(category_id);
  const cleanDescription =
    typeof description === "string" ? description.trim() : "";
  const cleanNotes =
    typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null;

  if (!Number.isInteger(accountId) || accountId <= 0) {
    return res.status(400).json({
      message: "Please select a valid account.",
    });
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({
      message: "Please select a valid category.",
    });
  }

  if (!VALID_TRANSACTION_TYPES.includes(transaction_type)) {
    return res.status(400).json({
      message: "Transaction type must be income or expense.",
    });
  }

  if (!isValidAmount(amount)) {
    return res.status(400).json({
      message:
        "Amount must be greater than zero and contain no more than two decimal places.",
    });
  }

  if (cleanDescription.length < 1 || cleanDescription.length > 255) {
    return res.status(400).json({
      message: "Description must contain between 1 and 255 characters.",
    });
  }

  if (!isValidTransactionDate(transaction_date)) {
    return res.status(400).json({
      message: "Please provide a valid transaction date.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions (
         user_id,
         account_id,
         category_id,
         transaction_type,
         amount,
         description,
         transaction_date,
         notes
       )
       SELECT
         $1,
         accounts.id,
         categories.id,
         categories.transaction_type,
         $5,
         $6,
         $7,
         $8
       FROM accounts
       CROSS JOIN categories
       WHERE accounts.id = $2
         AND accounts.user_id = $1
         AND accounts.is_archived = FALSE
         AND categories.id = $3
         AND categories.user_id = $1
         AND categories.is_archived = FALSE
         AND categories.transaction_type = $4::VARCHAR(10)
       RETURNING
         id,
         account_id,
         category_id,
         transaction_type,
         amount,
         description,
         transaction_date,
         notes,
         created_at`,
      [
        req.session.userId,
        accountId,
        categoryId,
        transaction_type,
        amount,
        cleanDescription,
        transaction_date,
        cleanNotes,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message:
          "The selected account or category is invalid for this transaction.",
      });
    }

    return res.status(201).json({
      message: "Transaction created successfully.",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Unable to create transaction:", error);

    return res.status(500).json({
      message: "Unable to create transaction.",
    });
  }
}

export async function getTransactions(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         transactions.id,
         transactions.account_id,
         accounts.name AS account_name,
         transactions.category_id,
         categories.name AS category_name,
         categories.color AS category_color,
         transactions.transaction_type,
         transactions.amount,
         transactions.description,
         transactions.transaction_date,
         transactions.notes,
         transactions.created_at,
         transactions.updated_at
       FROM transactions
       INNER JOIN accounts
         ON accounts.id = transactions.account_id
        AND accounts.user_id = transactions.user_id
       INNER JOIN categories
         ON categories.id = transactions.category_id
        AND categories.user_id = transactions.user_id
       WHERE transactions.user_id = $1
       ORDER BY
         transactions.transaction_date DESC,
         transactions.created_at DESC,
         transactions.id DESC`,
      [req.session.userId],
    );

    return res.status(200).json({
      transactions: result.rows,
    });
  } catch (error) {
    console.error("Unable to retrieve transactions:", error);

    return res.status(500).json({
      message: "Unable to retrieve transactions.",
    });
  }
}
