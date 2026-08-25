import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import API_URL from "../config/api";

const DEFAULT_FILTERS = {
  transactionType: "",
  accountId: "",
  categoryId: "",
  startDate: "",
  endDate: "",
  search: "",
  sort: "date_desc",
};

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

async function readJsonResponse(response, resourceName = "The server") {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `${resourceName} returned an unexpected response from the server.`,
    );
  }

  return response.json();
}

function buildTransactionQuery(filters) {
  const params = new URLSearchParams();

  if (filters.transactionType) {
    params.set("transaction_type", filters.transactionType);
  }

  if (filters.accountId) {
    params.set("account_id", filters.accountId);
  }

  if (filters.categoryId) {
    params.set("category_id", filters.categoryId);
  }

  if (filters.startDate) {
    params.set("start_date", filters.startDate);
  }

  if (filters.endDate) {
    params.set("end_date", filters.endDate);
  }

  const cleanSearch = filters.search.trim();

  if (cleanSearch) {
    params.set("search", cleanSearch);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  return params.toString();
}

function Transactions() {
  const [transactions, setTransactions] = useState([]);

  const [accounts, setAccounts] = useState([]);

  const [categories, setCategories] = useState([]);

  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
  }));

  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
  }));

  const [loading, setLoading] = useState(true);

  const [optionsLoading, setOptionsLoading] = useState(true);

  const [deletingId, setDeletingId] = useState(null);

  const [pageError, setPageError] = useState("");

  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadFilterOptions() {
      try {
        const [accountsResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_URL}/api/accounts?include_archived=true`, {
            credentials: "include",
            signal: controller.signal,
          }),
          fetch(`${API_URL}/api/categories?include_archived=true`, {
            credentials: "include",
            signal: controller.signal,
          }),
        ]);

        const [accountsData, categoriesData] = await Promise.all([
          readJsonResponse(accountsResponse, "Accounts"),
          readJsonResponse(categoriesResponse, "Categories"),
        ]);

        if (!accountsResponse.ok) {
          throw new Error(
            accountsData.message || "Unable to retrieve accounts.",
          );
        }

        if (!categoriesResponse.ok) {
          throw new Error(
            categoriesData.message || "Unable to retrieve categories.",
          );
        }

        setAccounts(
          Array.isArray(accountsData.accounts) ? accountsData.accounts : [],
        );

        setCategories(
          Array.isArray(categoriesData.categories)
            ? categoriesData.categories
            : [],
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          setPageError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setOptionsLoading(false);
        }
      }
    }

    loadFilterOptions();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTransactions() {
      try {
        setLoading(true);
        setPageError("");

        const query = buildTransactionQuery(appliedFilters);

        const response = await fetch(`${API_URL}/api/transactions?${query}`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await readJsonResponse(response, "Transactions");

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
  }, [appliedFilters]);

  function updateFilter(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));

    setFilterError("");
  }

  function handleTransactionTypeChange(event) {
    const transactionType = event.target.value;

    setFilters((currentFilters) => ({
      ...currentFilters,
      transactionType,
      categoryId: "",
    }));

    setFilterError("");
  }

  function handleApplyFilters(event) {
    event.preventDefault();

    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      setFilterError("Start date cannot be later than end date.");
      return;
    }

    setFilterError("");

    setAppliedFilters({
      ...filters,
      search: filters.search.trim(),
    });
  }

  function handleClearFilters() {
    const clearedFilters = {
      ...DEFAULT_FILTERS,
    };

    setFilters(clearedFilters);

    setAppliedFilters(clearedFilters);

    setFilterError("");
  }

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
      const response = await fetch(
        `${API_URL}/api/transactions/${transaction.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await readJsonResponse(response, "Transactions");

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

  const availableCategories = categories.filter(
    (category) =>
      !filters.transactionType ||
      category.transaction_type === filters.transactionType,
  );

  const hasAppliedFilters =
    Boolean(appliedFilters.transactionType) ||
    Boolean(appliedFilters.accountId) ||
    Boolean(appliedFilters.categoryId) ||
    Boolean(appliedFilters.startDate) ||
    Boolean(appliedFilters.endDate) ||
    Boolean(appliedFilters.search) ||
    appliedFilters.sort !== DEFAULT_FILTERS.sort;

  return (
    <div className="transactions-page">
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>

          <p>Review and search your recorded income and expenses.</p>
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

      <section className="transaction-filters-card">
        <h2>Filter Transactions</h2>

        <p className="transaction-filters-description">
          Search your transaction history or narrow the results by type,
          account, category, and date.
        </p>

        <form
          className="transaction-filters-form"
          onSubmit={handleApplyFilters}
        >
          <div className="form-field transaction-search-field">
            <label htmlFor="transaction-filter-search">Search</label>

            <input
              id="transaction-filter-search"
              type="search"
              value={filters.search}
              onChange={(event) => {
                updateFilter("search", event.target.value);
              }}
              placeholder="Search descriptions or notes"
              maxLength="100"
            />
          </div>

          <div className="form-field">
            <label htmlFor="transaction-filter-type">Transaction Type</label>

            <select
              id="transaction-filter-type"
              value={filters.transactionType}
              onChange={handleTransactionTypeChange}
            >
              <option value="">All Types</option>

              <option value="income">Income</option>

              <option value="expense">Expense</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="transaction-filter-account">Account</label>

            <select
              id="transaction-filter-account"
              value={filters.accountId}
              onChange={(event) => {
                updateFilter("accountId", event.target.value);
              }}
              disabled={optionsLoading}
            >
              <option value="">All Accounts</option>

              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.is_archived ? " (Archived)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="transaction-filter-category">Category</label>

            <select
              id="transaction-filter-category"
              value={filters.categoryId}
              onChange={(event) => {
                updateFilter("categoryId", event.target.value);
              }}
              disabled={optionsLoading}
            >
              <option value="">All Categories</option>

              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.is_archived ? " (Archived)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="transaction-filter-start-date">Start Date</label>

            <input
              id="transaction-filter-start-date"
              type="date"
              value={filters.startDate}
              onChange={(event) => {
                updateFilter("startDate", event.target.value);
              }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="transaction-filter-end-date">End Date</label>

            <input
              id="transaction-filter-end-date"
              type="date"
              value={filters.endDate}
              onChange={(event) => {
                updateFilter("endDate", event.target.value);
              }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="transaction-filter-sort">Sort By</label>

            <select
              id="transaction-filter-sort"
              value={filters.sort}
              onChange={(event) => {
                updateFilter("sort", event.target.value);
              }}
            >
              <option value="date_desc">Newest First</option>

              <option value="date_asc">Oldest First</option>

              <option value="amount_desc">Highest Amount First</option>

              <option value="amount_asc">Lowest Amount First</option>

              <option value="description_asc">Description: A to Z</option>

              <option value="description_desc">Description: Z to A</option>
            </select>
          </div>

          {filterError && (
            <p className="form-error transaction-filters-error" role="alert">
              {filterError}
            </p>
          )}

          <div className="transaction-filter-actions">
            <button
              type="submit"
              className="transaction-apply-button"
              disabled={loading}
            >
              {loading ? "Loading..." : "Apply Filters"}
            </button>

            <button
              type="button"
              className="transaction-clear-button"
              onClick={handleClearFilters}
              disabled={loading}
            >
              Clear Filters
            </button>
          </div>
        </form>
      </section>

      <section className="transactions-list-card">
        <div className="transaction-results-heading">
          <h2>Transaction History</h2>

          {!loading && (
            <p className="transaction-results-count">
              {transactions.length}{" "}
              {transactions.length === 1 ? "transaction" : "transactions"}
            </p>
          )}
        </div>

        {loading ? (
          <p className="empty-message">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="empty-message">
            {hasAppliedFilters
              ? "No transactions match your current filters."
              : "You have not recorded any transactions yet."}
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

                    <td>
                      {transaction.account_name}

                      {transaction.account_is_archived && (
                        <span className="transaction-archived-label">
                          Archived
                        </span>
                      )}
                    </td>

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

                      {transaction.category_is_archived && (
                        <span className="transaction-archived-label">
                          Archived
                        </span>
                      )}
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
