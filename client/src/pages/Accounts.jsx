import { useEffect, useState } from "react";

import AccountCard from "../components/accounts/AccountCard";
import AccountForm from "../components/accounts/AccountForm";
import API_URL from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

function sortAccounts(accounts) {
  return [...accounts].sort((firstAccount, secondAccount) => {
    const firstCreatedAt = new Date(firstAccount.created_at).getTime();
    const secondCreatedAt = new Date(secondAccount.created_at).getTime();

    if (firstCreatedAt !== secondCreatedAt) {
      return firstCreatedAt - secondCreatedAt;
    }

    return firstAccount.id - secondAccount.id;
  });
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
        const response = await fetch(
          `${API_URL}/api/accounts?include_archived=true`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(data, "Unable to retrieve accounts."),
          );
        }

        setAccounts(
          sortAccounts(Array.isArray(data.accounts) ? data.accounts : []),
        );
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
    setAccounts((currentAccounts) =>
      sortAccounts([...currentAccounts, newAccount]),
    );
  }

  function handleAccountChanged(updatedAccount) {
    setAccounts((currentAccounts) =>
      sortAccounts(
        currentAccounts.map((account) =>
          account.id === updatedAccount.id ? updatedAccount : account,
        ),
      ),
    );
  }

  const activeAccounts = accounts.filter((account) => !account.is_archived);

  const archivedAccounts = accounts.filter((account) => account.is_archived);

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
          <>
            <section className="account-group">
              <h3>Active Accounts</h3>

              {activeAccounts.length === 0 ? (
                <p className="account-empty-message">
                  You currently have no active accounts.
                </p>
              ) : (
                <div className="account-grid">
                  {activeAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onAccountChanged={handleAccountChanged}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="account-group archived-account-group">
              <h3>Archived Accounts</h3>

              <p className="archived-account-description">
                Archived accounts remain visible in transaction history but are
                excluded from your dashboard balance and cannot be used for new
                transactions.
              </p>

              {archivedAccounts.length === 0 ? (
                <p className="account-empty-message">
                  You currently have no archived accounts.
                </p>
              ) : (
                <div className="account-grid">
                  {archivedAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onAccountChanged={handleAccountChanged}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </section>
  );
}

export default Accounts;
