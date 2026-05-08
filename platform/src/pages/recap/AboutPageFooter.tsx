/**
 * Tiny "about this page" handwritten paragraph at the bottom of the recap.
 *
 * Quietly states the product story to anyone who scrolls all the way down
 * — the thing that turns a recap into a recruiting flywheel.
 */

export default function AboutPageFooter() {
  return (
    <footer className="recap-about" role="contentinfo">
      <p>
        Every show generates audience-created characters. We turn them into
        permanent canon. Your contributions will recur.
      </p>
      <p className="recap-about-mark">— The Misadventureverse</p>
    </footer>
  );
}
