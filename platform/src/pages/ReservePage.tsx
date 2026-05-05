/**
 * Reservation page — Phase 4 placeholder. Phase 5 will port the
 * reservation form and EmailJS confirmation logic from the legacy
 * /create flow into a proper marketing-side flow.
 */

export default function ReservePage() {
  return (
    <section className="page-card">
      <h1>Reserve a seat</h1>
      <p>
        Pick a show, claim a seat, get an access code via email, then create
        your character before the show starts.
      </p>
      <div className="placeholder-banner">
        Phase 5 will replace this with a real reservation form (name, email,
        show + showtime, EmailJS confirmation, Firestore reservation doc).
      </div>
    </section>
  );
}
