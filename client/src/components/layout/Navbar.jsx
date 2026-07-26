import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <header>
      <nav aria-label="Main navigation">
        <NavLink to="/">Finance Tracker</NavLink>

        <div>
          <NavLink to="/" end>
            Dashboard
          </NavLink>

          <NavLink to="/accounts">Accounts</NavLink>

          <NavLink to="/transactions">Transactions</NavLink>

          <NavLink to="/transactions/new">Add Transaction</NavLink>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
