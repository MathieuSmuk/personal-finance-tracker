import { useEffect, useState } from "react";

import AccountForm from "../components/accounts/AccountForm";
import API_URL from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

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

function Accounts() {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAccounts() {
      try {
        const response = await fetch(`${API_URL}/api/accounts`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(data, "Unable to retrieve accounts."),
          );
        }

        setAccounts(data.accounts);
      } catch (error) {
        if (error.name !== "AbortError") {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      controller.abort();
    };
  }, []);

  function handleAccountCreated(newAccount) {
    setAccounts((currentAccounts) => [...currentAccounts, newAccount]);
  }

  return (
    <section className="accounts-page">
      <div>
        <h1>Accounts</h1>
        <p>Manage the financial accounts belonging to {user.name}.</p>
      </div>

      <AccountForm onAccountCreated={handleAccountCreated} />

      <section className="account-list">
        <h2>Your Accounts</h2>

        {loading && <p>Loading accounts...</p>}

        {!loading && error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && accounts.length === 0 && (
          <p className="empty-state">
            You have not added any financial accounts yet.
          </p>
        )}

        {!loading && !error && accounts.length > 0 && (
          <div className="account-grid">
            {accounts.map((account) => (
              <article className="account-card" key={account.id}>
                <h3>{account.name}</h3>

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
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default Accounts;
