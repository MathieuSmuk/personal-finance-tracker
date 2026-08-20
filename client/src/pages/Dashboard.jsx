import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import API_URL from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

function formatAmount(amount) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number(amount));
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Date unavailable";
  }

  const datePart = String(dateValue).slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatAccountType(accountType) {
  if (!accountType) {
    return "Unknown";
  }

  return accountType.charAt(0).toUpperCase() + accountType.slice(1);
}

function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function getBalanceClass(amount) {
  const numericAmount = Number(amount);

  if (numericAmount > 0) {
    return "dashboard-positive";
  }

  if (numericAmount < 0) {
    return "dashboard-negative";
  }

  return "";
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("The dashboard server returned an unexpected response.");
  }

  return response.json();
}

function Dashboard() {
  const { user } = useAuth();

  const [summary, setSummary] = useState({
    total_balance: "0",
    monthly_income: "0",
    monthly_expenses: "0",
    monthly_net: "0",
  });

  const [accounts, setAccounts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setLoading(true);
        setPageError("");

        const response = await fetch(`${API_URL}/api/dashboard`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(data, "Unable to retrieve dashboard."),
          );
        }

        setSummary({
          total_balance: data.summary?.total_balance ?? "0",
          monthly_income: data.summary?.monthly_income ?? "0",
          monthly_expenses: data.summary?.monthly_expenses ?? "0",
          monthly_net: data.summary?.monthly_net ?? "0",
        });

        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);

        setRecentTransactions(
          Array.isArray(data.recent_transactions)
            ? data.recent_transactions
            : [],
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          setPageError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      controller.abort();
    };
  }, []);

  if (loading) {
    return <p>Loading financial dashboard...</p>;
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Financial Dashboard</h1>

          <p>Welcome back, {user.name}. Here is your financial overview.</p>
        </div>

        <div className="dashboard-actions">
          <Link
            to="/accounts"
            className="dashboard-link dashboard-link-secondary"
          >
            Manage Accounts
          </Link>

          <Link
            to="/transactions/new"
            className="dashboard-link dashboard-link-primary"
          >
            Add Transaction
          </Link>
        </div>
      </div>

      {pageError && (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      )}

      {!pageError && (
        <>
          <section
            className="dashboard-summary-grid"
            aria-label="Financial summary"
          >
            <article className="dashboard-summary-card">
              <span className="dashboard-summary-label">Total Balance</span>

              <strong
                className={`dashboard-summary-value ${getBalanceClass(
                  summary.total_balance,
                )}`}
              >
                {formatAmount(summary.total_balance)}
              </strong>

              <span className="dashboard-summary-period">
                Across active accounts
              </span>
            </article>

            <article className="dashboard-summary-card">
              <span className="dashboard-summary-label">Income</span>

              <strong className="dashboard-summary-value dashboard-positive">
                {formatAmount(summary.monthly_income)}
              </strong>

              <span className="dashboard-summary-period">
                {getCurrentMonthLabel()}
              </span>
            </article>

            <article className="dashboard-summary-card">
              <span className="dashboard-summary-label">Expenses</span>

              <strong className="dashboard-summary-value dashboard-negative">
                {formatAmount(summary.monthly_expenses)}
              </strong>

              <span className="dashboard-summary-period">
                {getCurrentMonthLabel()}
              </span>
            </article>

            <article className="dashboard-summary-card">
              <span className="dashboard-summary-label">Net Income</span>

              <strong
                className={`dashboard-summary-value ${getBalanceClass(
                  summary.monthly_net,
                )}`}
              >
                {formatAmount(summary.monthly_net)}
              </strong>

              <span className="dashboard-summary-period">
                {getCurrentMonthLabel()}
              </span>
            </article>
          </section>

          <section className="dashboard-section-card">
            <div className="dashboard-section-heading">
              <div>
                <h2>Account Balances</h2>

                <p>
                  Current balances based on opening balances and recorded
                  transactions.
                </p>
              </div>

              <Link to="/accounts" className="dashboard-text-link">
                View Accounts
              </Link>
            </div>

            {accounts.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>Add an account to begin tracking your financial balances.</p>

                <Link
                  to="/accounts"
                  className="dashboard-link dashboard-link-primary"
                >
                  Add an Account
                </Link>
              </div>
            ) : (
              <div className="dashboard-account-grid">
                {accounts.map((account) => (
                  <article className="dashboard-account-card" key={account.id}>
                    <div className="dashboard-account-heading">
                      <h3>{account.name}</h3>

                      <span>{formatAccountType(account.account_type)}</span>
                    </div>

                    <dl>
                      <div>
                        <dt>Opening Balance</dt>

                        <dd>{formatAmount(account.opening_balance)}</dd>
                      </div>

                      <div>
                        <dt>Current Balance</dt>

                        <dd
                          className={getBalanceClass(account.current_balance)}
                        >
                          {formatAmount(account.current_balance)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-section-card">
            <div className="dashboard-section-heading">
              <div>
                <h2>Recent Transactions</h2>

                <p>Your five most recent financial entries.</p>
              </div>

              <Link to="/transactions" className="dashboard-text-link">
                View All Transactions
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>You have not recorded any transactions yet.</p>

                <Link
                  to="/transactions/new"
                  className="dashboard-link dashboard-link-primary"
                >
                  Add a Transaction
                </Link>
              </div>
            ) : (
              <div className="transactions-table-wrapper">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Description</th>
                      <th scope="col">Account</th>
                      <th scope="col">Category</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.transaction_date)}</td>

                        <td>
                          <span className="transaction-description">
                            {transaction.description}
                          </span>

                          {transaction.notes && (
                            <span className="transaction-notes">
                              {transaction.notes}
                            </span>
                          )}
                        </td>

                        <td>{transaction.account_name}</td>

                        <td>
                          <span className="category-label">
                            {transaction.category_color && (
                              <span
                                className="category-color"
                                style={{
                                  backgroundColor: transaction.category_color,
                                }}
                                aria-hidden="true"
                              />
                            )}

                            {transaction.category_name}
                          </span>
                        </td>

                        <td
                          className={`transaction-amount ${
                            transaction.transaction_type === "income"
                              ? "transaction-income"
                              : "transaction-expense"
                          }`}
                        >
                          {transaction.transaction_type === "income"
                            ? "+"
                            : "-"}
                          {formatAmount(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default Dashboard;
