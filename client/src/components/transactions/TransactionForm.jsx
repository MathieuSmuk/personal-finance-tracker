import { useMemo, useState } from "react";

function getToday() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function TransactionForm({ accounts, categories, onTransactionCreated }) {
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [transactionType, setTransactionType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(getToday);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.transaction_type === transactionType,
      ),
    [categories, transactionType],
  );

  function clearError() {
    setError("");
  }

  function handleTransactionTypeChange(event) {
    setTransactionType(event.target.value);
    setCategoryId("");
    clearError();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!accountId) {
      setError("Please select an account.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Please enter an amount greater than zero.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (!transactionDate) {
      setError("Please select a transaction date.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          account_id: Number(accountId),
          category_id: Number(categoryId),
          transaction_type: transactionType,
          amount,
          description: description.trim(),
          transaction_date: transactionDate,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create transaction.");
      }

      setAmount("");
      setDescription("");
      setNotes("");

      await onTransactionCreated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  const formUnavailable =
    accounts.length === 0 || filteredCategories.length === 0;

  return (
    <section className="transaction-form-card">
      <h2>Add Transaction</h2>

      {accounts.length === 0 && (
        <p className="form-notice">
          Create an account before adding a transaction.
        </p>
      )}

      {accounts.length > 0 && filteredCategories.length === 0 && (
        <p className="form-notice">
          Create a {transactionType} category before adding this transaction.
        </p>
      )}

      <form className="transaction-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="transaction-type">Transaction Type</label>

          <select
            id="transaction-type"
            value={transactionType}
            onChange={handleTransactionTypeChange}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="transaction-account">Account</label>

          <select
            id="transaction-account"
            value={accountId}
            onChange={(event) => {
              setAccountId(event.target.value);
              clearError();
            }}
            required
          >
            <option value="">Select an account</option>

            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="transaction-category">Category</label>

          <select
            id="transaction-category"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              clearError();
            }}
            required
          >
            <option value="">Select a category</option>

            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="transaction-amount">Amount</label>

          <input
            id="transaction-amount"
            type="number"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              clearError();
            }}
            min="0.01"
            max="9999999999.99"
            step="0.01"
            placeholder="0.00"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="transaction-description">Description</label>

          <input
            id="transaction-description"
            type="text"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              clearError();
            }}
            maxLength="255"
            placeholder="For example, weekly groceries"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="transaction-date">Date</label>

          <input
            id="transaction-date"
            type="date"
            value={transactionDate}
            onChange={(event) => {
              setTransactionDate(event.target.value);
              clearError();
            }}
            required
          />
        </div>

        <div className="form-field transaction-notes-field">
          <label htmlFor="transaction-notes">
            Notes <span className="optional-label">(optional)</span>
          </label>

          <textarea
            id="transaction-notes"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              clearError();
            }}
            rows="3"
            placeholder="Add any additional details"
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="transaction-submit-button"
          disabled={submitting || formUnavailable}
        >
          {submitting ? "Adding transaction..." : "Add Transaction"}
        </button>
      </form>
    </section>
  );
}

export default TransactionForm;
