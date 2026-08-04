import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

function GuestRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const previousLocation = location.state?.from;

  const destination = previousLocation
    ? `${previousLocation.pathname}${previousLocation.search}${previousLocation.hash}`
    : "/";

  if (loading) {
    return (
      <main>
        <p>Checking authentication...</p>
      </main>
    );
  }

  if (user) {
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}

export default GuestRoute;
