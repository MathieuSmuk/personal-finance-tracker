import { useAuth } from "../hooks/useAuth";

function Transactions() {
  const { user } = useAuth();

  return (
    <section>
      <h1>Transactions</h1>
      <p>Transactions belonging to {user.name} will appear here.</p>
    </section>
  );
}

export default Transactions;
