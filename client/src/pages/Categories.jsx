import { useEffect, useState } from "react";

import CategoryCard from "../components/categories/CategoryCard";
import CategoryForm from "../components/categories/CategoryForm";
import API_URL from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

function sortCategories(categories) {
  return [...categories].sort((firstCategory, secondCategory) =>
    firstCategory.name.localeCompare(secondCategory.name),
  );
}

function CategoryGroup({ title, categories, emptyMessage, onCategoryChanged }) {
  return (
    <section className="category-group">
      <h3>{title}</h3>

      {categories.length === 0 ? (
        <p className="category-empty-message">{emptyMessage}</p>
      ) : (
        <div className="category-grid">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onCategoryChanged={onCategoryChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Categories() {
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch(
          `${API_URL}/api/categories?include_archived=true`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(data, "Unable to retrieve categories."),
          );
        }

        setCategories(
          sortCategories(Array.isArray(data.categories) ? data.categories : []),
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

    loadCategories();

    return () => {
      controller.abort();
    };
  }, []);

  function handleCategoryCreated(newCategory) {
    setCategories((currentCategories) =>
      sortCategories([...currentCategories, newCategory]),
    );
  }

  function handleCategoryChanged(updatedCategory) {
    setCategories((currentCategories) =>
      sortCategories(
        currentCategories.map((category) =>
          category.id === updatedCategory.id ? updatedCategory : category,
        ),
      ),
    );
  }

  const expenseCategories = categories.filter(
    (category) =>
      !category.is_archived && category.transaction_type === "expense",
  );

  const incomeCategories = categories.filter(
    (category) =>
      !category.is_archived && category.transaction_type === "income",
  );

  const archivedCategories = categories.filter(
    (category) => category.is_archived,
  );

  return (
    <section className="categories-page">
      <div>
        <h1>Categories</h1>

        <p>Manage the transaction categories belonging to {user.name}.</p>
      </div>

      <CategoryForm onCategoryCreated={handleCategoryCreated} />

      <section className="category-list">
        <h2>Your Categories</h2>

        {loading && <p>Loading categories...</p>}

        {!loading && error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && categories.length === 0 && (
          <p className="empty-state">
            You have not created any transaction categories yet.
          </p>
        )}

        {!loading && !error && categories.length > 0 && (
          <>
            <div className="category-groups">
              <CategoryGroup
                title="Expense Categories"
                categories={expenseCategories}
                emptyMessage="You have no active expense categories."
                onCategoryChanged={handleCategoryChanged}
              />

              <CategoryGroup
                title="Income Categories"
                categories={incomeCategories}
                emptyMessage="You have no active income categories."
                onCategoryChanged={handleCategoryChanged}
              />
            </div>

            <section className="category-group archived-category-group">
              <h3>Archived Categories</h3>

              <p className="archived-category-description">
                Archived categories remain visible in transaction history but
                cannot be used for new transactions.
              </p>

              {archivedCategories.length === 0 ? (
                <p className="category-empty-message">
                  You currently have no archived categories.
                </p>
              ) : (
                <div className="category-grid">
                  {archivedCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onCategoryChanged={handleCategoryChanged}
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

export default Categories;
