import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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

function EditTransaction() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadEditData() {
      try {
        setLoading(true);
        setPageError("");

        const [transactionResponse, accountsResponse, categoriesResponse] =
          await Promise.all([
            fetch(`/api/transactions/${id}`, {
              credentials: "include",
              signal: controller.signal,
            }),
            fetch("/api/accounts", {
              credentials: "include",
              signal: controller.signal,
            }),
            fetch("/api/categories", {
              credentials: "include",
              signal: controller.signal,
            }),
          ]);

        const [transactionData, accountsData, categoriesData] =
          await Promise.all([
            readJsonResponse(transactionResponse, "Transaction"),
            readJsonResponse(accountsResponse, "Accounts"),
            readJsonResponse(categoriesResponse, "Categories"),
          ]);

        if (!transactionResponse.ok) {
          throw new Error(
            transactionData.message || "Unable to retrieve transaction.",
          );
        }

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

        const loadedTransaction = transactionData.transaction;

        const loadedAccounts = Array.isArray(accountsData.accounts)
          ? accountsData.accounts
          : [];

        const loadedCategories = Array.isArray(categoriesData.categories)
          ? categoriesData.categories
          : [];

        const currentAccountAlreadyIncluded = loadedAccounts.some(
          (account) => account.id === loadedTransaction.account_id,
        );

        if (!currentAccountAlreadyIncluded) {
          loadedAccounts.push({
            id: loadedTransaction.account_id,
            name: loadedTransaction.account_name,
            is_archived: loadedTransaction.account_is_archived,
          });
        }

        const currentCategoryAlreadyIncluded = loadedCategories.some(
          (category) => category.id === loadedTransaction.category_id,
        );

        if (!currentCategoryAlreadyIncluded) {
          loadedCategories.push({
            id: loadedTransaction.category_id,
            name: loadedTransaction.category_name,
            color: loadedTransaction.category_color,
            transaction_type: loadedTransaction.transaction_type,
            is_archived: loadedTransaction.category_is_archived,
          });
        }

        setTransaction(loadedTransaction);
        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
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

    loadEditData();

    return () => {
      controller.abort();
    };
  }, [id]);

  function handleTransactionSaved() {
    navigate("/transactions");
  }

  if (loading) {
    return <p>Loading transaction...</p>;
  }

  return (
    <div className="edit-transaction-page">
      <div className="page-heading">
        <div>
          <h1>Edit Transaction</h1>

          <p>Correct the details of an existing financial entry.</p>
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
          initialTransaction={transaction}
          onTransactionSaved={handleTransactionSaved}
        />
      )}
    </div>
  );
}

export default EditTransaction;
