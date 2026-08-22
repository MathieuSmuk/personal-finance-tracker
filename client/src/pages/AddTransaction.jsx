import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import TransactionForm from "../components/transactions/TransactionForm.jsx";

async function readJsonResponse(response, resourceName) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `${resourceName} returned an unexpected response from the server.`,
    );
  }

  return response.json();
}

function AddTransaction() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadFormOptions() {
      try {
        setLoading(true);
        setPageError("");

        const [accountsResponse, categoriesResponse] = await Promise.all([
          fetch("/api/accounts", {
            credentials: "include",
            signal: controller.signal,
          }),
          fetch("/api/categories", {
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
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setPageError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadFormOptions();

    return () => {
      controller.abort();
    };
  }, []);

  function handleTransactionSaved() {
    navigate("/transactions");
  }

  if (loading) {
    return <p>Loading transaction form...</p>;
  }

  return (
    <div className="add-transaction-page">
      <div className="page-heading">
        <div>
          <h1>Add Transaction</h1>
          <p>Record new income or an expense.</p>
        </div>

        <Link to="/transactions" className="secondary-link-button">
          Back to Transactions
        </Link>
      </div>

      {pageError ? (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      ) : (
        <TransactionForm
          accounts={accounts}
          categories={categories}
          onTransactionCreated={handleTransactionSaved}
        />
      )}
    </div>
  );
}

export default AddTransaction;
