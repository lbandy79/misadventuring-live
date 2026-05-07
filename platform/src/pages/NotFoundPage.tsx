import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="page-card">
      <h1>404 — that path doesn't exist</h1>
      <p>The crew sailed off the edge of the map.</p>
      <p>
        <Link to="/">← Return to safer waters</Link>
      </p>
    </section>
  );
}
