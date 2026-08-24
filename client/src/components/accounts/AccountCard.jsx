import { useState } from "react";

import API_URL from "../../config/api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

function formatCurrency(amount) {
  const value = String(amount);
  const isNegative = value.startsWith("-");

  const unsignedValue = isNegative ? value.slice(1) : value;

  const [wholePart, decimalPart = ""] = unsignedValue.split(".");

  const formattedWholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const formattedDecimalPart = decimalPart.padEnd(2, "0").slice(0, 2);

  return `${isNegative ? "-" : ""}$${formattedWholePart}.${formattedDecimalPart}`;
}

function formatAccountType(accountType) {
  return accountType.charAt(0).toUpperCase() + accountType.slice(1);
}

function AccountCard({ account, onAccountChanged }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [accountType, setAccountType] = useState(account.account_type);
  const [openingBalance, setOpeningBalance] = useState(account.opening_balance);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingArchiveStatus, setChangingArchiveStatus] = useState(false);

  function handleStartEditing() {
    setName(account.name);
    setAccountType(account.account_type);
    setOpeningBalance(account.opening_balance);
    setError("");
    setEditing(true);
  }

  function handleCancelEditing() {
    setName(account.name);
    setAccountType(account.account_type);
    setOpeningBalance(account.opening_balance);
    setError("");
    setEditing(false);
  }

  async function handleSave(event) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Please enter an account name.");
      return;
    }

    if (openingBalance === "") {
      setError("Please enter an opening balance.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: cleanName,
          account_type: accountType,
          opening_balance: openingBalance,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Unable to update account."));
      }

      onAccountChanged(data.account);
      setEditing(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveStatusChange() {
    const nextArchiveStatus = !account.is_archived;

    if (
      nextArchiveStatus &&
      !window.confirm(
        `Archive "${account.name}"? It will no longer appear in your active accounts, dashboard balance, or new transaction options.`,
      )
    ) {
      return;
    }

    setError("");
    setChangingArchiveStatus(true);

    try {
      const response = await fetch(
        `${API_URL}/api/accounts/${account.id}/archive`,
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
              ? "Unable to archive account."
              : "Unable to restore account.",
          ),
        );
      }

      onAccountChanged(data.account);
    } catch (error) {
      setError(error.message);
    } finally {
      setChangingArchiveStatus(false);
    }
  }

  const busy = saving || changingArchiveStatus;

  if (editing) {
    return (
      <article className="account-card account-card-editing">
        <form className="account-edit-form" onSubmit={handleSave}>
          <div className="form-field">
            <label htmlFor={`account-edit-name-${account.id}`}>
              Account Name
            </label>

            <input
              id={`account-edit-name-${account.id}`}
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
            <label htmlFor={`account-edit-type-${account.id}`}>
              Account Type
            </label>

            <select
              id={`account-edit-type-${account.id}`}
              value={accountType}
              onChange={(event) => {
                setAccountType(event.target.value);
                setError("");
              }}
            >
              <option value="chequing">Chequing</option>
              <option value="savings">Savings</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor={`account-edit-balance-${account.id}`}>
              Opening Balance
            </label>

            <input
              id={`account-edit-balance-${account.id}`}
              type="number"
              value={openingBalance}
              onChange={(event) => {
                setOpeningBalance(event.target.value);
                setError("");
              }}
              min="-9999999999.99"
              max="9999999999.99"
              step="0.01"
              required
            />
          </div>

          <p className="account-balance-notice">
            Changing the opening balance also changes the account’s current
            balance and dashboard totals.
          </p>

          {error && (
            <p className="form-error account-card-error" role="alert">
              {error}
            </p>
          )}

          <div className="account-edit-actions">
            <button
              type="submit"
              className="account-save-button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              className="account-cancel-button"
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
      className={`account-card ${
        account.is_archived ? "account-card-archived" : ""
      }`}
    >
      <div className="account-card-heading">
        <h3>{account.name}</h3>

        {account.is_archived && (
          <span className="account-archived-label">Archived</span>
        )}
      </div>

      <dl>
        <div>
          <dt>Type</dt>
          <dd>{formatAccountType(account.account_type)}</dd>
        </div>

        <div>
          <dt>Opening Balance</dt>
          <dd>{formatCurrency(account.opening_balance)}</dd>
        </div>
      </dl>

      <div className="account-card-actions">
        <button
          type="button"
          className="account-edit-button"
          onClick={handleStartEditing}
          disabled={busy}
        >
          Edit
        </button>

        <button
          type="button"
          className={
            account.is_archived
              ? "account-restore-button"
              : "account-archive-button"
          }
          onClick={handleArchiveStatusChange}
          disabled={busy}
        >
          {changingArchiveStatus
            ? account.is_archived
              ? "Restoring..."
              : "Archiving..."
            : account.is_archived
              ? "Restore"
              : "Archive"}
        </button>
      </div>

      {error && (
        <p className="form-error account-card-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

export default AccountCard;
