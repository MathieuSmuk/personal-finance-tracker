import pool from "../db/index.js";

const VALID_TRANSACTION_TYPES = ["income", "expense"];

function isValidTransactionDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

function getTransactionId(value) {
  const transactionId = Number(value);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return null;
  }

  return transactionId;
}

function validateTransactionInput(body) {
  const {
    account_id,
    category_id,
    transaction_type,
    amount,
    description,
    transaction_date,
    notes,
  } = body;

  const accountId = Number(account_id);
  const categoryId = Number(category_id);

  const cleanDescription =
    typeof description === "string" ? description.trim() : "";

  const cleanNotes =
    typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null;

  if (!Number.isInteger(accountId) || accountId <= 0) {
    return {
      error: "Please select a valid account.",
    };
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return {
      error: "Please select a valid category.",
    };
  }

  if (!VALID_TRANSACTION_TYPES.includes(transaction_type)) {
    return {
      error: "Transaction type must be income or expense.",
    };
  }

  if (!isValidAmount(amount)) {
    return {
      error:
        "Amount must be greater than zero and contain no more than two decimal places.",
    };
  }

  if (cleanDescription.length < 1 || cleanDescription.length > 255) {
    return {
      error: "Description must contain between 1 and 255 characters.",
    };
  }

  if (!isValidTransactionDate(transaction_date)) {
    return {
      error: "Please provide a valid transaction date.",
    };
  }

  return {
    values: {
      accountId,
      categoryId,
      transactionType: transaction_type,
      amount,
      description: cleanDescription,
      transactionDate: transaction_date,
      notes: cleanNotes,
    },
  };
}

export async function createTransaction(req, res) {
  const validation = validateTransactionInput(req.body);

  if (validation.error) {
    return res.status(400).json({
      message: validation.error,
    });
  }

  const {
    accountId,
    categoryId,
    transactionType,
    amount,
    description,
    transactionDate,
    notes,
  } = validation.values;

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
         AND categories.transaction_type =
           $4::VARCHAR(10)
       RETURNING
         id,
         account_id,
         category_id,
         transaction_type,
         amount,
         description,
         transaction_date,
         notes,
         created_at,
         updated_at`,
      [
        req.session.userId,
        accountId,
        categoryId,
        transactionType,
        amount,
        description,
        transactionDate,
        notes,
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

export async function getTransactionById(req, res) {
  const transactionId = getTransactionId(req.params.id);

  if (transactionId === null) {
    return res.status(400).json({
      message: "Please provide a valid transaction ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         transactions.id,
         transactions.account_id,
         accounts.name AS account_name,
         accounts.is_archived AS account_is_archived,
         transactions.category_id,
         categories.name AS category_name,
         categories.color AS category_color,
         categories.is_archived AS category_is_archived,
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
       WHERE transactions.id = $1
         AND transactions.user_id = $2`,
      [transactionId, req.session.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Unable to retrieve transaction:", error);

    return res.status(500).json({
      message: "Unable to retrieve transaction.",
    });
  }
}

export async function updateTransaction(req, res) {
  const transactionId = getTransactionId(req.params.id);

  if (transactionId === null) {
    return res.status(400).json({
      message: "Please provide a valid transaction ID.",
    });
  }

  const validation = validateTransactionInput(req.body);

  if (validation.error) {
    return res.status(400).json({
      message: validation.error,
    });
  }

  const {
    accountId,
    categoryId,
    transactionType,
    amount,
    description,
    transactionDate,
    notes,
  } = validation.values;

  try {
    const existingResult = await pool.query(
      `SELECT
         id,
         account_id,
         category_id
       FROM transactions
       WHERE id = $1
         AND user_id = $2`,
      [transactionId, req.session.userId],
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        message: "Transaction not found.",
      });
    }

    const result = await pool.query(
      `UPDATE transactions
       SET
         account_id = accounts.id,
         category_id = categories.id,
         transaction_type =
           categories.transaction_type,
         amount = $6,
         description = $7,
         transaction_date = $8,
         notes = $9,
         updated_at = CURRENT_TIMESTAMP
       FROM accounts
       CROSS JOIN categories
       WHERE transactions.id = $2
         AND transactions.user_id = $1
         AND accounts.id = $3
         AND accounts.user_id = $1
         AND (
           accounts.is_archived = FALSE
           OR accounts.id = transactions.account_id
         )
         AND categories.id = $4
         AND categories.user_id = $1
         AND (
           categories.is_archived = FALSE
           OR categories.id = transactions.category_id
         )
         AND categories.transaction_type =
           $5::VARCHAR(10)
       RETURNING
         transactions.id,
         transactions.account_id,
         transactions.category_id,
         transactions.transaction_type,
         transactions.amount,
         transactions.description,
         transactions.transaction_date,
         transactions.notes,
         transactions.created_at,
         transactions.updated_at`,
      [
        req.session.userId,
        transactionId,
        accountId,
        categoryId,
        transactionType,
        amount,
        description,
        transactionDate,
        notes,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message:
          "The selected account or category is invalid for this transaction.",
      });
    }

    return res.status(200).json({
      message: "Transaction updated successfully.",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Unable to update transaction:", error);

    return res.status(500).json({
      message: "Unable to update transaction.",
    });
  }
}

export async function deleteTransaction(req, res) {
  const transactionId = getTransactionId(req.params.id);

  if (transactionId === null) {
    return res.status(400).json({
      message: "Please provide a valid transaction ID.",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id = $1
         AND user_id = $2
       RETURNING id`,
      [transactionId, req.session.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      message: "Transaction deleted successfully.",
      transaction_id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Unable to delete transaction:", error);

    return res.status(500).json({
      message: "Unable to delete transaction.",
    });
  }
}
