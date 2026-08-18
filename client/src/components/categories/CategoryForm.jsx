import { useState } from "react";

import API_URL from "../../config/api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

const DEFAULT_COLORS = {
  income: "#15803D",
  expense: "#DC2626",
};

function CategoryForm({ onCategoryCreated }) {
  const [name, setName] = useState("");
  const [transactionType, setTransactionType] = useState("expense");
  const [color, setColor] = useState(DEFAULT_COLORS.expense);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleTransactionTypeChange(event) {
    const newTransactionType = event.target.value;

    setTransactionType(newTransactionType);
    setColor(DEFAULT_COLORS[newTransactionType]);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Please enter a category name.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: cleanName,
          transaction_type: transactionType,
          color,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Unable to create category."));
      }

      onCategoryCreated(data.category);

      setName("");
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="category-form-card">
      <h2>Add Category</h2>

      <p>
        Create an income or expense category for organizing your transactions.
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <form className="category-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="category-name">Category Name</label>

          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="Groceries"
            minLength="1"
            maxLength="100"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="category-type">Category Type</label>

          <select
            id="category-type"
            value={transactionType}
            onChange={handleTransactionTypeChange}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="category-color">Colour</label>

          <input
            id="category-color"
            className="category-color-input"
            type="color"
            value={color}
            onChange={(event) => {
              setColor(event.target.value);
              setError("");
            }}
          />
        </div>

        <button
          type="submit"
          className="category-submit-button"
          disabled={submitting}
        >
          {submitting ? "Adding category..." : "Add Category"}
        </button>
      </form>
    </section>
  );
}

export default CategoryForm;
