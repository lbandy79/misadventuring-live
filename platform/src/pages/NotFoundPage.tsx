import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="page-card not-found-card">
      <img
        src="/images/mtp-logo.png"
        alt=""
        className="not-found-mark"
        width={160}
        height={160}
        decoding="async"
      />
      <h1>404 — that path doesn't exist</h1>
      <p className="not-found-blurb">The crew sailed off the edge of the map.</p>
      <p>
        <Link to="/" className="btn-primary">← Return to safer waters</Link>
      </p>
    </section>
  );
}
