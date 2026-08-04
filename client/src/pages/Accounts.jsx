import { useAuth } from "../hooks/useAuth";

function Accounts() {
  const { user } = useAuth();

  return (
    <section>
      <h1>Accounts</h1>
      <p>Financial accounts belonging to {user.name} will appear here.</p>
    </section>
  );
}

export default Accounts;
