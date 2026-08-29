import { Route, Routes } from "react-router-dom";

import GuestRoute from "./components/auth/GuestRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Footer from "./components/layout/Footer";
import Layout from "./components/layout/Layout";
import Accounts from "./pages/Accounts";
import AddTransaction from "./pages/AddTransaction";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import EditTransaction from "./pages/EditTransaction";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import Transactions from "./pages/Transactions";

function App() {
  return (
    <div className="app-shell">
      <div className="app-content">
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="categories" element={<Categories />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="transactions/new" element={<AddTransaction />} />
              <Route
                path="transactions/:id/edit"
                element={<EditTransaction />}
              />
            </Route>
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

export default App;
