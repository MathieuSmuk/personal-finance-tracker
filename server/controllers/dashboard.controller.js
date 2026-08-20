import pool from "../db/index.js";

export async function getDashboard(req, res) {
  try {
    const userId = req.session.userId;

    const [summaryResult, accountsResult, recentTransactionsResult] =
      await Promise.all([
        pool.query(
          `WITH account_balances AS (
           SELECT
             accounts.id,
             accounts.opening_balance
             +
             COALESCE(
               SUM(
                 CASE
                   WHEN transactions.transaction_type = 'income'
                     THEN transactions.amount
                   WHEN transactions.transaction_type = 'expense'
                     THEN -transactions.amount
                   ELSE 0
                 END
               ),
               0
             ) AS current_balance
           FROM accounts
           LEFT JOIN transactions
             ON transactions.account_id = accounts.id
            AND transactions.user_id = accounts.user_id
           WHERE accounts.user_id = $1
             AND accounts.is_archived = FALSE
           GROUP BY
             accounts.id,
             accounts.opening_balance
         ),
         monthly_totals AS (
           SELECT
             COALESCE(
               SUM(transactions.amount)
               FILTER (
                 WHERE transactions.transaction_type = 'income'
               ),
               0
             ) AS monthly_income,
             COALESCE(
               SUM(transactions.amount)
               FILTER (
                 WHERE transactions.transaction_type = 'expense'
               ),
               0
             ) AS monthly_expenses
           FROM transactions
           WHERE transactions.user_id = $1
             AND transactions.transaction_date
               >= DATE_TRUNC('month', CURRENT_DATE)::DATE
             AND transactions.transaction_date
               < (
                 DATE_TRUNC('month', CURRENT_DATE)
                 + INTERVAL '1 month'
               )::DATE
         )
         SELECT
           COALESCE(
             (
               SELECT SUM(account_balances.current_balance)
               FROM account_balances
             ),
             0
           ) AS total_balance,
           monthly_totals.monthly_income,
           monthly_totals.monthly_expenses,
           monthly_totals.monthly_income
             - monthly_totals.monthly_expenses AS monthly_net
         FROM monthly_totals`,
          [userId],
        ),

        pool.query(
          `SELECT
           accounts.id,
           accounts.name,
           accounts.account_type,
           accounts.opening_balance,
           accounts.opening_balance
           +
           COALESCE(
             SUM(
               CASE
                 WHEN transactions.transaction_type = 'income'
                   THEN transactions.amount
                 WHEN transactions.transaction_type = 'expense'
                   THEN -transactions.amount
                 ELSE 0
               END
             ),
             0
           ) AS current_balance
         FROM accounts
         LEFT JOIN transactions
           ON transactions.account_id = accounts.id
          AND transactions.user_id = accounts.user_id
         WHERE accounts.user_id = $1
           AND accounts.is_archived = FALSE
         GROUP BY
           accounts.id,
           accounts.name,
           accounts.account_type,
           accounts.opening_balance,
           accounts.created_at
         ORDER BY
           accounts.created_at ASC,
           accounts.id ASC`,
          [userId],
        ),

        pool.query(
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
           transactions.notes
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
           transactions.id DESC
         LIMIT 5`,
          [userId],
        ),
      ]);

    return res.status(200).json({
      summary: summaryResult.rows[0],
      accounts: accountsResult.rows,
      recent_transactions: recentTransactionsResult.rows,
    });
  } catch (error) {
    console.error("Unable to retrieve dashboard:", error);

    return res.status(500).json({
      message: "Unable to retrieve dashboard.",
    });
  }
}
