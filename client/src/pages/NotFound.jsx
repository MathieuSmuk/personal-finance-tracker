import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section>
      <h1>Page Not Found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/">Return to the dashboard</Link>
    </section>
  );
}

export default NotFound;
