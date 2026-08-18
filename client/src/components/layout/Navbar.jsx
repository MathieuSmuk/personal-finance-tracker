import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import ThemeToggle from "../theme/ThemeToggle";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <header>
      <nav aria-label="Main navigation">
        <NavLink to="/">Finance Tracker</NavLink>

        <div className="nav-links">
          <NavLink to="/" end>
            Dashboard
          </NavLink>

          <NavLink to="/accounts">Accounts</NavLink>

          <NavLink to="/categories">Categories</NavLink>

          <NavLink to="/transactions">Transactions</NavLink>

          <NavLink to="/transactions/new">Add Transaction</NavLink>
        </div>

        <div className="nav-user">
          <span>Signed in as {user.name}</span>

          <ThemeToggle />

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
