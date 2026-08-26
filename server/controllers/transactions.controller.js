import pool from "../db/index.js";

const VALID_TRANSACTION_TYPES = ["income", "expense"];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const TRANSACTION_SORT_OPTIONS = {
  date_desc: `
    transactions.transaction_date DESC,
    transactions.created_at DESC,
    transactions.id DESC
  `,
  date_asc: `
    transactions.transaction_date ASC,
    transactions.created_at ASC,
    transactions.id ASC
  `,
  amount_desc: `
    transactions.amount DESC,
    transactions.transaction_date DESC,
    transactions.id DESC
  `,
  amount_asc: `
    transactions.amount ASC,
    transactions.transaction_date DESC,
    transactions.id DESC
  `,
  description_asc: `
    LOWER(transactions.description) ASC,
    transactions.transaction_date DESC,
    transactions.id DESC
  `,
  description_desc: `
    LOWER(transactions.description) DESC,
    transactions.transaction_date DESC,
    transactions.id DESC
  `,
};

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

function validateTransactionFilters(query) {
  const {
    transaction_type,
    account_id,
    category_id,
    start_date,
    end_date,
    search,
    sort = "date_desc",
    page = String(DEFAULT_PAGE),
    limit = String(DEFAULT_PAGE_SIZE),
  } = query;

  if (
    transaction_type !== undefined &&
    !VALID_TRANSACTION_TYPES.includes(transaction_type)
  ) {
    return {
      error: "Transaction type filter must be income or expense.",
    };
  }

  let accountId = null;

  if (account_id !== undefined) {
    accountId = getTransactionId(account_id);

    if (accountId === null) {
      return {
        error: "Please provide a valid account ID filter.",
      };
    }
  }

  let categoryId = null;

  if (category_id !== undefined) {
    categoryId = getTransactionId(category_id);

    if (categoryId === null) {
      return {
        error: "Please provide a valid category ID filter.",
      };
    }
  }

  if (start_date !== undefined && !isValidTransactionDate(start_date)) {
    return {
      error: "Start date must be a valid date in YYYY-MM-DD format.",
    };
  }

  if (end_date !== undefined && !isValidTransactionDate(end_date)) {
    return {
      error: "End date must be a valid date in YYYY-MM-DD format.",
    };
  }

  if (
    start_date !== undefined &&
    end_date !== undefined &&
    start_date > end_date
  ) {
    return {
      error: "Start date cannot be later than end date.",
    };
  }

  if (search !== undefined && typeof search !== "string") {
    return {
      error: "Search must be a valid text value.",
    };
  }

  const cleanSearch = typeof search === "string" ? search.trim() : "";

  if (cleanSearch.length > 100) {
    return {
      error: "Search must contain no more than 100 characters.",
    };
  }

  if (
    typeof sort !== "string" ||
    !Object.hasOwn(TRANSACTION_SORT_OPTIONS, sort)
  ) {
    return {
      error: "Please provide a valid transaction sort option.",
    };
  }

  if (typeof page !== "string" || !/^[1-9]\d*$/.test(page)) {
    return {
      error: "Page must be a positive whole number.",
    };
  }

  if (typeof limit !== "string" || !/^[1-9]\d*$/.test(limit)) {
    return {
      error: "Page size must be a positive whole number.",
    };
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  if (!Number.isSafeInteger(pageNumber)) {
    return {
      error: "Page must be a valid positive whole number.",
    };
  }

  if (!Number.isSafeInteger(pageSize) || pageSize > MAX_PAGE_SIZE) {
    return {
      error: `Page size cannot exceed ${MAX_PAGE_SIZE} transactions.`,
    };
  }

  const offset = (pageNumber - 1) * pageSize;

  if (!Number.isSafeInteger(offset)) {
    return {
      error: "Requested page is too large.",
    };
  }

  return {
    values: {
      transactionType: transaction_type,
      accountId,
      categoryId,
      startDate: start_date,
      endDate: end_date,
      search: cleanSearch,
      sort,
      page: pageNumber,
      limit: pageSize,
      offset,
    },
  };
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
  const validation = validateTransactionFilters(req.query);

  if (validation.error) {
    return res.status(400).json({
      message: validation.error,
    });
  }

  const {
    transactionType,
    accountId,
    categoryId,
    startDate,
    endDate,
    search,
    sort,
    page,
    limit,
    offset,
  } = validation.values;

  const conditions = ["transactions.user_id = $1"];

  const values = [req.session.userId];

  if (transactionType !== undefined) {
    values.push(transactionType);

    conditions.push(
      `transactions.transaction_type = $${values.length}::VARCHAR(10)`,
    );
  }

  if (accountId !== null) {
    values.push(accountId);

    conditions.push(`transactions.account_id = $${values.length}`);
  }

  if (categoryId !== null) {
    values.push(categoryId);

    conditions.push(`transactions.category_id = $${values.length}`);
  }

  if (startDate !== undefined) {
    values.push(startDate);

    conditions.push(`transactions.transaction_date >= $${values.length}::DATE`);
  }

  if (endDate !== undefined) {
    values.push(endDate);

    conditions.push(`transactions.transaction_date <= $${values.length}::DATE`);
  }

  if (search !== "") {
    values.push(`%${search}%`);

    const searchParameter = `$${values.length}`;

    conditions.push(
      `(
         transactions.description ILIKE ${searchParameter}
         OR COALESCE(transactions.notes, '') ILIKE ${searchParameter}
       )`,
    );
  }

  const whereClause = conditions.join(" AND ");

  const orderBy = TRANSACTION_SORT_OPTIONS[sort];

  const limitParameter = `$${values.length + 1}`;

  const offsetParameter = `$${values.length + 2}`;

  const paginatedValues = [...values, limit, offset];

  try {
    const [countResult, transactionsResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total_items
         FROM transactions
         INNER JOIN accounts
           ON accounts.id = transactions.account_id
          AND accounts.user_id = transactions.user_id
         INNER JOIN categories
           ON categories.id = transactions.category_id
          AND categories.user_id = transactions.user_id
         WHERE ${whereClause}`,
        values,
      ),

      pool.query(
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
         WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT ${limitParameter}
         OFFSET ${offsetParameter}`,
        paginatedValues,
      ),
    ]);

    const totalItems = Number(countResult.rows[0].total_items);

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      transactions: transactionsResult.rows,
      pagination: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
        has_previous_page: page > 1 && totalPages > 0,
        has_next_page: page < totalPages,
      },
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
