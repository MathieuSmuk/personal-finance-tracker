import { useState } from "react";

import API_URL from "../../config/api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

function AccountForm({ onAccountCreated }) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("chequing");
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          account_type: accountType,
          opening_balance: openingBalance,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Unable to create account."));
      }

      onAccountCreated(data.account);

      setName("");
      setAccountType("chequing");
      setOpeningBalance("0.00");
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="account-form-card">
      <h2>Add Account</h2>
      <p>Add a chequing, savings, or cash account to your tracker.</p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <form className="account-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="account-name">Account Name</label>
          <input
            id="account-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="Personal Chequing"
            minLength="1"
            maxLength="100"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="account-type">Account Type</label>
          <select
            id="account-type"
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
          <div className="field-label-row">
            <label htmlFor="opening-balance">Opening Balance</label>

            <span className="tooltip">
              <button
                type="button"
                className="tooltip-trigger"
                aria-label="Opening balance information"
                aria-describedby="opening-balance-tooltip"
              >
                ?
              </button>

              <span
                id="opening-balance-tooltip"
                className="tooltip-content"
                role="tooltip"
              >
                Enter the balance the account had before tracking new
                transactions.
              </span>
            </span>
          </div>

          <input
            id="opening-balance"
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

        <button
          type="submit"
          className="account-submit-button"
          disabled={submitting}
        >
          {submitting ? "Adding account..." : "Add Account"}
        </button>
      </form>
    </section>
  );
}

export default AccountForm;
