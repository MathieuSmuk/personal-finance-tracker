import { useAuth } from "../hooks/useAuth";

function Dashboard() {
  const { user } = useAuth();

  return (
    <section>
      <h1>Financial Dashboard</h1>
      <p>Welcome back, {user.name}.</p>

      <dl>
        <div>
          <dt>Name</dt>
          <dd>{user.name}</dd>
        </div>

        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
      </dl>

      <p>Your financial summary will appear here.</p>
    </section>
  );
}

export default Dashboard;
