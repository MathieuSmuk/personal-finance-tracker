import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("The transaction server returned an unexpected response.");
  }

  return response.json();
}

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadTransactions() {
      try {
        setLoading(true);
        setPageError("");

        const response = await fetch("/api/transactions", {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Unable to retrieve transactions.");
        }

        setTransactions(
          Array.isArray(data.transactions) ? data.transactions : [],
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

    loadTransactions();

    return () => {
      controller.abort();
    };
  }, []);

  async function handleDelete(transaction) {
    const confirmed = window.confirm(
      `Delete "${transaction.description}"? This will permanently remove the transaction and recalculate your balances.`,
    );

    if (!confirmed) {
      return;
    }

    setPageError("");
    setDeletingId(transaction.id);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete transaction.");
      }

      setTransactions((currentTransactions) =>
        currentTransactions.filter(
          (currentTransaction) => currentTransaction.id !== transaction.id,
        ),
      );
    } catch (error) {
      setPageError(error.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <p>Loading transactions...</p>;
  }

  return (
    <div className="transactions-page">
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>

          <p>Review your recorded income and expenses.</p>
        </div>

        <Link to="/transactions/new" className="primary-link-button">
          Add Transaction
        </Link>
      </div>

      {pageError && (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      )}

      <section className="transactions-list-card">
        <h2>Transaction History</h2>

        {transactions.length === 0 ? (
          <p className="empty-message">
            You have not recorded any transactions yet.
          </p>
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
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => (
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
                      {transaction.transaction_type === "income" ? "+" : "-"}
                      {formatAmount(transaction.amount)}
                    </td>

                    <td>
                      <div className="transaction-actions">
                        <Link
                          to={`/transactions/${transaction.id}/edit`}
                          className="transaction-edit-link"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          className="transaction-delete-button"
                          onClick={() => handleDelete(transaction)}
                          disabled={deletingId === transaction.id}
                        >
                          {deletingId === transaction.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Transactions;
