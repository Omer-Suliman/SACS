// ============================================================
// FOOTER Web Component
// Matches editorial palette — thin top border, muted text.
// ============================================================

class CustomFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="sacs-footer">
        <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.2rem;">
          <div style="width:18px;height:18px;background:var(--navy);border-radius:3px;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:600;font-size:0.65rem;color:#fff;">S</div>
          <span style="font-weight:600;color:var(--text-muted);font-size:0.8rem;">SACS</span>
        </div>
        <p>&copy; ${new Date().getFullYear()} Student Affairs Coordination System &mdash; Altınbaş Üniversitesi</p>
      </footer>
    `;
  }
}

customElements.define('custom-footer', CustomFooter);
