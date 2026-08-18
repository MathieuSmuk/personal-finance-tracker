import { useState } from "react";

import API_URL from "../../config/api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

const DEFAULT_COLORS = {
  income: "#15803D",
  expense: "#DC2626",
};

function formatCategoryType(transactionType) {
  return transactionType.charAt(0).toUpperCase() + transactionType.slice(1);
}

function CategoryCard({ category, onCategoryChanged }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(
    category.color || DEFAULT_COLORS[category.transaction_type],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingArchiveStatus, setChangingArchiveStatus] = useState(false);

  function handleStartEditing() {
    setName(category.name);
    setColor(category.color || DEFAULT_COLORS[category.transaction_type]);
    setError("");
    setEditing(true);
  }

  function handleCancelEditing() {
    setName(category.name);
    setColor(category.color || DEFAULT_COLORS[category.transaction_type]);
    setError("");
    setEditing(false);
  }

  async function handleSave(event) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Please enter a category name.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/categories/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: cleanName,
          color,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Unable to update category."));
      }

      onCategoryChanged(data.category);
      setEditing(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveStatusChange() {
    const nextArchiveStatus = !category.is_archived;

    if (
      nextArchiveStatus &&
      !window.confirm(
        `Archive "${category.name}"? It will no longer be available for new transactions.`,
      )
    ) {
      return;
    }

    setError("");
    setChangingArchiveStatus(true);

    try {
      const response = await fetch(
        `${API_URL}/api/categories/${category.id}/archive`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            is_archived: nextArchiveStatus,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            data,
            nextArchiveStatus
              ? "Unable to archive category."
              : "Unable to restore category.",
          ),
        );
      }

      onCategoryChanged(data.category);
    } catch (error) {
      setError(error.message);
    } finally {
      setChangingArchiveStatus(false);
    }
  }

  const busy = saving || changingArchiveStatus;

  if (editing) {
    return (
      <article className="category-card category-card-editing">
        <form className="category-edit-form" onSubmit={handleSave}>
          <div className="form-field">
            <label htmlFor={`category-edit-name-${category.id}`}>
              Category Name
            </label>

            <input
              id={`category-edit-name-${category.id}`}
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              minLength="1"
              maxLength="100"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor={`category-edit-color-${category.id}`}>Colour</label>

            <input
              id={`category-edit-color-${category.id}`}
              className="category-edit-color-input"
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value);
                setError("");
              }}
            />
          </div>

          <p className="category-type-notice">
            Type:{" "}
            <strong>{formatCategoryType(category.transaction_type)}</strong>. A
            category’s type cannot be changed.
          </p>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="category-edit-actions">
            <button
              type="submit"
              className="category-save-button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              className="category-cancel-button"
              onClick={handleCancelEditing}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article
      className={`category-card ${
        category.is_archived ? "category-card-archived" : ""
      }`}
    >
      <div className="category-card-content">
        <span
          className="category-card-color"
          style={{
            backgroundColor: category.color || "transparent",
          }}
          aria-hidden="true"
        />

        <div>
          <span className="category-card-name">{category.name}</span>

          <span className="category-card-type">
            {formatCategoryType(category.transaction_type)}
          </span>
        </div>
      </div>

      <div className="category-card-actions">
        <button
          type="button"
          className="category-edit-button"
          onClick={handleStartEditing}
          disabled={busy}
        >
          Edit
        </button>

        <button
          type="button"
          className={
            category.is_archived
              ? "category-restore-button"
              : "category-archive-button"
          }
          onClick={handleArchiveStatusChange}
          disabled={busy}
        >
          {changingArchiveStatus
            ? category.is_archived
              ? "Restoring..."
              : "Archiving..."
            : category.is_archived
              ? "Restore"
              : "Archive"}
        </button>
      </div>

      {error && (
        <p className="form-error category-card-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

export default CategoryCard;
